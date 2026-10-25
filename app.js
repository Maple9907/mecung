/* Mê Cung: menu, đăng nhập, bảng xếp hạng, đồng bộ tiến độ.
   Firebase được nạp bằng import() có giới hạn thời gian: lỗi mạng/CDN thì vẫn chơi offline, không treo game. */
navigator.serviceWorker?.register('sw.js').catch(()=>{});
const $=s=>document.querySelector(s),MC=window.MC;
if(!MC){ /* index.html dừng sớm: máy không có WebGL hoặc không tải được three.js */
 document.body.insertAdjacentHTML('beforeend','<div id="menu"><div class="mc"><h1 class="logo">Mê Cung</h1><h2>Không chạy được game</h2><p class="sub">Trình duyệt không hỗ trợ WebGL hoặc không tải được thư viện 3D. Nếu đang mở trong Zalo/Facebook, hãy mở bằng Chrome/Safari. Kiểm tra mạng rồi tải lại.</p><button class="pri" id="bReload">Tải lại</button></div></div>');
 $('#bReload').onclick=()=>location.reload()}
else main();

function main(){
const CFG={apiKey:"AIzaSyDV38H4naMBsdLaanwsmqLOfFiSOed2mWo",authDomain:"my-game1-7ed99.firebaseapp.com",databaseURL:"https://my-game1-7ed99-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"my-game1-7ed99",storageBucket:"my-game1-7ed99.firebasestorage.app",messagingSenderId:"679780773541",appId:"1:679780773541:web:835f78df33f19b8995a74c"},
 FB='https://www.gstatic.com/firebasejs/13.1.0/',NOTM=8640000,STEP=8000,P=()=>MC.P(),fmc=MC.fmc;
/* mode: boot = đang kết nối · cloud = đã nối Firebase · local = chơi offline (không ghi lên mạng) */
let me=null,mode='boot',sel=1,paused=0,named=0,ld=0,nameTimer=0,emsg='',cloud={lv:0,tm:0,t:0,sc:null},off=0,busy=0,again=0,retry=0,fails=0,imp=null,app=null,
 auth,db,ref,get,update,query,orderByChild,limitToLast,serverTimestamp,onValue,runTransaction,onAuthStateChanged,signInAnonymously,GoogleAuthProvider,linkWithPopup,signInWithCredential,signInWithPopup,signOut;
const TT=(p,ms=9000)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]),warn=e=>console.warn(e);

document.body.insertAdjacentHTML('beforeend',`<div id="menu"><div class="mc"><h1 class="logo">Mê Cung</h1>
<div id="mLoad" class="mc"><p class="sub">Đang tải…</p></div>
<div id="mLogin" class="mc" hidden><h2>Chào mừng!</h2><p class="sub">Đăng nhập để lưu tiến độ, chơi trên nhiều máy và có tên trên bảng xếp hạng.</p><button class="pri" id="bG">Đăng nhập bằng Google</button><button id="bGuest">Chơi với tư cách khách</button><small id="le"></small></div>
<div id="mConfirm" class="mc" hidden><h2>Đăng xuất?</h2><p class="sub">Tiến độ đã lưu trên tài khoản Google, đăng nhập lại là chơi tiếp được.</p><button class="pri" id="bCancel">Ở lại</button><button class="dng" id="bYes">Đăng xuất</button></div>
<div id="mHome" class="mc" hidden><div class="pc" id="pc"><b id="pn"></b><small id="ps"></small></div>
<button class="pri" id="bPlay"></button>
<div class="sl"><button id="bM">◀</button><span id="sl"></span><button id="bP">▶</button></div>
<button id="bLb">🏆 Bảng xếp hạng</button><button id="bLink">🔗 Liên kết tài khoản Google</button><button id="bRetry" hidden>🔄 Thử kết nối lại</button><button id="bInst" hidden>📲 Cài game về máy</button><button id="bOut" hidden>Đăng xuất</button></div>
<div id="mLb" class="mc" hidden><h2>🏆 Top 50</h2><p class="sub">Xếp theo màn cao nhất. Cùng màn thì ai thoát nhanh hơn xếp trên.</p><ol id="lbList"></ol><button id="bBack">← Quay lại</button></div>
<div id="mName" class="mc" hidden><h2 id="nt"></h2><input id="ni" maxlength="16" placeholder="3–16 ký tự: chữ, số, _" autocomplete="off" spellcheck="false"><small id="ne"></small><button class="pri" id="bOk">Xác nhận</button><button id="bNo">Hủy</button></div></div></div>`);

