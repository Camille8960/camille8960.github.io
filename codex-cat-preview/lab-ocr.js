/* 識別完全在使用者瀏覽器執行。首次載入辨識程式需要網路。沒有連接雲端 AI。 */
(function(root){
'use strict';
function script(url){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=url;el.onload=resolve;el.onerror=()=>reject(new Error('無法載入瀏覽器辨識程式，請檢查網路或改以貼上文字／手動輸入。'));document.head.appendChild(el)})}
async function imageText(file){if(!root.Tesseract)await script('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');const worker=await root.Tesseract.createWorker('eng');try{const result=await worker.recognize(file);return result.data.text||''}finally{await worker.terminate()}}
async function pdfText(file){if(!root.pdfjsLib)await script('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');root.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const doc=await root.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let buf='';const cap=Math.min(doc.numPages,12);for(let i=1;i<=cap;i++){const pg=await doc.getPage(i);const t=await pg.getTextContent();const lines=new Map();for(const item of t.items){const y=Math.round((item.transform?.[5]||0)/4)*4;const a=lines.get(y)||[];a.push({x:item.transform?.[4]||0,str:item.str});lines.set(y,a)}for(const [y,items] of [...lines].sort((a,b)=>b[0]-a[0]))buf+='\n'+items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ')}return buf}
async function readFile(file){if(file.type.startsWith('image/'))return imageText(file);if(file.type==='application/pdf'){const text=await pdfText(file);if(text.trim().length<10)throw new Error('這份 PDF 是掃描影像，無法直接擷取文字。請改用清楚的照片，或手動輸入資料。');return text}throw new Error('只能辨識圖片或可擷取文字的 PDF')}
root.LabOCR={readFile};
})(window);
