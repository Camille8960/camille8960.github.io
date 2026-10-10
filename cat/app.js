'use strict';
/* ===== 工具 ===== */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseD=s=>{const a=String(s).split('-').map(Number);return new Date(a[0],a[1]-1,a[2])};
const todayStr=()=>ymd(new Date());
const addDays=(s,n)=>{const d=parseD(s);d.setDate(d.getDate()+n);return ymd(d)};
const addMonths=(s,n)=>{const d=parseD(s),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return ymd(d)};
const diffDays=(a,b)=>Math.round((parseD(a)-parseD(b))/864e5);
const WD='日一二三四五六';
const fmtFull=s=>{const d=parseD(s);return d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+'（'+WD[d.getDay()]+'）'};
const fmtMD=s=>{const d=parseD(s);return (d.getMonth()+1)+'/'+d.getDate()};
const fmtYMD=s=>{const d=parseD(s);return d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()};
const lsGet=(k,def)=>{try{const v=localStorage.getItem(k);return v==null?def:JSON.parse(v)}catch(e){return def}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
const newId=p=>p+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36);
const num=v=>{if(v===''||v==null)return null;const n=Number(v);return isFinite(n)?n:null};

/* ===== 檢驗項目 ===== */
/* g：f＝重點（腎臟、甲狀腺）　c＝血球　o＝其他生化 */
const MET={
  CREA:{zh:'肌酸酐',unit:'mg/dL',g:'f',lo:0.8,hi:2.4},
  SDMA:{zh:'SDMA（腎功能早期指標）',unit:'μg/dL',g:'f',lo:0,hi:14},
  BUN:{zh:'血中尿素氮',unit:'mg/dL',g:'f',lo:16,hi:36},
  PHOS:{zh:'磷離子',unit:'mg/dL',g:'f',lo:3.1,hi:7.5},
  TT4:{zh:'總甲狀腺素',unit:'μg/dL',g:'f',lo:0.8,hi:4.7},
  K:{zh:'鉀離子',unit:'mmol/L',g:'o'},Na:{zh:'鈉離子',unit:'mmol/L',g:'o'},Cl:{zh:'氯離子',unit:'mmol/L',g:'o'},Ca:{zh:'鈣',unit:'mg/dL',g:'o'},
  GLU:{zh:'血糖',unit:'mg/dL',g:'o'},ALT:{zh:'丙胺酸轉胺酶',unit:'U/L',g:'o'},ALKP:{zh:'鹼性磷酸酶',unit:'U/L',g:'o'},
  TP:{zh:'總蛋白',unit:'g/dL',g:'o'},ALB:{zh:'白蛋白',unit:'g/dL',g:'o'},GLOB:{zh:'球蛋白',unit:'g/dL',g:'o'},
  CHOL:{zh:'膽固醇',unit:'mg/dL',g:'o'},TBIL:{zh:'總膽紅素',unit:'mg/dL',g:'o'},
  RBC:{zh:'紅血球',unit:'M/μL',g:'c',lo:6.54,hi:12.20},HCT:{zh:'血球容積比',unit:'%',g:'c',lo:30.3,hi:52.3},
  HGB:{zh:'血紅素',unit:'g/dL',g:'c',lo:9.8,hi:16.2},MCV:{zh:'平均紅血球體積',unit:'fL',g:'c',lo:35.9,hi:53.1},
  MCH:{zh:'平均紅血球血紅素量',unit:'pg',g:'c',lo:11.8,hi:17.3},MCHC:{zh:'平均紅血球血紅素濃度',unit:'g/dL',g:'c',lo:28.1,hi:35.8},
  RDW:{zh:'紅血球分布寬度',unit:'%',g:'c',lo:15.0,hi:27.0},RETIC:{zh:'網狀紅血球',unit:'K/μL',g:'c',lo:3.0,hi:50.0},
  'RETIC-HGB':{zh:'網狀球血紅素',unit:'pg',g:'c',lo:13.2,hi:20.8},WBC:{zh:'白血球',unit:'K/μL',g:'c',lo:2.87,hi:17.02},
  NEU:{zh:'嗜中性球',unit:'K/μL',g:'c',lo:2.30,hi:10.29},LYM:{zh:'淋巴球',unit:'K/μL',g:'c',lo:0.92,hi:6.88},
  MONO:{zh:'單核球',unit:'K/μL',g:'c',lo:0.05,hi:0.67},EOS:{zh:'嗜酸性球',unit:'K/μL',g:'c',lo:0.17,hi:1.57},
  BASO:{zh:'嗜鹼性球',unit:'K/μL',g:'c',lo:0.01,hi:0.26},PLT:{zh:'血小板',unit:'K/μL',g:'c',lo:151,hi:600},
  MPV:{zh:'平均血小板體積',unit:'fL',g:'c',lo:11.4,hi:21.6},PCT:{zh:'血小板容積比',unit:'%',g:'c',lo:0.17,hi:0.86}
};
const KEYMAP={};Object.keys(MET).forEach(k=>KEYMAP[k.toUpperCase()]=k);
const normKey=k=>{const t=String(k||'').trim().replace(/\s+/g,'');return KEYMAP[t.toUpperCase()]||t};
const FOCUS_ORDER=['CREA','SDMA','BUN','PHOS','TT4'];
const CBC_KEYS=Object.keys(MET).filter(k=>MET[k].g==='c');
const TEMPLATES={kidney:['CREA','BUN','PHOS','SDMA','TT4'],cbc:CBC_KEYS};
const ITEMS=[['kidney','腎臟（肌酸酐、尿素氮、磷）'],['thy','甲狀腺（TT4）'],['cbc','血球檢查'],['wt','體重']];
const TYPES=[['lab','檢驗報告'],['xray','X 光・影像'],['visit','一般回診'],['other','其他']];
const TYPE_NAME=Object.fromEntries(TYPES);
const KINDS=[['report','檢驗報告'],['xray','X 光'],['img','超音波／其他影像'],['other','處方／其他']];
const KIND_NAME=Object.fromEntries(KINDS);
const SLOTS=[['08:00','早'],['13:00','午'],['20:00','晚'],['22:00','睡前']];

/* ===== 設定與後端 ===== */
const cfg=Object.assign({url:'',token:''},lsGet('cat-cfg',{}));
const FILECACHE=new Map();   // 檔案 id → dataURL
const Local={
  files:new Map(),
  db(){let d=lsGet('cat-db',null);if(!d){d=demoDb();lsSet('cat-db',d)}return d},
  save(d){lsSet('cat-db',d)},
  async call(a,p){
    const d=this.db();
    const ret=()=>JSON.parse(JSON.stringify(d));
    switch(a){
      case 'load':return ret();
      case 'saveCat':{let c=d.cats.find(x=>x.id===p.cat.id);if(!c){c={id:p.cat.id,name:'',info:'',photo:'',nextDate:'',nextTime:'',nextClinic:'',nextItems:[]};d.cats.push(c)}Object.assign(c,p.cat);this.save(d);return ret()}
      case 'saveVisit':{
        const v=p.visit,id=v.id||newId('v');
        const old=d.visits.find(x=>x.id===id);const rec={id,cat:v.cat,date:v.date,type:v.type||'',clinic:v.clinic||'',vet:v.vet||'',weight:v.weight==null?null:v.weight,notes:v.notes||''};
        if(old)Object.assign(old,rec);else d.visits.push(rec);
        d.labs=d.labs.filter(l=>l.visit!==id);
        (p.labs||[]).forEach(l=>{if(l.k&&typeof l.v==='number'&&isFinite(l.v))d.labs.push({visit:id,cat:v.cat,date:v.date,k:l.k,v:l.v,cap:!!l.cap,lo:l.lo==null?null:l.lo,hi:l.hi==null?null:l.hi,unit:l.unit||''})});
        (p.files||[]).forEach(f=>{const fid=newId('f');this.files.set(fid,{mime:f.mime,base64:f.base64});d.files.push({id:fid,visit:id,cat:v.cat,kind:f.kind||'other',name:f.name||'',mime:f.mime||'image/jpeg',date:v.date})});
        if(p.next!==undefined){const c=d.cats.find(x=>x.id===v.cat);if(c){const n=p.next;c.nextDate=n?n.date:'';c.nextTime=n?(n.time||''):'';c.nextClinic=n?(n.clinic||''):'';c.nextItems=n&&n.items?n.items:[]}}
        this.save(d);const r=ret();r.visitId=id;return r}
      case 'deleteVisit':d.visits=d.visits.filter(x=>x.id!==p.id);d.labs=d.labs.filter(x=>x.visit!==p.id);d.files=d.files.filter(x=>x.visit!==p.id);this.save(d);return ret();
      case 'saveMed':{const m=Object.assign({id:p.med.id||newId('m'),done:[]},p.med);const i=d.meds.findIndex(x=>x.id===m.id);if(i>=0)d.meds[i]=m;else d.meds.push(m);this.save(d);return ret()}
      case 'deleteMed':d.meds=d.meds.filter(x=>x.id!==p.id);this.save(d);return ret();
      case 'getFile':{const f=this.files.get(p.id);if(!f)throw new Error('示範模式重新整理後就看不到照片了');const row=d.files.find(x=>x.id===p.id)||{};return{mime:f.mime,name:row.name||'',base64:f.base64}}
      case 'extract':throw new Error('示範模式不能用 AI 讀取。請先到「設定」連接你的 Google 試算表。');
      case 'ping':return{pong:true};
    }
    throw new Error('不認得的動作');
  }
};
async function api(action,payload){
  if(!cfg.url)return Local.call(action,payload||{});
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),action==='extract'?150000:70000);
  try{
    const res=await fetch(cfg.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({token:cfg.token,action},payload||{})),signal:ctrl.signal,redirect:'follow'});
    let j;try{j=await res.json()}catch(e){throw new Error('後端回傳的不是資料，請確認網址是 /exec 結尾，而且部署時「誰可以存取」選了「所有人」')}
    if(!j.ok)throw new Error(j.error||'後端回傳失敗');
    return j.data;
  }catch(e){
    if(e.name==='AbortError')throw new Error('連線逾時，請再試一次');
    if(e instanceof TypeError)throw new Error('連不上後端，請檢查網路，或到「設定」確認網址');
    throw e;
  }finally{clearTimeout(t)}
}
/* 示範資料：虛構的貓「小虎」，只是讓你看畫面。真實資料在你自己的試算表裡。 */
function demoDb(){
  const t=todayStr(),d=[addDays(t,-76),addDays(t,-45),addDays(t,-14)];
  const L=(k,v,cap)=>({k,v,cap:!!cap,lo:MET[k].lo,hi:MET[k].hi,unit:MET[k].unit});
  const vals=[
    {CREA:2.7,BUN:46,PHOS:6.4,SDMA:19,TT4:2.9,HCT:29.5,HGB:9.6,RBC:6.4,WBC:12.4},
    {CREA:2.5,BUN:41,PHOS:5.9,SDMA:17,TT4:3.1,HCT:31.0,HGB:10.2,RBC:6.9,WBC:11.8},
    {CREA:2.2,BUN:35,PHOS:5.5,SDMA:15,TT4:2.8,HCT:33.4,HGB:11.0,RBC:7.6,WBC:10.9}
  ];
  const db={cats:[{id:'demo',name:'小虎',info:'示範貓・虎斑・已結紮',photo:'',nextDate:addDays(t,16),nextTime:'10:30',nextClinic:'示範動物醫院',nextItems:['kidney','thy']}],visits:[],labs:[],files:[],meds:[]};
  vals.forEach((o,i)=>{
    const id='demo-'+i;
    db.visits.push({id,cat:'demo',date:d[i],type:'lab',clinic:'示範動物醫院',vet:'',weight:[3.9,3.85,3.9][i],notes:i===2?'示範資料：這隻貓是虛構的。':''});
    Object.keys(o).forEach(k=>db.labs.push(Object.assign({visit:id,cat:'demo',date:d[i]},L(k,o[k]))));
  });
  return db;
}
/* 後端回傳的資料整理成一致的形狀 */
function normDb(raw){
  const d=raw||{};
  const db={cats:d.cats||[],visits:d.visits||[],labs:d.labs||[],files:d.files||[],meds:d.meds||[]};
  db.visits.forEach(v=>{if(TYPE_NAME[v.type]==null){const m=TYPES.find(t=>t[1]===v.type);v.type=m?m[0]:(v.type||'lab')}});
  db.cats.forEach(c=>{if(!Array.isArray(c.nextItems))c.nextItems=[]});
  return db;
}
const S={db:normDb(null),cat:null,range:6,base:'prev',demo:null,loading:false,err:'',toast:'',editNext:false,showMed:false,careMsg:null};
/* ===== 分析 ===== */
const LABEL={up:'進步',same:'持平',down:'需留意',new:'新項目'};
function cutDate(months){const m=months===undefined?S.range:months;return m?addMonths(todayStr(),-m):'0000-00-00'}
const dpOf=rs=>{let d=0;rs.forEach(r=>{const s=String(r.v),i=s.indexOf('.');if(i>=0)d=Math.max(d,Math.min(2,s.length-i-1))});return d};
const orderRank=m=>{const i=FOCUS_ORDER.indexOf(m.k);return i>=0?i:m.g==='f'?10:m.g==='o'?20:m.g==='c'?(30+CBC_KEYS.indexOf(m.k)):40};
function metricsFor(cid,months){
  const by={};
  S.db.labs.forEach(l=>{if(l.cat===cid&&l.v!=null)(by[l.k]=by[l.k]||{})[l.date]=l});
  const cut=cutDate(months);
  return Object.keys(by).map(k=>{
    const all=Object.values(by[k]).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
    let r=all.filter(x=>x.date>=cut);if(r.length<2)r=all.slice(-2);
    const last=all[all.length-1],meta=MET[k]||{zh:k,unit:'',g:'o'};
    return{k,zh:meta.zh,unit:last.unit||meta.unit||'',g:meta.g||'o',lo:last.lo,hi:last.hi,all,r,dp:dpOf(all)};
  }).sort((a,b)=>orderRank(a)-orderRank(b));
}
const hasRange=m=>m.lo!=null&&m.hi!=null;
const dist=(m,v)=>!hasRange(m)?0:v<m.lo?m.lo-v:v>m.hi?v-m.hi:0;
const zoneOf=(m,v)=>!hasRange(m)?'in':v<m.lo?'low':v>m.hi?'high':'in';
const baseIdx=m=>S.base==='prev'?m.r.length-2:0;
/* 和基準那一次比，只看有沒有更靠近或更遠離參考範圍，不看數字變大或變小。
   範圍寬度 5%～10% 以內的變動視為誤差；儀器上限（>20.0）無法判斷方向，一律算持平。 */