const V=n=>['mHome','mLb','mName','mLogin','mConfirm','mLoad'].forEach(i=>$('#'+i).hidden=i!==n),
 route=()=>{if(!ld)V('mLoad');else if(mode==='local')V('mHome');else if(!me)V('mLogin');else if(!named)nameView(0);else V('mHome')},
 show=()=>{render();route()},
 err=m=>{emsg=m;$('#le').textContent='⚠ '+m;render()},
 fs=()=>{const d=document.documentElement;if(!document.fullscreenElement&&d.requestFullscreen)d.requestFullscreen({navigationUI:'hide'}).catch(()=>{})},
 inApp=()=>/FBAN|FBAV|Zalo|Instagram|Line\//i.test(navigator.userAgent),
 netErr=e=>e&&e.code==='auth/network-request-failed';
function goLocal(m){mode='local';named=1;ld=1;emsg=m||'';show()}
function render(){const cl=mode==='cloud',p=P();
 $('#pn').textContent=(p.name||(cl?'…':'Khách'))+(cl?' ✏️':'');
 $('#ps').textContent=emsg?'⚠ '+emsg:mode==='local'?'Đang chơi offline · tiến độ lưu trên máy':!me?'Đang kết nối…':me.isAnonymous?'Khách · chạm để đổi tên':'✓ '+(me.email||'Google')+' · chạm để đổi tên';
 $('#bLink').hidden=!(cl&&me&&me.isAnonymous);$('#bOut').hidden=!(cl&&me&&!me.isAnonymous);$('#bLb').hidden=!cl;$('#bRetry').hidden=mode!=='local';
 $('#bPlay').textContent=(paused?'▶ Tiếp tục · Màn ':'▶ Chơi · Màn ')+sel;$('#sl').textContent='Chọn màn '+sel;
 $('#bPlay').disabled=!named;$('#bM').disabled=sel<=1;$('#bP').disabled=sel>=p.max}
function open(p){paused=p;sel=MC.G().lv;window.MENU=true;$('#menu').hidden=false;emsg='';render();route()}
/* Thời gian chỉ tính khi đang chơi (index.html cộng dồn G.el), nên mở menu hay ẩn app không làm tăng giờ */
$('#bPlay').onclick=()=>{fs();const g=MC.G();if(sel!==g.lv)MC.start(sel);window.MENU=false;$('#menu').hidden=true};
$('#bM').onclick=()=>{sel--;render()};$('#bP').onclick=()=>{sel++;render()};
$('#pc').onclick=()=>{if(mode==='cloud'&&me&&named)nameView(1)};
$('#bLink').onclick=async()=>{emsg='';if(inApp())return err('Hãy mở bằng Chrome/Safari để đăng nhập Google');
 try{await linkWithPopup(auth.currentUser,new GoogleAuthProvider())}catch(e){if(e.code==='auth/credential-already-in-use'){const c=GoogleAuthProvider.credentialFromError(e);if(c)await signInWithCredential(auth,c).catch(x=>err(x.code))}else if(e.code!=='auth/popup-closed-by-user')err(e.code)}
 me=auth.currentUser;render()};
$('#bOut').onclick=()=>V('mConfirm');$('#bCancel').onclick=()=>V('mHome');
$('#bYes').onclick=async()=>{clearTimeout(retry);cloud={lv:0,tm:0,t:0,sc:null};named=0;const p=P();p.max=p.lv=1;p.best={};p.bt={};delete p.name;MC.sv();MC.start(1);sel=1;await signOut(auth).catch(()=>{})};
$('#bG').onclick=async()=>{emsg='';if(inApp())return err('Hãy mở bằng Chrome/Safari để đăng nhập Google');$('#le').textContent='Đang mở Google…';
 try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){$('#le').textContent='';if(netErr(e))goLocal('Không có mạng');else if(!/popup-closed|cancelled-popup/.test(e.code))err(e.code)}};
