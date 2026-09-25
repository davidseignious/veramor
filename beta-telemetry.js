import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const telemetrySb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}}
);
const seen=new Set();

async function user(){const {data:{session}}=await telemetrySb.auth.getSession();return session?.user||null}
async function record(name,details={},onceKey=''){
  try{
    const u=await user();if(!u)return;
    const key=onceKey||'';
    if(key&&seen.has(key))return;
    if(key)seen.add(key);
    const {error}=await telemetrySb.rpc('record_beta_event',{p_event:name,p_details:details||{}});
    if(error&&key)seen.delete(key);
  }catch(_e){}
}
function visible(id){const e=document.getElementById(id);return !!e&&!e.classList.contains('hidden')}
function captureScreens(){
  if(visible('onboardingScreen'))record('onboarding_view',{},'screen:onboarding');
  if(visible('waitingScreen'))record('verification_waiting',{},'screen:waiting');
  if(visible('appScreen')){
    record('app_ready',{},'screen:ready');
    if(visible('discoverView'))record('discover_view',{},'view:discover');
    if(visible('matchesView'))record('matches_view',{},'view:matches');
    if(visible('profileView'))record('profile_view',{},'view:profile');
    if(visible('settingsView'))record('settings_view',{},'view:settings');
  }
}
function safeError(value){
  const s=String(value||'Unknown client error').replace(/https?:\/\/\S+/g,'[url]');
  return s.slice(0,500);
}
function install(){
  user().then(u=>{if(u)record('app_open',{path:location.pathname},'app-open')}).catch(()=>{});
  captureScreens();
  const root=document.body;
  if(root)new MutationObserver(()=>captureScreens()).observe(root,{subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{
    const id=e.target?.closest?.('button')?.id||'';
    if(id==='likeBtn')record('like_click');
    else if(id==='superBtn')record('super_like_click');
    else if(id==='sendMessage')record('message_send_click');
    else if(id==='saveDiscoveryFilters')record('filters_apply_click');
    else if(id==='openLikesYou')record('likes_you_open');
    else if(id==='enablePush')record('push_enable_click');
  },true);
  window.addEventListener('error',e=>record('client_error',{message:safeError(e.message),source:(e.filename||'').split('/').pop()||'',line:e.lineno||0}));
  window.addEventListener('unhandledrejection',e=>record('client_error',{message:safeError(e.reason?.message||e.reason||'Unhandled promise rejection')}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
