const VERSION='bc-v4';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/badge.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION&&k!=='bc-config'&&k!=='bc-fonts').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET')return;
  if(u.hostname.includes('fonts.googleapis.com')||u.hostname.includes('fonts.gstatic.com')){
    e.respondWith(caches.open('bc-fonts').then(async c=>{const hit=await c.match(e.request);const net=fetch(e.request).then(r=>{c.put(e.request,r.clone());return r}).catch(()=>hit);return hit||net}));return;
  }
  if(u.origin!==location.origin)return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put('./index.html',cp));return r}).catch(()=>caches.match('./index.html')));return;
  }
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put(e.request,cp));return r})));
});
async function checkReminders(){
  try{
    const c=await caches.open('bc-config');const r=await c.match('config.json');if(!r)return;
    const cfg=await r.json();if(!cfg.notify)return;
    const now=new Date();const p=n=>String(n).padStart(2,'0');
    const k=`${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`;
    const list=cfg.days[k]||[];const sentR=await c.match('sent-'+k);const sent=sentR?await sentR.json():[];
    const nm=now.getHours()*60+now.getMinutes();
    for(const it of list){const[h,m]=it.hm.split(':').map(Number);const t=h*60+m;
      if(!it.done&&nm>=t&&nm<t+180&&!sent.includes(it.id)){
        await self.registration.showNotification(it.title,{body:it.body,icon:'icons/icon-192.png',badge:'icons/badge.png',tag:'bc-'+it.id,lang:'ar',dir:'rtl',data:{url:'./#home'}});
        sent.push(it.id);
      }}
    await c.put('sent-'+k,new Response(JSON.stringify(sent)));
  }catch(e){}
}
self.addEventListener('periodicsync',e=>{if(e.tag==='bc-reminders')e.waitUntil(checkReminders())});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c)return c.focus()}return self.clients.openWindow((e.notification.data&&e.notification.data.url)||'./')}))});