$('#bGuest').onclick=()=>{emsg='';signInAnonymously(auth).catch(e=>netErr(e)?goLocal('Không có mạng'):err(e.code))};
$('#bBack').onclick=()=>V('mHome');
$('#bRetry').onclick=()=>{emsg='';ld=0;mode='boot';show();boot()};

/* ===== Bảng xếp hạng: màn cao nhất, cùng màn thì thời gian nhanh hơn xếp trên (sc = lv*1e8 + (1e8 - tm)) ===== */
$('#bLb').onclick=async()=>{V('mLb');const ol=$('#lbList');ol.textContent='Đang tải…';
 try{const s=await TT(get(query(ref(db,'players'),orderByChild('sc'),limitToLast(50)))),a=[];
  s.forEach(c=>{const v=c.val();if(v&&typeof v.lv==='number'&&v.name)a.push({id:c.key,...v})});
  a.sort((x,y)=>(y.sc==null?-1:y.sc)-(x.sc==null?-1:x.sc)||y.lv-x.lv);ol.textContent=a.length?'':'Chưa có ai. Hãy là người đầu tiên!';
  a.forEach((v,i)=>{const li=document.createElement('li'),r=document.createElement('i'),n=document.createElement('b'),d=document.createElement('div'),l=document.createElement('span'),m=document.createElement('small');
   if(me&&v.id===me.uid)li.className='me';r.textContent=i<3?['🥇','🥈','🥉'][i]:i+1;n.textContent=v.name;l.textContent='Màn '+v.lv;m.textContent=v.tm&&v.tm<NOTM?fmc(v.tm):'–';d.className='r';d.append(l,m);li.append(r,n,d);ol.append(li)})}
 catch(e){ol.textContent='Không tải được bảng xếp hạng'}};

/* ===== Tên duy nhất: names/<khoá chuẩn hoá> = uid. Đổi tên = 1 lệnh update nguyên tử (giữ chỗ tên mới + nhả tên cũ + ghi hồ sơ) ===== */
const nk=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]/g,''),cl=s=>s.trim().replace(/\s+/g,' ');
async function check(s){s=cl(s);if(!/^[\p{L}\p{N}_ ]{3,16}$/u.test(s)||nk(s).length<3)return'Tên 3–16 ký tự: chữ, số, dấu cách hoặc _';
 try{const o=(await TT(get(ref(db,'names/'+nk(s))))).val();if(o&&o!==me.uid)return'Tên này đã có người dùng'}catch(e){return'Không kiểm tra được, thử lại'}return''}
async function claim(s){s=cl(s);const m=await check(s);if(m)return m;const k=nk(s),o=nk(P().name||''),u={};u['names/'+k]=me.uid;u['players/'+me.uid+'/name']=s;
 if(o&&o!==k&&(await get(ref(db,'names/'+o)).then(x=>x.val()).catch(()=>0))===me.uid)u['names/'+o]=null;
 try{await update(ref(db),u)}catch(e){return'Tên vừa bị người khác lấy, hoặc Rules chưa cập nhật'}P().name=s;MC.sv();named=1;return''}
function nameView(re){V('mName');$('#nt').textContent=re?'Đổi tên':'Đặt tên của bạn';$('#bNo').hidden=!re;
 $('#ni').value=/^Khách\d+$/.test(P().name||'')&&!re?'':P().name||'';$('#ne').textContent='';$('#ni').focus()}
$('#ni').oninput=()=>{clearTimeout(nameTimer);const e=$('#ne');e.className='';e.textContent='…';nameTimer=setTimeout(async()=>{const m=await check($('#ni').value);e.className=m?'':'ok';e.textContent=m||'✓ Tên dùng được'},450)};
$('#ni').onkeydown=e=>{if(e.key==='Enter')$('#bOk').click()};
$('#bNo').onclick=()=>V('mHome');
$('#bOk').onclick=async()=>{const b=$('#bOk'),e=$('#ne');b.disabled=true;const m=await claim($('#ni').value);b.disabled=false;
 if(m){e.className='';e.textContent=m;return}V('mHome');render();await pushAll();syncLb()};

