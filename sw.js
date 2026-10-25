/* Service worker Mê Cung: mở nhanh + chơi được khi mất mạng.
   Chỉ cần đổi V khi thêm/bớt file trong SHELL. File game tự cập nhật ngầm mỗi lần mở. */
const V='mc-v4';
const SHELL=['./','index.html','app.js','menu.css','manifest.json','icon-192.png','icon-512.png'];
const LIBS=[
 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js',
 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js',
 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js'
];
const scope=self.registration.scope;
const abs=p=>new URL(p,scope).href;
const isLib=u=>u.origin==='https://cdnjs.cloudflare.com'||(u.origin==='https://www.gstatic.com'&&u.pathname.startsWith('/firebasejs/'));
/* Bỏ dấu "đã chuyển hướng" để trả được cho yêu cầu điều hướng */
const clean=r=>r.redirected?new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers}):r;

self.addEventListener('install',e=>{
 e.waitUntil((async()=>{
  const c=await caches.open(V);
  await c.addAll(SHELL.map(p=>new Request(abs(p),{cache:'reload'})));
  /* Thư viện ngoài: lỗi cũng không làm hỏng cài đặt, sẽ cache dần khi chạy */
  await Promise.allSettled(LIBS.map(u=>c.add(new Request(u,{mode:'cors'}))));
  self.skipWaiting();
 })());
});

self.addEventListener('activate',e=>{
 e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k.startsWith('mc-')&&k!==V)await caches.delete(k);
  await self.clients.claim();
 })());
});

/* File của game: trả bản cache ngay, đồng thời tải bản mới về cho lần mở sau */
async function swr(key){
 const c=await caches.open(V);
 const hit=await c.match(key,{ignoreSearch:true,ignoreVary:true});
 const net=fetch(key,{cache:'no-cache'}).then(async r=>{if(r.ok)await c.put(key,clean(r.clone()));return r}).catch(()=>null);
 if(hit){net.catch(()=>0);return hit}
 return (await net)||Response.error();
}

/* Thư viện bản cố định (three.js, Firebase SDK): đã có là dùng luôn */
async function libFirst(req){
 const c=await caches.open(V);
 const hit=await c.match(req,{ignoreVary:true});
 if(hit)return hit;
 try{const r=await fetch(req);if(r.ok||r.type==='opaque')await c.put(req,r.clone());return r}
 catch(e){return Response.error()}
}

self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.method!=='GET')return;
 const u=new URL(req.url);
 if(req.mode==='navigate'&&u.origin===location.origin&&u.href.startsWith(scope)){
  e.respondWith(swr(abs('index.html')));return;
 }
 if(u.origin===location.origin&&u.href.startsWith(scope)){e.respondWith(swr(req.url));return}
 if(isLib(u)){e.respondWith(libFirst(req));return}
 /* Còn lại (Firebase database, đăng nhập Google...) để đi thẳng ra mạng, không đụng vào */
});
