import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const URL='https://rfcoworvfqcqallgpozn.supabase.co';
const KEY='sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF';
const BETA_URL=location.hostname.endsWith('.supabase.co')?location.href.split(/[?#]/)[0]:location.origin+'/';
const TERMS_VERSION='2026-09-11.1';
const PRIVACY_VERSION='2026-09-11.1';
const SAFETY_VERSION='2026-09-11.1';
const BACKGROUND_NOTICE='VERAMOR DOES NOT CONDUCT CRIMINAL BACKGROUND SCREENINGS ON ITS MEMBERS.';
const hardeningSb=createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}});

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
function friendlyAuthError(err){
  const raw=String(err?.message||err||'').trim();
  const msg=raw.toLowerCase();
  if(msg.includes('invalid login credentials')||msg.includes('invalid credentials'))return 'Email or password is incorrect. Use the same password you signed up with, or tap Forgot password.';
  if(msg.includes('email not confirmed'))return 'This beta account still needs activation. Choose Create account once with the same email and password, then log in.';
  if(msg.includes('permission denied'))return 'Your account signed in, but VERAMOR could not finish loading it. Please try again now.';
  if(msg.includes('too many requests')||msg.includes('rate limit'))return 'Too many attempts were made too quickly. Wait a few minutes, then try again.';
  if(msg.includes('failed to fetch')||msg.includes('network'))return 'VERAMOR could not reach the login service. Check your connection and try again.';
  return raw||'Could not continue.';
}

function ensureLegalSignupUi(){
  const form=document.getElementById('authForm');
  const age=document.getElementById('ageRow');
  if(!form||!age)return null;
  let wrap=document.getElementById('veraLegalSignup');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id='veraLegalSignup';
    wrap.className='hidden';
    wrap.innerHTML=`
      <div class="vera-background-disclosure">${BACKGROUND_NOTICE}</div>
      <div class="vera-safety-registration">
        <strong>Dating safety notice</strong>
        <p>Use caution when communicating with someone you have not met. Do not share financial information, passwords, one-time codes, or unnecessary identifying information.</p>
        <p>For an in-person meeting, tell someone you trust where you are going, arrange your own transportation, and meet in a public place.</p>
        <a href="safety.html" target="_blank" rel="noopener">Read the Dating Safety Center</a>
      </div>
      <label class="notice vera-legal-check"><input id="termsConfirm" type="checkbox"> <span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Beta Terms</a> and acknowledge the <a href="privacy.html" target="_blank" rel="noopener">Privacy Notice</a>.</span></label>
      <label class="notice vera-legal-check"><input id="safetyConfirm" type="checkbox"> <span>I have read the dating safety notice and understand that verification does not guarantee another person's history, intentions, or behavior.</span></label>
      <label class="notice vera-legal-check"><input id="backgroundConfirm" type="checkbox"> <span>I acknowledge that VERAMOR does not conduct criminal background screenings on members.</span></label>`;
    age.insertAdjacentElement('afterend',wrap);
  }
  if(wrap.dataset.signupSync!=='1'){
    wrap.dataset.signupSync='1';
    const sync=()=>wrap.classList.toggle('hidden',age.classList.contains('hidden'));
    new MutationObserver(sync).observe(age,{attributes:true,attributeFilter:['class']});
    sync();
  }
  return wrap;
}
async function persistLegalAcceptance(u){
  if(!u)return;
  const payload={terms:TERMS_VERSION,privacy:PRIVACY_VERSION,safety:SAFETY_VERSION,background:true,accepted_at:new Date().toISOString()};
  const {error:recordError}=await hardeningSb.rpc('record_legal_acceptance',{
    p_terms:TERMS_VERSION,p_privacy:PRIVACY_VERSION,p_safety:SAFETY_VERSION,p_background:true
  });
  if(recordError)throw recordError;
  const prior=u.user_metadata||{};
  const {error}=await hardeningSb.auth.updateUser({data:{...prior,veramor_legal_acceptance:payload}});
  if(error)throw error;
  localStorage.removeItem('veramor_pending_legal_acceptance');
}
async function ensurePostLoginReady(){
  const {data:{session}}=await hardeningSb.auth.getSession();
  const u=session?.user;
  if(!u)throw new Error('Login did not create an active session. Please try again.');
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const {data:p,error:pe}=await hardeningSb.from('profiles').select('id').eq('id',u.id).maybeSingle();
      if(pe)throw pe;
      if(!p){const {error}=await hardeningSb.from('profiles').insert({id:u.id});if(error&&error.code!=='23505')throw error}
      const {data:s,error:se}=await hardeningSb.from('user_settings').select('user_id').eq('user_id',u.id).maybeSingle();
      if(se)throw se;
      if(!s){const {error}=await hardeningSb.from('user_settings').insert({user_id:u.id});if(error&&error.code!=='23505')throw error}
      const {error:le}=await hardeningSb.rpc('profile_launch_status');
      if(le)throw le;
      return true;
    }catch(e){
      lastError=e;
      if(attempt===0)await new Promise(r=>setTimeout(r,300));
    }
  }
  throw lastError||new Error('Could not load your account setup.');
}

