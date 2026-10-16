/* 貓奴值班中：用 Claude 視覺讀取檢驗報告照片。
   優先順序：① 本機設定的 Anthropic API 金鑰 ② 沿用「貓咪健康紀錄 /cat/」已連接的 Apps Script 後端 ③ 內建 OCR（app.js 處理）。
   金鑰只存在這台裝置的瀏覽器（localStorage），不會寫進程式碼或 GitHub。 */
(function(root){
'use strict';
const KEY='miaotherapy-codex-ai-v1';
const MODEL='claude-sonnet-5-5';
const PROMPT=`你是獸醫檢驗報告的資料擷取器。這些圖片是「同一份」貓咪檢驗報告的各頁（血液、生化、甲狀腺等）。請讀出報告上「每一個」有數值的檢驗項目，只輸出 JSON，不要任何說明文字：
{"date":"YYYY-MM-DD 或 null","weight_kg":數字或null,"clinic":"醫院名稱或null","items":[{"name":"報告上印的項目縮寫或名稱","value":數字,"cap":"" 或 ">" 或 "<","unit":"單位","lo":參考下限或null,"hi":參考上限或null,"flag":"H、L 或空字串"}]}
規則：
- 逐列讀取，不要漏列，也不要補報告上沒有的項目。
- 結果印成「>20.0」或「<0.5」這種超出儀器範圍的，value 填 20.0 或 0.5，cap 填 ">" 或 "<"；其他情況 cap 填空字串。
- 結果不是數字的項目（例如 Normal、陰性、***）略過。
- 參考範圍印成「0.8–2.4」就拆成 lo=0.8、hi=2.4；沒有印就填 null。
- 報告上有 H／L／↑／↓ 標記就填 flag。
- 日期若是民國年請換成西元；看不到日期填 null。
- 看不清楚的數字寧可略過該項，絕對不要猜。`;

function cfg(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return{}}}
function setKey(k){try{k?localStorage.setItem(KEY,JSON.stringify({apiKey:k})):localStorage.removeItem(KEY);return true}catch(e){return false}}
/* /cat/ 與這個 App 在同一個網站底下，所以能讀到 /cat/ 存的後端設定 */
function shared(){try{const c=JSON.parse(localStorage.getItem('cat-cfg')||'null');return c&&c.url&&c.token?c:null}catch(e){return null}}
function mode(){return cfg().apiKey?'key':shared()?'backend':'ocr'}

function loadImage(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('有一張照片無法讀取，請換一張或改用截圖'))};im.src=u})}
async function jpeg(file,max=1800,q=.86){
  const im=await loadImage(file),k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
  const cv=document.createElement('canvas');cv.width=Math.round(im.naturalWidth*k);cv.height=Math.round(im.naturalHeight*k);
  const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);x.drawImage(im,0,0,cv.width,cv.height);
  const u=cv.toDataURL('image/jpeg',q);return{mime:'image/jpeg',base64:u.slice(u.indexOf(',')+1)};
}
function fileB64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const u=String(r.result);res(u.slice(u.indexOf(',')+1))};r.onerror=()=>rej(new Error('無法讀取檔案'));r.readAsDataURL(file)})}

function parseJson(text){
  const a=String(text||'').indexOf('{'),b=String(text||'').lastIndexOf('}');
  if(a<0||b<a)throw new Error('AI 沒有回傳可用的資料，請重拍清楚一點再試一次');
  try{return JSON.parse(text.slice(a,b+1))}catch(e){throw new Error('AI 回傳的格式不完整，請再試一次')}
}
const numOrNull=v=>{if(v===''||v==null)return null;const n=Number(v);return Number.isFinite(n)?n:null};
/* 統一成 {date,weight,clinic,rows:[{name,value,cap,unit,lo,hi,flag}]} */
function normalize(o){
  const rows=[],seen=new Set();
  for(const x of (o.items||o.metrics||[])){
    const name=String(x.name||x.k||'').trim(),value=numOrNull(x.value);
    if(!name||value===null||value<0)continue;
    const cap=x.cap===true?'>':(x.cap==='>'||x.cap==='<')?x.cap:'';
    const unit=String(x.unit||'').trim(),sig=name.toUpperCase()+'|'+unit;
    if(seen.has(sig))continue;seen.add(sig);
    rows.push({name,value,cap,unit,lo:numOrNull(x.lo),hi:numOrNull(x.hi),flag:x.flag==='H'||x.flag==='L'?x.flag:''});
  }
  const date=/^\d{4}-\d{2}-\d{2}$/.test(o.date||'')?o.date:null;
  const w=numOrNull(o.weight_kg??o.weight);
  return{date,weight:w&&w>0&&w<35?w:null,clinic:o.clinic||'',rows};
}

async function viaKey(files){
  const content=[];
  for(const f of files){
    if(f.type==='application/pdf')content.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:await fileB64(f)}});
    else{const j=await jpeg(f);content.push({type:'image',source:{type:'base64',media_type:j.mime,data:j.base64}})}
  }
  content.push({type:'text',text:PROMPT});
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),120000);
  let res;
  try{
    res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:ctrl.signal,
      headers:{'content-type':'application/json','x-api-key':cfg().apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:MODEL,max_tokens:6000,messages:[{role:'user',content}]})});
  }catch(e){throw new Error(e.name==='AbortError'?'AI 讀取逾時，請再試一次':'連不上 AI 服務，請檢查網路')}finally{clearTimeout(t)}
  let j;try{j=await res.json()}catch(e){throw new Error('AI 服務回傳異常（'+res.status+'）')}
  if(!res.ok){
    const m=(j.error&&j.error.message)||'';
    if(res.status===401)throw new Error('API 金鑰不正確，請到「AI 辨識設定」重新貼上');
    if(res.status===429)throw new Error('AI 服務暫時太忙或額度用完，請稍後再試');
    throw new Error('AI 讀取失敗：'+(m||res.status));
  }
  return normalize(parseJson((j.content||[]).map(c=>c.text||'').join('')));
}

async function viaBackend(files){
  if(files.some(f=>f.type==='application/pdf'))throw new Error('目前連接的後端只能讀照片，PDF 請改拍照或設定 API 金鑰');
  const c=shared(),images=[];for(const f of files)images.push(await jpeg(f));
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),150000);
  let j;
  try{
    const res=await fetch(c.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:c.token,action:'extract',images}),signal:ctrl.signal,redirect:'follow'});
    j=await res.json();
  }catch(e){throw new Error(e.name==='AbortError'?'AI 讀取逾時，請再試一次':'連不上後端，請檢查網路或到「貓咪健康紀錄」確認設定')}finally{clearTimeout(t)}
  if(!j||!j.ok)throw new Error((j&&j.error)||'後端回傳失敗');
  const d=j.data||{};
  return normalize({date:d.date,clinic:d.clinic,items:(d.metrics||[]).map(m=>({name:m.k,value:m.value,cap:m.cap,unit:m.unit,lo:m.lo,hi:m.hi}))});
}

async function read(files){
  const m=mode();
  if(m==='key')return viaKey(files);
  if(m==='backend')return viaBackend(files);
  throw new Error('NO_AI');
}
root.LabAI={mode,read,setKey,hasKey:()=>!!cfg().apiKey,keyTail:()=>{const k=cfg().apiKey||'';return k?'…'+k.slice(-4):''}};
})(window);
