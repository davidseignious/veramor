import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const URL='https://rfcoworvfqcqallgpozn.supabase.co';
const KEY='sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF';
const BETA_URL='https://veramor.vercel.app/beta.html';
const hardeningSb=createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

function notice(target,text,type=''){
  const host=typeof target==='string'?document.querySelector(target):target;
  if(!host)return;
  host.textContent='';
  if(!text)return;
  const d=document.createElement('div');
  d.className='notice '+type;
  d.textContent=text;
  host.appendChild(d);
}
function fileExt(file){
  const raw=(file.name||'').split('.').pop()?.toLowerCase();
  if(raw&&/^[a-z0-9]{2,5}$/.test(raw))return raw;
  const subtype=(file.type||'').split('/')[1]||'bin';
  return subtype==='quicktime'?'mov':subtype.replace('jpeg','jpg');
}
async function me(){
  const {data:{session}}=await hardeningSb.auth.getSession();
  if(!session?.user)throw new Error('Your session expired. Log in again.');
  return session.user;
}
async function owned(bucket,userId){
  const {data,error}=await hardeningSb.storage.from(bucket).list(userId,{limit:20,sortBy:{column:'created_at',order:'asc'}});
  if(error)throw error;
  return (data||[]).filter(x=>x?.id&&x?.name);
}

let recoveryRequested=/type=recovery/i.test(location.hash+location.search);
function recoveryDialog(){
  if(document.getElementById('passwordRecoveryOverlay'))return;
  const wrap=document.createElement('div');
  wrap.id='passwordRecoveryOverlay';
  wrap.className='modal';
  wrap.innerHTML='<div class="sheet"><div class="sheet-head"><strong>Set a new password</strong></div><p class="muted">Use at least 8 characters. A longer unique password is better.</p><div class="field"><label>New password</label><input id="newRecoveryPassword" class="input" type="password" minlength="8" autocomplete="new-password"></div><button id="saveRecoveryPassword" class="btn primary full">Update password</button><div id="recoveryMsg"></div></div>';
  document.body.appendChild(wrap);
  document.getElementById('saveRecoveryPassword').onclick=async()=>{
    const btn=document.getElementById('saveRecoveryPassword');
    const pwd=document.getElementById('newRecoveryPassword').value;
    if(pwd.length<8)return notice('#recoveryMsg','Password must be at least 8 characters.','warn');
    btn.disabled=true;btn.textContent='Updating…';
    try{
      const {error}=await hardeningSb.auth.updateUser({password:pwd});
      if(error)throw error;
      notice('#recoveryMsg','Password updated. Returning you to login…','ok');
      await hardeningSb.auth.signOut();
      history.replaceState({},'',location.pathname);
      setTimeout(()=>location.replace(BETA_URL),500);
    }catch(e){notice('#recoveryMsg',e.message||'Could not update password.','bad');btn.disabled=false;btn.textContent='Update password'}
  };
}
hardeningSb.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY'){
    recoveryRequested=true;
    if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',recoveryDialog,{once:true});else recoveryDialog();
  }
});

function addForgotPassword(){
  if(document.getElementById('forgotPassword'))return;
  const form=document.getElementById('authForm');
  if(!form)return;
  const btn=document.createElement('button');
  btn.type='button';btn.id='forgotPassword';btn.className='btn full';btn.style.marginTop='8px';btn.textContent='Forgot password?';
  form.insertAdjacentElement('afterend',btn);
  btn.onclick=async()=>{
    const email=(document.getElementById('authEmail')?.value||'').trim();
    if(!email)return notice('#authMsg','Enter your email first, then choose Forgot password.','warn');
    btn.disabled=true;btn.textContent='Sending…';
    try{
      const {error}=await hardeningSb.auth.resetPasswordForEmail(email,{redirectTo:BETA_URL});
      if(error)throw error;
      notice('#authMsg','If that email has a VERAMOR account, a password-reset link has been sent. Use the newest reset email.','ok');
    }catch(e){notice('#authMsg',e.message||'Could not send reset email.','bad')}
    finally{btn.disabled=false;btn.textContent='Forgot password?'}
  };
}

function installFriendBetaSignupBypass(){
  const form=document.getElementById('authForm');
  if(!form||form.dataset.friendBetaSignup==='1')return;
  form.dataset.friendBetaSignup='1';

  document.addEventListener('submit',async e=>{
    if(e.target!==form)return;
    const ageRow=document.getElementById('ageRow');
    const isSignup=!!ageRow&&!ageRow.classList.contains('hidden');
    if(!isSignup)return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const email=(document.getElementById('authEmail')?.value||'').trim().toLowerCase();
    const password=document.getElementById('authPassword')?.value||'';
    const ageConfirm=document.getElementById('ageConfirm');
    const btn=document.getElementById('authSubmit');
    if(!ageConfirm?.checked)return notice('#authMsg','Confirm that you are at least 18.','warn');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return notice('#authMsg','Enter a valid email address.','warn');
    if(password.length<8)return notice('#authMsg','Password must be at least 8 characters.','warn');

    const old=btn?.textContent||'Create account';
    if(btn){btn.disabled=true;btn.textContent='Creating…'}
    notice('#authMsg','');
    try{
      const r=await fetch(URL+'/functions/v1/beta-signup',{
        method:'POST',
        headers:{'content-type':'application/json','apikey':KEY},
        body:JSON.stringify({email,password})
      });
      const body=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(body.error||'Could not create account.');

      const {error}=await hardeningSb.auth.signInWithPassword({email,password});
      if(error)throw error;
      notice('#authMsg','Friend Beta account active. Opening your profile…','ok');
      setTimeout(()=>location.reload(),250);
    }catch(err){
      notice('#authMsg',err?.message||'Could not create account.','bad');
      if(btn){btn.disabled=false;btn.textContent=old}
    }
  },true);

  const legal=document.querySelector('#authScreen .legal');
  if(legal&&!document.getElementById('betaEmailNote')){
    const p=document.createElement('p');
    p.id='betaEmailNote';p.className='notice';
    p.textContent='Friend Beta testing: accounts activate immediately after signup. Email confirmation will return before public launch.';
    legal.insertAdjacentElement('beforebegin',p);
  }
}