let recoveryRequested=/type=recovery/i.test(location.hash+location.search);
function recoveryDialog(){
  if(document.getElementById('passwordRecoveryOverlay'))return;
  const wrap=document.createElement('div');
  wrap.id='passwordRecoveryOverlay';
  wrap.className='modal';
  wrap.innerHTML='<div class="sheet"><div class="sheet-head"><strong>Set a new password</strong></div><p class="muted">Use at least 10 characters. A longer unique password is better.</p><div class="field"><label>New password</label><input id="newRecoveryPassword" class="input" type="password" minlength="10" autocomplete="new-password"></div><button id="saveRecoveryPassword" class="btn primary full">Update password</button><div id="recoveryMsg"></div></div>';
  document.body.appendChild(wrap);
  document.getElementById('saveRecoveryPassword').onclick=async()=>{
    const btn=document.getElementById('saveRecoveryPassword');
    const pwd=document.getElementById('newRecoveryPassword').value;
    if(pwd.length<10)return notice('#recoveryMsg','Password must be at least 10 characters.','warn');
    btn.disabled=true;btn.textContent='Updating…';
    try{
      const {error}=await hardeningSb.auth.updateUser({password:pwd});
      if(error)throw error;
      notice('#recoveryMsg','Password updated. Returning you to login…','ok');
      await hardeningSb.auth.signOut();
      history.replaceState({},'',location.pathname);
      setTimeout(()=>location.replace(BETA_URL),500);
    }catch(e){notice('#recoveryMsg',friendlyAuthError(e),'bad');btn.disabled=false;btn.textContent='Update password'}
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
    const email=(document.getElementById('authEmail')?.value||'').trim().toLowerCase();
    if(!email)return notice('#authMsg','Enter your email first, then choose Forgot password.','warn');
    btn.disabled=true;btn.textContent='Sending…';
    try{
      const {error}=await hardeningSb.auth.resetPasswordForEmail(email,{redirectTo:BETA_URL});
      if(error)throw error;
      notice('#authMsg','If that email has a VERAMOR account, a password-reset link has been sent. Use the newest reset email.','ok');
    }catch(e){notice('#authMsg',friendlyAuthError(e),'bad')}
    finally{btn.disabled=false;btn.textContent='Forgot password?'}
  };
}

function installFriendBetaSignupBypass(){
  const form=document.getElementById('authForm');
  if(!form||form.dataset.friendBetaSignup==='2')return;
  form.dataset.friendBetaSignup='2';
  ensureLegalSignupUi();

  document.addEventListener('submit',async e=>{
    if(e.target!==form)return;

    const ageRow=document.getElementById('ageRow');
    const isSignup=!!ageRow&&!ageRow.classList.contains('hidden');

    // Login is owned by beta.js and the main VERAMOR Supabase client.
    // Only intercept signup here for the Friend Beta account-creation flow.
    if(!isSignup)return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const email=(document.getElementById('authEmail')?.value||'').trim().toLowerCase();
    const password=document.getElementById('authPassword')?.value||'';
    const btn=document.getElementById('authSubmit');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return notice('#authMsg','Enter a valid email address.','warn');
    if(password.length<8)return notice('#authMsg','Password must be at least 8 characters.','warn');
    if(isSignup&&password.length<10)return notice('#authMsg','New beta accounts require at least 10 characters.','warn');
    if(isSignup&&password.length>128)return notice('#authMsg','Password must be 128 characters or fewer.','warn');
    if(isSignup){
      ensureLegalSignupUi();
      if(!document.getElementById('ageConfirm')?.checked)return notice('#authMsg','Confirm that you are at least 18.','warn');
      if(!document.getElementById('termsConfirm')?.checked||!document.getElementById('safetyConfirm')?.checked||!document.getElementById('backgroundConfirm')?.checked){
        return notice('#authMsg','Please accept the Terms, Privacy Notice, dating-safety notice, and background-screening disclosure to create an account.','warn');
      }
    }

    const old=btn?.textContent||(isSignup?'Create account':'Log in');
    if(btn){btn.disabled=true;btn.textContent=isSignup?'Creating…':'Logging in…'}
    notice('#authMsg','');
    let signedIn=false;
    try{
      if(isSignup){
        const r=await fetch(URL+'/functions/v1/beta-signup',{
          method:'POST',
          headers:{'content-type':'application/json','apikey':KEY},
          body:JSON.stringify({email,password})
        });
        const body=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(body.error||'Could not create account.');
      }

      const {data,error}=await hardeningSb.auth.signInWithPassword({email,password});
      if(error)throw error;
      signedIn=true;
      if(isSignup)await persistLegalAcceptance(data?.user);
      let setupWarning=null;
      try{await ensurePostLoginReady()}catch(setupErr){
        setupWarning=friendlyAuthError(setupErr);
        console.warn('VERAMOR post-login setup will retry after reload',setupErr);
      }
      notice('#authMsg',setupWarning
        ? 'Signed in. Finishing account setup…'
        : (isSignup?'Account created. Opening your profile…':'Signed in. Opening your profile…'),'ok');
      setTimeout(()=>location.reload(),250);
    }catch(err){
      const text=friendlyAuthError(err);
      notice('#authMsg',text,'bad');
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
  ensureLegalSignupUi();
  installFriendBetaSignupBypass();
  addForgotPassword();
  installSafeFaceReplace();
  installSafeIntroReplace();
  addConnectivityBanner();
  addEnterToSend();
  if(recoveryRequested)recoveryDialog();
});