function judge(m,bi){
  const now=m.r[m.r.length-1],prev=m.r[bi];
  const zone=zoneOf(m,now.v);
  if(!prev||prev===now)return{state:'new',zone,tags:[]};
  if(!hasRange(m))return{state:'same',zone,tags:[]};
  const span=m.hi-m.lo,dp=dist(m,prev.v),dn=dist(m,now.v),tags=[];
  let state='same';
  const cens=prev.cap||now.cap;
  if(dp===0&&dn===0){
    if(m.g==='f'&&prev.v!==0&&Math.abs(now.v-prev.v)/Math.abs(prev.v)>=0.4)tags.push('big');
    if(m.hi-now.v<=0.05*span)tags.push('nearHi');
    if(now.v-m.lo<=0.05*span)tags.push('nearLo');
  }else if(cens&&dp>0&&dn>0){state='same'}
  else if(dp===0||dn===0){const d=dp-dn;if(Math.abs(d)>=0.10*span)state=d>0?'up':'down'}
  else{const d=dp-dn;if(Math.abs(d)>=0.05*span&&Math.abs(d)>=0.10*dp)state=d>0?'up':'down'}
  return{state,zone,tags};
}
const val=(m,r)=>(r.cap?'>':'')+Number(r.v).toFixed(m.dp);
function visitDates(cid){return [...new Set(S.db.labs.filter(l=>l.cat===cid).map(l=>l.date))].sort()}
function baseDates(cid){
  const ds=visitDates(cid),cut=cutDate();
  const last=ds[ds.length-1],prev=ds.length>1?ds[ds.length-2]:null;
  const inR=ds.filter(d=>d>=cut);
  const start=inR.length>1?inR[0]:prev;
  return{last,prev,start};
}
function summarize(c){
  const ms=metricsFor(c.id);
  const all=ms.map(m=>({m,st:judge(m,Math.max(0,baseIdx(m)))}));
  const cmp=all.filter(x=>x.st.state!=='new');
  const up=cmp.filter(x=>x.st.state==='up'),down=cmp.filter(x=>x.st.state==='down'),same=cmp.filter(x=>x.st.state==='same');
  const out=all.filter(x=>x.st.zone!=='in'),bigs=all.filter(x=>x.st.tags.includes('big'));
  const v=!cmp.length?'flat':up.length&&!down.length?'up':down.length&&!up.length?'down':up.length&&down.length?'mixed':'flat';
  const names=l=>l.map(x=>x.m.zh.replace(/（.*?）/,'')).join('、');
  const bd=baseDates(c.id),bl=S.base==='prev'?(bd.prev?fmtMD(bd.prev):''):(bd.start?fmtMD(bd.start):'');
  const sub=[];
  let text;
  if(!cmp.length)text=`${c.name}目前只有一次檢驗，再多一次就能比較了`;
  else if(v==='up')text=`${c.name}有 ${up.length} 項往好的方向走，沒有項目變差`;
  else if(v==='down')text=`${c.name}有 ${down.length} 項需要留意：${names(down)}`;
  else if(v==='mixed')text=`${c.name}有 ${up.length} 項進步、${down.length} 項需要留意：${names(down)}`;
  else text=`${c.name}和 ${bl} 差不多`;
  if(up.length&&v==='mixed')sub.push(`進步的是：${names(up)}。`);
  if(out.length)sub.push(`目前還在參考範圍外：${names(out)}。`);
  bigs.forEach(x=>{const b=x.m.r[Math.max(0,baseIdx(x.m))],n=x.m.r[x.m.r.length-1];sub.push(`${x.m.zh.replace(/（.*?）/,'')}雖然在範圍內，但從 ${val(x.m,b)} 變成 ${val(x.m,n)}，變化很大，可以問獸醫。`)});
  return{all,up,down,same,out,v,text,sub:sub.join(' '),hasData:ms.length>0};
}
function tearP(x,c,y0){y0=y0==null?-30:y0;return `<path d="M${x} ${y0+1} v9" stroke="var(--water)" stroke-width="1.8" stroke-linecap="round" opacity=".55"/><path class="tear ${c}" d="M${x} ${y0} q-4 6 0 8.6 q4 -2.6 0 -8.6z" fill="var(--water)" stroke="var(--surface)" stroke-width=".6"/>`}
function heartP(x,y,c){return `<g transform="translate(${x} ${y})"><path class="heart ${c}" d="M0 0 C-3 -3.2 -7 0 -3.5 4 L0 7.5 L3.5 4 C7 0 3 -3.2 0 0Z" fill="var(--bad)"/></g>`}
/* 虎斑貓的臉。座標以 (17,-33) 為中心設計，再平移到 (cx,cy)；有照片就把照片貼在臉上。 */
const PHOTO_HEAD=false;
function face(mood,photo,uid,cx,cy){
  if(!PHOTO_HEAD)photo=null;
  const fur='var(--fur)',st='var(--stripe)',ln='var(--fur-line)',cr='var(--cream)';
  const ears=`<path d="M3.5 -37 L5.5 -55 L20 -45.5Z" fill="${fur}" stroke="${ln}" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.8 -43 L7.4 -50.5 L13.5 -46Z" fill="var(--nose)" opacity=".75"/>
    <path d="M30.5 -37 L28.5 -55 L14 -45.5Z" fill="${fur}" stroke="${ln}" stroke-width="1.2" stroke-linejoin="round"/><path d="M27.2 -43 L26.6 -50.5 L20.5 -46Z" fill="var(--nose)" opacity=".75"/>`;
  let head;
  if(photo){
    head=ears+`<clipPath id="hc${uid}"><circle cx="17" cy="-34" r="15"/></clipPath>
      <circle cx="17" cy="-34" r="16.8" fill="var(--fur-d)"/>
      <image href="${photo}" x="2" y="-49" width="30" height="30" preserveAspectRatio="xMidYMid slice" clip-path="url(#hc${uid})"/>`;
  }else{
    const eyes=mood==='happy'?`<path d="M8.5 -33 Q11.5 -37.5 14.5 -33 M19.5 -33 Q22.5 -37.5 25.5 -33" fill="none" stroke="${ln}" stroke-width="2" stroke-linecap="round"/>`
      :mood==='sad'?`<path d="M8.5 -37 L14 -34 L8.5 -31 M25.5 -37 L20 -34 L25.5 -31" fill="none" stroke="${ln}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      :mood==='worried'?`<ellipse cx="11.5" cy="-33" rx="2.7" ry="3.3" fill="${ln}"/><ellipse cx="22.5" cy="-33" rx="2.7" ry="3.3" fill="${ln}"/><circle cx="12.4" cy="-34.4" r="1.1" fill="#fff"/><circle cx="23.4" cy="-34.4" r="1.1" fill="#fff"/><path d="M7.5 -38 L14 -40.6 M26.5 -38 L20 -40.6" fill="none" stroke="${ln}" stroke-width="1.7" stroke-linecap="round"/>`
      :`<ellipse cx="11.5" cy="-33" rx="2.7" ry="3.3" fill="${ln}"/><ellipse cx="22.5" cy="-33" rx="2.7" ry="3.3" fill="${ln}"/><circle cx="12.4" cy="-34.2" r="1" fill="#fff"/><circle cx="23.4" cy="-34.2" r="1" fill="#fff"/>`;
    const mouth=mood==='happy'?`<path d="M13.3 -26 Q17 -20.5 20.7 -26Z" fill="#B8453F" stroke="${ln}" stroke-width="1.1" stroke-linejoin="round"/>`
      :mood==='sad'?`<ellipse cx="17" cy="-23.2" rx="3.1" ry="3.5" fill="#8C3B3B" stroke="${ln}" stroke-width="1"/>`
      :mood==='worried'?`<path d="M13 -23.8 Q15 -26 17 -23.8 Q19 -21.6 21 -23.8" fill="none" stroke="${ln}" stroke-width="1.4" stroke-linecap="round"/>`
      :`<path d="M13.8 -25.8 Q15.4 -23.6 17 -25.8 Q18.6 -23.6 20.2 -25.8" fill="none" stroke="${ln}" stroke-width="1.4" stroke-linecap="round"/>`;
    head=ears+`<ellipse cx="17" cy="-32" rx="16" ry="14.5" fill="${fur}" stroke="${ln}" stroke-width="1.2"/>
      <path d="M17 -46 v5 M12.3 -45.4 l.9 4.4 M21.7 -45.4 l-.9 4.4 M2.2 -32 h5 M3.2 -27.6 l4.4 1.2 M31.8 -32 h-5 M30.8 -27.6 l-4.4 1.2" fill="none" stroke="${st}" stroke-width="1.7" stroke-linecap="round"/>
      <ellipse cx="17" cy="-25.8" rx="6.8" ry="4.8" fill="${cr}"/>
      <circle cx="7.6" cy="-27" r="2.7" fill="var(--blush)" opacity=".6"/><circle cx="26.4" cy="-27" r="2.7" fill="var(--blush)" opacity=".6"/>
      ${eyes}<path d="M15.4 -29.2 L18.6 -29.2 L17 -27.2Z" fill="var(--nose)" stroke="${ln}" stroke-width=".6" stroke-linejoin="round"/>${mouth}`;
  }
  const sweat=mood==='worried'&&!photo?'<path d="M-2.5 -42 q-3.2 4.8 0 6.8 q3.2 -2 0 -6.8z" fill="var(--water)" stroke="var(--surface)" stroke-width=".6"/>':'';
  const tears=mood==='sad'?tearP(8.5,'a',-30)+tearP(25.5,'b',-30):'';
  return `<g transform="translate(${cx-17} ${cy+33})">${head}${tears}${sweat}</g>`;
}
const stripeTail=(d,w)=>`<path d="${d}" fill="none" stroke="var(--fur)" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="var(--stripe)" stroke-width="${w+.4}" stroke-dasharray="2.2 4.6" stroke-linecap="butt" opacity=".9"/>`;
/* pose：walk 走路（側面）、cheer 雙手向上歡呼（正面）、kneel 跪在地上哭（正面） */
function sprite(mood,photo,uid,pose){
  uid=uid||'';pose=pose||'walk';
  const fur='var(--fur)',fd='var(--fur-d)',st='var(--stripe)',ln='var(--fur-line)',cr='var(--cream)';
  const paw=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${cr}" stroke="${ln}" stroke-width=".9"/>`;
  if(pose==='cheer'){
    return `<g class="hop">
      ${stripeTail('M9 -10 C28 -8 32 -30 22 -36',5.5)}
      <line x1="-6" y1="-9" x2="-6" y2="-1" stroke="${fd}" stroke-width="5" stroke-linecap="round"/><line x1="6" y1="-9" x2="6" y2="-1" stroke="${fd}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="-6.5" cy="-.8" rx="4.2" ry="2.4" fill="${cr}" stroke="${ln}" stroke-width=".9"/><ellipse cx="6.5" cy="-.8" rx="4.2" ry="2.4" fill="${cr}" stroke="${ln}" stroke-width=".9"/>
      <path d="M-9 -28 L-21 -52 M9 -28 L21 -52" fill="none" stroke="${fur}" stroke-width="5.5" stroke-linecap="round"/>
      <ellipse cx="0" cy="-20" rx="12.5" ry="14" fill="${fur}" stroke="${ln}" stroke-width="1.2"/>
      <ellipse cx="0" cy="-18" rx="7" ry="9.5" fill="${cr}"/>
      <path d="M-12 -24 h4 M-12 -19 h3.5 M12 -24 h-4 M12 -19 h-3.5" stroke="${st}" stroke-width="1.8" stroke-linecap="round"/>
      ${paw(-21,-53,4)}${paw(21,-53,4)}
      ${face('happy',photo,uid,0,-42)}
      ${heartP(-31,-60,'a')}${heartP(31,-64,'b')}
    </g>`;
  }
  if(pose==='kneel'){
    return `<g class="sob">
      <ellipse cx="0" cy=".6" rx="21" ry="2.6" fill="var(--water)" opacity=".3"/>
      ${stripeTail('M12 -7 C28 -5 30 -15 22 -19',5)}
      <ellipse cx="0" cy="-14" rx="12.5" ry="13" fill="${fur}" stroke="${ln}" stroke-width="1.2"/>
      <ellipse cx="0" cy="-12" rx="6.8" ry="8.5" fill="${cr}"/>
      <path d="M-12.4 -18 h4 M-12.4 -13 h3.5 M12.4 -18 h-4 M12.4 -13 h-3.5" stroke="${st}" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse cx="-9.5" cy="-4" rx="9" ry="4.6" fill="${fur}" stroke="${ln}" stroke-width="1.1"/><ellipse cx="9.5" cy="-4" rx="9" ry="4.6" fill="${fur}" stroke="${ln}" stroke-width="1.1"/>
      <path d="M-14 -6.5 h3 M-8 -7.2 h3 M14 -6.5 h-3 M8 -7.2 h-3" stroke="${st}" stroke-width="1.5" stroke-linecap="round"/>
      <ellipse cx="-17" cy="-1.4" rx="4" ry="2.2" fill="${cr}" stroke="${ln}" stroke-width=".9"/><ellipse cx="17" cy="-1.4" rx="4" ry="2.2" fill="${cr}" stroke="${ln}" stroke-width=".9"/>
      ${face('sad',photo,uid,0,-31)}
      <path d="M-9 -17 Q-19 -17 -13.5 -25.5 M9 -17 Q19 -17 13.5 -25.5" fill="none" stroke="${fur}" stroke-width="5" stroke-linecap="round"/>
      ${paw(-13.5,-26.5,3.5)}${paw(13.5,-26.5,3.5)}
      <path class="tear a" d="M-19 -22 q-2.4 3.6 0 5.2 q2.4 -1.6 0 -5.2z" fill="var(--water)"/><path class="tear b" d="M19 -24 q-2.4 3.6 0 5.2 q2.4 -1.6 0 -5.2z" fill="var(--water)"/>
    </g>`;
  }
  const tail=mood==='sad'?'M-19 -16 C-32 -14 -38 -4 -34 3':'M-19 -18 C-36 -20 -34 -42 -22 -44';
  const extra=mood==='happy'?heartP(30,-52,'a')+heartP(6,-58,'b'):'';
  return `${stripeTail(tail,6)}
    <line class="leg" x1="-11" y1="-8" x2="-11" y2="0" stroke="${fd}" stroke-width="4.5" stroke-linecap="round"/>
    <line class="leg" x1="-5" y1="-8" x2="-5" y2="0" stroke="${fd}" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="0" cy="-17" rx="21" ry="12.5" fill="${fur}" stroke="${ln}" stroke-width="1.2"/>
    <ellipse cx="3" cy="-9.5" rx="14" ry="4" fill="${cr}"/>
    <path d="M-12 -28 q2 5 0 9 M-4 -29 q2 5 0 9 M4 -29 q2 5 0 9 M12 -27.5 q2 5 0 8.5" fill="none" stroke="${st}" stroke-width="2.2" stroke-linecap="round"/>
    <line class="leg" x1="8" y1="-8" x2="8" y2="0" stroke="${fur}" stroke-width="4.5" stroke-linecap="round"/>
    <line class="leg" x1="14" y1="-8" x2="14" y2="0" stroke="${fur}" stroke-width="4.5" stroke-linecap="round"/>
    ${face(mood,photo,uid,17,-33)}${extra}`;
}
const PATHS={
  up:'M24 140 C84 140 108 118 160 104 S250 96 318 92',
  down:'M24 84 C84 84 108 100 160 112 S250 132 318 140',
  flat:'M24 108 C90 100 130 114 180 108 S270 102 320 108',
  mixed:'M24 108 C70 80 110 126 170 102 S270 90 318 112'
};
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
let raf=0;
/* ===== 折線圖（最多畫最近 12 次） ===== */
function chart(m,bi,st,big){
  const rs=m.r.slice(-12),off=m.r.length-rs.length,b=Math.max(0,bi-off);
  const n=rs.length,W=320,H=big?112:44,top=big?30:6,bot=big?H-24:H-6;
  const x0=big?30:36,x1=big?W-64:W-36;
  const xs=rs.map((_,i)=>n===1?x0:x0+(x1-x0)*i/(n-1));
  const vals=rs.map(r=>r.v).concat(hasRange(m)?[m.lo,m.hi]:[]);
  const mn=Math.min(...vals),mx=Math.max(...vals),pd=(mx-mn)*0.12||1;
  let dmin=mn-pd;const dmax=mx+pd;if(mn>=0&&dmin<0)dmin=0;
  const y=v=>bot-(v-dmin)/(dmax-dmin)*(bot-top);
  const pts=rs.map((r,i)=>[xs[i],y(r.v)]);
  const c=st.state==='up'?'var(--good)':st.state==='down'?'var(--bad)':'var(--flat)';
  const nowc=st.zone==='in'?'var(--ink)':'var(--warn)';
  const P=a=>a.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const hi=pts.slice(b);
  const rad=n>7?(big?3:2.4):(big?4:3.4);
  let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.zh)}：${rs.map(r=>fmtMD(r.date)+' '+val(m,r)).join('，')} ${esc(m.unit)}">`;
  if(hasRange(m)){const yh=y(m.hi),bh=Math.max(y(m.lo)-yh,3);s+=`<rect x="8" y="${yh.toFixed(1)}" width="${W-16}" height="${bh.toFixed(1)}" rx="3" fill="var(--refband)"/>`}
  if(n>1)s+=`<polyline points="${P(pts)}" fill="none" stroke="var(--flat)" stroke-width="1.5" stroke-opacity=".55" stroke-linejoin="round"/>`;
  if(n>1&&hi.length>1)s+=`<polyline points="${P(hi)}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const step=Math.ceil(n/5);
  pts.forEach((p,i)=>{
    const last=i===n-1;
    s+=last?`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${rad+1}" fill="${nowc}"/>`
      :`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${rad}" fill="var(--surface)" stroke="${i===b?c:'var(--flat)'}" stroke-width="2"/>`;
    if(big){
      const showV=n<=5||last||i===0||i===b;
      if(showV){let ly=p[1]-10;if(ly<12)ly=p[1]+18;s+=`<text class="lv${last?' now':''}" x="${p[0].toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${val(m,rs[i])}</text>`}
      if(i%step===0||last)s+=`<text class="ax" x="${p[0].toFixed(1)}" y="${H-5}" text-anchor="middle">${last?'最近 ':''}${fmtMD(rs[i].date)}</text>`;
    }
  });
  if(big){
    const sv=S.demo==='up'?'up':S.demo==='down'?'down':st.state;
    const mood=sv==='up'?'happy':sv==='down'?'sad':(S.demo==='worry'||(sv==='same'&&st.zone!=='in'))?'worried':'flat';
    const d='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L')+' L'+(xs[n-1]+34)+' '+pts[n-1][1].toFixed(1);
    s+=`<path class="wpath" d="${d}" fill="none" stroke="none"/><g class="walker" data-mood="${mood}" data-uid="${esc(m.k)}">${sprite(mood,null,m.k)}</g>`;
  }
  return s+'</svg>';
}
/* ===== 動畫 ===== */
function place(path,g,len,ts,sc,up){
  sc=sc||1;
  const L=path.getTotalLength(),a=path.getPointAtLength(len),b=path.getPointAtLength(Math.min(len+2,L));
  const ang=up?0:Math.max(-18,Math.min(18,Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI*0.6));
  const bob=reduce||up?0:-Math.abs(Math.sin(ts/90))*1.8*sc;
  g.setAttribute('transform',`translate(${a.x.toFixed(1)} ${(a.y-4*sc+bob).toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${sc})`);
  const legs=g.querySelectorAll('.leg'),sw=reduce||up?0:Math.sin(ts/90)*5;
  legs.forEach((l,i)=>l.setAttribute('x2',(+l.getAttribute('x1')+(i%2?-sw:sw)).toFixed(1)));
}
/* 走完之後：進步 → 雙手向上歡呼；退步 → 跪在地上哭；持平 → 站著不動 */
function finish(it){
  if(it.done)return;
  it.done=true;
  if(it.fin){it.g.innerHTML=sprite(it.mood,null,it.uid,it.fin);place(it.p,it.g,it.L,0,it.sc,true)}
  else place(it.p,it.g,it.L,0,it.sc);
}
function play(){
  cancelAnimationFrame(raf);
  const items=[];
  const hp=$('#trail'),hg=$('#sprite');
  if(hp&&hg)items.push({p:hp,g:hg,sc:1.2,dur:3800,uid:''});
  $$('.wpath').forEach(p=>{const g=p.parentNode.querySelector('.walker');if(g)items.push({p,g,sc:0.5,dur:3200,uid:g.dataset.uid||''})});
  if(!items.length)return;
  items.forEach(it=>{
    it.L=it.p.getTotalLength();it.mood=it.g.dataset.mood||'flat';
    it.fin=it.mood==='happy'?'cheer':it.mood==='sad'?'kneel':null;it.done=false;
    it.g.innerHTML=sprite(it.mood,null,it.uid,'walk');
  });
  if(reduce){items.forEach(finish);return}
  let t0=0;
  const frame=ts=>{
    if(!t0)t0=ts;let run=false;
    items.forEach(it=>{
      const p=Math.min((ts-t0)/it.dur,1),e=1-Math.pow(1-p,3);
      if(p<1){place(it.p,it.g,e*it.L,ts,it.sc);run=true}else finish(it);
    });
    if(run)raf=requestAnimationFrame(frame);
  };
  items.forEach(it=>place(it.p,it.g,0,0,it.sc));
  raf=requestAnimationFrame(frame);
}
/* ===== 畫面：首頁 ===== */
const curCat=()=>S.db.cats.find(c=>c.id===S.cat)||S.db.cats[0]||null;
const filesOf=vid=>S.db.files.filter(f=>f.visit===vid);
const visitsOf=cid=>S.db.visits.filter(v=>v.cat===cid).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
const clinicList=()=>[...new Set(S.db.visits.map(v=>v.clinic).filter(Boolean))];
const OPEN=new Set(lsGet('cat-open',[]));
const isOpen=k=>OPEN.has(k)?' open':'';
const rangeLabel=r=>r===3?'3 個月':r===6?'6 個月':r===12?'1 年':'全部';
function tagsHtml(m,st,bi){
  const t=[],b=m.r[Math.max(0,bi)];
  if(st.zone==='high')t.push(['warn','偏高']);
  if(st.zone==='low')t.push(['warn','偏低']);
  if(st.tags.includes('big')&&b)t.push(['info','和 '+fmtMD(b.date)+' 差很多']);
  if(st.tags.includes('nearHi'))t.push(['info','貼近上限']);
  if(st.tags.includes('nearLo'))t.push(['info','貼近下限']);
  if(m.r[m.r.length-1].cap)t.push(['info','儀器上限，實際可能更高']);
  return t.length?`<div class="tags">${t.map(x=>`<span class="tag ${x[0]}">${x[1]}</span>`).join('')}</div>`:'';
}
const refTxt=m=>hasRange(m)?`參考範圍 ${Number(m.lo).toFixed(m.dp)}–${Number(m.hi).toFixed(m.dp)} ${esc(m.unit)}`:`單位 ${esc(m.unit)}（報告沒有參考範圍）`;
function bigCard(m){
  const bi=Math.max(0,baseIdx(m)),st=judge(m,bi),now=m.r[m.r.length-1];
  if(st.state==='new')return `<article class="metric"><div class="m-head"><div><h4>${esc(m.zh)}<span class="abbr">${esc(m.k)}</span></h4><p class="ref">${refTxt(m)}</p></div></div>
    <div class="vals"><span>${fmtMD(now.date)} <b>${val(m,now)}</b></span><span>${esc(m.unit)}</span></div>${tagsHtml(m,st,bi)}<p class="note">只有一次紀錄，下次檢驗後就能畫出走勢。</p></article>`;
  return `<article class="metric" aria-label="${esc(m.zh)} ${LABEL[st.state]}">
    <div class="m-head"><div><h4>${esc(m.zh)}<span class="abbr">${esc(m.k)}</span></h4><p class="ref">${refTxt(m)}</p></div><span class="chip ${st.state}">${LABEL[st.state]}</span></div>
    ${chart(m,bi,st,true)}${tagsHtml(m,st,bi)}</article>`;
}
function smallRow(m){
  const bi=Math.max(0,baseIdx(m)),st=judge(m,bi),rs=m.r.slice(-3);
  return `<div class="row">
    <div class="name">${esc(m.zh)}<span class="abbr" style="margin:0">${esc(m.k)}</span>${st.state==='new'?'':`<span class="chip ${st.state}">${LABEL[st.state]}</span>`}</div>
    <div class="vals">${rs.map((r,i)=>i===rs.length-1?`<b>${val(m,r)}</b>`:`<span>${val(m,r)}</span>`).join('<span>→</span>')}</div>
    ${m.r.length>1?chart(m,bi,st,false):''}
    <p class="ref">${refTxt(m)}</p>${tagsHtml(m,st,bi)}</div>`;
}
function quietCard(zh,abbr,items,unit,note){
  return `<article class="metric"><div class="m-head"><h4>${zh}<span class="abbr">${abbr}</span></h4></div>
    <div class="vals">${items.map((x,i)=>`<span>${x[0]} ${i===items.length-1?`<b>${x[1]}</b>`:x[1]}</span>`).join('')}<span>${unit}</span></div>${note||''}</article>`;
}
function ratioItems(c){
  const by={};S.db.labs.forEach(l=>{if(l.cat===c.id&&(l.k==='BUN'||l.k==='CREA')&&l.v!=null)(by[l.date]=by[l.date]||{})[l.k]=l.v});
  const cut=cutDate();let ds=Object.keys(by).filter(d=>by[d].BUN!=null&&by[d].CREA).sort();
  const inR=ds.filter(d=>d>=cut);ds=(inR.length>=2?inR:ds).slice(-5);
  return ds.map(d=>[fmtMD(d),(by[d].BUN/by[d].CREA).toFixed(0)]);
}
function weightItems(c){
  const cut=cutDate();let vs=visitsOf(c.id).filter(v=>v.weight!=null).reverse();
  const inR=vs.filter(v=>v.date>=cut);vs=(inR.length>=2?inR:vs).slice(-5);
  return vs.map(v=>[fmtMD(v.date),Number(v.weight).toFixed(2)]);
}
function suggestItems(c){
  const s=new Set();
  metricsFor(c.id).forEach(m=>{const z=zoneOf(m,m.r[m.r.length-1].v);if(z==='in')return;
    if(['CREA','BUN','PHOS','SDMA'].includes(m.k))s.add('kidney');else if(m.k==='TT4')s.add('thy');else if(m.g==='c')s.add('cbc')});
  return s;
}
function avatar(c,cls){return `<span class="av${cls?' '+cls:''}">${c.photo?`<img src="${esc(c.photo)}" alt="">`:esc((c.name||'?').slice(0,1))}</span>`}
function tabsHtml(){
  return `<div class="tabs" role="tablist">${S.db.cats.map(c=>`<button class="tab" role="tab" aria-selected="${c.id===S.cat}" data-act="tab" data-id="${esc(c.id)}">${avatar(c)}<span><span class="nm2">${esc(c.name)}</span><span class="sm">${esc(c.info||'')}</span></span></button>`).join('')}
    <button class="tab add" data-act="addcat">＋ 新增貓咪</button></div>`;
}
function rangesHtml(){
  return `<div class="ranges" role="group" aria-label="資料範圍"><span class="lbl">資料範圍</span>${[3,6,12,0].map(r=>`<button type="button" class="q" data-act="range" data-v="${r}" aria-pressed="${S.range===r}">${rangeLabel(r)}</button>`).join('')}</div>`;
}
function countsFor(c,b){const o=S.base;S.base=b;const r=summarize(c);S.base=o;return r}
function heroHtml(c,s){
  const bd=baseDates(c.id);
  const worry=S.demo==='worry'||(!S.demo&&(s.v==='flat'||s.v==='mixed')&&s.same.length>0&&s.out.length>0);
  const vv=S.demo==='up'?'up':S.demo==='down'?'down':S.demo==='worry'?'flat':s.v;
  const mood=vv==='up'?'happy':vv==='down'?'sad':worry?'worried':'flat';
  const col=vv==='up'?'var(--good)':vv==='down'?'var(--bad)':'var(--flat)';
  const segs=[];
  if(bd.prev)segs.push(['prev','和上次比',bd.prev]);
  if(bd.start&&bd.start!==bd.prev)segs.push(['start','和 '+fmtMD(bd.start)+' 比',bd.start]);
  if(S.base==='start'&&!segs.find(x=>x[0]==='start'))S.base='prev';
  const segHtml=segs.length>1?`<div class="seg" role="group" aria-label="和哪一次比較">${segs.map(x=>{const r=countsFor(c,x[0]);return `<button type="button" data-act="base" data-v="${x[0]}" aria-pressed="${S.base===x[0]}"><span class="k">${x[1]}</span><span class="d">${fmtMD(x[2])} → ${fmtMD(bd.last)}</span><span class="c">進步 ${r.up.length}・需留意 ${r.down.length}</span></button>`}).join('')}</div>`:'';
  let nv='';
  if(c.nextDate){const dd=diffDays(c.nextDate,todayStr());nv=`<span class="chip same">${dd>0?'下次回診 '+dd+' 天後':dd===0?'今天回診':'回診日已過'}</span>`}
  return `<section class="hero" aria-label="${esc(c.name)} 整體走勢">
    <div class="id">
      <label class="av" for="photo" style="cursor:pointer" aria-label="換${esc(c.name)}的照片">${c.photo?`<img src="${esc(c.photo)}" alt="${esc(c.name)}的照片">`:esc((c.name||'?').slice(0,1))}</label>
      <div><h2>${esc(c.name)}</h2><p class="meta">${esc(c.info||'')}</p></div>
      <div class="btns" style="margin-left:auto"><label class="photo-btn" style="margin-left:0">${c.photo?'換照片':'放上照片'}<input type="file" accept="image/*" id="photo"></label><button class="btn sm" data-act="editcat">編輯</button></div>
    </div>
    ${segHtml}
    <button class="scene" id="scene" type="button" aria-label="重播走勢動畫">
      <svg viewBox="0 0 360 170" role="img" aria-label="${esc(s.text)}">
        <path d="${PATHS[vv]}" fill="none" stroke="var(--track)" stroke-width="14" stroke-linecap="round"/>
        <path id="trail" d="${PATHS[vv]}" fill="none" stroke="${col}" stroke-width="2.4" stroke-dasharray="1 8" stroke-linecap="round"/>
        <text class="ax" x="24" y="164">${bd.prev?fmtMD(S.base==='prev'?bd.prev:(bd.start||bd.prev)):''}</text><text class="ax" x="336" y="164" text-anchor="end">${bd.last?fmtMD(bd.last):''}</text>
        <g id="sprite" data-mood="${mood}">${sprite(mood,null,'')}</g>
      </svg>
    </button>
    <p class="cap">山坡的方向是整體走勢（進步與變差的項目數），不是單一數值。點圖可重播。</p>
    <div class="qrow" role="group" aria-label="預覽貓咪動作"><span class="cap" style="align-self:center">預覽動作：</span>
      ${[[null,'目前結果'],['up','進步'],['down','退步'],['worry','擔心']].map(x=>`<button type="button" class="q" data-act="demo" data-v="${x[0]||''}" aria-pressed="${S.demo===x[0]}">${x[1]}</button>`).join('')}</div>
    ${S.demo?'<p class="cap">這是預覽，不是目前真正的結果。</p>':''}
    <h3 class="verdict">${esc(s.text)}</h3>
    ${s.sub?`<p class="sub">${esc(s.sub)}</p>`:''}
    <div class="counts"><span class="chip up">進步 ${s.up.length}</span><span class="chip same">持平 ${s.same.length}</span><span class="chip down">需留意 ${s.down.length}</span>${nv}</div>
  </section>`;
}
function visitCard(v){
  const fs=filesOf(v.id),ln=S.db.labs.filter(l=>l.visit===v.id).length;
  const meta=[ln?`檢驗 ${ln} 項`:'',v.weight!=null?`體重 ${Number(v.weight).toFixed(2)} kg`:'',v.vet?`獸醫 ${esc(v.vet)}`:''].filter(Boolean).join('・');
  const k='v:'+v.id;
  return `<details class="visit" data-key="${esc(k)}"${isOpen(k)}>
    <summary><span class="vd">${fmtYMD(v.date)}</span><span class="vt">${esc(TYPE_NAME[v.type]||v.type)}</span><span class="vc">${esc(v.clinic||'')}</span></summary>
    <div class="vbody">
      ${meta?`<p class="sub">${meta}</p>`:''}
      ${v.notes?`<p class="notes">${esc(v.notes)}</p>`:''}
      ${fs.length?`<div class="thumbs">${fs.map(f=>`<button type="button" class="thumb" data-act="openfile" data-id="${esc(f.id)}" data-fid="${esc(f.id)}" data-k="${esc(KIND_NAME[f.kind]||'')}"><span>讀取中…</span></button>`).join('')}</div>`:''}
      <div class="btns"><button class="btn sm" data-act="editvisit" data-id="${esc(v.id)}">編輯</button><button class="btn sm" data-act="delvisit" data-id="${esc(v.id)}">刪除</button></div>
    </div></details>`;
}
function visitsHtml(c){
  const vs=visitsOf(c.id),cut=cutDate(),inR=vs.filter(v=>v.date>=cut),show=inR.length?inR:vs.slice(0,3);
  return `<section><div class="bar"><h3 class="sec" style="margin:0">看診紀錄</h3><button class="btn pri" data-act="add">＋ 新增看診</button></div>
    <div class="list" style="margin-top:8px">${show.length?show.map(visitCard).join(''):'<p class="note">還沒有看診紀錄，按右上的「新增看診」開始。</p>'}</div>
    ${vs.length>show.length?`<p class="note" style="margin-top:6px">範圍外還有 ${vs.length-show.length} 筆，選「全部」可以看到。</p>`:''}</section>`;
}
/* ===== 回診與餵藥提醒 ===== */
function careHtml(c){
  const cr=[];
  const dd=c.nextDate?diffDays(c.nextDate,todayStr()):null;
  if(c.nextDate&&!S.editNext){
    const cd=dd>1?'還有 '+dd+' 天':dd===1?'明天':dd===0?'今天':'已過 '+(-dd)+' 天';
    const ev=nextEvent(c);
    cr.push(`<div class="card" aria-label="下次回診"><h4>下次回診</h4>
      <div><span class="big-n">${cd}</span><p class="sub">${fmtFull(c.nextDate)} ${esc(c.nextTime||'')}${c.nextClinic?'・'+esc(c.nextClinic):''}</p></div>
      ${c.nextItems.length?`<div class="tags">${c.nextItems.map(k=>`<span class="tag info">${(ITEMS.find(x=>x[0]===k)||[0,k])[1]}</span>`).join('')}</div>`:''}
      <div class="btns"><button class="btn pri" data-act="next-ics">加到手機日曆（含提醒）</button><a class="btn sm" href="${esc(ev.gurl)}" target="_blank" rel="noopener">Google 日曆</a><button class="btn sm" data-act="next-edit">修改</button><button class="btn sm" data-act="next-clear">清除</button></div>
      <p class="note">手機日曆會在 1 天前和 2 小時前提醒。Google 日曆連結不能預設提醒，加入後請在日曆裡自己設「通知」。</p></div>`);
  }else{
    const ref=(visitDates(c.id).slice(-1)[0]||todayStr())>todayStr()?visitDates(c.id).slice(-1)[0]:todayStr();
    const lastV=visitDates(c.id).slice(-1)[0]||todayStr();
    const base=lastV>todayStr()?lastV:todayStr();
    const chips=[['2 週後',addDays(base,14)],['1 個月後',addMonths(base,1)],['2 個月後',addMonths(base,2)],['3 個月後',addMonths(base,3)]]
      .map(x=>`<button type="button" class="q" data-act="qdate" data-v="${x[1]}">${x[0]}・${fmtMD(x[1])}</button>`).join('');
    const sel=new Set(c.nextDate&&c.nextItems.length?c.nextItems:suggestItems(c));
    cr.push(`<div class="card" aria-label="設定回診"><h4>${c.nextDate?'修改回診':'設定下次回診'}</h4>
      <div class="qrow" role="group" aria-label="快速填日期">${chips}</div>
      <p class="note" style="margin-top:-6px">日期從今天往後算，實際請依醫囑。慢性腎病的貓通常每月回診一次。</p>
      <div class="frow"><label class="field">日期<input type="date" id="n-date" min="${todayStr()}" value="${esc(c.nextDate||'')}"></label>
      <label class="field">時間<input type="time" id="n-time" value="${esc(c.nextTime||'10:00')}"></label></div>
      <label class="field">診所（選填）<input type="text" id="n-clinic" list="clinics" placeholder="診所名稱" value="${esc(c.nextClinic||(visitsOf(c.id)[0]||{}).clinic||'')}"></label>
      <div class="field">要複檢的項目（已先勾選目前超出參考範圍的）<div class="qrow" id="n-items">${ITEMS.map(x=>`<label class="pill"><input type="checkbox" value="${x[0]}"${sel.has(x[0])?' checked':''}>${x[1]}</label>`).join('')}</div></div>
      <div class="btns"><button class="btn pri" data-act="next-save">儲存回診</button>${c.nextDate?'<button class="btn sm" data-act="next-cancel">取消</button>':''}</div></div>`);
  }
  const meds=S.db.meds.filter(m=>m.cat===c.id);
  const medItem=m=>{
    const links=m.slots.map(s=>{const e=medEvent(c,m,s);return `<a class="btn sm" href="${esc(e.gurl)}" target="_blank" rel="noopener">${(SLOTS.find(x=>x[0]===s)||[0,''])[1]} ${s} Google</a>`}).join('');
    return `<div class="med"><div><b>${esc(m.name)}</b>${m.dose?'・'+esc(m.dose):''}<p class="sub">${m.slots.map(s=>((SLOTS.find(x=>x[0]===s)||[0,''])[1]+' '+s)).join('、')}・連續 ${m.days} 天（從 ${fmtMD(m.start)} 起）</p></div>
      <div class="btns"><button class="btn pri" data-act="med-ics" data-id="${esc(m.id)}">加到手機日曆（含提醒）</button>${links}<button class="btn sm" data-act="med-del" data-id="${esc(m.id)}">刪除</button></div></div>`;
  };
  cr.push(`<div class="card" aria-label="餵藥提醒"><h4>餵藥提醒</h4>
    ${meds.length?meds.map(medItem).join(''):'<p class="sub">把醫生開的藥輸入，就能在手機日曆每天準時提醒。</p>'}
    ${S.showMed?`<div class="med">
      <label class="field">藥名<input type="text" id="m-name" placeholder="例如：降磷藥"></label>
      <label class="field">劑量（選填）<input type="text" id="m-dose" placeholder="例如：半顆"></label>
      <div class="field">每天幾點<div class="qrow" id="m-slots">${SLOTS.map(x=>`<label class="pill"><input type="checkbox" value="${x[0]}"${x[0]==='08:00'||x[0]==='20:00'?' checked':''}>${x[1]} ${x[0]}</label>`).join('')}</div></div>
      <label class="field">連續幾天<input type="number" id="m-days" min="1" max="365" value="30" inputmode="numeric"></label>
      <div class="btns"><button class="btn pri" data-act="med-save">儲存</button><button class="btn sm" data-act="med-cancel">取消</button></div></div>`
      :`<div class="btns"><button class="btn" data-act="med-show">＋ 新增餵藥提醒</button></div>`}</div>`);
  if(S.careMsg)cr.push(`<p class="msg ${S.careMsg.kind}" role="status" aria-live="polite">${esc(S.careMsg.text)}</p>`);
  return `<section><h3 class="sec">回診與提醒</h3><div class="list">${cr.join('')}</div></section>`;
}
/* ===== 日曆 ===== */
const icsEsc=s=>String(s).replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
const icsStamp=iso=>iso.replace(/[-:]/g,'').slice(0,15);
function localIso(dateStr,time,addMin){
  const a=dateStr.split('-').map(Number),b=(time||'10:00').split(':').map(Number);
  const t=new Date(a[0],a[1]-1,a[2],b[0],b[1]+(addMin||0));
  return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())+'T'+pad(t.getHours())+':'+pad(t.getMinutes())+':00';
}
function foldLine(l){
  const enc=new TextEncoder();let out='',cur='',n=0;
  for(const ch of l){const b=enc.encode(ch).length;if(n+b>73){out+=cur+'\r\n ';cur='';n=1}cur+=ch;n+=b}
  return out+cur;
}
function vevent(e){
  const L=['BEGIN:VEVENT','UID:'+e.uid+'@cat-health','DTSTAMP:'+icsStamp(localIso(todayStr(),'00:00')).replace(/T.*/,'T000000')+'Z','DTSTART:'+icsStamp(e.start),'DTEND:'+icsStamp(e.end),'SUMMARY:'+icsEsc(e.title)];
  if(e.desc)L.push('DESCRIPTION:'+icsEsc(e.desc));
  if(e.loc)L.push('LOCATION:'+icsEsc(e.loc));
  if(e.rrule)L.push('RRULE:'+e.rrule);
  (e.alarms||[]).forEach(a=>L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(e.title),'TRIGGER:'+a,'END:VALARM'));
  L.push('END:VEVENT');return L.map(foldLine).join('\r\n');
}
const icsCal=evs=>['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CatHealth//ZH','CALSCALE:GREGORIAN',...evs,'END:VCALENDAR'].join('\r\n')+'\r\n';
function gurl(title,start,end,details,loc,rrule){
  const q=['action=TEMPLATE','text='+encodeURIComponent(title),'dates='+icsStamp(start)+'/'+icsStamp(end)];
  if(details)q.push('details='+encodeURIComponent(details));if(loc)q.push('location='+encodeURIComponent(loc));if(rrule)q.push('recur='+encodeURIComponent(rrule));
  return 'https://calendar.google.com/calendar/render?'+q.join('&');
}
function nextEvent(c){
  const items=(c.nextItems||[]).map(k=>(ITEMS.find(x=>x[0]===k)||[0,k])[1]);
  const desc=[c.name+' 回診',items.length?'複檢：'+items.join('、'):'','只做紀錄與提醒，不是診斷。'].filter(Boolean).join('\n');
  const start=localIso(c.nextDate,c.nextTime),end=localIso(c.nextDate,c.nextTime,60);
  const e={uid:'next-'+c.id+'-'+c.nextDate,title:c.name+' 回診',start,end,desc,loc:c.nextClinic||'',alarms:['-P1D','-PT2H']};
  e.gurl=gurl(e.title,start,end,desc,e.loc);return e;
}
function medEvent(c,m,slot){
  const start=localIso(m.start,slot),end=localIso(m.start,slot,15),title=c.name+' 餵藥：'+m.name+(m.dose?' '+m.dose:'');
  const e={uid:'med-'+m.id+'-'+slot,title,start,end,desc:'只做提醒，用藥請依獸醫指示。',rrule:'FREQ=DAILY;COUNT='+m.days,alarms:['PT0M']};
  e.gurl=gurl(title,start,end,e.desc,'',e.rrule);return e;
}
function downloadText(name,text,mime){
  const blob=new Blob([text],{type:mime||'text/plain'}),u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
}
/* ===== 圖表區 ===== */
function focusHtml(c,ms){
  const f=ms.filter(m=>m.g==='f'),ri=ratioItems(c),wi=weightItems(c);
  if(!f.length&&!ri.length&&!wi.length)return '';
  const wd=wi.length>1?Number(wi[wi.length-1][1])-Number(wi[wi.length-2][1]):0;
  return `<section><h3 class="sec">腎臟與甲狀腺</h3><div class="list">
    ${f.map(bigCard).join('')}
    ${ri.length?quietCard('尿素氮／肌酸酐比','BUN/CREA',ri,'','<p class="ref">報告沒有參考範圍，這裡只列數字。</p>'):''}
    ${wi.length?quietCard('體重','kg',wi,'kg',Math.abs(wd)>0.004?`<div class="tags"><span class="tag info">和上次比${wd>0?'增':'減'} ${Math.abs(wd).toFixed(2)} kg</span></div>`:''):''}
  </div><p class="note" style="margin-top:8px">綠色帶是參考範圍。空心圈是之前的紀錄，實心點是最近一次（橘色表示在範圍外）。折線是真實數值，往下走也可能是進步（例如肌酸酐），請看貓咪的表情。點折線可重播。</p></section>`;
}
function othersHtml(ms){
  const o=ms.filter(m=>m.g!=='f');if(!o.length)return '';
  const items=o.map(m=>({m,st:judge(m,Math.max(0,baseIdx(m)))})).sort((a,b)=>{const r=x=>x.st.state==='down'?0:x.st.zone!=='in'?1:x.st.state==='up'?2:3;return r(a)-r(b)||orderRank(a.m)-orderRank(b.m)});
  const cu=items.filter(x=>x.st.state==='up').length,cd=items.filter(x=>x.st.state==='down').length,co=items.filter(x=>x.st.zone!=='in');
  return `<section><details data-key="others"${isOpen('others')}><summary><span>血球與其他項目（${items.length} 項）</span><span class="s2">進步 ${cu}・需留意 ${cd}・${co.length?'範圍外：'+esc(co.map(x=>x.m.zh).join('、')):'全部在參考範圍內'}</span></summary>
    <p class="dcap">每列的數字依序是最近三次，折線同上。</p>${items.map(x=>smallRow(x.m)).join('')}</details></section>`;
}
function exportHtml(c){
  return `<section><h3 class="sec">匯出給醫師</h3><div class="card"><p class="sub">換醫院或看診時，可以把一段時間的檢驗數字、看診紀錄和用藥整理成一份摘要，列印或存成 PDF 給醫師看。範圍跟著上面「資料範圍」。</p>
    <div class="btns"><button class="btn pri" data-act="summary">產生摘要（${rangeLabel(S.range)}）</button><button class="btn" data-act="csv">下載表格 CSV</button></div></div></section>`;
}
function emptyCat(c){
  return `<section class="hero"><div class="id">${avatar(c,'')}<div><h2>${esc(c.name)}</h2><p class="meta">${esc(c.info||'')}</p></div></div>
    <p class="sub">還沒有檢驗紀錄。按下面的按鈕，拍一張檢驗報告，AI 會讀出數字，你確認後就能看到走勢。</p>
    <div class="btns"><button class="btn pri" data-act="add">＋ 新增看診</button><button class="btn sm" data-act="editcat">編輯貓咪資料</button></div></section>`;
}
function catView(c){
  const s=summarize(c);
  if(!s.hasData&&!visitsOf(c.id).length)return emptyCat(c);
  const ms=metricsFor(c.id);
  return (s.hasData?heroHtml(c,s):emptyCat(c))+visitsHtml(c)+careHtml(c)+(s.hasData?focusHtml(c,ms)+othersHtml(ms)+exportHtml(c):'')
    +`<p class="note">只做紀錄和對照，不是診斷，請以獸醫的判斷為準。AI 讀出的數值存檔前請再核對一次。</p>`;
}
function renderApp(top){
  const y=window.scrollY,c=curCat();if(c)S.cat=c.id;
  let h=`<div class="top"><h1>貓咪健康紀錄</h1><button class="gear" data-act="settings">設定</button></div>`;
  if(!cfg.url)h+=`<div class="banner"><span>目前是<b>示範資料</b>（虛構的貓「小虎」），只存在這支手機的瀏覽器。要存你家貓咪的真實紀錄，請到設定連接 Google 試算表。</span><div class="btns"><button class="btn sm" data-act="settings">去設定</button></div></div>`;
  if(S.err)h+=`<div class="banner err"><span>${esc(S.err)}</span><div class="btns"><button class="btn sm" data-act="reload">重新載入</button><button class="btn sm" data-act="settings">檢查設定</button></div></div>`;
  if(S.loading&&!S.db.cats.length)h+=`<p class="note"><span class="spin"></span>讀取中…</p>`;
  h+=tabsHtml();
  if(c)h+=rangesHtml()+catView(c);
  else if(!S.loading)h+=`<div class="card"><p class="sub">還沒有貓咪。</p><div class="btns"><button class="btn pri" data-act="addcat">＋ 新增貓咪</button></div></div>`;
  h+=`<datalist id="clinics">${clinicList().map(x=>`<option value="${esc(x)}">`).join('')}</datalist>`;
  $('#app').innerHTML=h;
  window.scrollTo(0,top?0:y);
  play();loadThumbs();
}
/* ===== 圖片、檔案、提示 ===== */
function toast(msg){
  const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;document.body.appendChild(t);
  setTimeout(()=>t.remove(),2800);
}
function readImage(file){
  return new Promise((res,rej)=>{
    const u=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{URL.revokeObjectURL(u);res(im)};
    im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('這張照片無法讀取，請換一張或改用截圖'))};
    im.src=u;
  });
}
async function compress(file,max,q,square){
  const im=await readImage(file),W=im.naturalWidth,H=im.naturalHeight;
  const cv=document.createElement('canvas'),ctx=cv.getContext('2d');
  if(square){
    const s=Math.min(W,H);cv.width=cv.height=max;ctx.fillStyle='#fff';ctx.fillRect(0,0,max,max);
    ctx.drawImage(im,(W-s)/2,(H-s)/2,s,s,0,0,max,max);
  }else{
    const k=Math.min(1,max/Math.max(W,H));cv.width=Math.round(W*k);cv.height=Math.round(H*k);
    ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(im,0,0,cv.width,cv.height);
  }
  return cv.toDataURL('image/jpeg',q);
}
const b64=u=>u.slice(u.indexOf(',')+1);
const INFLIGHT=new Map();
function getFileData(id){
  if(FILECACHE.has(id))return Promise.resolve(FILECACHE.get(id));
  if(INFLIGHT.has(id))return INFLIGHT.get(id);
  const p=api('getFile',{id}).then(r=>{const u='data:'+(r.mime||'image/jpeg')+';base64,'+r.base64;FILECACHE.set(id,u);return u}).finally(()=>INFLIGHT.delete(id));
  INFLIGHT.set(id,p);return p;
}
let thumbBusy=false;
async function loadThumbs(){
  if(thumbBusy)return;thumbBusy=true;
  try{
    for(;;){
      const el=$$('details.visit[open] .thumb[data-fid]:not([data-done])')[0];if(!el)break;
      el.dataset.done='1';
      try{
        const u=await getFileData(el.dataset.fid);
        if(el.isConnected)el.innerHTML=`<img src="${u}" alt="${esc(el.dataset.k)}"><span class="k">${esc(el.dataset.k)}</span>`;
      }catch(e){if(el.isConnected)el.innerHTML='<span>讀不到</span>'}
    }
  }finally{thumbBusy=false}
}
async function openFile(fid){
  const lb=document.createElement('div');lb.className='lightbox';lb.innerHTML='<p style="color:#fff"><span class="spin"></span>讀取中…</p>';document.body.appendChild(lb);
  lb.onclick=e=>{if(!e.target.closest('a'))lb.remove()};
  try{
    const u=await getFileData(fid),f=S.db.files.find(x=>x.id===fid)||{};
    lb.innerHTML=`<img src="${u}" alt=""><p style="color:#fff;font-size:13px;margin:0">${esc(KIND_NAME[f.kind]||'')}・${f.date?fmtYMD(f.date):''}</p><div class="btns"><a class="btn sm" href="${u}" download="${esc((f.date||'')+'_'+(f.kind||'img')+'.jpg')}">下載</a><button class="btn sm">關閉</button></div>`;
  }catch(e){lb.innerHTML=`<p style="color:#fff">${esc(e.message)}</p><button class="btn sm">關閉</button>`}
}
async function shareOrDownload(name,text,mime){
  try{
    if(navigator.canShare&&matchMedia('(pointer:coarse)').matches){
      const f=new File([text],name,{type:mime});
      if(navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}
    }
  }catch(e){if(e&&e.name==='AbortError')return}
  downloadText(name,text,mime);
}

