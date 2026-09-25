import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const pushSb=createClient('https://rfcoworvfqcqallgpozn.supabase.co','sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}});
const pEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function b64ToUint8(s){const pad='='.repeat((4-s.length%4)%4),raw=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
async function user(){const {data:{session}}=await pushSb.auth.getSession();return session?.user||null}
async function registerSw(){if(!('serviceWorker'in navigator))throw new Error('Push notifications are not supported by this browser.');return navigator.serviceWorker.register('/sw.js')}
async function installPanel(){
  const host=document.getElementById('settingsView');if(!host||document.getElementById('pushSettings'))return;
  const p=document.createElement('div');p.id='pushSettings';p.className='panel';p.innerHTML='<div class="section-title"><div><span class="pill">PUSH</span><h3 style="margin:7px 0 0">Notifications when VERAMOR is closed</h3></div><span style="font-size:24px">♥</span></div><p class="muted">Get match, message, call, verification and reward alerts even when the app is not open.</p><button class="btn primary full" id="enablePush">Enable push notifications</button><button class="btn full hidden" id="disablePush" style="margin-top:8px">Turn off push on this device</button><div id="pushMsg"></div>';
  const danger=host.querySelector('.danger-zone');danger?host.insertBefore(p,danger):host.appendChild(p);document.getElementById('enablePush').onclick=enable;document.getElementById('disablePush').onclick=disable;await paint();
}
async function currentSub(){try{const reg=await registerSw();return await reg.pushManager.getSubscription()}catch{return null}}
async function paint(){
  const sub=await currentSub(),en=document.getElementById('enablePush'),dis=document.getElementById('disablePush');if(!en||!dis)return;
  en.classList.toggle('hidden',!!sub);dis.classList.toggle('hidden',!sub);
}
async function enable(){
  const u=await user(),msg=document.getElementById('pushMsg'),b=document.getElementById('enablePush');if(!u)return;
  b.disabled=true;b.textContent='Enabling…';
  try{
    if(!('Notification'in window))throw new Error('Notifications are not supported on this device.');
    const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('Notification permission was not granted.');
    const reg=await registerSw();const {data:key,error:ke}=await pushSb.rpc('get_push_public_key');if(ke)throw ke;
    let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToUint8(key)});
    const j=sub.toJSON(),keys=j.keys||{};const {error}=await pushSb.from('push_subscriptions').upsert({user_id:u.id,endpoint:sub.endpoint,p256dh:keys.p256dh,auth_key:keys.auth,user_agent:navigator.userAgent,updated_at:new Date().toISOString()},{onConflict:'user_id,endpoint'});if(error)throw error;
    msg.innerHTML='<div class="notice ok">Push notifications are on for this device.</div>';await paint();
  }catch(e){msg.innerHTML='<div class="notice bad">'+pEsc(e.message||'Could not enable push notifications.')+'</div>'}
  finally{b.disabled=false;b.textContent='Enable push notifications'}
}
async function disable(){
  const u=await user(),msg=document.getElementById('pushMsg'),sub=await currentSub();if(!u||!sub)return;
  try{await pushSb.from('push_subscriptions').delete().eq('user_id',u.id).eq('endpoint',sub.endpoint);await sub.unsubscribe();msg.innerHTML='<div class="notice ok">Push notifications are off on this device.</div>';await paint()}catch(e){msg.innerHTML='<div class="notice bad">'+pEsc(e.message||'Could not disable push.')+'</div>'}
}
function boot(){registerSw().catch(()=>{});installPanel().catch(()=>{})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
pushSb.auth.onAuthStateChange(e=>{if(e==='SIGNED_IN'||e==='TOKEN_REFRESHED')setTimeout(()=>installPanel().then(paint).catch(()=>{}),100)});
