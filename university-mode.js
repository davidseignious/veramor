import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const campusSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}}
);

const cEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let campusState=null;
let campusCandidates=[];

function isEdu(user){
  const email=String(user?.email||'').toLowerCase();
  return !!user?.email_confirmed_at && /^[^@\s]+@[a-z0-9.-]+\.edu$/.test(email);
}
function emailDomain(user){return String(user?.email||'').toLowerCase().split('@')[1]||''}
function schoolLabel(profile,user){return profile?.university_name||emailDomain(user)||'Verified .edu campus'}

async function fetchCampusState(){
  const {data:{user},error:ue}=await campusSb.auth.getUser();
  if(ue||!user)return null;
  const [{data:profile},{data:settings}]=await Promise.all([
    campusSb.from('profiles').select('university_name,university_verified').eq('id',user.id).maybeSingle(),
    campusSb.from('user_settings').select('university_mode_enabled,university_scope').eq('user_id',user.id).maybeSingle()
  ]);
  campusState={
    user,
    eligible:isEdu(user),
    verified:profile?.university_verified===true,
    school:schoolLabel(profile,user),
    enabled:settings?.university_mode_enabled===true,
    scope:settings?.university_scope||'same_school'
  };
  return campusState;
}

async function setCampusMode(enabled,scope){
  const state=campusState||await fetchCampusState();
  if(!state)throw new Error('Sign in first.');
  if(enabled&&!state.eligible)throw new Error('University Mode requires a confirmed .edu account email.');
  const {data,error}=await campusSb.rpc('set_university_mode',{
    p_enabled:!!enabled,
    p_school_name:null,
    p_scope:scope||state.scope||'same_school'
  });
  if(error)throw error;
  return data;
}

function discoverMarkup(s){
  const scopeText=s.scope==='all_colleges'?'All verified colleges':'Same campus only';
  return `<div id="universityModeCard" class="panel campus-panel">
    <div class="campus-head"><div><span class="pill">🎓 UNIVERSITY MODE</span><h3>Meet verified college accounts</h3></div><button class="btn ${s.enabled?'primary':''}" id="campusToggle">${s.enabled?'University On':'Turn on'}</button></div>
    <p class="muted">University Mode filters discovery to accounts verified through a confirmed <strong>.edu</strong> email. Your normal 1-on-1, 2 Man, and Trio browsing still works inside the campus pool.</p>
    <div class="campus-status"><span class="campus-dot ${s.enabled?'on':''}"></span><strong>${s.enabled?cEsc(scopeText):'Standard discovery'}</strong>${s.verified?`<span class="campus-profile-line">✓ ${cEsc(s.school)}</span>`:''}</div>
    <div class="campus-controls">
      <div class="field"><label>University discovery</label><select id="campusScope"><option value="same_school" ${s.scope==='same_school'?'selected':''}>My campus only</option><option value="all_colleges" ${s.scope==='all_colleges'?'selected':''}>All verified colleges</option></select></div>
      <button class="btn" id="campusSaveScope">Apply</button>
    </div>
    ${s.eligible?'':`<div class="notice warn campus-requires">To turn this on, sign in with a confirmed .edu email. This verifies the institutional email; it does not independently prove current enrollment.</div>`}
    <div id="campusMsg"></div>
  </div>`;
}

function settingsMarkup(s){
  return `<div id="universitySettings" class="panel campus-panel">
    <div class="section-title"><div><span class="pill">🎓 UNIVERSITY</span><h3 style="margin:7px 0 0">Campus discovery</h3></div><span class="campus-dot ${s.enabled?'on':''}"></span></div>
    <div class="campus-settings-grid"><div class="campus-mini"><small>Eligibility</small><b>${s.eligible?'Confirmed .edu':'Needs confirmed .edu'}</b></div><div class="campus-mini"><small>Mode</small><b>${s.enabled?(s.scope==='all_colleges'?'All colleges':'Same campus'):'Off'}</b></div></div>
    ${s.verified?`<p class="campus-profile-line" style="margin-top:12px">✓ Institutional email verified · ${cEsc(s.school)}</p>`:''}
    <p class="muted">University Mode is optional and can be turned off at any time. It only changes who appears in discovery.</p>
  </div>`;
}

