'use strict';
/* 貓奴值班中 Codex UI handoff: independently deployable local-first preview.
   No real AI, authentication, server-side storage, medical diagnosis or notifications. */
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const dateOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=dateOf(new Date());
const defs={CREA:{name:'肌酸酐',unit:'mg/dL',lo:0.8,hi:2.4},BUN:{name:'血中尿素氮',unit:'mg/dL',lo:16,hi:36},SDMA:{name:'SDMA',unit:'µg/dL',lo:0,hi:14},PHOS:{name:'磷離子',unit:'mg/dL',lo:3.1,hi:7.5},T4:{name:'甲狀腺素',unit:'µg/dL',lo:0.8,hi:4.7},HCT:{name:'血比容',unit:'%',lo:30,hi:45},BP:{name:'收縮壓',unit:'mmHg',lo:110,hi:160}};
const mock={guai:{CREA:[3.5,3.0,2.2],BUN:[30,40,51],SDMA:[22,19,16],PHOS:[7.5,7.0,6.3],T4:[4.8,4.4,4.1]},duo:{CREA:[3.8,3.2,2.9],BUN:[32,41,49],SDMA:[25,24,21],PHOS:[6.2,7.0,8.1],T4:[5.5,5.0,4.5]}};
const mockdates=['2026-09-12','2026-09-25','2026-10-09'];
const key='miaotherapy-codex-local-v1';
function blank(){return {cats:[{id:'guai',name:'乖乖',note:'慢性病照護'},{id:'duo',name:'多多',note:'慢性病照護'}],metrics:[],care:[],events:[],docs:[],reports:[]}}
let DB;try{DB=Object.assign(blank(),JSON.parse(localStorage.getItem(key)||'null')||{});}catch(e){DB=blank()}
for(const prop of ['cats','metrics','care','events','docs','reports'])if(!Array.isArray(DB[prop]))DB[prop]=blank()[prop];
let viewRep=null,labView='current',cmp={a:null,b:null,all:false},scanState=null,active=DB.cats[0]?.id||'guai',tab='home',month=new Date().getMonth(),year=new Date().getFullYear(),selected=today,frames={},objectURLs=[];
const persist=()=>{try{localStorage.setItem(key,JSON.stringify(DB));return true}catch(e){alert('儲存失敗，請先匯出備份並檢查瀏覽器容量。');return false}};
const pet=()=>DB.cats.find(x=>x.id===active)||DB.cats[0];
const avatar=c=>c.photo?'<img alt="貓咪照片" src="'+safe(c.photo)+'">':'🐱';
const byDate=(a,b)=>a.date.localeCompare(b.date);
function registry(){
 const d={...defs};for(const x of DB.metrics.filter(x=>x.cat===active).slice().sort(byDate)){
  const k=x.key;if(!d[k])d[k]={name:LabCore.zhName(x.testName||x.canonical||k.split('@@')[0]),unit:x.unit||'',lo:x.lo??null,hi:x.hi??null,category:x.category||LabCore.category(x.testName||k)};
  else {d[k]={...d[k]};if(x.lo!==null&&x.lo!==undefined)d[k].lo=x.lo;if(x.hi!==null&&x.hi!==undefined)d[k].hi=x.hi;if(x.unit)d[k].unit=x.unit;}
 }return d;
}
function actualRows(k){return DB.metrics.filter(x=>x.cat===active&&x.key===k).slice().sort(byDate)}
function latestReport(){return DB.reports.filter(x=>x.cat===active).slice().sort((a,b)=>b.date.localeCompare(a.date))[0]}
function measurements(k){return {data:actualRows(k),demo:false};}
function mood(k,rows){if(!rows.length)return 'neutral';const d=registry()[k];if(!d||!Number.isFinite(Number(d.lo))||!Number.isFinite(Number(d.hi))||d.lo===null||d.hi===null)return 'neutral';if(rows.length<2){const v=+rows.at(-1).value;return v<d.lo||v>d.hi?'worse':'better'}const dist=v=>v<d.lo?d.lo-v:v>d.hi?v-d.hi:0,was=dist(+rows.at(-2).value),is=dist(+rows.at(-1).value),t=Math.max((d.hi-d.lo)*.04,.03);return was-is>t?'better':is-was>t?'worse':'neutral'}
function num(v){return v==null||v===''||!Number.isFinite(+v)?null:+v}
function rangeState(k,rows){const r=rows.at(-1);if(!r||r.cap)return null;const d=registry()[k]||{},lo=num(d.lo??r.lo),hi=num(d.hi??r.hi),v=num(r.value);if(lo===null||hi===null||v===null)return null;return v<lo?{s:'low'}:v>hi?{s:'high'}:{s:'ok'}}
function catSvg(){return `<svg viewBox="0 0 140 175" xmlns="http://www.w3.org/2000/svg" aria-label="Q版虎斑貓">
<g class="whole">
<g class="tail"><path d="M88 119 C111 133 122 111 112 91" stroke="#785842" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M88 119 C111 133 122 111 112 91" stroke="#edb77f" stroke-width="8.5" stroke-linecap="round" fill="none"/><path d="M110 99 l8 3 M111 114 l8 0" stroke="#9d6b48" stroke-width="4"/></g>
<g class="feet-walk"><g class="leg-left"><rect x="47" y="134" width="17" height="19" rx="8" fill="#eeb783" stroke="#805a43" stroke-width="2.5"/><ellipse cx="55" cy="154" rx="11" ry="5" fill="#fff0dc" stroke="#805a43" stroke-width="2"/></g><g class="leg-right"><rect x="76" y="134" width="17" height="19" rx="8" fill="#eeb783" stroke="#805a43" stroke-width="2.5"/><ellipse cx="84" cy="154" rx="11" ry="5" fill="#fff0dc" stroke="#805a43" stroke-width="2"/></g></g>
<g class="feet-sit"><ellipse cx="50" cy="153" rx="21" ry="9" fill="#eeb783" stroke="#805a43" stroke-width="2"/><ellipse cx="90" cy="153" rx="21" ry="9" fill="#eeb783" stroke="#805a43" stroke-width="2"/></g>
<ellipse cx="70" cy="115" rx="25" ry="35" fill="#805a43"/><ellipse cx="70" cy="114" rx="22" ry="33" fill="#eeb783"/><ellipse cx="70" cy="123" rx="14" ry="20" fill="#fff1df"/>
<path d="M48 120 l8 2 M48 130 l8 1 M92 120 l-8 2 M92 130 l-8 1" stroke="#a77451" stroke-width="3" stroke-linecap="round"/>
<g class="head"><path d="M42 55 L40 26 Q40 21 46 26 L59 40 M81 40 L94 26 Q100 21 100 26 L98 55" fill="#eeb783" stroke="#805a43" stroke-width="3" stroke-linejoin="round"/><path d="M45 33 L48 43 L55 41 Z M95 33 L92 43 L85 41 Z" fill="#eba6a6"/>
<ellipse cx="70" cy="66" rx="33" ry="31" fill="#805a43"/><ellipse cx="70" cy="64" rx="30" ry="28.5" fill="#eeb783"/>
<path d="M60 37 l1 10 M70 36 v11 M80 37 l-1 10 M42 63 l8 1 M98 63 l-8 1" stroke="#a36b48" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="70" cy="80" rx="15" ry="10" fill="#fff4e5"/><path d="M66 77 Q70 81 74 77 Z" fill="#b97e79"/>
<g class="face-happy"><path d="M49 63 Q56 54 63 63 M77 63 Q84 54 91 63" stroke="#634b3e" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M63 83 Q70 93 77 83" fill="#bb706a" stroke="#70483e" stroke-width="2"/></g>
<g class="face-sad"><ellipse cx="56" cy="65" rx="5" ry="6" fill="#685044"/><ellipse cx="84" cy="65" rx="5" ry="6" fill="#685044"/><circle cx="57" cy="62.5" r="1.8" fill="white"/><circle cx="85" cy="62.5" r="1.8" fill="white"/><path d="M50 52 Q56 49 62 52 M78 52 Q84 49 90 52" stroke="#a57d60" stroke-width="1.7" fill="none"/><path d="M65 85 Q70 80 75 85" stroke="#85574e" stroke-width="2.4" fill="none"/></g>
<g class="face-wail"><path d="M49 65 Q56 69 62 65 M78 65 Q84 69 91 65" fill="none" stroke="#704f42" stroke-width="2.5"/><ellipse cx="70" cy="85" rx="8" ry="10" fill="#784742"/><ellipse cx="70" cy="89" rx="4" ry="2.7" fill="#eba5a5"/></g>
<g class="walk-hands"><path d="M52 106 Q43 112 42 122 M88 106 Q97 112 98 122" stroke="#805a43" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M52 106 Q43 112 42 122 M88 106 Q97 112 98 122" stroke="#eeb783" stroke-width="8" fill="none" stroke-linecap="round"/></g>
<g class="victory-hands"><path d="M53 106 Q39 84 34 61 M87 106 Q101 84 106 61" stroke="#805a43" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M53 106 Q39 84 34 61 M87 106 Q101 84 106 61" stroke="#eeb783" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="34" cy="60" r="7" fill="#eeb783" stroke="#805a43" stroke-width="2"/><circle cx="106" cy="60" r="7" fill="#eeb783" stroke="#805a43" stroke-width="2"/></g>
<!-- Wiping is in front of left cheek; other arm hangs naturally. -->
<g class="swing-hand"><path d="M88 107 Q100 114 101 123" fill="none" stroke="#805a43" stroke-width="12" stroke-linecap="round"/><path d="M88 107 Q100 114 101 123" fill="none" stroke="#eeb783" stroke-width="8" stroke-linecap="round"/></g>
<g class="wipe-hand"><path d="M52 105 Q41 92 53 68" fill="none" stroke="#805a43" stroke-width="12" stroke-linecap="round"/><path d="M52 105 Q41 92 53 68" fill="none" stroke="#eeb783" stroke-width="8" stroke-linecap="round"/><ellipse cx="53" cy="67" rx="9.7" ry="9" fill="#eeb783" stroke="#805a43" stroke-width="2"/></g>
<!-- Both forepaws are foreground siblings AFTER the eyes, physically covering the eye region. -->
<g class="cover-hands"><path d="M51 106 Q38 88 56 66 M89 106 Q102 88 84 66" fill="none" stroke="#805a43" stroke-width="15" stroke-linecap="round"/><path d="M51 106 Q38 88 56 66 M89 106 Q102 88 84 66" fill="none" stroke="#eeb783" stroke-width="10" stroke-linecap="round"/><ellipse cx="56" cy="64" rx="14" ry="13" fill="#eeb783" stroke="#805a43" stroke-width="2.5"/><ellipse cx="84" cy="64" rx="14" ry="13" fill="#eeb783" stroke="#805a43" stroke-width="2.5"/><path d="M51 62 q5 -3 10 0 M79 62 q5 -3 10 0" stroke="#bb8864" stroke-width="1.5" fill="none"/></g>
<g class="tears"><g class="tear1"><path d="M41 76 Q35 87 41 91 Q47 87 41 76" fill="#75c6e4"/></g><g class="tear2"><path d="M99 76 Q93 87 99 91 Q105 87 99 76" fill="#75c6e4"/></g></g>
</g></g></svg>`}
function sprite(key,s){return `<div class="cat-sprite ${s}" data-key="${key}" data-mood="${s}">${catSvg()}<div class="effects"><span class="heart">♥</span><span class="heart">♥</span><span class="heart">♥</span><i class="confetti"></i><i class="confetti"></i><i class="confetti"></i><i class="confetti"></i></div></div>`}
function metricCard(k,rowsOv){const m=registry()[k],o=measurements(k),rows=rowsOv||o.data,st=mood(k,rows),rg=rangeState(k,rows),sm=(st==='better'&&rg&&rg.s!=='ok')?'neutral':st,vals=rows.map(r=>Number(r.value));let coords=[];
 if(rows.length){let mn=Math.min(...vals,...(m.lo===null||m.lo===undefined?[]:[m.lo])),mx=Math.max(...vals,...(m.hi===null||m.hi===undefined?[]:[m.hi])),span=Math.max(1,mx-mn);coords=rows.map((r,i)=>({x:rows.length===1?210:51+i*320/(rows.length-1),y:166-(+r.value-mn)/(span)*58}));}
 let pts=coords.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="white" stroke="#a78277" stroke-width="2"/><text x="${p.x}" y="${Math.max(11,p.y-11)}" text-anchor="middle" font-size="12" font-weight="700" fill="#725f55">${safe(rows[i].value)}</text><text x="${p.x}" y="205" text-anchor="middle" font-size="11" fill="#a38f84">${safe(rows[i].date.slice(5).replace('-','/'))}</text>`).join('');let path=coords.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ');
 return `<section class="card" data-chart="${safe(k)}" data-points="${coords.map(p=>p.x+','+p.y).join(';')}"><div class="flex"><div class="metric-name">${safe(LabCore.zhName(m.name))} <span>${safe(k.split('@@')[0])}</span></div><span class="status ${st}">${rows.length<2?(st==='better'?'在參考範圍內':st==='worse'?'超出參考範圍':'待觀察'):st==='better'?'朝參考範圍改善':st==='worse'?'變化需留意':'持平／待觀察'}</span></div><div class="muted">參考範圍 ${m.lo??'—'}–${m.hi??'—'} ${safe(m.unit||'')}（以原始報告為準）</div><div class="flex"><div class="amount${rg&&rg.s!=='ok'?' bad':''}">${rows.length?safe((rows.at(-1).cap||'')+rows.at(-1).value):'—'} <small>${safe(m.unit||'')}</small></div><div class="amount-side"><span class="muted">${rows.length?(rows.at(-1).sourceDoc?'已確認報告':'手動輸入'):'尚無檢驗數據'}</span></div></div><div class="chart-container"><svg class="plot-svg" viewBox="0 0 420 224" aria-label="${safe(m.name)}歷次趨勢"><rect x="25" y="118" width="370" height="48" rx="6" fill="#dfeee6"/><path d="M25 166H395" stroke="#d4e5df"/><path d="${path}" stroke="${st==='worse'?'#c98a79':'#89a48f'}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${pts}</svg>${rows.length>=2?sprite(k,sm):''}</div><div class="card-controls"><span class="muted">${rows.length} 筆紀錄</span><div class="buttons">${rowsOv?'':`<button class="btn soft small" data-action="newmetric" data-key="${safe(k)}">＋ 數值</button>`}${st==='worse'&&rows.length>=2?`<button class="btn outline small" data-action="seat" data-key="${safe(k)}">看捂眼姿勢</button>`:''}${rows.length>=2?`<button class="btn small" data-action="replay" data-key="${safe(k)}">↻ 重播</button>`:''}</div></div></section>`;
}
function reportsOf(c){return DB.reports.filter(x=>x.cat===c).slice().sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)))}
function wInfo(cid){const rs=reportsOf(cid),r=rs.find(x=>x.id===viewRep&&x.cat===cid)||rs[0];if(!r)return{};const hasW=x=>x.weight!=null&&x.weight!==''&&isFinite(+x.weight);const prev=rs.find(x=>x!==r&&x.date<r.date&&hasW(x));return{r,cur:hasW(r)?{d:r.date,w:+r.weight}:null,prev:prev?{d:prev.date,w:+prev.weight}:null}}
function petStats(c){const {r,cur,prev}=wInfo(c.id);let age=r?.age?String(r.age).trim():'';if(/^\d+(\.\d+)?$/.test(age))age+=' 歲';let diff='';if(cur&&prev){const d=Math.round((cur.w-prev.w)*100)/100;diff=d>0?`<span class="wd up">▲ 比上份報告(${safe(prev.d)})重了 ${d} kg</span>`:d<0?`<span class="wd down">▼ 比上份報告(${safe(prev.d)})輕了 ${Math.abs(d)} kg</span>`:`<span class="wd same">＝ 和上份報告(${safe(prev.d)})一樣</span>`}
const parts=[];if(age)parts.push(`<span class="ps-age">🎂 ${safe(age)}</span>`);if(cur)parts.push(`<span class="ps-w">⚖️ ${cur.w} kg</span>`);if(!parts.length)return`<div class="muted">${safe(c.note||'個別健康追蹤')}</div>`;return`<div class="petstats">${parts.join('')}${diff}</div>`}
function petLine(c){const r=reportsOf(c.id)[0],cw=DB.care.filter(x=>x.cat===c.id&&x.weight!=null).sort(byDate).at(-1);let age=r?.age?String(r.age).trim():'';if(/^\d+(\.\d+)?$/.test(age))age+=' 歲';const w=cw?.weight??r?.weight,p=[];if(age)p.push(age);if(w!=null)p.push(w+' kg');return p.length?p.join(' · '):(c.note||'個別健康追蹤')}
/* 通用貓咪參考值：只在報告沒印範圍、也沒有內建範圍時才用，一律灰色標示，不當作異常。
   來源：康乃爾大學獸醫檢驗室（Cobas 501 血清），各醫院儀器不同，僅供參考。 */