function installSafeFaceReplace(){
  const btn=document.getElementById('uploadFace');
  if(!btn)return;
  btn.onclick=async()=>{
    const input=document.getElementById('faceVideoInput');
    const file=input?.files?.[0];
    if(!file)return notice('#faceMsg','Choose or record a face video first.','warn');
    if(!file.type.startsWith('video/'))return notice('#faceMsg','Face verification must be a video.','bad');
    if(file.size>50*1024*1024)return notice('#faceMsg','Face video must be 50 MB or smaller.','bad');
    btn.disabled=true;btn.textContent='Uploading…';
    let newPath=null;
    try{
      const u=await me();
      const oldRows=await owned('verification-media',u.id);
      const oldPaths=oldRows.map(x=>`${u.id}/${x.name}`);
      newPath=`${u.id}/face-${crypto.randomUUID()}.${fileExt(file)}`;
      const {error:up}=await hardeningSb.storage.from('verification-media').upload(newPath,file,{contentType:file.type,upsert:false});
      if(up)throw up;
      const {error:pe}=await hardeningSb.from('profiles').update({presence_video_path:newPath,presence_prompt:'Beta face verification',live_capture_at:new Date().toISOString()}).eq('id',u.id);
      if(pe)throw pe;
      const remove=oldPaths.filter(p=>p!==newPath);
      if(remove.length)await hardeningSb.storage.from('verification-media').remove(remove);
      input.value='';
      notice('#faceMsg','Private face video uploaded safely.','ok');
      setTimeout(()=>location.reload(),450);
    }catch(e){
      if(newPath)try{await hardeningSb.storage.from('verification-media').remove([newPath])}catch(_e){}
      notice('#faceMsg',e.message||'Face video upload failed. Your previous video was kept.','bad');
      btn.disabled=false;btn.textContent='Upload face video';
    }
  };
}

function installSafeIntroReplace(){
  const btn=document.getElementById('uploadIntro');
  if(!btn)return;
  btn.onclick=async()=>{
    const input=document.getElementById('introVideoInput');
    const file=input?.files?.[0];
    if(!file)return notice('#introMsg','Choose a public intro video first.','warn');
    if(!file.type.startsWith('video/'))return notice('#introMsg','Intro must be a video.','bad');
    if(file.size>50*1024*1024)return notice('#introMsg','Video must be 50 MB or smaller.','bad');
    btn.disabled=true;btn.textContent='Uploading…';
    let newPath=null;
    try{
      const u=await me();
      const {data:p,error:pErr}=await hardeningSb.from('profiles').select('intro_video_path').eq('id',u.id).single();
      if(pErr)throw pErr;
      const oldPath=p?.intro_video_path||null;
      newPath=`${u.id}/intro-${crypto.randomUUID()}.${fileExt(file)}`;
      const {error:up}=await hardeningSb.storage.from('profile-videos').upload(newPath,file,{contentType:file.type,upsert:false});
      if(up)throw up;
      const {error:pe}=await hardeningSb.from('profiles').update({intro_video_path:newPath}).eq('id',u.id);
      if(pe)throw pe;
      if(oldPath&&oldPath!==newPath)await hardeningSb.storage.from('profile-videos').remove([oldPath]);
      input.value='';
      notice('#introMsg','Public profile video saved safely.','ok');
      setTimeout(()=>location.reload(),450);
    }catch(e){
      if(newPath)try{await hardeningSb.storage.from('profile-videos').remove([newPath])}catch(_e){}
      notice('#introMsg',e.message||'Video upload failed. Your previous video was kept.','bad');
      btn.disabled=false;btn.textContent='Upload public intro';
    }
  };
}

function addConnectivityBanner(){
  const id='connectionBanner';
  const show=()=>{
    if(document.getElementById(id))return;
    const d=document.createElement('div');d.id=id;d.className='notice warn';
    d.style.position='fixed';d.style.left='12px';d.style.right='12px';d.style.top='74px';d.style.zIndex='10000';d.textContent='You’re offline. VERAMOR will work again when your connection returns.';
    document.body.appendChild(d);
  };
  const hide=()=>document.getElementById(id)?.remove();
  window.addEventListener('offline',show);window.addEventListener('online',hide);if(!navigator.onLine)show();
}

function addEnterToSend(){
  document.addEventListener('keydown',e=>{
    const t=e.target;
    if(t?.id==='chatInput'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('sendMessage')?.click()}
  });
}

window.addEventListener('load',()=>{
  installFriendBetaSignupBypass();
  addForgotPassword();
  installSafeFaceReplace();
  installSafeIntroReplace();
  addConnectivityBanner();
  addEnterToSend();
  if(recoveryRequested)recoveryDialog();
});