/* ===== 彈出畫面（新增看診／設定／貓咪／摘要） ===== */
let SH=null;
function openSheet(s){SH=s;document.body.style.overflow='hidden';renderSheet()}
function closeSheet(){SH=null;const e=$('#sheet');if(e)e.remove();document.body.style.overflow=''}
function renderSheet(){
  if(!SH)return;
  let el=$('#sheet');
  const top=el?el.scrollTop:0;
  if(!el){el=document.createElement('div');el.id='sheet';el.className='sheet';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el)}
  el.innerHTML=SH.kind==='visit'?visitSheet():SH.kind==='settings'?settingsSheet():SH.kind==='cat'?catSheet():summarySheet();
  el.scrollTop=top;
}
/* ----- 新增／編輯看診 ----- */
function prevOf(cid,k,date){
  let best=null;
  S.db.labs.forEach(l=>{if(l.cat===cid&&l.k===k&&l.date<date&&l.v!=null&&(!best||l.date>best.date))best=l});
  return best;
}
function labRow(r,i,cid,date){
  const m=MET[r.k]||{},p=r.k?prevOf(cid,r.k,date):null;
  const hint=[m.zh||'',r.unit||m.unit||'',p?`上次 ${p.cap?'>':''}${p.v}（${fmtMD(p.date)}）`:''].filter(Boolean).join('・');
  return `<div data-row="${i}"><div class="lrow${r.cap?' cap':''}">
    <input data-li="${i}" data-lf="k" list="mkeys" value="${esc(r.k)}" placeholder="縮寫" aria-label="項目縮寫" autocapitalize="characters" autocomplete="off">
    <input class="v" data-li="${i}" data-lf="v" value="${esc(r.vs)}" placeholder="數值" inputmode="decimal" aria-label="數值" autocomplete="off">
    <input data-li="${i}" data-lf="lo" value="${esc(r.lo)}" placeholder="下限" inputmode="decimal" aria-label="參考下限" autocomplete="off">
    <input data-li="${i}" data-lf="hi" value="${esc(r.hi)}" placeholder="上限" inputmode="decimal" aria-label="參考上限" autocomplete="off">
    <button type="button" class="x" data-act="lrow-del" data-i="${i}" aria-label="刪除這一列">×</button></div>
    <p class="note" style="margin:2px 0 0;font-size:12px" data-hint="${i}">${esc(hint)}</p></div>`;
}
function newVisitState(cid,existing){
  if(existing){
    const labs=S.db.labs.filter(l=>l.visit===existing.id).map(l=>({k:l.k,vs:(l.cap?'>':'')+l.v,lo:l.lo==null?'':String(l.lo),hi:l.hi==null?'':String(l.hi),unit:l.unit||''}));
    labs.sort((a,b)=>orderRank({k:a.k,g:(MET[a.k]||{}).g})-orderRank({k:b.k,g:(MET[b.k]||{}).g}));
    return {kind:'visit',id:existing.id,cat:existing.cat,date:existing.date,type:existing.type||'lab',clinic:existing.clinic||'',vet:existing.vet||'',weight:existing.weight==null?'':String(existing.weight),notes:existing.notes||'',labs,files:[],oldFiles:filesOf(existing.id),nextOn:false,next:{date:'',time:'10:00',clinic:existing.clinic||'',items:['kidney']},busy:'',msg:null,extracted:false};
  }
  const last=visitsOf(cid)[0];
  return {kind:'visit',id:'',cat:cid,date:todayStr(),type:'lab',clinic:last?last.clinic||'':'',vet:last?last.vet||'':'',weight:'',notes:'',labs:[],files:[],oldFiles:[],nextOn:false,next:{date:'',time:'10:00',clinic:last?last.clinic||'':'',items:['kidney']},busy:'',msg:null,extracted:false};
}
function visitSheet(){
  const V=SH,c=S.db.cats.find(x=>x.id===V.cat)||{name:''};
  const nrep=V.files.filter(f=>f.kind==='report').length;
  const mkeys=Object.keys(MET).map(k=>`<option value="${esc(k)}">`).join('');
  const nxt=V.next;
  const chips=[['2 週',addDays(V.date,14)],['1 個月',addMonths(V.date,1)],['2 個月',addMonths(V.date,2)],['3 個月',addMonths(V.date,3)]]
    .map(x=>`<button type="button" class="q" data-act="vnext-q" data-v="${x[1]}">${x[0]}後・${fmtMD(x[1])}</button>`).join('');
  return `<div class="inner">
    <div class="bar"><h2>${V.id?'編輯':'新增'}看診・${esc(c.name)}</h2><button class="btn sm" data-act="sheet-close">取消</button></div>
    ${S.db.cats.length>1&&!V.id?`<label class="field">哪一隻貓<select data-f="cat">${S.db.cats.map(x=>`<option value="${esc(x.id)}"${x.id===V.cat?' selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`:''}
    <div class="qrow" role="group" aria-label="看診類型">${TYPES.map(t=>`<button type="button" class="q" data-act="vtype" data-v="${t[0]}" aria-pressed="${V.type===t[0]}">${t[1]}</button>`).join('')}</div>
    <div class="frow"><label class="field">日期<input type="date" data-f="date" value="${esc(V.date)}"></label>
      <label class="field">體重 kg（選填）<input type="number" step="0.01" min="0" inputmode="decimal" data-f="weight" value="${esc(V.weight)}"></label></div>
    <div class="frow"><label class="field">醫院<input type="text" data-f="clinic" list="clinics" value="${esc(V.clinic)}" placeholder="診所名稱"></label>
      <label class="field">獸醫師（選填）<input type="text" data-f="vet" value="${esc(V.vet)}"></label></div>

    <section><h3 class="sec">照片與影像</h3>
      <p class="note">檢驗報告、X 光、超音波、處方都可以放。報告拍清楚一點（整張、不反光），AI 讀得比較準。</p>
      <div class="list">${V.oldFiles.map(f=>`<div class="filechip"><span class="nm">已存：${esc(KIND_NAME[f.kind]||'')}・${esc(f.name||'')}</span></div>`).join('')}
      ${V.files.map((f,i)=>`<div class="filechip"><img src="${f.dataUrl}" alt=""><div style="flex:1;min-width:0"><select data-fi="${i}" aria-label="這張是什麼">${KINDS.map(k=>`<option value="${k[0]}"${f.kind===k[0]?' selected':''}>${k[1]}</option>`).join('')}</select></div><button type="button" class="x btn sm" data-act="vfile-del" data-i="${i}" aria-label="移除這張">移除</button></div>`).join('')}</div>
      <div class="btns" style="margin-top:8px"><label class="btn addfile">＋ 拍照／選照片<input type="file" id="vfiles" accept="image/*" multiple></label>
      ${nrep?`<button class="btn pri" data-act="vextract"${V.busy?' disabled':''}>${V.busy==='ai'?'<span class="spin"></span>AI 讀取中…（約 20–60 秒）':'AI 讀取數字（'+nrep+' 張報告）'}</button>`:''}</div>
      ${V.msg?`<p class="msg ${V.msg.kind}" role="status" aria-live="polite">${esc(V.msg.text)}</p>`:''}
    </section>

    <section><h3 class="sec">檢驗數值</h3>
      ${V.extracted?'<p class="banner" style="margin:0 0 8px">以下是 AI 讀出的數字，<b>請對照報告逐項核對</b>，有錯就直接改。</p>':''}
      <datalist id="mkeys">${mkeys}</datalist>
      <div class="qrow" role="group" aria-label="快速加入"><span class="cap" style="align-self:center">快速加入：</span>
        <button type="button" class="q" data-act="vtpl" data-v="kidney">腎臟＋甲狀腺</button><button type="button" class="q" data-act="vtpl" data-v="cbc">血球 18 項</button><button type="button" class="q" data-act="vtpl" data-v="blank">空白一列</button></div>
      ${V.labs.length?`<div class="lhead" style="margin-top:8px"><span>項目</span><span>數值</span><span>下限</span><span>上限</span><span></span></div>`:'<p class="note">還沒有數字。可以用上面的 AI 讀取，或「快速加入」手動輸入。沒做檢驗的看診（例如只拍 X 光）可以留空。</p>'}
      <div class="rows" style="margin-top:6px">${V.labs.map((r,i)=>labRow(r,i,V.cat,V.date)).join('')}</div>
      ${V.labs.length?'<p class="note" style="margin-top:6px">數值前面加 > 表示儀器上限（例如 >20.0）。</p>':''}
    </section>

    <label class="field">備註（診斷、用藥調整、醫囑…）<textarea data-f="notes" placeholder="例如：開始吃降磷藥、改處方糧">${esc(V.notes)}</textarea></label>

    <section><label class="pill" style="align-self:flex-start"><input type="checkbox" data-f="nextOn"${V.nextOn?' checked':''}>同時設定下次回診</label>
      ${V.nextOn?`<div class="list" style="margin-top:8px"><div class="qrow">${chips}</div>
        <div class="frow"><label class="field">日期<input type="date" data-nf="date" value="${esc(nxt.date)}"></label><label class="field">時間<input type="time" data-nf="time" value="${esc(nxt.time)}"></label></div>
        <label class="field">診所<input type="text" data-nf="clinic" list="clinics" value="${esc(nxt.clinic)}"></label>
        <div class="qrow">${ITEMS.map(x=>`<label class="pill"><input type="checkbox" data-nitem="${x[0]}"${nxt.items.includes(x[0])?' checked':''}>${x[1]}</label>`).join('')}</div></div>`:''}</section>

    <div class="btns"><button class="btn pri" data-act="vsave"${V.busy?' disabled':''}>${V.busy==='save'?'<span class="spin"></span>儲存中…':'儲存看診'}</button><button class="btn" data-act="sheet-close">取消</button></div>
    ${V.msg&&V.msg.where==='save'?`<p class="msg err" role="alert">${esc(V.msg.text)}</p>`:''}
  </div>`;
}
function openVisit(id){
  const ex=id?S.db.visits.find(v=>v.id===id):null;
  openSheet(newVisitState(ex?ex.cat:S.cat,ex));
}
function addTemplate(kind){
  const V=SH;
  if(kind==='blank'){V.labs.push({k:'',vs:'',lo:'',hi:'',unit:''});renderSheet();return}
  const have=new Set(V.labs.map(r=>r.k));
  TEMPLATES[kind].forEach(k=>{if(!have.has(k)){const m=MET[k]||{};V.labs.push({k,vs:'',lo:m.lo==null?'':String(m.lo),hi:m.hi==null?'':String(m.hi),unit:m.unit||''})}});
  renderSheet();
}
async function vExtract(){
  const V=SH,reps=V.files.filter(f=>f.kind==='report');
  if(!reps.length||V.busy)return;
  V.busy='ai';V.msg=null;renderSheet();
  try{
    const r=await api('extract',{images:reps.map(f=>({mime:'image/jpeg',base64:b64(f.dataUrl)}))});
    const ms=r.metrics||[];
    ms.forEach(x=>{
      const k=normKey(x.k),m=MET[k]||{};
      const row={k,vs:(x.cap?'>':'')+x.value,lo:x.lo!=null?String(x.lo):(m.lo==null?'':String(m.lo)),hi:x.hi!=null?String(x.hi):(m.hi==null?'':String(m.hi)),unit:x.unit||m.unit||''};
      const i=V.labs.findIndex(y=>y.k===k);if(i>=0)V.labs[i]=row;else V.labs.push(row);
    });
    V.labs.sort((a,b)=>orderRank({k:a.k,g:(MET[a.k]||{}).g})-orderRank({k:b.k,g:(MET[b.k]||{}).g}));
    let extra='';
    if(r.date&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date!==V.date){V.date=r.date;extra='，日期已改成報告上的 '+fmtYMD(r.date)}
    if(r.clinic&&!V.clinic)V.clinic=r.clinic;
    V.type='lab';V.extracted=ms.length>0;
    V.msg=ms.length?{kind:'ok',text:`AI 讀到 ${ms.length} 項${extra}。請逐項核對。`}:{kind:'err',text:'AI 沒有讀到數字，請重拍清楚一點，或手動輸入。'};
  }catch(e){V.msg={kind:'err',text:e.message}}
  V.busy='';renderSheet();
}
const parseVal=s=>{const m=String(s).trim().match(/^([<>]?)\s*(-?\d+(?:\.\d+)?)$/);return m?{v:Number(m[2]),cap:m[1]==='>'}:null};
async function vSave(){
  const V=SH;if(V.busy)return;
  const fail=t=>{V.msg={kind:'err',text:t,where:'save'};renderSheet();const e=$('#sheet');if(e)e.scrollTop=e.scrollHeight};
  if(!V.date)return fail('請選日期');
  const labs=[];
  for(let i=0;i<V.labs.length;i++){
    const r=V.labs[i];if(!r.k&&!String(r.vs).trim())continue;
    if(!r.k)return fail(`第 ${i+1} 列有數字但沒有項目縮寫`);
    if(!String(r.vs).trim())continue;
    const p=parseVal(r.vs);if(!p)return fail(`${r.k} 的數值「${r.vs}」看不懂，請只填數字（可加 >）`);
    const lo=num(r.lo),hi=num(r.hi);
    if(String(r.lo).trim()&&lo==null||String(r.hi).trim()&&hi==null)return fail(`${r.k} 的參考範圍要填數字`);
    labs.push({k:normKey(r.k),v:p.v,cap:p.cap,lo,hi,unit:r.unit||(MET[normKey(r.k)]||{}).unit||''});
  }
  const dup=labs.map(l=>l.k).filter((k,i,a)=>a.indexOf(k)!==i)[0];
  if(dup)return fail(`${dup} 重複了，請刪掉一列`);
  const w=String(V.weight).trim()?num(V.weight):null;
  if(String(V.weight).trim()&&w==null)return fail('體重要填數字');
  const payload={visit:{id:V.id||undefined,cat:V.cat,date:V.date,type:V.type,clinic:V.clinic.trim(),vet:V.vet.trim(),weight:w,notes:V.notes.trim()},labs,
    files:V.files.map(f=>({kind:f.kind,name:f.name,mime:'image/jpeg',base64:b64(f.dataUrl)}))};
  if(V.nextOn){
    if(!V.next.date)return fail('要設定下次回診的話，請選日期');
    payload.next={date:V.next.date,time:V.next.time||'10:00',clinic:V.next.clinic.trim(),items:V.next.items};
  }
  V.busy='save';V.msg=null;renderSheet();
  try{
    const res=await api('saveVisit',payload);
    S.db=normDb(res);S.cat=V.cat;
    closeSheet();toast('已儲存');renderApp();
  }catch(e){V.busy='';fail(e.message)}
}
/* ----- 設定 ----- */
function settingsSheet(){
  const T=SH;
  return `<div class="inner">
    <div class="bar"><h2>設定</h2><button class="btn sm" data-act="sheet-close">關閉</button></div>
    <p class="sub">${cfg.url?'目前連接：你的 Google 試算表。':'目前是示範模式，資料只存在這支手機的瀏覽器。'}</p>
    <label class="field">後端網址（Apps Script 部署後的 /exec 網址）<input type="text" data-sf="url" value="${esc(T.url)}" placeholder="https://script.google.com/macros/s/…/exec" autocapitalize="off" autocomplete="off" spellcheck="false"></label>
    <label class="field">密碼（你在 Script 屬性設的 TOKEN）<input type="password" data-sf="token" value="${esc(T.token)}" autocapitalize="off" autocomplete="off"></label>
    <div class="btns"><button class="btn pri" data-act="set-save"${T.busy?' disabled':''}>${T.busy?'<span class="spin"></span>連線中…':'測試並儲存'}</button>
      ${cfg.url?'<button class="btn" data-act="set-demo">改回示範模式</button>':'<button class="btn" data-act="set-reset">重設示範資料</button>'}</div>
    ${T.msg?`<p class="msg ${T.msg.kind}" role="status" aria-live="polite">${esc(T.msg.text)}</p>`:''}
    <p class="note">網址和密碼只存在這支手機。換手機要重新輸入一次。照片與數字都存在你自己的 Google 雲端硬碟和試算表。</p>
  </div>`;
}
async function setSave(){
  const T=SH;if(T.busy)return;
  const url=T.url.trim(),token=T.token.trim();
  if(!/^https:\/\/script\.google\.com\/.+\/exec/.test(url)){T.msg={kind:'err',text:'網址要是 https://script.google.com/…/exec 結尾'};renderSheet();return}
  if(!token){T.msg={kind:'err',text:'請輸入密碼'};renderSheet();return}
  T.busy=true;T.msg=null;renderSheet();
  const old={url:cfg.url,token:cfg.token};
  cfg.url=url;cfg.token=token;
  try{
    const d=await api('load');
    lsSet('cat-cfg',{url,token});FILECACHE.clear();
    S.db=normDb(d);S.cat=null;S.err='';
    closeSheet();toast('已連接');renderApp(true);
  }catch(e){cfg.url=old.url;cfg.token=old.token;T.busy=false;T.msg={kind:'err',text:e.message};renderSheet()}
}
/* ----- 貓咪資料 ----- */
function catSheet(){
  const C=SH;
  return `<div class="inner">
    <div class="bar"><h2>${C.id?'編輯貓咪':'新增貓咪'}</h2><button class="btn sm" data-act="sheet-close">取消</button></div>
    <div class="id" style="display:flex;gap:12px;align-items:center"><span class="av" style="width:64px;height:64px;font-size:24px">${C.photo?`<img src="${esc(C.photo)}" alt="">`:esc((C.name||'?').slice(0,1))}</span>
      <label class="btn addfile">${C.photo?'換照片':'放照片'}<input type="file" id="cphoto" accept="image/*"></label></div>
    <label class="field">名字<input type="text" data-cf="name" value="${esc(C.name)}"></label>
    <label class="field">簡介（年齡、性別…）<input type="text" data-cf="info" value="${esc(C.info)}" placeholder="例如：16 歲・公・已結紮"></label>
    <div class="btns"><button class="btn pri" data-act="cat-save"${C.busy?' disabled':''}>${C.busy?'<span class="spin"></span>儲存中…':'儲存'}</button></div>
    ${C.msg?`<p class="msg err" role="alert">${esc(C.msg)}</p>`:''}
    <p class="note">照片只當頭像用，不會放到跑步的貓咪上。</p>
  </div>`;
}
async function catSave(){
  const C=SH;if(C.busy)return;
  if(!C.name.trim()){C.msg='請輸入名字';renderSheet();return}
  C.busy=true;C.msg='';renderSheet();
  try{
    const id=C.id||newId('c');
    const res=await api('saveCat',{cat:{id,name:C.name.trim(),info:C.info.trim(),photo:C.photo||''}});
    S.db=normDb(res);S.cat=id;closeSheet();toast('已儲存');renderApp(true);
  }catch(e){C.busy=false;C.msg=e.message;renderSheet()}
}
/* ===== 摘要（給醫師）與 CSV ===== */
function rangeInfo(){
  const cut=cutDate(),to=todayStr();
  return {cut,to,label:S.range?`近 ${rangeLabel(S.range)}`:'全部紀錄'};
}
function labTable(cid){
  const {cut}=rangeInfo();
  const labs=S.db.labs.filter(l=>l.cat===cid&&l.date>=cut&&l.v!=null);
  let dates=[...new Set(labs.map(l=>l.date))].sort();
  const cutN=dates.length>10;if(cutN)dates=dates.slice(-10);
  const keys=[...new Set(labs.filter(l=>dates.includes(l.date)).map(l=>l.k))];
  const rows=keys.map(k=>{
    const m=MET[k]||{},ls=labs.filter(l=>l.k===k).sort((a,b)=>a.date<b.date?-1:1),last=ls[ls.length-1];
    const lo=last.lo!=null?last.lo:(m.lo==null?null:m.lo),hi=last.hi!=null?last.hi:(m.hi==null?null:m.hi);
    return {k,zh:m.zh||k,unit:last.unit||m.unit||'',lo,hi,g:m.g||'o',by:Object.fromEntries(ls.map(l=>[l.date,l]))};
  }).sort((a,b)=>orderRank({k:a.k,g:a.g})-orderRank({k:b.k,g:b.g}));
  return {dates,rows,cutN};
}
function cellOf(r,d){
  const l=r.by[d];if(!l)return {t:'',c:''};
  const lo=l.lo!=null?l.lo:r.lo,hi=l.hi!=null?l.hi:r.hi;
  let c='',mark='';
  if(hi!=null&&l.v>hi){c='hi';mark=' ▲'}else if(lo!=null&&l.v<lo){c='lo';mark=' ▼'}
  return {t:(l.cap?'>':'')+l.v+mark,c};
}
function spark(r,dates){
  const pts=dates.map(d=>r.by[d]?{d,v:r.by[d].v}:null).filter(Boolean);
  if(pts.length<2)return '';
  const W=220,H=66,px=8,py=8;
  let a=Math.min(...pts.map(p=>p.v)),b=Math.max(...pts.map(p=>p.v));
  if(r.lo!=null)a=Math.min(a,r.lo);if(r.hi!=null)b=Math.max(b,r.hi);
  if(b===a){a-=1;b+=1}const pad2=(b-a)*.08;a-=pad2;b+=pad2;
  const y=v=>H-py-(v-a)/(b-a)*(H-2*py),x=i=>px+i*(W-2*px)/(pts.length-1);
  const band=r.lo!=null&&r.hi!=null?`<rect x="0" y="${y(r.hi).toFixed(1)}" width="${W}" height="${Math.max(1,y(r.lo)-y(r.hi)).toFixed(1)}" fill="#cfe8d6"/>`:'';
  const line=pts.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.v).toFixed(1)).join(' ');
  const dots=pts.map((p,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${i===pts.length-1?3.4:2.4}" fill="#111"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(r.zh)}走勢">${band}<path d="${line}" fill="none" stroke="#111" stroke-width="1.6"/>${dots}</svg>`;
}
function summarySheet(){
  const M=SH,c=curCat();if(!c)return '';
  const {cut,label}=rangeInfo(),T=labTable(c.id);
  const vs=visitsOf(c.id).filter(v=>v.date>=cut).reverse();
  const meds=S.db.meds.filter(m=>m.cat===c.id);
  const fs=S.db.files.filter(f=>f.cat===c.id&&f.date>=cut).sort((a,b)=>a.date<b.date?-1:1);
  const from=T.dates.length?T.dates[0]:(vs[0]||{}).date,to=T.dates.length?T.dates[T.dates.length-1]:(vs[vs.length-1]||{}).date;
  const groups=[['f','腎臟與甲狀腺'],['o','其他生化'],['c','血球']];
  const body=groups.map(g=>{
    const rs=T.rows.filter(r=>r.g===g[0]);if(!rs.length)return '';
    return `<tr><th class="l" colspan="${T.dates.length+3}" style="background:#ddd">${g[1]}</th></tr>`+rs.map(r=>`<tr><td class="l"><b>${esc(r.zh)}</b> <span class="meta">${esc(r.k)}</span></td><td>${esc(r.unit)}</td><td>${r.lo!=null&&r.hi!=null?r.lo+'–'+r.hi:'—'}</td>${T.dates.map(d=>{const x=cellOf(r,d);return `<td class="${x.c}">${esc(x.t)}</td>`}).join('')}</tr>`).join('');
  }).join('');
  const focus=T.rows.filter(r=>r.g==='f'&&Object.keys(r.by).length>1);
  const wts=vs.filter(v=>v.weight!=null);
  const imgs=M.imgs?fs.map(f=>`<figure><img src="${FILECACHE.get(f.id)||''}" alt=""><figcaption>${fmtYMD(f.date)}・${esc(KIND_NAME[f.kind]||'')}</figcaption></figure>`).join(''):'';
  return `<div class="inner" style="max-width:820px">
    <div class="sumbar"><button class="btn pri" data-act="sum-print">列印／存成 PDF</button>
      <button class="btn" data-act="sum-imgs"${M.busy?' disabled':''}>${M.busy?'<span class="spin"></span>載入影像…':M.imgs?'不附影像':'附上影像縮圖'}</button><button class="btn" data-act="sheet-close">關閉</button></div>
    ${M.msg?`<p class="msg err" role="alert">${esc(M.msg)}</p>`:''}
    <article class="sum">
      <h1>${esc(c.name)} 健康紀錄摘要</h1>
      <p class="meta">${esc(c.info||'')}｜範圍：${label}${from?`（${fmtYMD(from)} – ${fmtYMD(to)}）`:''}｜製表日 ${fmtYMD(todayStr())}</p>
      <h3>檢驗數值</h3>
      ${T.dates.length?`<div class="tw"><table><thead><tr><th class="l">項目</th><th>單位</th><th>參考範圍</th>${T.dates.map(d=>`<th>${fmtYMD(d)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>
      <p class="meta">▲ 高於、▼ 低於該報告的參考範圍；> 表示儀器上限。${T.cutN?'欄位太多，只列最近 10 次。':''}</p>`:'<p>這段期間沒有檢驗數值。</p>'}
      ${focus.length?`<h3>主要項目走勢</h3><div class="chartgrid">${focus.map(r=>`<div class="mini"><b>${esc(r.zh)} ${esc(r.k)}</b> <span class="meta">${esc(r.unit)}</span>${spark(r,T.dates)}<span class="meta">綠帶＝參考範圍</span></div>`).join('')}</div>`:''}
      ${wts.length?`<h3>體重</h3><p>${wts.map(v=>`${fmtYMD(v.date)}：${Number(v.weight).toFixed(2)} kg`).join('　')}</p>`:''}
      <h3>看診紀錄（${vs.length} 次）</h3>
      ${vs.length?`<table><thead><tr><th class="l">日期</th><th class="l">類型</th><th class="l">醫院／獸醫</th><th class="l">備註</th></tr></thead><tbody>${vs.map(v=>`<tr><td class="l">${fmtYMD(v.date)}</td><td class="l">${esc(TYPE_NAME[v.type]||'')}</td><td class="l">${esc(v.clinic||'')}${v.vet?'／'+esc(v.vet):''}</td><td class="l" style="white-space:pre-wrap">${esc(v.notes||'')}</td></tr>`).join('')}</tbody></table>`:'<p>沒有紀錄。</p>'}
      ${meds.length?`<h3>目前的餵藥提醒</h3><ul>${meds.map(m=>`<li>${esc(m.name)}${m.dose?'・'+esc(m.dose):''}：${m.slots.join('、')}，連續 ${m.days} 天（${fmtYMD(m.start)} 起）</li>`).join('')}</ul>`:''}
      ${c.nextDate?`<h3>下次回診</h3><p>${fmtFull(c.nextDate)} ${esc(c.nextTime||'')} ${esc(c.nextClinic||'')}</p>`:''}
      ${fs.length?`<h3>附件（${fs.length} 份）</h3><p class="meta">${fs.map(f=>fmtYMD(f.date)+' '+esc(KIND_NAME[f.kind]||'')).join('、')}</p>${imgs?`<div class="imgs">${imgs}</div>`:''}`:''}
      <p class="note" style="margin-top:14px">本摘要由飼主整理，數字來自動物醫院的檢驗報告，僅供就診參考，不是診斷。</p>
    </article></div>`;
}
function csvText(){
  const c=curCat(),T=labTable(c.id),q=s=>'"'+String(s==null?'':s).replace(/"/g,'""')+'"';
  const vs=visitsOf(c.id).filter(v=>v.date>=rangeInfo().cut).reverse();
  const L=[[q('貓咪'),q(c.name),q('範圍'),q(rangeInfo().label)].join(',')];
  L.push(['項目','縮寫','單位','參考下限','參考上限',...T.dates].map(q).join(','));
  T.rows.forEach(r=>L.push([r.zh,r.k,r.unit,r.lo==null?'':r.lo,r.hi==null?'':r.hi,...T.dates.map(d=>r.by[d]?(r.by[d].cap?'>':'')+r.by[d].v:'')].map(q).join(',')));
  L.push(['體重 kg','','kg','','',...T.dates.map(d=>{const v=vs.find(x=>x.date===d);return v&&v.weight!=null?v.weight:''})].map(q).join(','));
  L.push('');L.push(['看診日期','類型','醫院','獸醫','備註'].map(q).join(','));
  vs.forEach(v=>L.push([v.date,TYPE_NAME[v.type]||'',v.clinic,v.vet,v.notes].map(q).join(',')));
  return '﻿'+L.join('\r\n')+'\r\n';
}
async function sumImgs(){
  const M=SH;
  if(M.imgs){M.imgs=false;renderSheet();return}
  const cut=rangeInfo().cut,c=curCat(),fs=S.db.files.filter(f=>f.cat===c.id&&f.date>=cut);
  M.busy=true;M.msg='';renderSheet();
  try{for(const f of fs.slice(0,30))await getFileData(f.id);M.imgs=true}catch(e){M.msg='有影像讀不到：'+e.message}
  M.busy=false;renderSheet();
}

/* ===== 載入與動作 ===== */
async function load(){
  S.loading=true;S.err='';renderApp();
  try{S.db=normDb(await api('load'))}catch(e){S.err=e.message}
  S.loading=false;if(!S.db.cats.find(c=>c.id===S.cat))S.cat=(S.db.cats[0]||{}).id||null;
  renderApp(true);
}
async function mutate(action,payload,okMsg){
  try{
    S.db=normDb(await api(action,payload));S.careMsg=null;
    if(okMsg)toast(okMsg);
    renderApp();return true;
  }catch(e){S.careMsg={kind:'err',text:e.message};renderApp();return false}
}
const checked=sel=>$$(sel+' input:checked').map(x=>x.value);
async function onAct(a,el){
  const c=curCat(),id=el.dataset.id,v=el.dataset.v;
  switch(a){
    case 'tab':S.cat=id;S.demo=null;S.editNext=false;S.showMed=false;S.careMsg=null;renderApp(true);break;
    case 'range':S.range=Number(v);S.demo=null;renderApp();break;
    case 'base':S.base=v;S.demo=null;renderApp();break;
    case 'demo':S.demo=v||null;renderApp();break;
    case 'reload':load();break;
    case 'settings':openSheet({kind:'settings',url:cfg.url,token:cfg.token,busy:false,msg:null});break;
    case 'addcat':openSheet({kind:'cat',id:'',name:'',info:'',photo:'',busy:false,msg:''});break;
    case 'editcat':openSheet({kind:'cat',id:c.id,name:c.name,info:c.info||'',photo:c.photo||'',busy:false,msg:''});break;
    case 'add':openVisit('');break;
    case 'editvisit':openVisit(id);break;
    case 'delvisit':{
      const vv=S.db.visits.find(x=>x.id===id);
      if(vv&&confirm(`確定刪除 ${fmtYMD(vv.date)} 這筆看診？檢驗數字和照片都會一起刪除，無法復原。`))mutate('deleteVisit',{id},'已刪除');
      break}
    case 'openfile':openFile(el.dataset.fid);break;
    case 'sheet-close':closeSheet();break;
    /* 看診表單 */
    case 'vtype':SH.type=v;renderSheet();break;
    case 'vfile-del':SH.files.splice(Number(el.dataset.i),1);renderSheet();break;
    case 'lrow-del':SH.labs.splice(Number(el.dataset.i),1);renderSheet();break;
    case 'vtpl':addTemplate(v);break;
    case 'vextract':vExtract();break;
    case 'vsave':vSave();break;
    case 'vnext-q':SH.next.date=v;renderSheet();break;
    /* 設定／貓咪 */
    case 'set-save':setSave();break;
    case 'set-demo':if(confirm('改回示範模式？（你的試算表資料不會被刪除）')){cfg.url='';cfg.token='';lsSet('cat-cfg',{url:'',token:''});S.cat=null;closeSheet();load()}break;
    case 'set-reset':if(confirm('清除示範資料並重新開始？')){try{localStorage.removeItem('cat-db')}catch(e){}S.cat=null;closeSheet();load()}break;
    case 'cat-save':catSave();break;
    /* 回診 */
    case 'next-edit':S.editNext=true;renderApp();break;
    case 'next-cancel':S.editNext=false;renderApp();break;
    case 'qdate':{const i=$('#n-date');if(i)i.value=v;break}
    case 'next-clear':if(confirm('清除下次回診？'))mutate('saveCat',{cat:{id:c.id,nextDate:'',nextTime:'',nextClinic:'',nextItems:[]}},'已清除');break;
    case 'next-save':{
      const d=$('#n-date').value;
      if(!d){S.careMsg={kind:'err',text:'請選日期'};renderApp();break}
      S.editNext=false;
      mutate('saveCat',{cat:{id:c.id,nextDate:d,nextTime:$('#n-time').value||'10:00',nextClinic:$('#n-clinic').value.trim(),nextItems:checked('#n-items')}},'已儲存回診');
      break}
    case 'next-ics':{const e=nextEvent(c);await shareOrDownload(c.name+'-回診.ics',icsCal([vevent(e)]),'text/calendar');break}
    /* 餵藥 */
    case 'med-show':S.showMed=true;renderApp();break;
    case 'med-cancel':S.showMed=false;renderApp();break;
    case 'med-save':{
      const name=$('#m-name').value.trim(),slots=checked('#m-slots'),days=Math.max(1,Math.min(365,parseInt($('#m-days').value,10)||0));
      if(!name||!slots.length||!days){S.careMsg={kind:'err',text:'請填藥名、至少選一個時段、天數'};renderApp();break}
      S.showMed=false;
      mutate('saveMed',{med:{cat:c.id,name,dose:$('#m-dose').value.trim(),slots,days,start:todayStr(),done:[]}},'已新增');
      break}
    case 'med-del':if(confirm('刪除這個餵藥提醒？（已加到日曆的要自己在日曆刪除）'))mutate('deleteMed',{id},'已刪除');break;
    case 'med-ics':{
      const m=S.db.meds.find(x=>x.id===id);if(!m)break;
      await shareOrDownload(c.name+'-餵藥.ics',icsCal(m.slots.map(s=>vevent(medEvent(c,m,s)))),'text/calendar');break}
    /* 匯出 */
    case 'summary':openSheet({kind:'summary',imgs:false,busy:false,msg:''});break;
    case 'sum-print':window.print();break;
    case 'sum-imgs':sumImgs();break;
    case 'csv':{const T=labTable(c.id);if(!T.dates.length){toast('這段期間沒有檢驗數值');break}
      await shareOrDownload(`${c.name}_檢驗總表_${S.range?S.range+'個月':'全部'}.csv`,csvText(),'text/csv');break}
  }
}
function setupEvents(){
  document.addEventListener('click',e=>{
    const lb=e.target.closest('.lightbox');
    if(lb&&e.target.closest('button')){lb.remove();return}
    const el=e.target.closest('[data-act]');if(!el||el.disabled)return;
    onAct(el.dataset.act,el);
  });
  document.addEventListener('toggle',e=>{
    const d=e.target;if(!(d instanceof HTMLDetailsElement)||!d.dataset.key)return;
    if(d.open)OPEN.add(d.dataset.key);else OPEN.delete(d.dataset.key);
    lsSet('cat-open',[...OPEN]);if(d.open)loadThumbs();
  },true);
  document.addEventListener('input',e=>{
    const t=e.target;if(!SH)return;
    if(t.dataset.f!=null){
      const f=t.dataset.f;
      if(f==='nextOn'){SH.nextOn=t.checked;if(t.checked&&!SH.next.date)SH.next.date=addMonths(SH.date,1);renderSheet();return}
      if(f==='cat'){SH.cat=t.value;renderSheet();return}
      if(f==='date'){SH[f]=t.value;return}
      SH[f]=t.value;return;
    }
    if(t.dataset.nf!=null){SH.next[t.dataset.nf]=t.value;return}
    if(t.dataset.nitem!=null){const s=new Set(SH.next.items);t.checked?s.add(t.dataset.nitem):s.delete(t.dataset.nitem);SH.next.items=[...s];return}
    if(t.dataset.li!=null){
      const r=SH.labs[Number(t.dataset.li)],f=t.dataset.lf;if(!r)return;
      r[f==='v'?'vs':f]=t.value;
      if(f==='v'){const row=t.closest('.lrow');if(row)row.classList.toggle('cap',/^\s*>/.test(t.value))}
      return;
    }
    if(t.dataset.sf!=null){SH[t.dataset.sf]=t.value;return}
    if(t.dataset.cf!=null){SH[t.dataset.cf]=t.value;return}
    if(t.dataset.fi!=null){SH.files[Number(t.dataset.fi)].kind=t.value;renderSheet();return}
  });
  document.addEventListener('change',async e=>{
    const t=e.target;
    if(t.id==='vfiles'&&SH&&SH.kind==='visit'){
      const list=[...t.files];t.value='';
      SH.msg={kind:'ok',text:'處理照片中…'};renderSheet();
      let bad=0;
      for(const f of list){
        try{
          const du=await compress(f,1800,.82,false);
          SH.files.push({name:f.name||'photo.jpg',dataUrl:du,kind:SH.type==='xray'?'xray':'report'});
        }catch(err){bad++}
      }
      SH.msg=bad?{kind:'err',text:bad+' 張照片無法讀取'}:null;renderSheet();return;
    }
    if(t.id==='cphoto'&&SH&&SH.kind==='cat'){
      try{SH.photo=await compress(t.files[0],160,.78,true);renderSheet()}catch(err){SH.msg=err.message;renderSheet()}return;
    }
    if(t.id==='photo'){
      const c=curCat(),f=t.files[0];if(!c||!f)return;
      try{const du=await compress(f,160,.78,true);await mutate('saveCat',{cat:{id:c.id,photo:du}},'已更新照片')}catch(err){toast(err.message)}
      return;
    }
    if(SH&&SH.kind==='visit'&&t.dataset.lf==='k'){
      const r=SH.labs[Number(t.dataset.li)];if(!r)return;
      r.k=normKey(t.value);t.value=r.k;
      const m=MET[r.k];
      if(m){
        if(!r.lo&&m.lo!=null)r.lo=String(m.lo);if(!r.hi&&m.hi!=null)r.hi=String(m.hi);if(!r.unit)r.unit=m.unit;
        const row=t.closest('[data-row]');
        if(row){const ins=row.querySelectorAll('input');ins[2].value=r.lo;ins[3].value=r.hi;
          const p=prevOf(SH.cat,r.k,SH.date);row.querySelector('[data-hint]').textContent=[m.zh,m.unit,p?`上次 ${p.cap?'>':''}${p.v}（${fmtMD(p.date)}）`:''].filter(Boolean).join('・')}
      }
    }
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const lb=$('.lightbox');if(lb)lb.remove();else if(SH)closeSheet()}});
  $('#app').addEventListener('click',e=>{if(e.target.closest('#scene')||e.target.closest('.metric svg'))play()});
}
function init(){
  setupEvents();
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
  load();
}
document.addEventListener('DOMContentLoaded',init);