const GENERIC={NA:{lo:149,hi:158,u:['mmol/L','mEq/L']},K:{lo:3.8,hi:5.5,u:['mmol/L','mEq/L']},CL:{lo:111,hi:124,u:['mmol/L','mEq/L']},CA:{lo:9.0,hi:11.3,u:['mg/dL']},TP:{lo:6.6,hi:8.4,u:['g/dL']},ALB:{lo:3.2,hi:4.3,u:['g/dL']},GLOB:{lo:2.9,hi:4.7,u:['g/dL']},GLU:{lo:71,hi:182,u:['mg/dL']},CHOL:{lo:101,hi:323,u:['mg/dL']},ALT:{lo:28,hi:109,u:['U/L','IU/L']},AST:{lo:17,hi:48,u:['U/L','IU/L']},ALP:{lo:11,hi:49,u:['U/L','IU/L']},GGT:{lo:0,hi:2,u:['U/L','IU/L']}};
function judge(x,reg){const d=reg[x.key]||{},code=LabCore.canonical(x.testName||x.key.split('@@')[0]),cd=defs[code],ok=cd&&(!x.unit||LabCore.unit(x.unit)===LabCore.unit(cd.unit));
 let lo=num(x.lo)??num(d.lo)??(ok?num(cd.lo):null),hi=num(x.hi)??num(d.hi)??(ok?num(cd.hi):null),g=false;const v=num(x.value);
 if(lo===null&&hi===null){const ge=GENERIC[code];if(ge&&(!x.unit||ge.u.includes(LabCore.unit(x.unit)))){lo=ge.lo;hi=ge.hi;g=true}}
 if(v===null||(lo===null&&hi===null))return{s:null,lo,hi,g};
 if(x.cap==='>')return{s:hi!==null&&v>=hi?'high':null,lo,hi,g};if(x.cap==='<')return{s:lo!==null&&v<=lo?'low':null,lo,hi,g};
 return{s:lo!==null&&v<lo?'low':hi!==null&&v>hi?'high':'ok',lo,hi,g}}
const isBad=j=>!j.g&&(j.s==='low'||j.s==='high');
function rangeBar(v,j){const {lo,hi}=j;if(!Number.isFinite(v)||(lo===null&&hi===null))return '';const l=lo??0,h=hi??Math.max(l*2,v*1.2,1),span=Math.max(h-l,1e-9);
 let mn=lo===null?Math.min(0,v):l-span*.8,mx=hi===null?Math.max(h,v)+span*.2:h+span*.8;mn=Math.max(Math.min(mn,v-span*.1),l-span*2.5);mx=Math.min(Math.max(mx,v+span*.1),h+span*2.5);if(l>=0&&v>=0)mn=Math.max(mn,0);
 const pct=x=>Math.min(100,Math.max(0,(x-mn)/((mx-mn)||1)*100)),zl=lo===null?0:pct(l),zr=hi===null?100:pct(h);
 const bad=isBad(j),pad=bad?'#e57373':'#eba6a6',glove=bad?'#ffe6e2':'#fff3e4',stroke=bad?'#c2564f':'#805a43';
 const paw=`<svg class="armpaw" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="${glove}" stroke="${stroke}" stroke-width="2.4"/><ellipse cx="10.5" cy="14" rx="4.6" ry="5.2" fill="${pad}"/><circle cx="19" cy="8.6" r="2.3" fill="${pad}"/><circle cx="21.6" cy="14" r="2.3" fill="${pad}"/><circle cx="19" cy="19.4" r="2.3" fill="${pad}"/></svg>`;
 return `<div class="abar${j.g?' gen':''}" aria-hidden="true"><i class="zone" style="left:${zl}%;width:${Math.max(zr-zl,1)}%"></i><div class="arm${bad?' bad':''}" style="width:${Math.max(pct(v),4)}%">${paw}</div>${lo!==null?`<em class="tick" style="left:${zl}%">${lo}</em>`:''}${hi!==null?`<em class="tick" style="left:${zr}%">${hi}</em>`:''}</div>`}