/* ===== Đồng bộ tiến độ + bảng xếp hạng =====
   saves/<uid>   (riêng tư): max, best/<màn> = ít bước nhất, bt/<màn> = thời gian nhanh nhất (centisecond). Luôn đúng, không giới hạn.
   players/<uid> (công khai): name, lv = số màn đã qua, tm = thời gian tốt nhất ở màn lv, sc = khoá xếp hạng, t = giờ server.
   Rules cho phép lv tăng tối đa 1 màn / 8 giây (cộng dồn khi nghỉ), nên máy có nhiều màn hơn bảng xếp hạng sẽ tự đuổi kịp. */
/*SYNC-START*/
const sc=(lv,t)=>lv*1e8+(1e8-t),
 flo=lv=>Math.ceil(70*((lv>=67?28:5+lv*.33)-1)-100), /* sàn thời gian vật lý của màn lv: phải khớp database.rules.json */
 tmOf=l=>Math.min(NOTM,Math.max(flo(l),P().bt[l]||NOTM)),
 ent=o=>Object.entries(o||{}).filter(e=>typeof e[1]==='number'); /* RTDB trả mảng (có lỗ null) khi khoá là số liên tiếp */
async function readCloud(){const d=(await TT(get(ref(db,'players/'+me.uid)))).val()||{};cloud={lv:d.lv||0,tm:d.tm||0,t:d.t||0,sc:d.sc==null?null:d.sc}}
function pushDiff(s){const p=P(),u={};if((s.max||0)<p.max)u.max=p.max;
 for(const k of['best','bt'])for(const[l,v]of ent(p[k])){const c=s[k]&&s[k][l];if(!(c<=v)&&v>=1&&v<=(k==='bt'?NOTM:1e6))u[k+'/'+l]=v}
 return Object.keys(u).length?update(ref(db,'saves/'+me.uid),u).catch(warn):0}
async function pushAll(){if(mode!=='cloud'||!me)return;try{await pushDiff((await TT(get(ref(db,'saves/'+me.uid)))).val()||{})}catch(e){warn(e)}}
async function loadCloud(u){
 const[d0,s0]=await TT(Promise.all([get(ref(db,'players/'+u.uid)),get(ref(db,'saves/'+u.uid))]),12000),d=d0.val()||{},s=s0.val()||{},p=P(),fresh=(p.max||1)<=1;
 cloud={lv:d.lv||0,tm:d.tm||0,t:d.t||0,sc:d.sc==null?null:d.sc};
 p.max=Math.max(p.max||1,s.max||0,cloud.lv+1);
 for(const k of['best','bt']){const m=p[k]=p[k]||{};for(const[l,v]of ent(s[k]))if(!(m[l]<=v))m[l]=v}
 if(d.name)p.name=d.name;
 if(fresh&&p.max>1){MC.start(p.max);sel=p.max} /* máy mới: vào thẳng màn đang chơi dở */
 MC.sv();await pushDiff(s)}
const upMin=(path,v)=>runTransaction(ref(db,path),c=>c==null||v<c?v:undefined).catch(warn),
 upMax=(path,v)=>runTransaction(ref(db,path),c=>c==null||v>c?v:undefined).catch(warn);
