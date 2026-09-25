import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const passportSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}}
);
const passportEndpoint='https://rfcoworvfqcqallgpozn.supabase.co/functions/v1/profile-passport';
let passportUrl='';

async function authHeaders(){
  const {data:{session}}=await passportSb.auth.getSession();
  return session?.access_token?{'Authorization':`Bearer ${session.access_token}`}:{ };
}
async function call(action,extra={}){
  const headers=await authHeaders();
  const r=await fetch(passportEndpoint,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({action,...extra})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error||'Profile Link unavailable');
  return data;
}
function status(text,type=''){
  const el=document.getElementById('passportMsg');if(!el)return;
  el.innerHTML=text?`<div class="notice ${type}">${String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</div>`:'';
}
function passportPanel(){
  const host=document.getElementById('myProfile');
  if(!host||host.querySelector('#passportPanel'))return;
  const panel=document.createElement('div');
  panel.id='passportPanel';panel.className='panel';panel.style.marginTop='12px';
  panel.innerHTML='<span class="pill">PROFILE LINK</span><h3>Share your VERAMOR profile</h3><p class="muted">Create a revocable link to your current approved profile. On a phone, Share opens the device share sheet so you can send it to other apps.</p><div class="actions"><button class="btn primary" id="passportCreate">Create profile link</button><button class="btn" id="passportShare" disabled>Share</button><button class="btn" id="passportCopy" disabled>Copy link</button><button class="btn danger" id="passportRevoke">Revoke link</button></div><div id="passportMsg"></div>';
  host.appendChild(panel);
  document.getElementById('passportCreate').onclick=createPassport;
  document.getElementById('passportShare').onclick=sharePassport;
  document.getElementById('passportCopy').onclick=copyPassport;
  document.getElementById('passportRevoke').onclick=revokePassport;
}
async function createPassport(){
  const b=document.getElementById('passportCreate');b.disabled=true;b.textContent='Creating…';status('');
  try{
    const data=await call('create');passportUrl=data.url||'';
    document.getElementById('passportShare').disabled=!passportUrl;
    document.getElementById('passportCopy').disabled=!passportUrl;
    status('Profile link ready.','ok');
  }catch(e){status(e.message,'bad')}
  finally{b.disabled=false;b.textContent='Create profile link'}
}
async function sharePassport(){
  if(!passportUrl)return status('Create a profile link first.','warn');
  try{
    if(navigator.share){await navigator.share({title:'My VERAMOR Profile',text:'Check out my VERAMOR profile.',url:passportUrl});status('Share sheet opened.','ok')}
    else{await navigator.clipboard.writeText(passportUrl);status('Your browser does not have a share sheet, so the link was copied instead.','ok')}
  }catch(e){if(e?.name!=='AbortError')status(e.message||'Could not share the profile.','bad')}
}
async function copyPassport(){
  if(!passportUrl)return status('Create a profile link first.','warn');
  try{await navigator.clipboard.writeText(passportUrl);status('Profile link copied.','ok')}catch(e){status('Could not copy automatically. Use Share instead.','bad')}
}
async function revokePassport(){
  if(!confirm('Revoke your current profile link? Anyone with that link will no longer be able to open it.'))return;
  const b=document.getElementById('passportRevoke');b.disabled=true;b.textContent='Revoking…';
  try{await call('revoke');passportUrl='';document.getElementById('passportShare').disabled=true;document.getElementById('passportCopy').disabled=true;status('Profile link revoked.','ok')}
  catch(e){status(e.message,'bad')}
  finally{b.disabled=false;b.textContent='Revoke link'}
}

const observer=new MutationObserver(()=>passportPanel());
window.addEventListener('load',()=>{const host=document.getElementById('myProfile');if(host)observer.observe(host,{childList:true,subtree:false});passportPanel()});