function reportView(){
 const reps=reportsOf(active);
 if(!reps.length)return `<div class="card upload-hero"><h3>📷 還沒有報告</h3><p class="muted">拍下醫院的檢驗報告上傳，會自動讀出檢驗日期、體重、年齡與所有項目。</p><button class="btn big" data-goto="records">去上傳報告</button></div>`;
 const r=reps.find(x=>x.id===viewRep)||reps[0],reg=registry();
 const items=DB.metrics.filter(x=>x.cat===active&&x.sourceDoc===r.docId).map(x=>({x,j:judge(x,reg)}));
 const catOf=it=>reg[it.x.key]?.category||LabCore.category(it.x.testName||it.x.key),nameOf=it=>LabCore.zhName(reg[it.x.key]?.name||it.x.testName||it.x.key.split('@@')[0]);
 items.sort((a,b)=>catOf(a).localeCompare(catOf(b),'zh-Hant')||nameOf(a).localeCompare(nameOf(b),'zh-Hant'));
 const bad=items.filter(i=>isBad(i.j)),ok=items.filter(i=>i.j.s==='ok'&&!i.j.g),gen=items.filter(i=>i.j.g&&i.j.s),na=items.filter(i=>!i.j.s);
 const irow=it=>{const {x,j}=it,m=reg[x.key]||{},b=isBad(j);return `<div class="rrow"><div class="rtop"><div class="rname"><b>${safe(nameOf(it))}</b><small>${safe(x.key.split('@@')[0])}・${safe(catOf(it))}</small></div><div class="rval${b?' bad':''}">${safe((x.cap||'')+x.value)} <small>${safe(x.unit||m.unit||'')}</small>${b?`<span class="arrow">${j.s==='high'?'↑':'↓'}</span>`:j.g?(j.s==='ok'?'':`<span class="arrow gray">${j.s==='high'?'↑':'↓'}</span>`):j.s==='ok'?' <span class="thumb">👍</span>':''}</div></div>${rangeBar(num(x.value),j)}<div class="rref">${j.lo!==null||j.hi!==null?(j.g?'通用參考 ':'參考範圍 ')+(j.lo??'—')+'–'+(j.hi??'—')+(j.g?'（報告沒印，非本報告範圍）':''):'這項報告沒有參考範圍'}</div></div>`};
 const sec=(t,list,open,cls)=>list.length?`<details class="card rsec ${cls}"${open?' open':''}><summary>${t}（${list.length} 項）</summary>${list.map(irow).join('')}</details>`:'';
 const chips=reps.map(x=>`<button class="chip${x.id===r.id?' on':''}" data-action="pickrep" data-id="${safe(x.id)}">${safe(x.date)}</button>`).join('');
 return `<div class="card rep-head"><div class="flex"><b>選擇檢驗日期</b><button class="btn soft small" data-goto="records">＋ 上傳新報告</button></div><div class="rep-chips">${chips}</div>
 <div class="rep-sum"><div><b>${items.length}</b><small>檢驗項目</small></div><div class="${bad.length?'bad':'ok'}"><b>${bad.length}</b><small>超出範圍</small></div><div><b>${ok.length}</b><small>正常</small></div></div>
 <div class="muted">下面全部是 ${safe(r.date)} 這一份報告的數據${r.weight!=null?'・體重 '+r.weight+' kg':''}${r.age?'・年齡 '+safe(r.age):''}。綠色＝正常範圍，粉紅色＝超出範圍。貓手伸進綠色區就是正常。</div></div>`
 +(items.length?sec('⚠ 超出參考範圍',bad,true,'sbad')+sec('👍 在參考範圍內',ok,!bad.length,'ok')+(gen.length?`<div class="muted" style="margin:2px 4px">以下 ${gen.length} 項報告沒印正常範圍，改用康乃爾大學獸醫檢驗室的貓咪通用值對照。各醫院儀器不同，只供參考，灰色不代表異常。</div>`+sec('📋 通用參考對照',gen,false,'gen'):'')+sec('沒有參考範圍（只列數值）',na,false,'na'):'<div class="card muted">這份報告沒有匯入任何項目。</div>');
}
/* 預設比較：選最新日期 vs 前一個「不同日期」；同一天有多份時取項目最多的那份。使用者手動選了就照選的 */
function pickPair(asc){const best=ds=>ds.slice().sort((x,y)=>(y.testCount||0)-(x.testCount||0))[0],dates=[...new Set(asc.map(r=>r.date))].sort(),cnt=r=>DB.metrics.filter(m=>m.sourceDoc===r.docId).length,pick=d=>asc.filter(r=>r.date===d).sort((x,y)=>cnt(y)-cnt(x))[0];
 let nw=asc.find(r=>r.id===cmp.b)||pick(dates.at(-1));let old=asc.find(r=>r.id===cmp.a&&r.id!==nw.id);
 if(!old){const prevDates=dates.filter(d=>d<nw.date);old=prevDates.length?pick(prevDates.at(-1)):asc.find(r=>r.id!==nw.id)}
 if(old.date>nw.date)[old,nw]=[nw,old];return[old,nw]}
function compareSection(){
 const reps=reportsOf(active).slice().reverse();
 if(reps.length<2)return reps.length?'<div class="card"><b>比較兩份報告</b><p class="muted">目前只有一份報告。再上傳另一天的報告，就能選兩個日期來比較。</p></div>':'';
 let [old,nw]=pickPair(reps);
 const reg=registry(),nk=x=>LabCore.canonical(x.testName||x.key.split('@@')[0])+'|'+String(LabCore.unit(x.unit)||'').toLowerCase(),rowsOf=r=>new Map(DB.metrics.filter(x=>x.cat===active&&x.sourceDoc===r.docId).map(x=>[nk(x),x]));
 const A=rowsOf(old),B=rowsOf(nw),nameOf=k=>LabCore.zhName(reg[k]?.name||k.split('@@')[0]);
 const list=[...B.keys()].filter(q=>A.has(q)).map(q=>{const p=A.get(q),n=B.get(q);return{k:n.key,p,n,jp:judge(p,reg),jn:judge(n,reg)}});
 list.sort((a,b)=>(isBad(b.jn)-isBad(a.jn))||(isBad(b.jp)-isBad(a.jp))||nameOf(a.k).localeCompare(nameOf(b.k),'zh-Hant'));
 const md=d=>safe(d.slice(5).replace('-','/')),fmt=r=>safe((r.cap||'')+r.value);
 const row=({k,p,n,jp,jn})=>{const v=verdict(p,n,reg[k]),d=n.value-p.value,dd=Math.abs(d)<1e-9?'':(d>0?'▲ ':'▼ ')+Math.abs(Math.round(d*1000)/1000);
  return `<div class="cmp-row"><div class="cmp-name"><b>${safe(nameOf(k))}</b><small>${safe(k.split('@@')[0])}・${safe(n.unit||p.unit||'')}</small></div><div class="${isBad(jp)?'bad':''}">${fmt(p)}</div><div class="${isBad(jn)?'bad':''}"><b>${fmt(n)}</b>${dd?`<small class="d ${v.c}">${dd}</small>`:''}</div><div><span class="status ${v.c}">${v.t}</span></div></div>`};
 const opt=x=>reps.slice().reverse().map(r=>`<option value="${safe(r.id)}"${r.id===x.id?' selected':''}>${safe(r.date)}（${r.testCount||0}項）</option>`).join('');
 const onlyN=[...B.keys()].filter(k=>!A.has(k)).length,onlyO=[...A.keys()].filter(k=>!B.has(k)).length;
 const focus=list.filter(x=>isBad(x.jn)||isBad(x.jp)).slice(0,8);
 return `<div class="card cmp-card"><b>比較兩份報告</b><div class="muted">選兩個檢驗日期，看哪些項目變好、變差</div><div class="cols"><div class="field"><label>較早</label><select id="cmp-a">${opt(old)}</select></div><div class="field"><label>較新</label><select id="cmp-b">${opt(nw)}</select></div></div>`
 +(list.length?`<div class="cmp-head"><div>項目</div><div>${md(old.date)}</div><div>${md(nw.date)}</div><div>變化</div></div>${list.map(row).join('')}`:'<p class="muted">這兩份報告沒有共同項目可以比對。</p>')
 +((onlyN||onlyO)?`<div class="muted" style="margin-top:8px">只在較新報告有 ${onlyN} 項、只在較早報告有 ${onlyO} 項，未列入比較。</div>`:'')
 +'<div class="muted" style="margin-top:6px">判斷只看有沒有更靠近各報告上的參考範圍，不是診斷，請以獸醫說明為準。</div></div>'
 +(focus.length?`<h3 class="sec-title">重點項目動畫（任一份超出範圍）</h3>${focus.map(x=>metricCard(x.k,[x.p,x.n])).join('')}`:(list.length?'<div class="card muted">兩份報告的共同項目都在參考範圍內 👍</div>':''));
}

