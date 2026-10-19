/* 貓奴值班中：雲端同步後端（貼到 Google Apps Script，部署為網頁應用程式）
   資料存在你自己的 Google 雲端硬碟，檔名「貓奴值班中-資料.json」。
   把下面的 TOKEN 改成你自己的密碼，部署時：執行身分＝我，誰可以存取＝所有人。 */
const TOKEN = '改成你自己的密碼';
const FILE_NAME = '貓奴值班中-資料.json';

function out_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function file_(){
  const it = DriveApp.getFilesByName(FILE_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFile(FILE_NAME, '{}', 'application/json');
}
function doPost(e){
  const lock = LockService.getScriptLock();
  try{
    lock.waitLock(20000);
    const b = JSON.parse(e.postData.contents);
    if(b.token !== TOKEN) return out_({ok:false, error:'密碼不對'});
    const f = file_();
    if(b.action === 'load') return out_({ok:true, data: JSON.parse(f.getBlob().getDataAsString() || '{}')});
    if(b.action === 'save'){ f.setContent(JSON.stringify(b.data)); return out_({ok:true, data:{savedAt:Date.now()}}); }
    return out_({ok:false, error:'不認得的動作'});
  }catch(err){ return out_({ok:false, error:String(err)}); }
  finally{ try{ lock.releaseLock(); }catch(_){} }
}
function doGet(){ return out_({ok:true, data:'貓奴值班中同步後端運作中'}); }
