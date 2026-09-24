import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const recoverySb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
const rEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function ensureRecoveryUi(){
  const form=document.getElementById('authForm');
  if(form&&!document.getElementById('forgotPassword')){
    const b=document.createElement('button');
    b.type='button';b.id='forgotPassword';b.className='btn full';b.style.marginTop='8px';b.textContent='Forgot password?';
    form.insertAdjacentElement('afterend',b);b.onclick=requestReset;
  }
  if(!document.getElementById('passwordRecoveryModal')){
    const m=document.createElement('div');m.id='passwordRecoveryModal';m.className='modal hidden';
    m.innerHTML='<div class="sheet"><div class="sheet-head"><div><span class="pill">ACCOUNT RECOVERY</span><h2 style="margin:8px 0 0">Choose a new password</h2></div></div><p class="muted">Use at least 8 characters. After saving, sign in with your new password.</p><div class="field"><label>New password</label><input id="newRecoveryPassword" type="password" minlength="8" autocomplete="new-password"></div><div class="field"><label>Confirm password</label><input id="confirmRecoveryPassword" type="password" minlength="8" autocomplete="new-password"></div><button class="btn primary full" id="saveRecoveryPassword">Update password</button><div id="recoveryMsg"></div></div>';
    document.body.appendChild(m);document.getElementById('saveRecoveryPassword').onclick=savePassword;
  }
}
function authMsg(text,type=''){const el=document.getElementById('authMsg');if(el)el.innerHTML=text?'<div class="notice '+type+'">'+rEsc(text)+'</div>':''}
async function requestReset(){
  const email=(document.getElementById('authEmail')?.value||'').trim();
  if(!email)return authMsg('Enter your email address first.','warn');
  const b=document.getElementById('forgotPassword');b.disabled=true;b.textContent='Sending reset link…';
  try{
    const {error}=await recoverySb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/'});
    if(error)throw error;authMsg('Password reset link sent. Check your email.','ok');
  }catch(e){authMsg(e.message||'Could not send the reset link.','bad')}
  finally{b.disabled=false;b.textContent='Forgot password?'}
}
function openRecovery(){ensureRecoveryUi();document.getElementById('passwordRecoveryModal')?.classList.remove('hidden')}
async function savePassword(){
  const p=document.getElementById('newRecoveryPassword')?.value||'',c=document.getElementById('confirmRecoveryPassword')?.value||'',msg=document.getElementById('recoveryMsg'),b=document.getElementById('saveRecoveryPassword');
  if(p.length<8){msg.innerHTML='<div class="notice warn">Use at least 8 characters.</div>';return}
  if(p!==c){msg.innerHTML='<div class="notice warn">Passwords do not match.</div>';return}
  b.disabled=true;b.textContent='Updating…';
  try{
    const {error}=await recoverySb.auth.updateUser({password:p});if(error)throw error;
    msg.innerHTML='<div class="notice ok">Password updated. You can now sign in with it.</div>';
    await recoverySb.auth.signOut({scope:'local'}).catch(()=>{});
    setTimeout(()=>location.assign(location.origin+'/'),700);
  }catch(e){msg.innerHTML='<div class="notice bad">'+rEsc(e.message||'Could not update password.')+'</div>'}
  finally{b.disabled=false;b.textContent='Update password'}
}
ensureRecoveryUi();
window.addEventListener('load',ensureRecoveryUi);
recoverySb.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')openRecovery()});
if(location.hash.includes('type=recovery')||location.search.includes('type=recovery'))setTimeout(openRecovery,250);
