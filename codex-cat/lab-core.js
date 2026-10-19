/* 貓奴值班中：可擴充檢驗項目資料處理；不傳輸使用者附件。 */
(function(root){
'use strict';
const NAMES={
CREA:['CREA','CREAT','CREATININE','肌酸酐','肌酐'],BUN:['BUN','UREA','UREA NITROGEN','尿素氮','血中尿素氮'],SDMA:['SDMA'],
PHOS:['PHOS','PHOSPHORUS','P','磷','血磷'],T4:['T4','TT4','TOTAL T4','甲狀腺素','總甲狀腺素'],
HCT:['HCT','PCV','HEMATOCRIT','血比容','血容比'],BP:['SBP','SYSTOLIC BP','收縮壓'],
RBC:['RBC','紅血球'],WBC:['WBC','白血球'],HGB:['HGB','HB','HEMOGLOBIN','血紅素'],PLT:['PLT','PLATELETS','血小板'],
ALT:['ALT','GPT'],AST:['AST','GOT'],ALP:['ALP'],GGT:['GGT'],ALB:['ALB','ALBUMIN','白蛋白'],TP:['TP','TOTAL PROTEIN','總蛋白'],
GLOB:['GLOB','GLOBULIN','球蛋白'],GLU:['GLU','GLUCOSE','血糖'],CHOL:['CHOL','CHOLESTEROL','膽固醇'],
CA:['CA','CALCIUM','鈣'],K:['K','POTASSIUM','鉀'],NA:['NA','SODIUM','鈉'],CL:['CL','CHLORIDE','氯'],
UPC:['UPC','UP/C','尿蛋白肌酸酐比'],USG:['USG','SPECIFIC GRAVITY','尿比重'],
AMYL:['AMYL','AMYLASE'],LIPA:['LIPA','LIPASE'],TSH:['TSH'],FT4:['FT4','FREE T4'],
MCH:['MCH'],MCV:['MCV'],MCHC:['MCHC'],RDW:['RDW'],RETIC:['RETIC','RETICULOCYTES'],NEU:['NEU','NEUTROPHILS'],LYM:['LYM','LYMPHOCYTES'],MONO:['MONO','MONOCYTES'],EOS:['EOS','EOSINOPHILS'],BASO:['BASO','BASOPHILS'],'RETIC-HGB':['RETIC-HGB','RETIC HGB','RET-HE','RET HE','網織球血紅素']
};
const units={'UG/DL':'µg/dL','ΜG/DL':'µg/dL','MG/DL':'mg/dL','MMOL/L':'mmol/L','G/DL':'g/dL','G/L':'g/L','IU/L':'IU/L','U/L':'U/L','NG/ML':'ng/mL','FL':'fL','PG':'pg','%':'%','10^3/UL':'10³/µL','K/UL':'10³/µL','KG':'kg','MMHG':'mmHg'};
const groups={
腎臟:['CREA','BUN','SDMA','PHOS','CA','K','NA','CL','UPC','USG'],
血液:['HCT','RBC','WBC','HGB','PLT','MCH','MCV','MCHC','RDW','RETIC','NEU','LYM','MONO','EOS','BASO'],
肝臟:['ALT','AST','ALP','GGT','ALB','TP','GLOB'],
甲狀腺:['T4','FT4','TSH'],
尿液:['UPC','USG'],
其他:['GLU','CHOL','AMYL','LIPA','BP']
};
const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase().replace(/[：:]/g,'');
function canonical(s){let x=norm(s).replace(/\./g,'');const hit=n=>{for(const [k,a] of Object.entries(NAMES)){if(a.map(norm).includes(n))return k}return null};let h=hit(x);if(h)return h;
 /* 報告常印成「血中尿素氮 (BUN)」：括號裡的縮寫或括號外的中文名都試試看；BUN/CREA 這種比值不會被誤認成 BUN */
 const m=x.match(/[（(]([^()（）]+)[)）]/);if(m){h=hit(m[1].trim());if(h)return h;h=hit(x.replace(m[0],'').trim());if(h)return h;if(/^[%A-Z0-9\/\-+ ]+$/.test(m[1].trim()))return m[1].trim()}return x}
function unit(s){let x=String(s||'').trim().replace(/μ/g,'µ').replace(/\s+/g,'');return units[norm(x)]||x}
function identity(name,u){return canonical(name)+'@@'+norm(unit(u)).replace(/\s/g,'')}
function category(name,kind){const k=canonical(name);if(kind==='尿檢'&&['WBC','RBC','TP','GLU','PHOS'].includes(k))return '尿液';return Object.entries(groups).find(([g,ks])=>ks.includes(k))?.[0]||'其他'}
function textDate(s){const m=String(s||'').match(/(?:^|\D)(20\d{2})\s*[\/\-.年]\s*(\d{1,2})\s*[\/\-.月]\s*(\d{1,2})(?:日)?(?:\D|$)/);if(!m)return null;let iso=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;return Number.isFinite(new Date(iso+'T12:00:00').getTime())?iso:null}
function parse(text,kind='血檢'){
const lines=String(text||'').split(/\r?\n/), output=[],seen=new Set();let date=textDate(text),weight=null;
for(const line of lines){const m=line.match(/(?:WEIGHT|BODY\s*WEIGHT|WT\b|體重|體\s*重)\s*[:：=]?\s*(\d{1,2}(?:\.\d{1,3})?)\s*(KG|公斤|KGS)\b/i);if(m){const v=Number(m[1]);if(v>0&&v<35)weight=v;}}
const ignore=/^(?:PATIENT|PET\s+NAME|NAME|DATE|AGE|SEX|ID|LAB|HOSPITAL|REF|REFERENCE|TEST|RESULT|VALUE|UNITS?|RANGE|ITEM|SPECIES|BREED|醫院|姓名|日期|年齡|性別|檢驗項目|參考區間|參考值|檢測項目|單位|結果)\b/i;
for(const raw of lines){const row=raw.trim().replace(/[│|]/g,' ').replace(/\s{2,}/g,' ');if(!row||ignore.test(row)||/\b(?:WEIGHT|BODY WEIGHT)\b|體重/.test(row.toUpperCase()))continue;
// 尋找第一個數值前的檢驗名稱；名稱必須至少包含英文字母或中文字。
const match=row.match(/^(.{1,48}?)\s+([<>]?\s*-?\d+(?:[.,]\d+)?)(.*)$/);
if(!match)continue;const label=match[1].replace(/^[\s*#-]+|[\s:：-]+$/g,'').trim();if(!/[a-zA-Z\u4e00-\u9fff]/.test(label)||label.length<1)continue;
if(/(?:TIME|DATE|AGE|WEIGHT|BIRTH|SAMPLE|PATIENT|LOT|CODE|PHONE|TEL|TEL\.)/i.test(label))continue;
const value=Number(match[2].replace(/[<>\s]/g,'').replace(',','.'));if(!Number.isFinite(value)||value<0)continue;
const tail=match[3];const range=tail.match(/(-?\d+(?:\.\d+)?)\s*[-~–—]\s*(-?\d+(?:\.\d+)?)/);
let unitMatch=tail.match(/(µg\/dL|μg\/dL|ug\/dL|mg\/dL|mmol\/L|g\/dL|g\/L|ng\/mL|U\/L|IU\/L|mEq\/L|fL|pg|%|10\^?[369]\/\S+|K\/uL|M\/uL|mmHg)/i);
const u=unitMatch?unit(unitMatch[1]):'';const remaining=tail.replace(unitMatch?.[0]||'','').replace(range?.[0]||'','').trim();const flag=/\bHIGH\b|(?:^|\W)H(?:\W|$)|偏高|↑/.test(remaining.toUpperCase())?'H':/\bLOW\b|(?:^|\W)L(?:\W|$)|偏低|↓/.test(remaining.toUpperCase())?'L':'';
let lo=range?Number(range[1]):null,hi=range?Number(range[2]):null;
const key=identity(label,u);if(seen.has(key))continue;seen.add(key);
output.push({name:label,canonical:canonical(label),key,value,unit:u,lo,hi,flag,category:category(label,kind)});
}
return {date,weight,rows:output,rawText:String(text||'')};
}
const ZH={CREA:'肌酸酐',BUN:'血中尿素氮',SDMA:'對稱二甲基精胺酸',PHOS:'磷',T4:'甲狀腺素',FT4:'游離甲狀腺素',TSH:'促甲狀腺素',HCT:'血比容',BP:'收縮壓',RBC:'紅血球',WBC:'白血球',HGB:'血紅素',PLT:'血小板',ALT:'丙胺酸轉胺酶（肝）',AST:'天門冬胺酸轉胺酶（肝）',ALP:'鹼性磷酸酶',GGT:'麩胺醯轉移酶',ALB:'白蛋白',TP:'總蛋白',GLOB:'球蛋白',GLU:'血糖',CHOL:'膽固醇',CA:'鈣',K:'鉀',NA:'鈉',CL:'氯',UPC:'尿蛋白肌酸酐比',USG:'尿比重',AMYL:'澱粉酶',LIPA:'脂肪酶',MCH:'平均紅血球血紅素量',MCV:'平均紅血球體積',MCHC:'平均紅血球血紅素濃度',RDW:'紅血球分布寬度',RETIC:'網織紅血球',NEU:'嗜中性球',LYM:'淋巴球',MONO:'單核球',EOS:'嗜酸性球',BASO:'嗜鹼性球','RETIC-HGB':'網織球血紅素',MPV:'平均血小板體積',PCT:'血小板容積比',PDW:'血小板分布寬度',TBIL:'總膽紅素','BUN/CREA':'尿素氮／肌酸酐比','NA/K':'鈉鉀比',HB:'血紅素'};
function zhName(raw){const s=String(raw||'').trim();if(!s)return s;if(/[\u4e00-\u9fff]/.test(s)){if(/[A-Za-z]/.test(s))return s;const k=canonical(s);return /^[%A-Z0-9\/\-]+$/.test(k)?s+'（'+k+'）':s}const c=canonical(s);let z=ZH[c];if(!z&&/^%/.test(c)&&ZH[c.slice(1)])z=ZH[c.slice(1)]+'百分比';return z?z+'（'+s+'）':s}
const api={zhName,NAMES,canonical,unit,identity,category,parse,textDate};root.LabCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