function setCampusMessage(text,type=''){
  const el=document.getElementById('campusMsg');
  if(el)el.innerHTML=text?`<div class="notice ${type}">${cEsc(text)}</div>`:'';
}

async function bindCampusControls(){
  const toggle=document.getElementById('campusToggle');
  const apply=document.getElementById('campusSaveScope');
  const scope=document.getElementById('campusScope');
  if(toggle)toggle.onclick=async()=>{
    toggle.disabled=true;setCampusMessage(campusState.enabled?'Turning University Mode off…':'Verifying campus email…');
    try{await setCampusMode(!campusState.enabled,scope?.value||campusState.scope);location.reload()}
    catch(e){setCampusMessage(e.message||'Could not update University Mode.','bad');toggle.disabled=false}
  };
  if(apply)apply.onclick=async()=>{
    apply.disabled=true;setCampusMessage('Applying campus filter…');
    try{await setCampusMode(campusState.enabled,scope?.value||campusState.scope);location.reload()}
    catch(e){setCampusMessage(e.message||'Could not update campus filter.','bad');apply.disabled=false}
  };
}

async function refreshCampusCandidates(){
  if(!campusState?.enabled){campusCandidates=[];return}
  const {data,error}=await campusSb.rpc('get_discovery_candidates');
  if(error){campusCandidates=[];return}
  campusCandidates=(data||[]).map(x=>x.profile).filter(Boolean);
}
function visibleCampusProfile(){
  const h=document.querySelector('#deck .profile-overlay h2');
  if(!h)return null;
  const text=(h.textContent||'').trim();
  return campusCandidates.find(p=>text===String(p.display_name||'')||text.startsWith(String(p.display_name||'')+','))||null;
}
function decorateCampusCard(){
  if(!campusState?.enabled)return;
  const overlay=document.querySelector('#deck .profile-overlay');
  if(!overlay||overlay.querySelector('.campus-profile-badge'))return;
  const p=visibleCampusProfile();
  if(!p?.university_verified)return;
  const badge=document.createElement('div');badge.className='campus-profile-badge';badge.textContent=`🎓 ${p.university_name||'Verified .edu'}`;overlay.appendChild(badge);
}
function decorateProfileModal(){
  if(!campusState?.enabled)return;
  const body=document.getElementById('profileModalBody');
  if(!body||body.querySelector('.campus-profile-line'))return;
  const h=body.querySelector('h2');if(!h)return;
  const text=(h.textContent||'').trim();
  const p=campusCandidates.find(x=>text===String(x.display_name||'')||text.startsWith(String(x.display_name||'')+','));
  if(!p?.university_verified)return;
  const line=document.createElement('div');line.className='campus-profile-line';line.textContent=`🎓 Institutional email verified · ${p.university_name||'Verified .edu'}`;h.insertAdjacentElement('afterend',line);
}

async function installUniversityMode(){
  const s=await fetchCampusState();if(!s)return;
  const discover=document.getElementById('discoverView');
  const modes=document.getElementById('modeButtons');
  if(discover&&modes&&!document.getElementById('universityModeCard'))modes.insertAdjacentHTML('beforebegin',discoverMarkup(s));
  const settings=document.getElementById('settingsView');
  if(settings&&!document.getElementById('universitySettings')){
    const danger=settings.querySelector('.danger-zone');
    if(danger)danger.insertAdjacentHTML('beforebegin',settingsMarkup(s));else settings.insertAdjacentHTML('beforeend',settingsMarkup(s));
  }
  await bindCampusControls();
  await refreshCampusCandidates();
  decorateCampusCard();decorateProfileModal();
  const deck=document.getElementById('deck');if(deck)new MutationObserver(()=>decorateCampusCard()).observe(deck,{childList:true,subtree:true});
  const modal=document.getElementById('profileModalBody');if(modal)new MutationObserver(()=>decorateProfileModal()).observe(modal,{childList:true,subtree:true});
}

campusSb.auth.onAuthStateChange((_event,session)=>{if(session?.user)setTimeout(()=>installUniversityMode().catch(()=>{}),0)});
setTimeout(()=>installUniversityMode().catch(()=>{}),0);
