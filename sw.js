const CACHE='veramor-shell-v8';
const SCOPE=self.registration.scope;
const rel=path=>new URL(path,SCOPE).href;
const CORE=[rel('./'),rel('beta.css'),rel('beta-growth.css'),rel('veramor-icon.svg')];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request)
        .then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return r})
        .catch(()=>caches.match(event.request).then(r=>r||caches.match(rel('./'))))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{
      if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{})}
      return r;
    }))
  );
});

self.addEventListener('push',event=>{
  let d={};
  try{d=event.data?.json()||{}}catch{d={body:event.data?.text()||'You have a new VERAMOR signal.'}}
  const title=d.title||'VERAMOR';
  event.waitUntil(self.registration.showNotification(title,{
    body:d.body||'You have a new VERAMOR signal.',
    tag:d.tag||'veramor-signal',
    icon:rel('veramor-icon.svg'),
    badge:rel('veramor-icon.svg'),
    data:{url:d.url||rel('./')},
    renotify:true
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||rel('./'),SCOPE).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){
      if('focus' in c){c.navigate(url);return c.focus()}
    }
    return clients.openWindow(url);
  }));
});