async function syncLb(){
 if(mode!=='cloud'||!me||!named)return;
 if(busy){again=1;return}
 busy=1;clearTimeout(retry);
 try{
  await readCloud();
  const w=P().max-1,o=cloud,now=()=>Date.now()+off,pl=ref(db,'players/'+me.uid);
  if(w>=1&&w>o.lv){
   let v;
   if(!o.lv)v=Math.min(w,30); /* lần đầu rules cho tối đa 30 màn */
   else{const k=Math.floor((now()-o.t-700)/STEP); /* số màn được phép nhảy kể từ lần ghi trước */
    if(k<1){retry=setTimeout(syncLb,Math.max(800,o.t+STEP+900-now()));return}
    v=Math.min(w,o.lv+k)}
   const t=tmOf(v);
   await TT(update(pl,{name:P().name,lv:v,tm:t,sc:sc(v,t),t:serverTimestamp()}),15000);
   await readCloud();fails=0;
   if(cloud.lv<w)retry=setTimeout(syncLb,STEP+900)} /* còn thiếu màn: tiếp tục đuổi kịp */
  else if(w>=1&&w===o.lv){
   const t=tmOf(w);
   if(o.sc==null||t<o.tm){await TT(update(pl,{tm:t,sc:sc(w,t)}),15000);await readCloud()}}
  fails=0}
 catch(e){warn(e);if(++fails<5)retry=setTimeout(syncLb,12000)}
 finally{busy=0;if(again){again=0;syncLb()}}}
/*SYNC-END*/
/* Thắng màn: tiến độ + kỷ lục ghi bằng transaction (chỉ nhận giá trị tốt hơn) để máy cũ không ghi đè kỷ lục của máy khác */
window.onWin=()=>{if(mode!=='cloud'||!me||!named)return;const g=MC.G(),p=P(),b='saves/'+me.uid+'/';
 upMax(b+'max',p.max);if(p.best[g.lv])upMin(b+'best/'+g.lv,p.best[g.lv]);if(p.bt[g.lv]&&p.bt[g.lv]<=NOTM)upMin(b+'bt/'+g.lv,p.bt[g.lv]);syncLb()};

async function onAuth(u){
 emsg='';
 if(!u){me=null;named=0;mode='cloud';ld=1;cloud={lv:0,tm:0,t:0,sc:null};paused=0;if($('#menu').hidden)open(0);else show();return}
 me=u;
 try{await loadCloud(u);const n=P().name;named=n?(await TT(get(ref(db,'names/'+nk(n))))).val()===u.uid:0;mode='cloud'}
 catch(e){warn(e);mode='local';named=1;emsg='Không kết nối được máy chủ'}
 ld=1;MC.sv();render();if(!$('#menu').hidden&&$('#mLb').hidden&&$('#mConfirm').hidden)route();
 if(mode==='cloud'&&named)syncLb()}
async function boot(){
 try{
  if(!imp){imp=Promise.all([import(FB+'firebase-app.js'),import(FB+'firebase-auth.js'),import(FB+'firebase-database.js')]);imp.catch(()=>{imp=null})}
  const[A,Au,D]=await TT(imp,10000);
  if(!app){app=A.initializeApp(CFG);auth=Au.getAuth(app);db=D.getDatabase(app);
   ({ref,get,update,query,orderByChild,limitToLast,serverTimestamp,onValue,runTransaction}=D);
   ({onAuthStateChanged,signInAnonymously,GoogleAuthProvider,linkWithPopup,signInWithCredential,signInWithPopup,signOut}=Au);
   onValue(ref(db,'.info/serverTimeOffset'),s=>{off=s.val()||0});
   onAuthStateChanged(auth,onAuth)}
  else await onAuth(auth.currentUser)}
 catch(e){warn(e);goLocal('Không tải được dịch vụ đăng nhập')}}

document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;if(a==='fs')document.fullscreenElement?document.exitFullscreen():fs();if(a==='menu')open(1)});
{const bi=$('#bInst'),ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),
 app2=matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches||navigator.standalone;let dip=null;
 if(!app2){
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e;bi.hidden=0});
  if(ios&&!/crios|fxios/i.test(ua))bi.hidden=0;
  bi.onclick=async()=>{if(dip){dip.prompt();await dip.userChoice.catch(()=>{});dip=null;bi.hidden=1}
   else alert('Trên iPhone/iPad: bấm nút Chia sẻ (ô vuông có mũi tên) ở thanh Safari, chọn "Thêm vào MH chính".')}}
 addEventListener('appinstalled',()=>{bi.hidden=1})}
open(0);boot()}
