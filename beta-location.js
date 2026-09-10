import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const locationSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

function isoLocal(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function addYearsSafe(date,years){
  const d=new Date(date.getFullYear()+years,date.getMonth(),date.getDate());
  if(d.getMonth()!==date.getMonth()) d.setDate(0);
  return d;
}
function configureAgeRange(){
  const input=document.getElementById('birthdate');
  if(!input)return;
  const today=new Date();today.setHours(12,0,0,0);
  const latest=addYearsSafe(today,-18);
  const earliestExclusive=addYearsSafe(today,-101);
  const earliest=new Date(earliestExclusive);earliest.setDate(earliest.getDate()+1);
  input.min=isoLocal(earliest);
  input.max=isoLocal(latest);
  input.addEventListener('change',()=>{
    if(!input.value)return;
    if(input.value<input.min||input.value>input.max){
      input.setCustomValidity('VERAMOR is for ages 18 to 100 only.');
      input.reportValidity();
    }else input.setCustomValidity('');
  });
}

let international=false;
function paintScope(){
  const local=document.getElementById('scopeLocal');
  const intl=document.getElementById('scopeInternational');
  const note=document.getElementById('scopeNote');
  if(!local||!intl)return;
  local.classList.toggle('primary',!international);
  intl.classList.toggle('primary',international);
  if(note)note.textContent=international
    ? 'International Browse is on. You can discover verified people globally, but your own location does not change.'
    : 'Local Browse is on. Distance limits use your real/home location unless you have a paid Travel Mode location.';
}
async function currentUser(){
  const {data:{session}}=await locationSb.auth.getSession();
  return session?.user||null;
}
async function loadScope(){
  const u=await currentUser();
  if(!u)return;
  const {data,error}=await locationSb.from('user_settings').select('international_discovery_enabled').eq('user_id',u.id).single();
  if(error)return;
  international=!!data?.international_discovery_enabled;
  paintScope();
}
async function setScope(value){
  const u=await currentUser();
  if(!u)return;
  const buttons=[document.getElementById('scopeLocal'),document.getElementById('scopeInternational')];
  buttons.forEach(b=>{if(b)b.disabled=true});
  const {error}=await locationSb.from('user_settings').update({international_discovery_enabled:value,updated_at:new Date().toISOString()}).eq('user_id',u.id);
  buttons.forEach(b=>{if(b)b.disabled=false});
  if(error){alert(error.message||'Could not change discovery area.');return}
  international=value;paintScope();
  document.getElementById('refreshDiscovery')?.click();
}
function installScopeButtons(){
  if(document.getElementById('discoveryScope'))return;
  const modes=document.getElementById('modeButtons');
  if(!modes)return;
  const wrap=document.createElement('div');
  wrap.id='discoveryScope';
  wrap.className='panel';
  wrap.style.marginBottom='12px';
  wrap.innerHTML='<div class="section-title" style="margin:0 0 8px"><strong>Discovery area</strong><span class="pill">FREE</span></div><div class="actions"><button class="btn primary" id="scopeLocal">Nearby</button><button class="btn" id="scopeInternational">🌍 International</button></div><p id="scopeNote" class="muted" style="margin:10px 0 0">Local Browse is on.</p>';
  modes.insertAdjacentElement('beforebegin',wrap);
  document.getElementById('scopeLocal').onclick=()=>setScope(false);
  document.getElementById('scopeInternational').onclick=()=>setScope(true);
  loadScope().catch(()=>{});
}
function loadExperienceModules(){
  if(!document.querySelector('link[href="beta-experience.css"]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='beta-experience.css';document.head.appendChild(link);
  }
  import('./beta-notifications.js').catch(e=>console.error('Notification module failed',e));
  import('./beta-chemistry-context.js').catch(e=>console.error('Chemistry context module failed',e));
}

loadExperienceModules();
window.addEventListener('load',()=>{
  configureAgeRange();
  installScopeButtons();
});
locationSb.auth.onAuthStateChange((event)=>{
  if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')loadScope().catch(()=>{});
});