/* ===== 直接輸出 PDF（不靠外部套件：用 canvas 畫頁面，再包成 PDF） ===== */
function pdfFrom(cvs){const enc=new TextEncoder(),parts=[],offs=[];let len=0;const push=u=>{parts.push(u);len+=u.length},s=t=>push(enc.encode(t));
 s('%PDF-1.4\n');const n=cvs.length,obj=(id,fn)=>{offs[id]=len;s(id+' 0 obj\n');fn();s('\nendobj\n')};
 obj(1,()=>s('<< /Type /Catalog /Pages 2 0 R >>'));
 obj(2,()=>s(`<< /Type /Pages /Count ${n} /Kids [${cvs.map((_,i)=>(3+3*i)+' 0 R').join(' ')}] >>`));
 cvs.forEach((cv,i)=>{const u=Uint8Array.from(atob(cv.toDataURL('image/jpeg',.92).split(',')[1]),ch=>ch.charCodeAt(0)),pid=3+3*i,cs='q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
  obj(pid,()=>s(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${pid+2} 0 R >> >> /Contents ${pid+1} 0 R >>`));
  obj(pid+1,()=>s(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
  obj(pid+2,()=>{s(`<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${u.length} >>\nstream\n`);push(u);s('\nendstream')})});
 const xr=len,total=3*n+3;s(`xref\n0 ${total}\n0000000000 65535 f \n`);for(let i=1;i<total;i++)s(String(offs[i]).padStart(10,'0')+' 00000 n \n');
 s(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);return new Blob(parts,{type:'application/pdf'})}
function pdfReport(){
 const c=pet(),reps=reportsOf(active);if(!reps.length)return null;
 const r=reps.find(x=>x.id===viewRep)||reps[0],reg=registry();
 const catOf=it=>reg[it.x.key]?.category||LabCore.category(it.x.testName||it.x.key),nameOf=it=>LabCore.zhName(reg[it.x.key]?.name||it.x.testName||it.x.key.split('@@')[0]);
 const items=DB.metrics.filter(x=>x.cat===active&&x.sourceDoc===r.docId).map(x=>({x,j:judge(x,reg)}));
 items.sort((a,b)=>catOf(a).localeCompare(catOf(b),'zh-Hant')||nameOf(a).localeCompare(nameOf(b),'zh-Hant'));
 const bad=items.filter(i=>isBad(i.j)),ok=items.filter(i=>i.j.s==='ok'&&!i.j.g),oth=items.filter(i=>!isBad(i.j)&&!(i.j.s==='ok'&&!i.j.g));
 const W=1240,H=1754,M=70,CW=W-2*M,FONT='"Noto Sans TC","Noto Sans CJK TC","PingFang TC","Microsoft JhengHei","Heiti TC",sans-serif';
 const pages=[];let g,y;
 const np=()=>{const cv=document.createElement('canvas');cv.width=W;cv.height=H;g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);pages.push(cv);y=M};
 const F=(sz,b)=>`${b?'700':'400'} ${sz}px ${FONT}`;
 const T=(t,x,yy,sz,col,b,al,mw)=>{t=String(t);let z=sz;g.font=F(z,b);if(mw)while(g.measureText(t).width>mw&&z>13){z--;g.font=F(z,b)}g.fillStyle=col||'#333';g.textAlign=al||'left';g.fillText(t,x,yy)};
 const need=h=>{if(y+h>H-110)np()};
 const rr=(x,yy,w,h,rad,col)=>{g.fillStyle=col;g.beginPath();g.roundRect?g.roundRect(x,yy,w,h,rad):g.rect(x,yy,w,h);g.fill()};
 const sec=(t,col,bg)=>{need(120);y+=14;rr(M,y,CW,50,12,bg);T(t,M+20,y+35,27,col,true);y+=68};
 const bar=(x,yy,w,v,j)=>{const lo=j.lo,hi=j.hi;if(!Number.isFinite(v)||(lo===null&&hi===null))return;const l=lo??0,h=hi??Math.max(v*1.2,l+1),span=Math.max(h-l,1e-9);
  let mn=lo===null?Math.min(0,v):l-span*.8,mx=hi===null?Math.max(h,v)+span*.2:h+span*.8;mn=Math.min(mn,v-span*.1);mx=Math.max(mx,v+span*.1);if(l>=0&&v>=0)mn=Math.max(mn,0);
  const p=q=>x+Math.min(1,Math.max(0,(q-mn)/((mx-mn)||1)))*w,b=isBad(j);
  rr(x,yy,w,18,9,'#fbe3e0');const a=lo===null?x:p(l),z=hi===null?x+w:p(h);rr(a,yy,Math.max(z-a,6),18,9,'#b9dfb9');
  g.beginPath();g.arc(p(v),yy+9,12,0,7);g.fillStyle=b?'#d32f2f':(j.g?'#888':'#2e7d32');g.fill();g.lineWidth=3;g.strokeStyle='#fff';g.stroke()};
 const rowH=70;
 const row=it=>{need(rowH);const {x,j}=it,b=isBad(j),u=x.unit||reg[x.key]?.unit||'';
  T(nameOf(it),M+4,y+30,26,'#222',true,'left',380);T(x.key.split('@@')[0]+'・'+catOf(it),M+4,y+56,17,'#999',false,'left',380);
  T((x.cap||'')+x.value+(b?(j.s==='high'?' ↑':' ↓'):''),M+420,y+30,28,b?'#d32f2f':'#222',true,'left',190);T(u,M+420,y+56,17,'#999',false,'left',190);
  bar(M+630,y+20,290,num(x.value),j);
  const ref=j.lo!==null||j.hi!==null?(j.g?'通用 ':'')+(j.lo??'—')+'–'+(j.hi??'—'):'報告未印範圍';T(ref,M+950,y+36,j.g?18:21,j.g?'#999':'#555',false,'left',CW-950+M-4);
  g.fillStyle='#eee';g.fillRect(M,y+rowH-2,CW,2);y+=rowH};
 np();
 // 抬頭
 T(c.name+'的檢驗報告',M,y+48,50,'#222',true);T('檢驗日期 '+r.date,W-M,y+46,28,'#555',true,'right');y+=84;
 const {cur,prev}=wInfo(active);let age=r.age?String(r.age).trim():'';if(/^\d+(\.\d+)?$/.test(age))age+=' 歲';
 let x0=M;if(age){T('年紀 '+age,x0,y+34,32,'#222',true);g.font=F(32,true);x0+=g.measureText('年紀 '+age).width+50}
 if(cur){const t='體重 '+cur.w+' kg';T(t,x0,y+34,32,'#222',true);g.font=F(32,true);x0+=g.measureText(t).width+24;
  if(prev){const d=Math.round((cur.w-prev.w)*100)/100,tx=d>0?`▲ 比上份報告(${prev.d})重了 ${d} kg`:d<0?`▼ 比上份報告(${prev.d})輕了 ${Math.abs(d)} kg`:`＝ 和上份報告(${prev.d})一樣`;T(tx,x0,y+34,25,d>0?'#1565c0':d<0?'#c0392b':'#2e7d32',true)}}
 y+=64;
 rr(M,y,CW,80,14,'#f6f1ea');const cw=CW/3;[['檢驗項目',items.length,'#222'],['超出範圍',bad.length,bad.length?'#d32f2f':'#2e7d32'],['正常',ok.length,'#2e7d32']].forEach(([t,n,col],i)=>{T(n,M+cw*i+cw/2,y+42,40,col,true,'center');T(t,M+cw*i+cw/2,y+68,18,'#777',false,'center')});y+=104;
 // 異常
 sec(bad.length?`超出參考範圍（${bad.length} 項）`:'超出參考範圍','#b71c1c','#fdeceb');
 if(bad.length)bad.forEach(row);else{need(60);T('這份報告沒有超出範圍的項目',M+10,y+30,24,'#2e7d32',true);y+=56}
 // 比較
 if(reps.length>1){const asc=reps.slice().reverse();let [old,nw]=pickPair(asc);
  const nk=q=>LabCore.canonical(q.testName||q.key.split('@@')[0])+'|'+String(LabCore.unit(q.unit)||'').toLowerCase(),rowsOf=q=>new Map(DB.metrics.filter(m=>m.cat===active&&m.sourceDoc===q.docId).map(m=>[nk(m),m]));
  const A=rowsOf(old),B=rowsOf(nw);const list=[...B.keys()].filter(k=>A.has(k)).map(k=>({p:A.get(k),n:B.get(k)}));list.forEach(o=>{o.jp=judge(o.p,reg);o.jn=judge(o.n,reg)});
  list.sort((a,b)=>(isBad(b.jn)-isBad(a.jn))||(isBad(b.jp)-isBad(a.jp)));
  sec(`與上次比較：${old.date} → ${nw.date}（共同 ${list.length} 項）`,'#0d47a1','#e8f1fb');
  if(list.length){need(50);T('項目',M+4,y+24,20,'#777',true);T(old.date.slice(5),M+470,y+24,20,'#777',true);T(nw.date.slice(5),M+640,y+24,20,'#777',true);T('變化',M+830,y+24,20,'#777',true);y+=38;
   list.forEach(({p,n,jp,jn})=>{need(58);const v=verdict(p,n,reg[n.key]),d=n.value-p.value,dd=Math.abs(d)<1e-9?'':(d>0?'▲':'▼')+Math.abs(Math.round(d*1000)/1000),col=v.c==='better'?'#2e7d32':v.c==='worse'?'#d32f2f':'#777';
    T(LabCore.zhName(reg[n.key]?.name||n.testName||n.key.split('@@')[0]),M+4,y+26,24,'#222',true,'left',420);T(n.unit||p.unit||'',M+4,y+48,16,'#999',false,'left',420);
    T((p.cap||'')+p.value,M+470,y+32,26,isBad(jp)?'#d32f2f':'#222',isBad(jp));T((n.cap||'')+n.value,M+640,y+32,26,isBad(jn)?'#d32f2f':'#222',true);
    T((dd?dd+' ':'')+v.t,M+830,y+32,21,col,true,'left',CW-830+M-4);g.fillStyle='#eee';g.fillRect(M,y+56,CW,2);y+=58})}
  else{need(60);T('這兩份報告沒有共同項目可以比對',M+10,y+30,22,'#777');y+=56}}
 // 正常
 if(ok.length){sec(`在參考範圍內（${ok.length} 項）`,'#1b5e20','#e8f5e9');ok.forEach(row)}
 if(oth.length){sec(`其他：報告沒印範圍，灰色為通用貓咪值（${oth.length} 項）`,'#555','#f0f0f0');oth.forEach(row)}
 // 頁尾
 pages.forEach((cv,i)=>{g=cv.getContext('2d');g.fillStyle='#ddd';g.fillRect(M,H-92,CW,2);T(`貓奴值班中・${c.name}・輸出日期 ${today}・僅供參考，請以獸醫判讀為準`,M,H-52,19,'#888');T(`${i+1} / ${pages.length}`,W-M,H-52,19,'#888',false,'right')});
 return{blob:pdfFrom(pages),name:`${c.name}-檢驗報告-${r.date}.pdf`,pages:pages.length,cvs:pages}}
function trendSection(){const all=registry(),keys=Object.keys(all).filter(k=>actualRows(k).length>=2);
 keys.sort((a,b)=>{const x=all[a].category||LabCore.category(a),y=all[b].category||LabCore.category(b);return x.localeCompare(y,'zh-Hant')||a.localeCompare(b)});
 if(!keys.length)return '';
 return `<details class="trend-wrap"><summary class="card"><b>📈 長期走勢動畫</b>（驗過兩次以上的 ${keys.length} 項，點開查看）</summary><div class="flex" style="margin:6px 0"><span class="muted">每項一張，看一段時間的變化</span><button class="btn soft small" data-action="newtest">＋ 新增檢驗項目</button></div>${keys.map(k=>metricCard(k)).join('')}</details>`}
function home(){const c=pet(),next=DB.events.filter(x=>x.cat===active&&x.date>=today).sort(byDate)[0];return `<div class="flex"><div><div class="page-title">${safe(c.name)}的檢驗報告</div>${petStats(c)}</div><div style="display:grid;gap:6px"><button class="btn small" data-action="pdf">📄 匯出 PDF</button><button class="btn soft small" data-action="newcat">＋ 新增貓咪</button></div></div>${reportView()}${compareSection()}${trendSection()}<div class="card"><div class="flex"><b>下次回診</b><button class="btn soft small" data-goto="calendar">安排回診</button></div><p>${next?`${safe(next.date)} · ${safe(next.title)}`:'目前尚未安排回診'}</p></div><div class="notice">檢驗結果需由獸醫判讀，紅色與動畫只是視覺提示。此版本為本機試用，沒有帳號與雲端備份。瀏覽器資料可能遺失，請勿將它作為唯一病歷保存位置。</div>`}
function keyFor(name,unit){const code=LabCore.canonical(name),u=LabCore.unit(unit),built=defs[code];return built&&(!u||LabCore.unit(built.unit)===u)?code:LabCore.identity(name,u)}
const parseVal=s=>{const m=String(s).trim().match(/^([<>]?)\s*(-?\d+(?:[.,]\d+)?)$/);return m?{cap:m[1],v:Number(m[2].replace(',','.'))}:null};
function prevOf(key,date){return actualRows(key).filter(x=>x.date<date&&x.sourceDoc!==scanState?.docId).pop()}
function docGroup(id){return DB.docs.filter(x=>x.id===id||x.lead===id)}
function aiBadge(){const m=LabAI.mode();return m==='ocr'?`<div class="notice">⚠ 還沒設定 AI 辨識，現在用的是準確度較低的內建 OCR。<button class="linkish" data-action="aiset">設定 AI 辨識</button></div>`:`<p class="muted">✓ AI 辨識已啟用（${m==='key'?'API 金鑰':'沿用貓咪健康紀錄的後端'}）　<button class="linkish" data-action="aiset">設定</button></p>`}
/* 兩次同項比較：只看「兩次都有驗、單位相同」的項目，看有沒有更靠近該項的參考範圍 */
function verdict(p,n,reg){
 const lo=n.lo??p.lo??reg?.lo,hi=n.hi??p.hi??reg?.hi;
 if(p.cap||n.cap)return{t:'超出儀器上限，無法判斷',c:'neutral'};
 if(lo==null||hi==null)return{t:'沒有參考範圍',c:'neutral'};
 const dist=v=>v<lo?lo-v:v>hi?v-hi:0,was=dist(p.value),is=dist(n.value),t=Math.max((hi-lo)*.04,.03);
 return was-is>t?{t:'更靠近參考範圍',c:'better'}:is-was>t?{t:'離參考範圍更遠',c:'worse'}:{t:is===0?'維持在範圍內':'差不多',c:'neutral'};
}
function metricsPage(){
 const r=latestReport(),all=registry(),used=new Set(r?DB.metrics.filter(x=>x.cat===active&&x.sourceDoc===r.docId).map(x=>x.key):[]);
 const keys=labView==='current'?(r?[...used]:[]):Object.keys(all);
 keys.sort((a,b)=>{let x=all[a].category||LabCore.category(a),y=all[b].category||LabCore.category(b);return x.localeCompare(y,'zh-Hant')||a.localeCompare(b)});
 return `<div class="flex"><div><div class="page-title">${safe(pet().name)}的檢驗指數</div><div class="muted">每次只看當次檢驗，也能查看歷史所有項目</div></div><button class="btn soft small" data-action="newtest">＋ 新增檢驗項目</button></div>
 <div class="card"><div class="lab-modes"><button class="btn ${labView==='current'?'':'soft'}" data-action="labview" data-view="current">本次檢驗</button><button class="btn ${labView==='history'?'':'soft'}" data-action="labview" data-view="history">歷史全部項目</button></div><p class="muted">${labView==='current'?(r?'最近報告：'+safe(r.date)+'，僅列出這次有檢驗的項目':'還沒有已確認的報告；請先到「病歷」匯入並核對檢驗結果'):'包含所有歷史檢驗項目及未來可新增的項目；本次未檢驗不代表數值為 0。'}</p></div>
 <div class="muted" style="margin:6px 2px">這頁只列有兩次以上紀錄的項目走勢；只驗過一次的項目請看首頁的報告。</div>
 ${keys.length?keys.map(k=>{const recent=!used.has(k)&&r?'<div class="muted" style="margin:0 4px 5px">本次未檢驗；歷史紀錄保留</div>':'';const rows=actualRows(k);if(labView==='history'&&!rows.length)return `<div class="card"><strong>${safe(all[k].name)} ${safe(k.split('@@')[0])}</strong><div class="muted">尚無真實檢驗紀錄，未來驗到會自動保留</div><button class="btn soft small" data-action="newmetric" data-key="${safe(k)}">＋ 輸入數值</button></div>`;if(rows.length===1)return '';return recent+metricCard(k)}).join(''):'<div class="card empty">尚無本次檢驗數據。請先上傳報告並確認。</div>'}
 <div class="notice">重要：沒有驗的項目不會刪除、不會補零。照片自動辨識可能漏讀，必須與原始報告逐項核對。</div>`;
}
function recordsPage(){const docs=DB.docs.filter(x=>x.cat===active).sort((a,b)=>b.date.localeCompare(a.date));const reports=DB.reports.filter(x=>x.cat===active).sort((a,b)=>b.date.localeCompare(a.date));return `<div class="flex"><div class="page-title">醫療病歷</div><button class="btn soft small" data-action="pdf">匯出 PDF</button></div><div class="muted">保存原始檔，辨識完整檢驗資料，確認後才寫入趨勢圖</div>
 <div class="card upload-hero"><h3>📷 上傳報告，自動辨識</h3><p class="muted">拍整張報告（不反光、字清楚）。同一份報告有好幾頁，可以一次選好幾張。選好後會自動讀出所有檢驗項目，核對後按儲存即可。</p><label class="btn big">選擇報告照片<input type="file" id="quick-file" multiple accept="image/*,application/pdf" hidden></label>${aiBadge()}</div>
 <details class="card"><summary>其他檔案（X 光、處方、超音波…）</summary><div class="cols"><div class="field"><label>報告日期（稍後可以修正）</label><input type="date" id="doc-date" value="${today}"></div><div class="field"><label>資料類型</label><select id="doc-type"><option>血檢</option><option>尿檢</option><option>X 光</option><option>超音波</option><option>處方</option><option>其他</option></select></div></div><div class="field"><label>備註</label><input id="doc-note" placeholder="醫院／檢查說明"></div><div class="field"><label>圖片或 PDF，每份不超過 12 MB</label><input type="file" id="doc-file" multiple accept="image/*,application/pdf"></div><button class="btn" data-action="addfiles">儲存原始檔</button><p class="muted">上傳後按每份報告的「辨識／輸入數據」。首次照片 OCR 需下載辨識程式；辨識在本機進行，不需要 OpenAI 金鑰。</p></details>
 <div class="card"><h3>已有 ${docs.length} 份原始檔</h3>${docs.length?docs.map(o=>{const rp=DB.reports.find(r=>r.docId===o.id);return `<div class="entry"><span style="font-size:22px">${o.mime==='application/pdf'?'📄':'🩻'}</span><div class="entry-body"><strong>${safe(o.date)} · ${safe(o.type)}</strong><div class="muted">${safe(o.name)}</div><div class="muted">${o.lead&&o.lead!==o.id?'同一份報告的其他頁':rp?'已確認 '+rp.testCount+' 項 · '+safe(rp.date):'尚未擷取檢驗數據'}</div></div><div class="lab-entry-buttons"><button class="btn soft small" data-action="viewfile" data-id="${safe(o.id)}">查看</button>${o.lead&&o.lead!==o.id?'':`<button class="btn small" data-action="recognize" data-id="${safe(o.id)}">${rp?'核對／修改':'辨識／輸入'}</button><button class="btn outline small" data-action="deldoc" data-id="${safe(o.id)}">刪除</button>`}</div></div>`}).join(''):'<div class="empty">還沒有上傳病歷</div>'}</div>
 <div class="card"><h3>③ 已確認的檢驗紀錄</h3>${reports.length?reports.map(r=>`<div class="entry"><div class="entry-body"><strong>${safe(r.date)} · ${r.testCount||0} 項</strong><div class="muted">體重：${r.weight??'未提供'} kg · 年齡：${safe(r.age||'未提供')} · ${safe(r.kind||'檢驗')}</div></div><button class="btn soft small" data-action="labview" data-view="history">看歷史</button></div>`).join(''):'<div class="empty">尚未確認檢驗結果</div>'}</div>
 <div class="notice">本機測試版：照片／PDF 只存這台裝置的瀏覽器，不具備帳號同步或雲端備份。文字 PDF 可試讀；掃描 PDF 請改拍清晰照片。請勿刪除唯一一份原始報告。</div>`}
function carePage(){let logs=DB.care.filter(x=>x.cat===active).sort((a,b)=>b.date.localeCompare(a.date));return `<div class="page-title">每日照護</div><div class="muted">記下體重、皮下輸液、食慾、飲水與用藥</div><div class="card"><div class="field"><label>日期</label><input type="date" id="care-date" value="${today}"></div><div class="cols"><div class="field"><label>體重 kg</label><input type="number" id="weight" step=".01" placeholder="例如 2.6"></div><div class="field"><label>皮下輸液 ml</label><input type="number" id="fluid" step="1"></div></div><div class="cols"><div class="field"><label>食慾</label><select id="appetite"><option>正常</option><option>很好</option><option>稍差</option><option>沒有進食</option></select></div><div class="field"><label>飲水</label><select id="water"><option>正常</option><option>增加</option><option>減少</option></select></div></div><div class="field"><label>藥物與照護備註</label><textarea id="care-note" placeholder="藥名、劑量、排尿、精神狀況等"></textarea></div><button class="btn" data-action="savecare">儲存今日紀錄</button></div><div class="card"><h3>最近紀錄</h3>${logs.length?logs.map(o=>`<div class="entry"><span>♡</span><div class="entry-body"><strong>${safe(o.date)}</strong><div class="muted">體重 ${safe(o.weight||'—')} kg · 輸液 ${safe(o.fluid||'—')} ml · 食慾${safe(o.appetite)} · 飲水${safe(o.water)}</div><div class="muted">${safe(o.note)}</div></div></div>`).join(''):'<div class="empty">尚無照護紀錄</div>'}</div>`}
function calendarPage(){const count=new Date(year,month+1,0).getDate(),start=new Date(year,month,1).getDay();let grid=['日','一','二','三','四','五','六'].map(x=>`<div class="weekday">${x}</div>`).join('');for(let i=0;i<start;i++)grid+='<div></div>';for(let d=1;d<=count;d++){let date=year+'-'+pad(month+1)+'-'+pad(d);grid+=`<button class="day ${selected===date?'selected':''} ${DB.events.some(x=>x.cat===active&&x.date===date)?'has-event':''}" data-action="day" data-date="${date}">${d}</button>`};const events=DB.events.filter(x=>x.cat===active).sort(byDate);return `<div class="page-title">回診行事曆</div><div class="muted">看診、用藥及照護提醒</div><div class="card"><div class="flex" style="margin-bottom:13px"><button class="btn soft" data-action="month" data-shift="-1">‹</button><b>${year} 年 ${month+1} 月</b><button class="btn soft" data-action="month" data-shift="1">›</button></div><div class="calendar">${grid}</div></div><div class="card"><h3>新增提醒</h3><div class="cols"><div class="field"><label>日期</label><input type="date" id="event-date" value="${selected}"></div><div class="field"><label>時間</label><input type="time" id="event-time" value="10:00"></div></div><div class="field"><label>提醒事項</label><input id="event-title" placeholder="例如：腎功能抽血、餵藥"></div><button class="btn" data-action="saveevent">新增提醒</button></div><div class="card"><h3>已安排事項</h3>${events.length?events.map(o=>`<div class="entry"><span>📅</span><div class="entry-body"><strong>${safe(o.date)} ${safe(o.time)}</strong><div class="muted">${safe(o.title)}</div></div><button class="btn soft small" data-action="ics" data-id="${safe(o.id)}">加入手機日曆</button></div>`).join(''):'<div class="empty">尚無提醒</div>'}</div><div class="notice">目前不會主動發送通知，可將事件匯入手機日曆，再由手機日曆提醒。</div>`}
function render(scroll=true){for(const f of Object.values(frames))cancelAnimationFrame(f);frames={};$('#petSwitch').innerHTML=DB.cats.map(c=>`<button class="pet-choice" data-pet="${safe(c.id)}" aria-pressed="${c.id===active}"><span class="avatar">${avatar(c)}</span><span><strong>${safe(c.name)}</strong><small>${safe(petLine(c))}</small></span></button>`).join('');$('#content').innerHTML=(({home,records:recordsPage,care:carePage,calendar:calendarPage})[tab]||home)();$$('#bottomNav button').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));if(scroll)$('#content').scrollTop=0;if(tab==='home'||tab==='metrics')requestAnimationFrame(()=>{$$('[data-chart]').forEach(x=>play(x.dataset.chart))})}
function prepare(k){const card=$(`[data-chart="${k}"]`);if(!card)return null;const sprite=card.querySelector('.cat-sprite');if(!sprite)return null;cancelAnimationFrame(frames[k]);const pts=card.dataset.points.split(';').map(x=>{let [a,b]=x.split(',').map(Number);return{x:a,y:b}});const move=p=>{sprite.style.left=p.x/420*100+'%';sprite.style.top=p.y/224*100+'%'};return {sprite,pts,move}}
function play(k){const o=prepare(k);if(!o)return;const {sprite,pts,move}=o,s=sprite.dataset.mood;sprite.className='cat-sprite '+s+' walking';void sprite.offsetWidth;move(pts[0]);if(pts.length<2){end();return}let lengths=[0];for(let i=1;i<pts.length;i++)lengths.push(lengths.at(-1)+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));let start=0,L=lengths.at(-1);function frame(t){if(!sprite.isConnected)return;if(!start)start=t;let p=Math.min(1,(t-start)/3100),distance=L*p,i=0;while(i<lengths.length-2&&distance>lengths[i+1])i++;let a=pts[i],b=pts[i+1],v=(distance-lengths[i])/(lengths[i+1]-lengths[i]||1);move({x:a.x+(b.x-a.x)*v,y:a.y+(b.y-a.y)*v});if(p<1)frames[k]=requestAnimationFrame(frame);else end()}function end(){sprite.className='cat-sprite '+s+' '+(s==='better'?'celebrate':s==='worse'?'sitting':'rest')}frames[k]=requestAnimationFrame(frame)}
function seat(k){const o=prepare(k);if(!o)return;o.move(o.pts.at(-1));o.sprite.className='cat-sprite worse sitting'}
function modal(html){$('#dialogRoot').innerHTML=`<div class="dialog-backdrop"><div class="dialog">${html}</div></div>`}
function close(){ $('#dialogRoot').innerHTML='' }
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const download=(name,blob)=>{const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)};
const asJSON=()=>JSON.stringify({meta:{format:'貓奴值班中本機試用資料',date:today,note:'不包含原始影像附件'},data:DB},null,2);
function doctorHTML(months){
 const c=pet(),reg=registry();
 const lim=new Date();if(months)lim.setMonth(lim.getMonth()-months);const cut=months?dateOf(lim):'0000-00-00';
 const mine=DB.metrics.filter(x=>x.cat===active);
 let dates=[...new Set(mine.filter(x=>x.date>=cut).map(x=>x.date))].sort();
 if(dates.length<2)dates=[...new Set(mine.map(x=>x.date))].sort().slice(-2);
 const used=mine.filter(x=>dates.includes(x.date)),by=new Map(used.map(x=>[x.key+'|'+x.date,x]));
 const rank=k=>{const i=Object.keys(defs).indexOf(k);return i<0?99:i};
 const keys=[...new Set(used.map(x=>x.key))].sort((x,y)=>rank(x)-rank(y)||(reg[x]?.category||LabCore.category(x)).localeCompare(reg[y]?.category||LabCore.category(y),'zh-Hant')||x.localeCompare(y));
 const last=dates.at(-1),nm=k=>reg[k]?.name||k.split('@@')[0];
 const zone=(r,k)=>{const lo=r.lo??reg[k]?.lo,hi=r.hi??reg[k]?.hi;if(lo==null||hi==null)return r.flag==='H'?'H':r.flag==='L'?'L':'';return r.value<lo?'L':r.value>hi?'H':''};
 const cell=(k,d)=>{const r=by.get(k+'|'+d);if(!r)return '<td class="na">—</td>';const z=zone(r,k);return `<td class="${z?'out':''}${d===last?' latest':''}">${safe((r.cap||'')+r.value)}${z?' '+(z==='H'?'↑':'↓'):''}</td>`};
 const refOf=k=>{const r=mine.filter(x=>x.key===k).sort(byDate).at(-1)||{},lo=r.lo??reg[k]?.lo,hi=r.hi??reg[k]?.hi;return lo==null||hi==null?'—':lo+'–'+hi};
 const body=keys.map(k=>{const u=(by.get(k+'|'+last)||mine.filter(x=>x.key===k).sort(byDate).at(-1)||{}).unit||reg[k]?.unit||'';return `<tr><th>${safe(nm(k))}<small>${safe(k.split('@@')[0])}・${safe(u)}</small></th>${dates.map(d=>cell(k,d)).join('')}<td class="ref">${safe(refOf(k))}</td></tr>`}).join('');
 const outNow=keys.filter(k=>{const r=by.get(k+'|'+last);return r&&zone(r,k)}).map(k=>{const r=by.get(k+'|'+last);return safe(nm(k)+' '+(r.cap||'')+r.value+(zone(r,k)==='H'?'↑':'↓'))});
 const reps=DB.reports.filter(x=>x.cat===active).sort((a,b)=>b.date.localeCompare(a.date)),age=(reps.find(x=>x.age)||{}).age||'';
 const wts=DB.care.filter(x=>x.cat===active&&Number(x.weight)>0&&x.date>=cut).slice().sort(byDate);
 const wRows=wts.map((x,i)=>{const d=i?Math.round((Number(x.weight)-Number(wts[i-1].weight))*100)/100:null;return `<tr><td>${safe(x.date)}</td><td>${safe(x.weight)}</td><td>${d==null?'—':(d>0?'+':'')+d}</td></tr>`}).join('');
 const care=DB.care.filter(x=>x.cat===active&&x.date>=cut&&(x.fluid||(x.note&&!x.sourceDoc))).slice().sort((a,b)=>b.date.localeCompare(a.date));
 const docs=DB.docs.filter(x=>x.cat===active&&x.date>=cut&&!(x.lead&&x.lead!==x.id)).slice().sort((a,b)=>b.date.localeCompare(a.date));
 const label=months?'最近 '+months+' 個月':'全部紀錄';
 return `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(c.name)}｜貓奴值班中醫療摘要</title><style>body{font:14px/1.7 sans-serif;color:#333;max-width:1000px;margin:25px auto;padding:0 16px}h1{font-size:23px;margin-bottom:4px}h2{border-bottom:2px solid #eee;padding-bottom:5px;margin-top:26px}.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 7px;text-align:center;font-size:12px;white-space:nowrap}th{background:#f6f1ec}tbody th{text-align:left;white-space:normal}th small{display:block;font-weight:400;color:#777;font-size:10px}td.out{background:#fde9e3;color:#a4402f;font-weight:700}td.latest{border-left:2px solid #b9867a;border-right:2px solid #b9867a}th.latest{background:#ead9cf}td.na{color:#bbb}td.ref{color:#666;background:#faf7f4}.sum{background:#faf3ee;border-radius:8px;padding:10px 12px;margin:10px 0}li{padding:3px 0}.note{font-size:12px;color:#555}@page{size:A4 landscape;margin:12mm}@media print{body{margin:0;padding:0}tr{break-inside:avoid}}</style>
<h1>${safe(c.name)}｜健康與檢驗病歷摘要</h1><p>匯出日期：${today}　｜　期間：${label}${age?'　｜　年齡：'+safe(age):''}${wts.length?'　｜　最近體重：'+safe(wts.at(-1).weight)+' kg（'+safe(wts.at(-1).date)+'）':''}</p>
<h2>歷次檢驗結果（每列一個項目，每欄一次檢驗）</h2>${keys.length?`<div class="sum"><b>最近一次（${safe(last)}）</b>：${outNow.length?'超出參考範圍的項目：'+outNow.join('、'):'所有項目都在參考範圍內'}</div><div class="wrap"><table><thead><tr><th>項目</th>${dates.map(d=>`<th${d===last?' class="latest"':''}>${safe(d)}${d===last?'<small>最近一次</small>':''}</th>`).join('')}<th>參考範圍</th></tr></thead><tbody>${body}</tbody></table></div><p class="note">紅底＝超出該報告的參考範圍（↑偏高、↓偏低）；「—」＝該次沒有檢驗，不代表數值為 0。參考範圍取最近一次報告上的範圍。</p>`:'<p>尚無檢驗數據</p>'}
<h2>體重變化</h2>${wRows?`<div class="wrap"><table><thead><tr><th>日期</th><th>體重 kg</th><th>與上次相差</th></tr></thead><tbody>${wRows}</tbody></table></div>`:'<p>此期間沒有體重紀錄</p>'}
<h2>日常照護（皮下輸液、備註）</h2>${care.length?`<div class="wrap"><table><thead><tr><th>日期</th><th>皮下輸液 ml</th><th>照護備註</th></tr></thead><tbody>${care.map(x=>`<tr><td>${safe(x.date)}</td><td>${safe(x.fluid||'—')}</td><td style="text-align:left;white-space:normal">${safe(x.note||'')}</td></tr>`).join('')}</tbody></table></div>`:'<p>此期間沒有輸液或照護備註</p>'}
<h2>相關原始附件清單</h2>${docs.length?`<ul>${docs.map(x=>`<li>${safe(x.date)} · ${safe(x.type)} · ${safe(x.name)}</li>`).join('')}</ul>`:'<p>尚無原始附件</p>'}
<p class="note">此摘要不含附件原始檔，須另外從 App 的病歷清單下載。可用瀏覽器「列印 → 儲存為 PDF」。數值來自 AI 讀取或手動輸入，可能有誤，請以原始報告為準，並非獸醫診斷。</p></html>`;
}
function createICS(o){const t=(o.date.replaceAll('-','')+'T'+o.time.replace(':','')+'00'),later=(o.date.replaceAll('-','')+'T'+(o.time||'10:00').replace(':','')+'00');const clean=s=>String(s).replace(/[\\,;\n]/g,' ');download('貓奴值班中-'+o.date+'.ics',new Blob(['BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:'+o.id+'@miaotherapy\r\nDTSTART:'+t+'\r\nDTEND:'+later+'\r\nSUMMARY:'+clean(o.title)+'\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n'],{type:'text/calendar;charset=utf-8'}))}
let idbPromise;
function store(){if(!idbPromise){idbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('miaotherapy-codex-files-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('files');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}return idbPromise}
async function putFile(id,file){const db=await store();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function delFile(id){const db=await store();return new Promise(res=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=()=>res();tx.onerror=()=>res()})}
async function getFile(id){const db=await store();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly'),r=tx.objectStore('files').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function compressPhoto(f){return new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(f);img.onload=()=>{const s=Math.min(1,320/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',.78))};img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('無法開啟此照片'))};img.src=u})}
function examCell(row={},date){
 const v=x=>safe(x===null||x===undefined?'':String(x));
 let prev='';
 if(row.name&&date){const p=prevOf(keyFor(row.name,row.unit),date);if(p)prev=`<div class="exam-prev">上次 ${safe((p.cap||'')+p.value)}（${safe(p.date.slice(5).replace('-','/'))}）</div>`}
 return `<div class="exam-row">
 <input class="exam-name" aria-label="檢驗項目" placeholder="項目名稱（例如 CRE）" value="${v(row.name)}">
 <input class="exam-value" aria-label="數值" inputmode="decimal" placeholder="數值" value="${v((row.cap||'')+(row.value??''))}">
 <input class="exam-unit" aria-label="單位" placeholder="單位" value="${v(row.unit)}">
 <input class="exam-lo" aria-label="下限" type="number" step="any" placeholder="參考下限" value="${v(row.lo)}">
 <input class="exam-hi" aria-label="上限" type="number" step="any" placeholder="參考上限" value="${v(row.hi)}">
 <select class="exam-flag" aria-label="異常標示"><option value="" ${!row.flag?'selected':''}>未標示</option><option value="H" ${row.flag==='H'?'selected':''}>偏高</option><option value="L" ${row.flag==='L'?'selected':''}>偏低</option></select>
 <button class="btn soft small" data-action="deltest" type="button">移除此列</button>${prev}
 </div>`;
}
function reviewExam(docId,parsed={rows:[],date:null,weight:null,rawText:''}){
 const d=DB.docs.find(x=>x.id===docId);if(!d)return;
 scanState={docId};const old=DB.reports.find(x=>x.docId===docId);
 const oldRows=old?DB.metrics.filter(x=>x.sourceDoc===docId).map(x=>({...x,name:x.testName})):[];
 const rows=parsed.rows?.length?parsed.rows:oldRows;
 const date=parsed.date||old?.date||d.date;
 const msg=parsed.error?`<div class="notice">自動讀取沒有成功：${safe(parsed.error)}　你仍可以自己加入項目，或換更清楚的照片再試。</div>`
  :parsed.ai?`<div class="notice ok">AI 讀到 <b>${rows.length}</b> 項。請對照原始照片逐項核對，有錯直接改；<b>按儲存才會寫入</b>。</div>`
  :`<div class="notice">請對照原始照片逐項核對：OCR 可能漏掉項目、辨錯小數點或單位。<b>未經確認不會寫入。</b></div>`;
 modal(`<div class="flex"><strong>${safe(d.name)}｜辨識核對</strong><button class="dialog-close close">關閉</button></div>${msg}
 <div class="exam-thumbs" id="exam-thumbs"></div>
 <div class="cols"><div class="field"><label>檢驗日期</label><input id="exam-date" type="date" value="${safe(date)}"></div><div class="field"><label>報告體重 (kg)，未提供可留白</label><input id="exam-weight" type="number" step="any" min="0" value="${parsed.weight??old?.weight??''}"></div></div>
 <div class="field"><label>年齡（報告上印的，例如 16Y 3M；沒有可留白）</label><input id="exam-age" value="${safe(parsed.age??old?.age??'')}" maxlength="24"></div>
 ${parsed.ai?'':`<div class="field"><label>辨識文字／手動貼上（可修改後重新解析）</label><textarea id="exam-raw" rows="3" placeholder="例如：CREA 2.8 mg/dL 0.8-2.4">${safe(parsed.rawText||'')}</textarea><button class="btn soft small" data-action="reparse" type="button">從文字重新整理項目</button></div>`}
 <div class="flex"><strong>檢驗項目 <span id="exam-count">${rows.length}</span> 項</strong><button class="btn soft small" data-action="addtest" type="button">＋ 新增任意項目</button></div>
 <div class="exam-head">名稱　｜　數值（可加 > 或 <）　｜　單位　｜　參考下限／上限　｜　標示</div><div id="exam-rows">${rows.length?rows.map(r=>examCell(r,date)).join(''):examCell({},date)}</div>
 <div class="notice">這次沒檢驗的項目不需要填寫，也不會從歷史資料移除。辨識不到的項目請按「新增任意項目」。</div>
 <button class="btn" data-action="saveexam" type="button">我已核對，儲存本次全部項目</button>${LabAI.mode()!=='ocr'&&old?' <button class="btn soft" data-action="rereadai" type="button">重新用 AI 讀取</button>':''}`);
 (async()=>{const box=$('#exam-thumbs');if(!box)return;for(const x of docGroup(docId)){try{const f=await getFile(x.id);if(!f||!box.isConnected)continue;const u=URL.createObjectURL(f);objectURLs.push(u);box.insertAdjacentHTML('beforeend',f.type==='application/pdf'?`<a href="${u}" target="_blank" rel="noopener">📄 ${safe(x.name)}</a>`:`<a href="${u}" target="_blank" rel="noopener"><img alt="報告照片，點一下放大" src="${u}"></a>`)}catch(e){}}})();
}
function currentExamRows(){return [...document.querySelectorAll('#exam-rows .exam-row')].map(el=>{
 const s=q=>el.querySelector(q).value.trim();return {name:s('.exam-name'),value:s('.exam-value'),unit:s('.exam-unit'),lo:s('.exam-lo'),hi:s('.exam-hi'),flag:s('.exam-flag')}
}).filter(x=>x.name||x.value)}
const canonName=n=>{const c=LabCore.canonical(n);return LabCore.NAMES[c]?c:n};
async function runRecognition(docId,docs){
 const m=LabAI.mode(),doc=DB.docs.find(x=>x.id===docId);if(!doc)return;
 modal(`<div class="flex"><strong>正在讀取報告</strong><button class="dialog-close close">關閉</button></div><div class="notice"><span class="spin"></span>${m==='ocr'?'用內建 OCR 讀取（首次需下載辨識程式，準確度較低）…':'AI 正在逐項讀取，約 20–60 秒，請不要離開這個畫面…'}</div>`);
 let parsed;
 try{
  const files=[];for(const d of docs){const f=await getFile(d.id);if(!f)throw new Error('找不到這份附件，請重新上傳');files.push(f)}
  if(m==='ocr'){let txt='';for(const f of files)txt+='\n'+await LabOCR.readFile(f);parsed=LabCore.parse(txt,doc.type);parsed.ai=false}
  else{const r=await LabAI.read(files);parsed={date:r.date,weight:r.weight,age:r.age,rows:r.rows.map(x=>({name:canonName(x.name),value:x.value,cap:x.cap,unit:LabCore.unit(x.unit),lo:x.lo,hi:x.hi,flag:x.flag})).filter((x,i,a)=>a.findIndex(y=>keyFor(y.name,y.unit)===keyFor(x.name,x.unit))===i),rawText:'',ai:true}}
 }catch(err){parsed={rows:[],date:null,weight:null,rawText:'',error:err.message}}
 if(!$('.dialog'))return;
 if(parsed.ai&&parsed.rows.length){
  const ok=saveExam({docId,date:parsed.date||doc.date||today,weight:parsed.weight,age:parsed.age||'',rows:parsed.rows.map(x=>({name:x.name,value:(x.cap||'')+x.value,unit:x.unit,lo:x.lo==null?'':String(x.lo),hi:x.hi==null?'':String(x.hi),flag:x.flag}))});
  if(ok){render(false);importSummary(docId);return}
 }
 reviewExam(docId,parsed);
}
async function recognizeDoc(docId){const rp=DB.reports.find(r=>r.docId===docId);if(rp){reviewExam(docId);return}runRecognition(docId,docGroup(docId))}
async function quickUpload(files){
 files=files.filter(f=>f.type.startsWith('image/')||f.type==='application/pdf');
 if(!files.length){alert('請選擇圖片或 PDF');return}
 const ids=[];
 for(const f of files){
  if(f.size>12*1024*1024){alert(f.name+' 超過 12 MB，已略過');continue}
  const i=id();try{await putFile(i,f);DB.docs.push({id:i,cat:active,date:today,type:'血檢',note:'',name:f.name||'報告照片',mime:f.type,lead:ids[0]||i});ids.push(i)}catch(err){alert('無法儲存 '+f.name+'：'+err.message)}
 }
 if(!ids.length)return;
 persist();
 await runRecognition(ids[0],docGroup(ids[0]));
}
function saveExam(auto){
 const fail=m=>{if(!auto)alert(m);return false};
 const d=DB.docs.find(x=>x.id===(auto?auto.docId:scanState?.docId));if(!d)return false;
 const date=auto?auto.date:$('#exam-date').value,weight=auto?(auto.weight==null?'':String(auto.weight)):$('#exam-weight').value.trim(),rawRows=auto?auto.rows:currentExamRows(),age=auto?(auto.age||''):($('#exam-age')?.value.trim()||'');
 if(!date)return fail('請確認檢驗日期');if(!rawRows.length)return fail('請至少輸入一項檢驗結果');
 const inputs=[],seen=new Set();
 for(const r of rawRows){
  const pv=parseVal(r.value);
  if(!r.name||!pv)return fail('每一列必須有項目名稱及有效數值（可在數字前加 > 或 <）：'+(r.name||'（未命名）'));
  if(r.lo!==''&&!Number.isFinite(Number(r.lo))||r.hi!==''&&!Number.isFinite(Number(r.hi)))return fail('參考區間應為數字，或留白');
  const code=LabCore.canonical(r.name),unit=LabCore.unit(r.unit),built=defs[code],k=keyFor(r.name,r.unit);
  if(seen.has(k))return fail('同一次檢驗有重複項目 '+r.name+'，請合併或更正');seen.add(k);
  inputs.push({id:id(),cat:active,key:k,canonical:code,testName:r.name,date,value:pv.v,cap:pv.cap,unit:unit||built?.unit||'',lo:r.lo===''?null:Number(r.lo),hi:r.hi===''?null:Number(r.hi),flag:r.flag,category:LabCore.category(r.name,d.type),sourceDoc:d.id});
 }
 if(weight!==''&&(!Number.isFinite(Number(weight))||Number(weight)<=0||Number(weight)>35))return fail('請檢查體重 kg');
 DB.metrics=DB.metrics.filter(x=>x.sourceDoc!==d.id);DB.metrics.push(...inputs);
 DB.care=DB.care.filter(x=>x.sourceDoc!==d.id);
 if(weight!=='')DB.care.push({id:id(),cat:active,sourceDoc:d.id,date,weight:Number(weight),fluid:'',appetite:'未紀錄',water:'未紀錄',note:'從 '+d.name+' 檢驗報告記錄的體重'});
 DB.reports=DB.reports.filter(x=>x.docId!==d.id);const rid=id();viewRep=rid;DB.reports.push({id:rid,docId:d.id,cat:active,date,weight:weight===''?null:Number(weight),testCount:inputs.length,kind:d.type,age});
 docGroup(d.id).forEach(x=>x.date=date);
 if(!persist())return false;cmp={a:null,b:null,all:false};
 if(auto)return true;
 scanState=null;close();tab='home';render();return true;
}
async function removeDoc(docId){
 const ids=docGroup(docId).map(x=>x.id);
 DB.docs=DB.docs.filter(x=>!ids.includes(x.id));
 DB.metrics=DB.metrics.filter(x=>!ids.includes(x.sourceDoc));DB.care=DB.care.filter(x=>!ids.includes(x.sourceDoc));DB.reports=DB.reports.filter(x=>!ids.includes(x.docId));
 for(const i of ids)await delFile(i);
 persist();viewRep=null;cmp={a:null,b:null,all:false};scanState=null;close();render(false);
}
function importSummary(docId){
 const rp=DB.reports.find(r=>r.docId===docId);if(!rp)return;
 modal(`<div class="flex"><strong>✓ 已匯入</strong><button class="dialog-close close">關閉</button></div>
 <div class="notice ok">${safe(pet().name)}　${safe(rp.date)}　共 <b>${rp.testCount}</b> 項已記錄${rp.weight!=null?'；體重 <b>'+rp.weight+' kg</b> 已記到「照護」':'；報告上沒有讀到體重'}${rp.age?'；年齡 <b>'+safe(rp.age)+'</b>':'；報告上沒有讀到年齡'}。</div>
 <p class="muted">AI 偶爾會讀錯。想對照原始照片檢查，點「核對／修改」；讀錯的整份可以刪除重傳。</p>
 <div class="buttons" style="justify-content:flex-start"><button class="btn" data-action="gometrics">看報告與比較</button><button class="btn soft" data-action="recognize" data-id="${safe(docId)}">核對／修改</button><button class="btn outline" data-action="deldoc" data-id="${safe(docId)}">刪除這份報告</button></div>`);
}
function aiDialog(){const m=LabAI.mode();modal(`<div class="flex"><strong>AI 辨識設定</strong><button class="dialog-close close">關閉</button></div>
<div class="notice">目前：${m==='key'?'使用你的 API 金鑰 '+safe(LabAI.keyTail()):m==='backend'?'沿用「貓咪健康紀錄」已連接的後端':'尚未設定（使用準確度較低的內建 OCR）'}</div>
<div class="field"><label>Anthropic API 金鑰</label><input id="ai-key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…"></div>
<p class="muted">金鑰只存在這台裝置的瀏覽器，不會上傳到 GitHub；報告照片只會送到 Anthropic 讀取。建議到 Anthropic Console 另外建一把專用金鑰，並設定每月用量上限。換手機或清除瀏覽器資料後要重新貼一次。</p>
<button class="btn" data-action="aisave">儲存</button>${LabAI.hasKey()?' <button class="btn soft" data-action="aiclear">移除金鑰</button>':''}`)}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.pet){active=b.dataset.pet;labView='current';viewRep=null;cmp={a:null,b:null,all:false};render();return}if(b.dataset.tab){tab=b.dataset.tab;render();return}if(b.dataset.goto){tab=b.dataset.goto;render();return}const a=b.dataset.action,k=b.dataset.key;
 if(a==='pickrep'){viewRep=b.dataset.id;render(false);return}
 if(a==='labview'){labView=b.dataset.view;tab='home';render();return}
 if(a==='newtest'){modal(`<div class="flex"><strong>新增任意檢驗項目</strong><button class="dialog-close close">關閉</button></div><div class="field"><label>檢驗日期</label><input type="date" id="manual-date" value="${today}"></div><div class="field"><label>項目名稱</label><input id="manual-name" placeholder="例如：USG 或其他任何檢驗項目"></div><div class="cols"><div class="field"><label>數值</label><input id="manual-value" type="number" step="any"></div><div class="field"><label>單位</label><input id="manual-unit" placeholder="例如 mg/dL"></div></div><button class="btn" data-action="savemanual">確認新增</button>`);return}
 if(a==='savemanual'){const name=$('#manual-name').value.trim(),v=$('#manual-value').value,dt=$('#manual-date').value,unit=LabCore.unit($('#manual-unit').value);if(!name||!dt||v.trim()===''||!Number.isFinite(+v)){alert('請填寫名稱、日期與有效數值');return}const k=defs[LabCore.canonical(name)]&&LabCore.unit(defs[LabCore.canonical(name)].unit)===unit?LabCore.canonical(name):LabCore.identity(name,unit);DB.metrics.push({id:id(),cat:active,key:k,date:dt,value:Number(v),testName:name,unit,category:LabCore.category(name)});persist();close();labView='history';tab='home';render();return}
 if(a==='recognize'){recognizeDoc(b.dataset.id);return}
 if(a==='gometrics'){close();tab='home';render();return}
 if(a==='deldoc'){const d=DB.docs.find(x=>x.id===b.dataset.id);if(!d)return;const rp=DB.reports.find(r=>r.docId===d.id);if(!confirm(rp?'確定刪除這份報告？它匯入的 '+rp.testCount+' 項數據和體重紀錄也會一起刪除，無法復原。':'確定刪除這份檔案？無法復原。'))return;await removeDoc(d.id);return}
 if(a==='cmpall'){cmp.all=!cmp.all;render(false);return}
 if(a==='aiset'){aiDialog();return}
 if(a==='aisave'){const v=$('#ai-key').value.trim();if(v&&!/^sk-ant-/.test(v)){alert('金鑰通常以 sk-ant- 開頭，請確認是否貼對');return}if(!LabAI.setKey(v)){alert('無法儲存設定');return}close();render(false);return}
 if(a==='aiclear'){LabAI.setKey('');close();render(false);return}
 if(a==='rereadai'){const d=DB.docs.find(x=>x.id===scanState?.docId);if(d)runRecognition(d.id,docGroup(d.id));return}
 if(a==='doctordlg'||a==='pdf'){const o=pdfReport();if(!o){modal('<div class="flex"><strong>匯出 PDF</strong><button class="dialog-close close">關閉</button></div><p class="muted">還沒有報告可以匯出。</p>');return}download(o.name,o.blob);return}
 if(a==='doctordlg_old'){modal(`<div class="flex"><strong>匯出醫師摘要</strong><button class="dialog-close close">關閉</button></div><p class="muted">選擇要給醫生看的期間。摘要會把每個檢驗項目排成一列、每次檢驗一欄，方便看出變化，並附上參考範圍、體重和照護紀錄。</p><div class="buttons" style="justify-content:flex-start"><button class="btn" data-action="doctor" data-months="3">最近 3 個月</button><button class="btn" data-action="doctor" data-months="6">最近 6 個月</button><button class="btn soft" data-action="doctor" data-months="0">全部紀錄</button></div>`);return}
 if(a==='doctor'){download('貓奴值班中-'+pet().name+'-醫師摘要-'+today+'.html',new Blob([doctorHTML(Number(b.dataset.months)||0)],{type:'text/html;charset=utf-8'}));close();return}
 if(a==='addtest'){const wrap=$('#exam-rows');wrap.insertAdjacentHTML('beforeend',examCell());$('#exam-count').textContent=wrap.children.length;return}
 if(a==='deltest'){b.closest('.exam-row')?.remove();$('#exam-count').textContent=$('#exam-rows').children.length;return}
 if(a==='reparse'){const raw=$('#exam-raw').value,dt=$('#exam-date').value,w=$('#exam-weight').value,doc=DB.docs.find(x=>x.id===scanState?.docId);const parsed=LabCore.parse(raw,doc?.type);parsed.date=parsed.date||dt;parsed.weight=parsed.weight??(w?Number(w):null);reviewExam(doc.id,parsed);return}
 if(a==='saveexam'){saveExam();return}
 if(a==='replay'){play(k);return}if(a==='all'){$$('[data-chart]').forEach(x=>play(x.dataset.chart));return}if(a==='seat'){seat(k);modal(`<div class="flex"><strong>終點：雙手摀住眼睛</strong><button class="dialog-close close">關閉</button></div><div style="background:#f0f8f4;border-radius:12px;height:210px;position:relative;display:grid;place-items:center;margin:12px 0"><div class="cat-sprite worse sitting" style="position:relative;left:auto;top:auto;transform:none;width:130px;height:168px">${catSvg()}</div></div><p class="muted">雙手是蓋在眼睛前方的圖層，不是畫在頭後面。</p>`);return}
 if(a==='newcat'){const name=prompt('新貓咪的名字');if(!name?.trim())return;const c={id:id(),name:name.trim().slice(0,30),note:'健康追蹤'};DB.cats.push(c);active=c.id;persist();render();return}
 if(a==='newmetric'){const x=registry()[k];modal(`<div class="flex"><strong>新增 ${x.name} (${k})</strong><button class="dialog-close close">關閉</button></div><div class="field"><label>日期</label><input id="metric-date" type="date" value="${today}"></div><div class="field"><label>檢驗數值 ${x.unit}</label><input id="metric-value" type="number" step="any" placeholder="請輸入真實檢驗數值"></div><button class="btn" data-action="savemetric" data-key="${k}">確認儲存</button>`);return}
 if(a==='savemetric'){let v=$('#metric-value').value,dt=$('#metric-date').value;if(!dt||v.trim()===''||!Number.isFinite(+v)||+v<0){alert('請輸入有效日期與數值');return}DB.metrics.push({id:id(),cat:active,key:k,date:dt,value:+v,testName:registry()[k]?.name||k,unit:registry()[k]?.unit||'',category:registry()[k]?.category||LabCore.category(k)});persist();close();render(false);return}
 if(a==='savecare'){let dt=$('#care-date').value;if(!dt)return;DB.care.push({id:id(),cat:active,date:dt,weight:$('#weight').value,fluid:$('#fluid').value,appetite:$('#appetite').value,water:$('#water').value,note:$('#care-note').value});persist();render(false);return}
 if(a==='addfiles'){let files=[...($('#doc-file').files||[])],date=$('#doc-date').value,type=$('#doc-type').value,note=$('#doc-note').value;if(!files.length){alert('請先選擇醫療檔案');return}for(let f of files){if(!f.type.startsWith('image/')&&f.type!=='application/pdf'){alert('只能選圖片或 PDF');continue}if(f.size>12*1024*1024){alert(f.name+' 超過 12 MB');continue}const identifier=id();try{await putFile(identifier,f);DB.docs.push({id:identifier,cat:active,date,type,note,name:f.name,mime:f.type})}catch(err){alert('無法儲存 '+f.name+': '+err.message)}}persist();render(false);return}
 if(a==='viewfile'){const f=DB.docs.find(x=>x.id===b.dataset.id);if(!f)return;try{const file=await getFile(f.id);if(!file){alert('找不到這份附件，可能已清除瀏覽器資料');return}const u=URL.createObjectURL(file);objectURLs.push(u);modal(`<div class="flex"><b>${safe(f.name)}</b><button class="dialog-close close">關閉</button></div><p class="muted">${safe(f.date)} · ${safe(f.type)}</p>${file.type==='application/pdf'?`<iframe src="${u}" title="PDF病歷"></iframe>`:`<img src="${u}" alt="病歷圖片">`}<p><a href="${u}" download="${safe(f.name)}">下載此檔案</a></p>`)}catch(err){alert('讀取附件失敗：'+err.message)}return}
 if(a==='month'){month+=Number(b.dataset.shift);if(month<0){month=11;year--}if(month>11){month=0;year++}render(false);return}
 if(a==='day'){selected=b.dataset.date;render(false);return}
 if(a==='saveevent'){let date=$('#event-date').value,time=$('#event-time').value,title=$('#event-title').value.trim();if(!date||!title){alert('請填寫日期及提醒事項');return}DB.events.push({id:id(),cat:active,date,time,title});persist();render(false);return}
 if(a==='ics'){const o=DB.events.find(x=>x.id===b.dataset.id);if(o)createICS(o);return}
 if(b.classList.contains('dialog-close')){close();return}
});
document.addEventListener('toggle',e=>{if(e.target.id==='cmp-details')cmp.open=e.target.open},true);
document.addEventListener('change',e=>{
 if(e.target.id==='quick-file'){const fs=[...e.target.files];e.target.value='';quickUpload(fs);return}
 if(e.target.id==='cmp-a'||e.target.id==='cmp-b'){cmp.a=$('#cmp-a').value;cmp.b=$('#cmp-b').value;render(false)}
});
document.addEventListener('change',async e=>{if(!e.target.matches('#pet-photo'))return;const f=e.target.files?.[0];if(!f||!f.type.startsWith('image/'))return;try{pet().photo=await compressPhoto(f);persist();render(false)}catch(err){alert(err.message)}});
$('#backupButton').addEventListener('click',()=>modal(`<div class="flex"><strong>資料備份及照片管理</strong><button class="dialog-close close">關閉</button></div><div class="notice">本機測試資料可匯出 JSON；<b>目前匯出不包含醫療附件原始檔，包含已確認的檢驗項目與歷史數值</b>。正式雲端備份與帳號同步尚未完成。</div><button class="btn" data-action="export">匯出紀錄 JSON</button><button class="btn soft" data-action="aiset">AI 辨識設定</button><button class="btn soft" data-action="photo">${safe(pet().name)}的照片</button><div class="field"><label>合併匯入（保留這台資料，只補上這台沒有的報告）</label><input type="file" id="merge-file" accept="application/json,.json"></div><div class="field"><label>整個取代（會蓋掉這台目前的資料）</label><input type="file" id="import-file" accept="application/json"></div>`));
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.action==='export')download('貓奴值班中-本機紀錄-'+today+'.json',new Blob([asJSON()],{type:'application/json;charset=utf-8'}));if(b.dataset.action==='photo')modal(`<div class="flex"><strong>${safe(pet().name)}的照片</strong><button class="dialog-close close">關閉</button></div><div class="field"><label>選擇貓咪照片（只在這台裝置顯示）</label><input type="file" id="pet-photo" accept="image/*"></div>`)});
document.addEventListener('change',async e=>{if(e.target.id!=='import-file')return;try{const obj=JSON.parse(await e.target.files[0].text()),v=obj.data;if(!v||!Array.isArray(v.cats)||!Array.isArray(v.metrics)||!Array.isArray(v.care)||!Array.isArray(v.events)||!Array.isArray(v.docs))throw new Error('檔案格式不正確');if(!confirm('這會取代這台裝置目前的本機紀錄，確定匯入嗎？'))return;DB=v;DB.reports=Array.isArray(DB.reports)?DB.reports:[];active=DB.cats[0]?.id||'guai';persist();close();render()}catch(err){alert('匯入失敗：'+err.message)}});
document.addEventListener('change',async e=>{if(e.target.id!=='merge-file')return;try{const obj=JSON.parse(await e.target.files[0].text()),v=obj.data;if(!v||!Array.isArray(v.cats)||!Array.isArray(v.metrics))throw new Error('檔案格式不正確');
 const add={cats:0,reports:0,metrics:0,care:0,events:0,docs:0};DB.reports=DB.reports||[];
 for(const c of v.cats)if(!DB.cats.some(x=>x.id===c.id)){DB.cats.push(c);add.cats++}
 const docMap=new Map();
 for(const r of (v.reports||[])){const hit=DB.reports.find(x=>x.cat===r.cat&&x.date===r.date&&(x.testCount||0)===(r.testCount||0)),same=DB.reports.find(x=>x.id===r.id);if(hit||same){docMap.set(r.docId,(hit||same).docId);continue}DB.reports.push(r);add.reports++}
 const mk=m=>[m.cat,m.key,m.date,m.value].join('|'),have=new Set(DB.metrics.map(mk));
 for(let m of v.metrics){if(docMap.has(m.sourceDoc))m={...m,sourceDoc:docMap.get(m.sourceDoc)};if(have.has(mk(m)))continue;if(DB.metrics.some(x=>x.id===m.id))m={...m,id:m.id+'-m'+Date.now()};DB.metrics.push(m);have.add(mk(m));add.metrics++}
 for(const d of (v.docs||[]))if(!DB.docs.some(x=>x.id===d.id)){DB.docs.push(d);add.docs++}
 const ck=x=>[x.cat,x.date,x.weight,x.note||''].join('|'),hc=new Set(DB.care.map(ck));for(const x of (v.care||[]))if(!hc.has(ck(x))){DB.care.push(x);hc.add(ck(x));add.care++}
 const ek=x=>[x.cat,x.date,x.title].join('|'),he=new Set(DB.events.map(ek));for(const x of (v.events||[]))if(!he.has(ek(x))){DB.events.push(x);he.add(ek(x));add.events++}
 persist();close();render();alert(`合併完成：新增 ${add.reports} 份報告、${add.metrics} 筆檢驗數值、${add.care} 筆照護紀錄、${add.events} 筆行程。原本的資料都還在。`)}catch(err){alert('合併失敗：'+err.message)}});
window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
