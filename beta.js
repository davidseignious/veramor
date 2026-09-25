import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL='https://rfcoworvfqcqallgpozn.supabase.co';
const SUPABASE_KEY='sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF';
const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const screens=['authScreen','onboardingScreen','waitingScreen','appScreen'];
let authMode='login',session=null,user=null,profile=null,launchStatus=null,photos=[],faceUrl=null,discovery=[],deckIndex=0,viewMode='single',matches=[],activeMatch=null,chatTimer=null,chatChannel=null,planCache=null,lastPassedId=null;

function showScreen(id){screens.forEach(x=>$('#'+x).classList.toggle('hidden',x!==id));$('#topSignOut').classList.toggle('hidden',id==='authScreen');$('#bottomNav').classList.toggle('hidden',id!=='appScreen');window.scrollTo({top:0,behavior:'smooth'})}
function message(sel,text,type=''){const el=$(sel);if(!el)return;el.innerHTML=text?`<div class="notice ${type}">${esc(text)}</div>`:''}
function setBusy(btn,busy,label){if(!btn)return;if(busy){btn.dataset.old=btn.textContent;btn.textContent=label||'Working…';btn.disabled=true}else{btn.textContent=btn.dataset.old||btn.textContent;btn.disabled=false}}
function uuid(){return crypto.randomUUID()}
function ext(file){const n=(file.name||'').split('.').pop()?.toLowerCase();if(n&&/^[a-z0-9]{2,5}$/.test(n))return n;const m=(file.type||'').split('/')[1]||'bin';return m==='quicktime'?'mov':m.replace('jpeg','jpg')}
function ageFrom(date){if(!date)return 0;const d=new Date(date+'T00:00:00');const now=new Date();let a=now.getFullYear()-d.getFullYear();if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))a--;return a}
function formatAge(p){const d=p.birthdate||p.birth_date;const a=ageFrom(d);return a>=18?a:''}
function heightLabel(n){return n?`${Math.floor(n/12)}′${n%12}″`:''}
const lifestyleFacts=p=>[
  ['↕','Height',heightLabel(p.height_inches)],
  ['🏃','Exercise',p.exercise],
  ['🚭','Cigarettes',p.smoking],
  ['🌿','Weed',p.cannabis_use],
  ['🥂','Drinking',p.drinking],
  ['👶','Has kids',p.has_children],
  ['❤️','Wants kids',p.wants_children],
  ['✦','Religion',p.religion],
  ['🎓','Education',p.education],
  ['🐾','Pets',p.pets],
  ['🗣','Languages',Array.isArray(p.languages)?p.languages.join(' · '):p.languages]
].filter(([, ,v])=>v);
function lifestyleHtml(p){
  const facts=lifestyleFacts(p);
  if(!facts.length)return '';
  return `<section class="vera-profile-details">
    <div class="vera-profile-details-head"><div><small>PROFILE DETAILS</small><strong>At a glance</strong></div></div>
    <div class="lifestyle-facts">${facts.map(([icon,label,value])=>`<div class="vera-detail-fact"><span class="vera-detail-icon">${icon}</span><span><small>${esc(label)}</small><strong>${esc(value)}</strong></span></div>`).join('')}</div>
  </section>`;
}
function discoveryQuickFacts(p){
  const facts=[
    heightLabel(p.height_inches)?['↕',heightLabel(p.height_inches)]:null,
    p.exercise?['🏃',p.exercise]:null,
    p.has_children?['👶',p.has_children==='No'?'No kids':'Has kids']:null,
    p.relationship_intent?['♥',p.relationship_intent]:null
  ].filter(Boolean).slice(0,4);
  return facts.length?`<div class="vera-discovery-facts">${facts.map(([icon,value])=>`<span><b>${icon}</b>${esc(value)}</span>`).join('')}</div>`:'';
}

$('#heightInches').insertAdjacentHTML('beforeend',Array.from({length:61},(_,i)=>{const n=i+36;return `<option value="${n}">${heightLabel(n)}</option>`}).join(''));

async function signed(bucket,path,ttl=900){if(!path)return null;if(/^https?:\/\//i.test(path))return path;const {data,error}=await sb.storage.from(bucket).createSignedUrl(path,ttl);return error?null:data?.signedUrl||null}
async function listOwned(bucket,id=user.id){const {data,error}=await sb.storage.from(bucket).list(id,{limit:20,sortBy:{column:'created_at',order:'asc'}});if(error)throw error;return data||[]}
async function mediaForProfile(p){
  const id=p.id;
  let imageRows=[];
  try{imageRows=await listOwned('profile-media',id)}catch(e){console.warn('VERAMOR photo listing failed; using saved photo order.',e)}
  const savedOrder=Array.isArray(p.photo_order)?p.photo_order.filter(Boolean):[];
  const candidatePaths=[];
  for(const path of savedOrder)if(!candidatePaths.includes(path))candidatePaths.push(path);
  if(p.avatar_path&&!candidatePaths.includes(p.avatar_path))candidatePaths.push(p.avatar_path);
  for(const f of imageRows){
    if(!f?.name||!f.id)continue;
    const path=id+'/'+f.name;
    if(!candidatePaths.includes(path))candidatePaths.push(path);
  }
  const urls=[];
  for(const path of candidatePaths){
    const u=await signed('profile-media',path);
    if(u)urls.push({path,url:u,name:path.split('/').pop()||'profile'});
  }
  let video=null;
  if(p.intro_video_path)video=await signed('profile-videos',p.intro_video_path);
  if(!urls.length&&p.avatar_url)urls.push({path:null,url:p.avatar_url,name:'profile'});
  return {photos:urls,video};
}
async function ensureUserRows(){
  const {data:p,error}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(error)throw error;
  if(!p){const {error:e}=await sb.from('profiles').insert({id:user.id});if(e)throw e}
  const {data:s,error:se}=await sb.from('user_settings').select('user_id').eq('user_id',user.id).maybeSingle();if(se)throw se;
  if(!s){const {error:e}=await sb.from('user_settings').insert({user_id:user.id});if(e)throw e}
}
async function fetchMe(){const {data,error}=await sb.from('profiles').select('*').eq('id',user.id).single();if(error)throw error;profile=data;const {data:st,error:ste}=await sb.rpc('profile_launch_status');if(ste)throw ste;launchStatus=st;return st}

async function routeUser(){
  await ensureUserRows();const st=await fetchMe();
  if(st.launch_ready){showScreen('appScreen');await enterApp();return}
  if(profile.profile_complete&&profile.verification_status==='pending'){showScreen('waitingScreen');return}
  showScreen('onboardingScreen');await loadOnboarding();if(profile.verification_status==='rejected')message('#submitMsg','Verification was not approved. Review your profile and face video, then submit again.','bad')
}

function setAuthMode(mode){authMode=mode;const signup=mode==='signup';$('#ageRow').classList.toggle('hidden',!signup);$('#authSubmit').textContent=signup?'Create account':'Log in';$('#authPassword').setAttribute('autocomplete',signup?'new-password':'current-password');$('#showLogin').classList.toggle('primary',!signup);$('#showSignup').classList.toggle('primary',signup);message('#authMsg','')}
$('#showLogin').onclick=()=>setAuthMode('login');$('#showSignup').onclick=()=>setAuthMode('signup');
$('#authForm').onsubmit=async e=>{e.preventDefault();const btn=$('#authSubmit');setBusy(btn,true,authMode==='signup'?'Creating…':'Logging in…');message('#authMsg','');try{
  const email=$('#authEmail').value.trim(),password=$('#authPassword').value;
  if(authMode==='signup'){
    if(!$('#ageConfirm').checked)throw new Error('Confirm that you are at least 18.');
    const {data,error}=await sb.auth.signUp({email,password});if(error)throw error;
    if(!data.session){message('#authMsg','Account created. Check your email to confirm it, then return here to log in.','ok');return}
  }else{const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error}
  const {data:{session:s}}=await sb.auth.getSession();session=s;user=s?.user||null;if(user)await routeUserWithRetry();
}catch(err){message('#authMsg',err.message||'Could not continue.','bad')}finally{setBusy(btn,false)}};

async function loadOnboarding(){
  await fetchMe();
  $('#displayName').value=profile.display_name||'';$('#birthdate').value=profile.birthdate||profile.birth_date||'';$('#gender').value=profile.gender||'';$('#city').value=profile.city||'';$('#occupation').value=profile.occupation||'';$('#intent').value=profile.relationship_intent||'';$('#bio').value=profile.bio||'';$('#interests').value=(profile.interests||[]).join(', ');$('#bioCount').textContent=`${($('#bio').value||'').length}/500`;
  $('#heightInches').value=profile.height_inches||'';$('#smoking').value=profile.smoking||'';$('#cannabisUse').value=profile.cannabis_use||'';$('#exercise').value=profile.exercise||'';$('#drinking').value=profile.drinking||'';$('#hasChildren').value=profile.has_children||'';$('#wantsChildren').value=profile.wants_children||'';$('#religion').value=profile.religion||'';$('#education').value=profile.education||'';$('#pets').value=profile.pets||'';$('#languages').value=(profile.languages||[]).join(', ');
  const {data:settings}=await sb.from('user_settings').select('*').eq('user_id',user.id).single();const interested=settings?.interested_in||[];$('#interestedIn').value=interested.length===1?(interested[0]==='Woman'?'Women':interested[0]==='Man'?'Men':interested[0]):'Everyone';
  await refreshMedia();renderLaunchChecklist();
}
$('#bio').oninput=()=>$('#bioCount').textContent=`${$('#bio').value.length}/500`;

async function saveProfileDetails(show=true){
  const birth=$('#birthdate').value;if(ageFrom(birth)<18)throw new Error('VERAMOR is 18+ only.');
  const interests=$('#interests').value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);
  const languages=$('#languages').value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,8);const row={display_name:$('#displayName').value.trim(),birthdate:birth,birth_date:birth,gender:$('#gender').value,city:$('#city').value.trim(),occupation:$('#occupation').value.trim(),relationship_intent:$('#intent').value,bio:$('#bio').value.trim(),interests,height_inches:Number($('#heightInches').value)||null,smoking:$('#smoking').value||null,cannabis_use:$('#cannabisUse').value||null,exercise:$('#exercise').value||null,drinking:$('#drinking').value||null,has_children:$('#hasChildren').value||null,wants_children:$('#wantsChildren').value||null,religion:$('#religion').value.trim()||null,education:$('#education').value.trim()||null,pets:$('#pets').value.trim()||null,languages};
  const {error}=await sb.from('profiles').update(row).eq('id',user.id);if(error)throw error;
  const meet=$('#interestedIn').value;const interested_in=meet==='Women'?['Woman']:meet==='Men'?['Man']:['Everyone'];
  const {error:se}=await sb.from('user_settings').update({interested_in,updated_at:new Date().toISOString()}).eq('user_id',user.id);if(se)throw se;
  await fetchMe();renderLaunchChecklist();if(show)message('#profileMsg','Profile details saved.','ok')
}
$('#saveProfile').onclick=async()=>{const b=$('#saveProfile');setBusy(b,true,'Saving…');try{await saveProfileDetails(true)}catch(e){message('#profileMsg',e.message,'bad')}finally{setBusy(b,false)}};

async function refreshMedia(){
  await fetchMe();
  const m=await mediaForProfile(profile);
  photos=m.photos||[];
  let vr=[];
  try{vr=await listOwned('verification-media')}catch(e){console.warn('VERAMOR verification media listing failed',e)}
  faceUrl=null;
  for(const f of vr){
    if(!f?.id||!f.name)continue;
    if(String(f.metadata?.mimetype||'').startsWith('video/')||/\.(mp4|mov|webm)$/i.test(f.name)){
      faceUrl=await signed('verification-media',user.id+'/'+f.name);
      if(faceUrl)break;
    }
  }
  renderPhotos();renderFace();renderLaunchChecklist();
}function renderPhotos(){$('#photoGrid').innerHTML=photos.map((p,i)=>`<div class="photo"><img src="${esc(p.url)}" alt="Profile photo ${i+1}"><button title="Remove" data-remove-photo="${esc(p.path)}">×</button></div>`).join('');$$('[data-remove-photo]').forEach(b=>b.onclick=()=>removePhoto(b.dataset.removePhoto))}
function renderFace(){$('#facePreview').innerHTML=faceUrl?`<video src="${esc(faceUrl)}" controls playsinline></video><div class="notice ok">Private face video uploaded.</div>`:'<div class="notice">No face video uploaded yet.</div>'}
function renderLaunchChecklist(){const st=launchStatus||{};$('#photoReq').textContent=`${st.photo_count||0}/4`;$('#faceReq').textContent=st.face_video_submitted?'Ready':'Missing';$('#detailReq').textContent=st.details_ready?'Ready':'Incomplete';$('#prog2').classList.toggle('on',!!st.details_ready);$('#prog3').classList.toggle('on',!!(st.media_ready&&st.details_ready));const pct=(st.details_ready?34:0)+(Math.min(4,Number(st.photo_count)||0)/4*33)+(st.face_video_submitted?33:0);$('#setupPercent').textContent=`${Math.round(pct)}%`;
  const miss=Array.isArray(st.missing_details)?st.missing_details:[];$('#launchChecklist').innerHTML=`<div class="notice ${st.details_ready?'ok':'warn'}">${st.details_ready?'✓ Required profile details complete':'Still needed: '+esc(miss.join(', ')||'profile details')}</div><div class="notice ${(st.photo_count||0)>=4?'ok':'warn'}">${(st.photo_count||0)>=4?'✓ Four-photo minimum met':`${st.photos_remaining??4} more photo${Number(st.photos_remaining)===1?'':'s'} required`}</div><div class="notice ${st.face_video_submitted?'ok':'warn'}">${st.face_video_submitted?'✓ Private face video submitted':'Face verification video required'}</div>`;
  const inReview=st.profile_complete&&st.verification_status==='pending';$('#submitVerification').disabled=!(st.details_ready&&st.media_ready);$('#submitVerification').classList.toggle('hidden',!!st.launch_ready||inReview);$('#returnToApp').classList.toggle('hidden',!st.launch_ready&&!inReview);$('#returnToApp').textContent=inReview?'View review status':'Back to my profile'
}
$('#returnToApp').onclick=async()=>{await fetchMe();if(launchStatus.launch_ready){showScreen('appScreen');await renderMyProfile();showView('profileView')}else{showScreen('waitingScreen');message('#waitMsg','Your new photo is waiting for admin review. Your existing face verification is saved.','warn')}};

$('#uploadPhotos').onclick=async()=>{
  const btn=$('#uploadPhotos'),files=Array.from($('#photoInput').files||[]);
  if(!files.length)return message('#photoMsg','Choose photos first.','warn');
  if(photos.length+files.length>6)return message('#photoMsg','VERAMOR allows up to 6 profile photos.','bad');
  setBusy(btn,true,'Uploading…');
  try{
    const added=[];
    for(const file of files){
      if(!file.type.startsWith('image/'))throw new Error('Profile photos must be image files.');
      if(file.size>10*1024*1024)throw new Error('Each photo must be 10 MB or smaller.');
      const path=user.id+'/'+uuid()+'.'+ext(file);
      const {error}=await sb.storage.from('profile-media').upload(path,file,{contentType:file.type,upsert:false});
      if(error)throw error;
      added.push(path);
    }
    const current=Array.isArray(profile?.photo_order)?profile.photo_order.filter(Boolean):photos.map(x=>x.path).filter(Boolean);
    const next=[...current,...added].filter((x,i,a)=>a.indexOf(x)===i).slice(0,6);
    const avatar=next[0]||null;
    const {error:pe}=await sb.from('profiles').update({avatar_path:avatar,avatar_url:null,photo_order:next}).eq('id',user.id);
    if(pe)throw pe;
    $('#photoInput').value='';
    await refreshMedia();
    message('#photoMsg',added.length+' photo'+(added.length===1?'':'s')+' uploaded. Your existing photos were kept.','ok');
  }catch(e){message('#photoMsg',e.message,'bad')}finally{setBusy(btn,false)}
};
async function removePhoto(path){
  if(!confirm('Remove this photo?'))return;
  try{
    const {error}=await sb.storage.from('profile-media').remove([path]);
    if(error)throw error;
    const current=Array.isArray(profile?.photo_order)?profile.photo_order.filter(Boolean):photos.map(x=>x.path).filter(Boolean);
    const next=current.filter(x=>x!==path);
    const {error:pe}=await sb.from('profiles').update({avatar_path:next[0]||null,avatar_url:null,photo_order:next}).eq('id',user.id);
    if(pe)throw pe;
    await refreshMedia();
    message('#photoMsg','Photo removed.','ok');
  }catch(e){message('#photoMsg',e.message,'bad')}
}
$('#uploadFace').onclick=async()=>{const btn=$('#uploadFace'),file=$('#faceVideoInput').files?.[0];if(!file)return message('#faceMsg','Choose or record a face video first.','warn');if(!file.type.startsWith('video/'))return message('#faceMsg','Face verification must be a video.','bad');if(file.size>50*1024*1024)return message('#faceMsg','Face video must be 50 MB or smaller.','bad');setBusy(btn,true,'Uploading…');try{const old=await listOwned('verification-media');const oldPaths=old.filter(x=>x.id&&x.name).map(x=>`${user.id}/${x.name}`);if(oldPaths.length)await sb.storage.from('verification-media').remove(oldPaths);const path=`${user.id}/face-${uuid()}.${ext(file)}`;const {error}=await sb.storage.from('verification-media').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;const {error:pe}=await sb.from('profiles').update({presence_video_path:path,presence_prompt:'Beta face verification',live_capture_at:new Date().toISOString()}).eq('id',user.id);if(pe)throw pe;$('#faceVideoInput').value='';await refreshMedia();message('#faceMsg','Private face video uploaded.','ok')}catch(e){message('#faceMsg',e.message,'bad')}finally{setBusy(btn,false)}};

$('#uploadIntro').onclick=async()=>{const btn=$('#uploadIntro'),file=$('#introVideoInput').files?.[0];if(!file)return message('#introMsg','Choose a public intro video first.','warn');if(!file.type.startsWith('video/'))return message('#introMsg','Intro must be a video.','bad');if(file.size>50*1024*1024)return message('#introMsg','Video must be 50 MB or smaller.','bad');setBusy(btn,true,'Uploading…');try{if(profile.intro_video_path)await sb.storage.from('profile-videos').remove([profile.intro_video_path]);const path=`${user.id}/intro-${uuid()}.${ext(file)}`;const {error}=await sb.storage.from('profile-videos').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;const {error:pe}=await sb.from('profiles').update({intro_video_path:path}).eq('id',user.id);if(pe)throw pe;$('#introVideoInput').value='';await fetchMe();message('#introMsg','Public profile video saved.','ok')}catch(e){message('#introMsg',e.message,'bad')}finally{setBusy(btn,false)}};

$('#submitVerification').onclick=async()=>{const btn=$('#submitVerification');setBusy(btn,true,'Submitting…');message('#submitMsg','');try{await saveProfileDetails(false);const {data,error}=await sb.rpc('finalize_profile_setup');if(error)throw error;launchStatus=data;message('#submitMsg',data.message||'Submitted.','ok');if(data.submitted){await fetchMe();showScreen('waitingScreen')}}catch(e){message('#submitMsg',e.message,'bad')}finally{setBusy(btn,false)}};
$('#refreshStatus').onclick=async()=>{const b=$('#refreshStatus');setBusy(b,true,'Checking…');try{await fetchMe();if(launchStatus.launch_ready){showScreen('appScreen');await enterApp()}else message('#waitMsg',profile.verification_status==='rejected'?'Verification needs changes. Edit and resubmit.':'Still awaiting verification.','warn')}catch(e){message('#waitMsg',e.message,'bad')}finally{setBusy(b,false)}};
async function openProfileEditor(){
  showScreen('onboardingScreen');
  try{await loadOnboarding();window.dispatchEvent(new CustomEvent('veramor:profile-editor-open'))}
  catch(e){console.error('VERAMOR profile editor load failed',e);message('#profileMsg',e.message||'Could not load your profile. Try again.','bad')}
}
$('#editProfile').onclick=openProfileEditor;

async function enterApp(){
  const tasks=[
    ['discovery',loadDiscovery],
    ['matches',loadMatches],
    ['settings',loadSettings],
    ['profile',renderMyProfile]
  ];
  const results=await Promise.allSettled(tasks.map(([,fn])=>fn()));
  results.forEach((result,i)=>{if(result.status==='rejected')console.error('VERAMOR '+tasks[i][0]+' load failed',result.reason)});
  showView('discoverView');
}
async function loadDiscovery(priorityId=null){const {data,error}=await sb.rpc('get_discovery_candidates');if(error)throw error;discovery=(data||[]).map(x=>({...x.profile,distance_miles:x.distance_miles}));if(priorityId){const i=discovery.findIndex(x=>x.id===priorityId);if(i>0){const [p]=discovery.splice(i,1);discovery.unshift(p)}}deckIndex=0;await renderDeck();await refreshRewindStatus()}
async function refreshRewindStatus(){const b=$('#undoPass');if(!b||!user)return;try{const {data,error}=await sb.rpc('rewind_status');if(error)throw error;const credits=Number(data?.rewind_credits)||0;b.dataset.rewindCredits=String(credits);b.dataset.freeAvailable=data?.free_available?'1':'0';b.title=data?.free_available?'Your first rewind is free.':credits>0?`${credits} rewind credit${credits===1?'':'s'} available.`:'Your free rewind is used. Additional rewinds require a paid credit or a weekly-gift rewind.';if(!lastPassedId){b.textContent=data?.free_available?'↶ Undo · 1 free':credits>0?`↶ Undo · ${credits} credit${credits===1?'':'s'}`:'↶ Undo · credit';b.disabled=true}else{b.textContent=data?.free_available?'↶ Undo · FREE':credits>0?`↶ Undo · ${credits}`:'↶ Undo · paid/gift';b.disabled=false}}catch(_e){}}
async function decorate(p){if(p._media)return p;try{p._media=await mediaForProfile(p)}catch(e){p._media={photos:p.avatar_url?[{url:p.avatar_url}]:[],video:null}}return p}

function discoveryCarouselMarkup(p,m){
  const photoList=(m.photos||[]).filter(x=>x?.url);
  if(!photoList.length){
    if(m.video)return `<video class="vera-discovery-fallback-video" src="${esc(m.video)}" controls playsinline preload="metadata"></video>`;
    return '<div class="vera-discovery-media-empty"><span>Photo unavailable</span></div>';
  }
  const count=photoList.length;
  return `<div class="vera-photo-carousel" id="veraPhotoCarousel" aria-label="${esc(p.display_name)} photo gallery">
    <img id="veraDiscoveryPhoto" src="${esc(photoList[0].url)}" alt="${esc(p.display_name)} profile photo 1 of ${count}" draggable="false">
    ${count>1?`<div class="vera-photo-progress" id="veraPhotoProgress" aria-hidden="true">${photoList.map((_,i)=>`<span class="${i===0?'on':''}"></span>`).join('')}</div>
      <button class="vera-photo-nav prev" id="veraPhotoPrev" type="button" aria-label="Previous photo">‹</button>
      <button class="vera-photo-nav next" id="veraPhotoNext" type="button" aria-label="Next photo">›</button>
      <span class="vera-photo-count" id="veraPhotoCount">1 / ${count}</span>`:''}
    ${m.video?`<button class="vera-intro-video-btn" id="veraIntroVideoBtn" type="button" aria-label="Play intro video">▶ Intro</button>`:''}
  </div>`;
}

function installDiscoveryCarousel(p,m){
  const host=document.getElementById('veraPhotoCarousel');
  const img=document.getElementById('veraDiscoveryPhoto');
  if(!host||!img)return;
  const photos=(m.photos||[]).filter(x=>x?.url);
  let index=0;
  let suppressClick=false;
  let startX=0,startY=0,pointerId=null;

  const progress=()=>Array.from(document.querySelectorAll('#veraPhotoProgress span'));
  const prev=document.getElementById('veraPhotoPrev');
  const next=document.getElementById('veraPhotoNext');
  const count=document.getElementById('veraPhotoCount');
  const intro=document.getElementById('veraIntroVideoBtn');
  const profileMedia=host.closest('.profile-media');

  function preload(i){
    const u=photos[i]?.url;
    if(!u)return;
    const im=new Image();im.src=u;
  }
  function show(i){
    if(!photos.length)return;
    index=Math.max(0,Math.min(photos.length-1,i));
    img.src=photos[index].url;
    img.alt=`${p.display_name||'Profile'} profile photo ${index+1} of ${photos.length}`;
    if(count)count.textContent=`${index+1} / ${photos.length}`;
    progress().forEach((dot,n)=>dot.classList.toggle('on',n===index));
    if(prev){prev.disabled=index===0;prev.classList.toggle('disabled',index===0)}
    if(next){next.disabled=index===photos.length-1;next.classList.toggle('disabled',index===photos.length-1)}
    preload(index+1);
    preload(index-1);
  }
  function move(dir){
    const target=index+dir;
    if(target<0||target>=photos.length)return;
    show(target);
  }

  prev?.addEventListener('click',e=>{e.stopPropagation();move(-1)});
  next?.addEventListener('click',e=>{e.stopPropagation();move(1)});

  host.addEventListener('pointerdown',e=>{
    if(e.target.closest('button,video'))return;
    pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;suppressClick=false;
  });
  host.addEventListener('pointerup',e=>{
    if(pointerId!==e.pointerId)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    pointerId=null;
    if(Math.abs(dx)>46&&Math.abs(dx)>Math.abs(dy)+12){
      suppressClick=true;
      move(dx<0?1:-1);
      setTimeout(()=>{suppressClick=false},80);
    }
  });
  host.addEventListener('pointercancel',()=>{pointerId=null});

  host.addEventListener('click',e=>{
    if(suppressClick||e.target.closest('button,video')||photos.length<2)return;
    const r=host.getBoundingClientRect();
    const x=e.clientX-r.left;
    if(x<r.width*.38)move(-1);
    else if(x>r.width*.62)move(1);
  });

  if(intro&&m.video){
    intro.addEventListener('click',e=>{
      e.stopPropagation();
      const active=host.classList.toggle('playing-intro');
      const existing=document.getElementById('veraDiscoveryIntroVideo');
      if(active){
        img.hidden=true;
        if(prev)prev.hidden=true;if(next)next.hidden=true;if(count)count.hidden=true;
        document.getElementById('veraPhotoProgress')?.classList.add('hidden');
        const v=document.createElement('video');
        v.id='veraDiscoveryIntroVideo';v.src=m.video;v.poster=photos[index]?.url||'';v.controls=true;v.playsInline=true;v.autoplay=true;v.preload='metadata';
        host.insertBefore(v,host.firstChild);
        intro.textContent='Photos';
        intro.setAttribute('aria-label','Return to photos');
        profileMedia?.classList.add('vera-intro-playing');
        v.play().catch(()=>{});
      }else{
        existing?.pause();existing?.remove();img.hidden=false;
        if(prev)prev.hidden=false;if(next)next.hidden=false;if(count)count.hidden=false;
        document.getElementById('veraPhotoProgress')?.classList.remove('hidden');
        intro.textContent='▶ Intro';
        intro.setAttribute('aria-label','Play intro video');
        profileMedia?.classList.remove('vera-intro-playing');
      }
    });
  }
  show(0);
}

async function renderDeck(){const root=$('#deck');if(!discovery.length||deckIndex>=discovery.length){root.innerHTML='<div class="panel empty"><div class="heart">♥</div><h2>You’re caught up.</h2><p class="muted">No more verified profiles fit your discovery settings right now. More people will appear as friends complete verification.</p><button class="btn" id="deckRefresh">Check again</button></div>';$('#deckRefresh').onclick=()=>loadDiscovery().catch(e=>alert(e.message));return}
  if(viewMode!=='single'){const count=viewMode==='duo'?2:3;const group=discovery.slice(deckIndex,deckIndex+count);for(const p of group)await decorate(p);root.innerHTML=`<div class="panel"><span class="pill">${viewMode==='duo'?'2 MAN':'TRIO'} BETA</span><h3>Tap who you want to see 1-on-1</h3><p class="muted">Group discovery lets you browse together while still choosing an individual connection.</p><div class="group ${count===2?'two':'three'}">${group.map((p,i)=>`<button class="mini" data-group-person="${i}"><img src="${esc(p._media.photos[0]?.url||'')}" alt="${esc(p.display_name)}"><div>${esc(p.display_name)}${formatAge(p)?`, ${formatAge(p)}`:''}${p.is_demo_profile?' · AI DEMO':''}</div></button>`).join('')}</div><button class="btn full" id="passGroup" style="margin-top:10px">Pass group</button></div>`;$$('[data-group-person]').forEach(b=>b.onclick=()=>{deckIndex+=Number(b.dataset.groupPerson);viewMode='single';syncModeButtons();renderDeck()});$('#passGroup').onclick=()=>passGroup(group);return}
  const p=await decorate(discovery[deckIndex]);
  const m=p._media||{photos:[],video:null};
  const media=discoveryCarouselMarkup(p,m);
  root.innerHTML=`<article class="card profile-card" data-profile-id="${esc(p.id)}"><div class="profile-media ${p.is_demo_profile?'demo-user-media':'real-user-media'}">${media}<span class="pill ${p.is_demo_profile?'warn':'ok'} profile-badge">${p.is_demo_profile?'AI DEMO · NOT A REAL PERSON':'VERIFIED BETA'}</span>${formatAge(p)?`<span class="age-badge" aria-label="Age ${formatAge(p)}">AGE ${formatAge(p)}</span>`:''}<div class="profile-overlay"><h2>${esc(p.display_name)}${formatAge(p)?`, ${formatAge(p)}`:''}</h2><div>${esc(p.occupation||'')}${p.city?` · ${esc(p.city)}`:''}${p.distance_miles!=null?` · ${esc(p.distance_miles)} mi`:''}</div><div class="tags">${(p.interests||[]).slice(0,5).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></div></div><div class="details">${discoveryQuickFacts(p)}${p.is_demo_profile?'<div class="notice warn"><strong>AI demo profile</strong><br>This profile is synthetic filler for beta testing. It is not a real person and cannot become a real match.</div>':''}<p>${esc(p.bio||'')}</p>${lifestyleHtml(p)}<div class="actions"><button class="btn" id="fullProfileBtn">View full profile</button><button class="btn" id="safetyBtn">•••</button></div></div><div class="swipe-actions"><button class="btn" id="passBtn">✕</button><button class="btn primary" id="likeBtn">♥</button><button class="btn" id="superBtn">★</button></div></article>`;
  installDiscoveryCarousel(p,m);
  $('#passBtn').onclick=()=>passCurrent(p);$('#likeBtn').onclick=()=>likeCurrent(p,false);$('#superBtn').onclick=()=>likeCurrent(p,true);$('#fullProfileBtn').onclick=()=>openFullProfile(p);$('#safetyBtn').onclick=()=>openSafety(p)
}
function syncModeButtons(){$$('#modeButtons [data-mode]').forEach(b=>b.classList.toggle('primary',b.dataset.mode===viewMode))}
$$('#modeButtons [data-mode]').forEach(b=>b.onclick=()=>{viewMode=b.dataset.mode;syncModeButtons();renderDeck()});
async function nextCard(){deckIndex++;await renderDeck()}
async function passCurrent(p){try{const {error}=await sb.rpc('pass_profile',{target_user:p.id});if(error)throw error;lastPassedId=p.id;await nextCard();await refreshRewindStatus()}catch(e){alert(e.message)}}
async function passGroup(group){try{for(const p of group){const {error}=await sb.rpc('pass_profile',{target_user:p.id});if(error)throw error}deckIndex+=group.length;await renderDeck()}catch(e){alert(e.message)}}
async function undoLastPass(){const b=$('#undoPass');if(!b)return;setBusy(b,true,'Undoing…');try{const {data,error}=await sb.rpc('undo_last_pass');if(error)throw error;if(!data){lastPassedId=null;alert('There is no recent pass to undo.');return}lastPassedId=null;await loadDiscovery(data)}catch(e){alert(e.message||'Could not undo that pass.')}finally{setBusy(b,false);await refreshRewindStatus()}}
async function likeCurrent(p,superLike){if(p.is_demo_profile){alert('This is an AI demo profile, not a real person. Demo profiles cannot create matches.');await nextCard();return}try{const fn=superLike?'super_like_profile':'like_profile';const {data,error}=await sb.rpc(fn,{target_user:p.id});if(error)throw error;if(data?.matched)showNewMatch(p,data.match_id);await nextCard()}catch(e){alert(e.message)}}
function showNewMatch(p,matchId){$('#matchModalTitle').textContent="It's a match";$('#matchModalBody').innerHTML=`<div class="hero"><div class="heart">♥</div><h2>You + ${esc(p.display_name)}</h2><p class="muted">One Chemistry Check answer from each of you unlocks messages.</p><button class="btn primary" id="openNewMatch">Open match</button></div>`;showModal('matchModal');$('#openNewMatch').onclick=async()=>{closeModal('matchModal');await loadMatches();const m=matches.find(x=>x.id===matchId);if(m)openMatch(m)}}
async function previewMyProfileAsOthers(){
  await fetchMe();
  const p=await decorate({...profile,is_demo_profile:false,distance_miles:null});
  const m=p._media||{photos:[],video:null};

  let host=document.getElementById('selfPreviewHost');
  if(!host){
    host=document.createElement('section');
    host.id='selfPreviewHost';
    host.className='vera-self-preview-host';
    const profileView=document.getElementById('profileView');
    const anchor=document.getElementById('myProfile');
    if(anchor)anchor.insertAdjacentElement('afterend',host);
    else profileView?.prepend(host);
  }

  const main=m.photos[0]?.url||'';
  const media=m.video
    ? `<video src="${esc(m.video)}" poster="${esc(main)}" controls playsinline preload="metadata"></video>`
    : `<img src="${esc(main)}" alt="${esc(p.display_name)}">`;

  host.innerHTML=`
    <div class="section-title vera-self-preview-head">
      <div><span class="pill ok">VIEW AS OTHERS</span><h3 style="margin:7px 0 0">Your Discovery profile</h3></div>
      <button class="btn" id="closeSelfPreview" type="button">Close preview</button>
    </div>
    <article class="card profile-card vera-self-preview-card">
      <div class="profile-media real-user-media">
        ${media}
        <span class="pill ok profile-badge">VERIFIED BETA</span>
        ${formatAge(p)?`<span class="age-badge" aria-label="Age ${formatAge(p)}">AGE ${formatAge(p)}</span>`:''}
        <div class="profile-overlay">
          <h2>${esc(p.display_name)}${formatAge(p)?`, ${formatAge(p)}`:''}</h2>
          <div>${esc(p.occupation||'')}${p.city?` · ${esc(p.city)}`:''}</div>
          <div class="tags">${(p.interests||[]).slice(0,5).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="details">
        <p>${esc(p.bio||'')}</p>
        ${lifestyleHtml(p)}
        <button class="btn full" id="previewFullProfileBtn" type="button">View full profile preview</button>
      </div>
      <div class="swipe-actions vera-preview-actions">
        <button class="btn" type="button" disabled>Skip</button>
        <button class="btn primary" type="button" disabled>Connect</button>
        <button class="btn" type="button" disabled>Signal</button>
      </div>
    </article>
    <div class="panel vera-preview-gallery">
      <div class="section-title"><strong>Photo order others see</strong><span class="pill">${m.photos.length} photo${m.photos.length===1?'':'s'}</span></div>
      <div class="photo-grid">${m.photos.map((x,i)=>`<div class="photo"><img src="${esc(x.url)}" alt="Profile photo ${i+1}"><span class="vera-photo-order-badge">${i+1}</span></div>`).join('')}</div>
    </div>`;

  host.classList.add('on');
  host.scrollIntoView({behavior:'smooth',block:'start'});
  document.getElementById('closeSelfPreview').onclick=()=>{
    host.classList.remove('on');
    host.innerHTML='';
    document.getElementById('profileView')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  document.getElementById('previewFullProfileBtn').onclick=()=>openFullProfile(p);
}
window.VERAMOR_PREVIEW_MY_PROFILE=previewMyProfileAsOthers;

function openFullProfile(p){const m=p._media||{photos:[]};$('#profileModalBody').dataset.profileId=p.id;$('#profileModalBody').classList.toggle('real-user-profile',!p.is_demo_profile);$('#profileModalBody').classList.toggle('demo-user-profile',!!p.is_demo_profile);$('#profileModalBody').innerHTML=`${p.is_demo_profile?'<div class="notice warn"><strong>AI DEMO · NOT A REAL PERSON</strong><br>This synthetic profile exists only to fill the beta deck when there are not enough real profiles.</div>':''}<h2>${esc(p.display_name)}${formatAge(p)?`, ${formatAge(p)}`:''}</h2><p class="muted">${esc(p.occupation||'')}${p.city?` · ${esc(p.city)}`:''}</p><div class="photo-grid">${m.photos.map(x=>`<div class="photo"><img src="${esc(x.url)}" alt="Profile photo"></div>`).join('')}</div><p>${esc(p.bio||'')}</p><div class="tags">${(p.interests||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>${lifestyleHtml(p)}<div class="prompt"><small>Looking for</small><strong>${esc(p.relationship_intent||'Not specified')}</strong></div>`;showModal('profileModal')}

function openSafety(p,context={surface:'profile'}){const excerpt=context.message_excerpt?`<div class="report-context"><small>REPORTED MESSAGE</small>${esc(context.message_excerpt)}</div>`:'';$('#safetyModalBody').innerHTML=`<h2>${esc(p.display_name)}</h2><p class="muted">Blocking removes this person from discovery and ends any active connection. Reports go to beta moderation with the exact profile or conversation context attached.</p>${excerpt}<div class="field"><label>Report reason</label><select id="reportReason"><option>Fake or impersonation</option><option>Harassment</option><option>Inappropriate content</option><option>Solicitation or spam</option><option>Under 18 concern</option><option>Threat or safety concern</option><option>Other</option></select></div><div class="field"><label>Details (optional)</label><textarea id="reportDetails" maxlength="2000"></textarea></div><div class="actions"><button class="btn danger" id="reportUser">Report</button><button class="btn danger" id="blockUser">Block</button></div><div id="safetyMsg"></div>`;showModal('safetyModal');$('#reportUser').onclick=()=>reportUser(p,context);$('#blockUser').onclick=()=>blockUser(p)}
async function reportUser(p,context={surface:'profile'}){try{const safeContext={surface:context.surface||'profile',match_id:context.match_id||null,message_id:context.message_id||null,message_excerpt:context.message_excerpt?String(context.message_excerpt).slice(0,500):null};const {error}=await sb.from('reports').insert({reporter_id:user.id,reported_id:p.id,reason:$('#reportReason').value,details:$('#reportDetails').value.trim(),safety_context:safeContext});if(error)throw error;message('#safetyMsg','Report submitted with context. Thank you.','ok')}catch(e){message('#safetyMsg',e.message,'bad')}}
async function blockUser(p){if(!confirm(`Block ${p.display_name}?`))return;try{const {error}=await sb.from('blocks').insert({blocker_id:user.id,blocked_id:p.id});if(error)throw error;closeModal('safetyModal');discovery=discovery.filter(x=>x.id!==p.id);deckIndex=Math.min(deckIndex,discovery.length);await renderDeck();await loadMatches()}catch(e){message('#safetyMsg',e.message,'bad')}}

async function loadMatches(){const {data,error}=await sb.from('matches').select('*').eq('status','active').or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order('created_at',{ascending:false});if(error)throw error;const rows=data||[];const ids=[...new Set(rows.map(m=>m.user_a===user.id?m.user_b:m.user_a))];let ps=[];if(ids.length){const {data:p,error:pe}=await sb.from('profiles').select('*').in('id',ids);if(pe)throw pe;ps=p||[]}const map=new Map(ps.map(p=>[p.id,p]));matches=[];for(const m of rows){const otherId=m.user_a===user.id?m.user_b:m.user_a;const p=map.get(otherId);if(!p)continue;await decorate(p);matches.push({...m,other:p})}renderMatches()}
function myChemDone(m){return m.user_a===user.id?m.chemistry_complete_a:m.chemistry_complete_b}function otherChemDone(m){return m.user_a===user.id?m.chemistry_complete_b:m.chemistry_complete_a}
function renderMatches(){const root=$('#matchesList');if(!matches.length){root.innerHTML='<div class="panel empty"><div class="heart">♡</div><h3>No matches yet</h3><p class="muted">When two verified people like each other, the match appears here.</p></div>';return}root.innerHTML=matches.map((m,i)=>`<button class="match-row" data-match="${i}" style="width:100%;color:white;text-align:left"><img src="${esc(m.other._media?.photos?.[0]?.url||'')}" alt="${esc(m.other.display_name)}"><div class="grow"><strong>${esc(m.other.display_name)}</strong><div class="muted">${myChemDone(m)?(otherChemDone(m)?'Messages unlocked':'Waiting on their Chemistry Check'):'Answer Chemistry Check'}</div></div><span>›</span></button>`).join('');$$('[data-match]').forEach(b=>b.onclick=()=>openMatch(matches[Number(b.dataset.match)]))}
async function openMatch(m){activeMatch=m;$('#matchModalTitle').textContent=m.other.display_name;showModal('matchModal');await renderMatchState()}
async function renderMatchState(){const m=activeMatch;if(!m)return;if(!myChemDone(m)){$('#matchModalBody').innerHTML=`<span class="pill">CHEMISTRY CHECK</span><h2>One question</h2><p>Say one thing you noticed about ${esc(m.other.display_name)}’s profile.</p><p class="muted">Take as long as you need. This is the only Chemistry Check question.</p><div class="field"><textarea id="chemAnswer" maxlength="500" placeholder="Write your answer…"></textarea></div><button class="btn primary full" id="submitChem">Continue</button><div id="chemMsg"></div>`;$('#submitChem').onclick=submitChemistry;return}if(!otherChemDone(m)){$('#matchModalBody').innerHTML=`<div class="hero"><span class="pill ok">YOUR ANSWER IS IN</span><h2>Waiting on ${esc(m.other.display_name)}</h2><p>As soon as they answer their one Chemistry Check question, messaging unlocks for both of you.</p><button class="btn" id="checkChem">Check again</button></div>`;$('#checkChem').onclick=async()=>{await loadMatches();activeMatch=matches.find(x=>x.id===m.id)||m;await renderMatchState()};return}await renderChat()}
async function submitChemistry(){const answer=$('#chemAnswer').value.trim();if(!answer)return message('#chemMsg','Answer the one question to continue.','warn');const b=$('#submitChem');setBusy(b,true,'Submitting…');try{const {error}=await sb.rpc('submit_chemistry_answer',{match_uuid:activeMatch.id,answer});if(error)throw error;await loadMatches();activeMatch=matches.find(x=>x.id===activeMatch.id)||activeMatch;await renderMatchState()}catch(e){message('#chemMsg',e.message,'bad')}finally{setBusy(b,false)}}

async function refreshMyPlan(force=false){
  if(planCache&&!force)return planCache;
  try{
    const {data,error}=await sb.rpc('get_my_plan');
    if(error)throw error;
    planCache=String(data||'free').toLowerCase();
  }catch(_e){planCache='free'}
  return planCache;
}
function hasPaidReadReceipts(){return planCache==='plus'||planCache==='premium'}
function openReadReceiptUpgrade(){closeModal('matchModal');showView('settingsView');setTimeout(()=>document.getElementById('veramorBilling')?.scrollIntoView({behavior:'smooth',block:'start'}),250)}
function stopChatRealtime(){
  clearInterval(chatTimer);chatTimer=null;
  if(chatChannel){try{sb.removeChannel(chatChannel)}catch(_e){}chatChannel=null}
}
function subscribeChatRealtime(){
  if(!activeMatch?.id||!user?.id)return;
  if(chatChannel){try{sb.removeChannel(chatChannel)}catch(_e){}}
  const matchId=activeMatch.id;
  chatChannel=sb.channel(`vera-chat-${matchId}-${user.id}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`match_id=eq.${matchId}`},()=>loadMessages(false).catch(()=>{}))
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:`match_id=eq.${matchId}`},()=>loadMessages(false).catch(()=>{}))
    .subscribe();
}
async function renderChat(){
  stopChatRealtime();
  await refreshMyPlan(true);
  const paidReceipts=hasPaidReadReceipts();
  $('#matchModalBody').innerHTML=`<div class="notice ok">✓ Both Chemistry Checks complete · messaging unlocked</div><div class="vera-read-receipt-status ${paidReceipts?'unlocked':'locked'}">${paidReceipts?'<span>✓ Read receipts enabled</span>':'<span>🔒 Read receipts</span><button class="btn" id="upgradeReadReceipts" type="button">Unlock with a paid plan</button>'}</div><div class="chat" id="chatMessages"></div><div class="compose"><input class="input" id="chatInput" maxlength="2000" placeholder="Message ${esc(activeMatch.other.display_name)}…"><button class="btn primary" id="sendMessage">Send</button></div><div class="actions" style="margin-top:12px"><button class="btn" id="chatSafety">Block / report</button><button class="btn danger" id="unmatchBtn">Unmatch</button></div><div id="chatMsg"></div>`;
  $('#sendMessage').onclick=sendMessage;
  $('#chatInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}};
  $('#upgradeReadReceipts')?.addEventListener('click',openReadReceiptUpgrade);
  $('#chatSafety').onclick=()=>openSafety(activeMatch.other,{surface:'conversation',match_id:activeMatch.id});
  $('#unmatchBtn').onclick=unmatchActive;
  await loadMessages();
  subscribeChatRealtime();
  chatTimer=setInterval(()=>{if(!$('#matchModal').classList.contains('hidden'))loadMessages(false).catch(()=>{});else stopChatRealtime()},15000);
}
async function loadMessages(scroll=true){
  if(!activeMatch)return;
  const matchId=activeMatch.id;
  const {data,error}=await sb.from('messages').select('*').eq('match_id',matchId).order('created_at',{ascending:true});
  if(error)throw error;
  if(!activeMatch||activeMatch.id!==matchId)return;
  const root=$('#chatMessages');if(!root)return;
  const canSeeRead=hasPaidReadReceipts();
  root.innerHTML=(data||[]).map(x=>`<div class="msg ${x.sender_id===user.id?'me':''}" data-message-id="${esc(x.id)}">${esc(x.body)}${canSeeRead&&x.sender_id===user.id?`<div class="vera-seen-receipt">${x.read_at?'Seen':'Sent'}</div>`:''}${x.sender_id!==user.id?`<button class="msg-report" type="button" data-report-message="${esc(x.id)}">Report message</button>`:''}</div>`).join('');
  $$('[data-report-message]').forEach(b=>b.onclick=()=>{const row=(data||[]).find(x=>x.id===b.dataset.reportMessage);if(row)openSafety(activeMatch.other,{surface:'message',match_id:activeMatch.id,message_id:row.id,message_excerpt:row.body})});
  const {error:readError}=await sb.rpc('mark_match_messages_read',{p_match:matchId});
  if(readError)console.warn('VERAMOR mark read failed',readError);
  if(scroll)root.scrollTop=root.scrollHeight;
}
async function sendMessage(){
  const input=$('#chatInput'),body=input.value.trim();if(!body)return;
  const b=$('#sendMessage');setBusy(b,true,'…');
  try{
    const {error}=await sb.from('messages').insert({match_id:activeMatch.id,sender_id:user.id,body});
    if(error)throw error;
    input.value='';
    await loadMessages(true);
  }catch(e){message('#chatMsg',e.message,'bad')}finally{setBusy(b,false)}
}
async function unmatchActive(){if(!confirm(`Unmatch ${activeMatch.other.display_name}?`))return;try{const {error}=await sb.rpc('unmatch',{match_uuid:activeMatch.id});if(error)throw error;stopChatRealtime();closeModal('matchModal');await loadMatches()}catch(e){message('#chatMsg',e.message,'bad')}}


async function renderMyProfile(){await fetchMe();const m=await mediaForProfile(profile);const status=launchStatus||{};const statusCard=status.launch_ready?`<div class="vera-profile-status ready"><strong>✓ Discoverable</strong><span>Your profile is live for eligible people.</span></div>`:`<div class="vera-profile-status"><strong>${Number(status.photos_remaining||0)>0?Number(status.photos_remaining)+' photo'+(Number(status.photos_remaining)===1?'':'s')+' needed':'Profile needs attention'}</strong><span>${Number(status.photos_remaining||0)>0?'Add the remaining required photo to return to discovery.':'Finish the remaining profile requirements.'}</span></div>`;$('#myProfile').innerHTML=`<div class="panel">${statusCard}<div class="section-title"><div><span class="pill">YOUR PROFILE</span><h3 style="margin:7px 0 0">What people see</h3></div><button class="btn primary" id="previewMyProfile" type="button">👁 View as others</button></div><div class="photo-grid vera-my-profile-grid">${m.photos.map((x,i)=>`<div class="photo"><img src="${esc(x.url)}" alt="Profile photo ${i+1}"><span class="vera-photo-order-badge">${i+1}</span></div>`).join('')}</div><h2>${esc(profile.display_name)}${formatAge(profile)?`, ${formatAge(profile)}`:''}</h2><p class="muted">${esc(profile.occupation||'')}${profile.city?` · ${esc(profile.city)}`:''}</p><p>${esc(profile.bio||'')}</p><div class="tags">${(profile.interests||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>${lifestyleHtml(profile)}${m.video?`<video src="${esc(m.video)}" controls playsinline style="width:100%;border-radius:16px;margin-top:10px"></video>`:''}</div>`;let host=document.getElementById('selfPreviewHost');if(!host){host=document.createElement('section');host.id='selfPreviewHost';host.className='vera-self-preview-host';$('#myProfile').insertAdjacentElement('afterend',host)}$('#previewMyProfile').onclick=previewMyProfileAsOthers}
$('#editLiveProfile').onclick=openProfileEditor;

async function loadSettings(){const {data,error}=await sb.from('user_settings').select('*').eq('user_id',user.id).single();if(error)throw error;$('#discoveryToggle').checked=data.discovery_enabled!==false}
$('#saveSettings').onclick=async()=>{const b=$('#saveSettings');setBusy(b,true,'Saving…');try{const {error}=await sb.from('user_settings').update({discovery_enabled:$('#discoveryToggle').checked,updated_at:new Date().toISOString()}).eq('user_id',user.id);if(error)throw error;message('#settingsMsg','Settings saved.','ok')}catch(e){message('#settingsMsg',e.message,'bad')}finally{setBusy(b,false)}};
$('#deleteAccount').onclick=async()=>{const typed=prompt('This permanently deletes your VERAMOR account and private media. Type DELETE to continue.');if(typed!=='DELETE')return;const b=$('#deleteAccount');setBusy(b,true,'Deleting…');try{const {data,error}=await sb.functions.invoke('delete-account',{body:{confirm:true}});if(error)throw error;if(!data?.deleted)throw new Error('Deletion did not complete.');await sb.auth.signOut({scope:'local'}).catch(()=>{});session=null;user=null;profile=null;showScreen('authScreen');message('#authMsg','Your VERAMOR account was deleted.','ok')}catch(e){message('#deleteMsg',e.message||'Account deletion failed.','bad')}finally{setBusy(b,false)}};

function showView(id){
  const target=$('#'+id);
  if(!target||!target.classList.contains('appView'))return;
  $$('.appView').forEach(v=>v.classList.toggle('hidden',v.id!==id));
  $$('#bottomNav button[data-view]').forEach(b=>{
    const active=b.dataset.view===id;
    b.classList.toggle('on',active);
    b.setAttribute('aria-selected',active?'true':'false');
  });
  if(id==='matchesView')loadMatches().catch(e=>console.error('Matches load failed',e));
  if(id==='profileView')renderMyProfile().catch(e=>console.error('Profile load failed',e));
  if(id==='settingsView')loadSettings().catch(e=>console.error('Settings load failed',e));
  window.dispatchEvent(new CustomEvent('veramor:view-change',{detail:{view:id}}));
  window.scrollTo({top:0,behavior:'smooth'});
}
window.VERAMOR_SHOW_VIEW=showView;
$$('#bottomNav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));$('#refreshDiscovery').onclick=()=>loadDiscovery().catch(e=>alert(e.message));$('#undoPass').onclick=undoLastPass;$('#refreshMatches').onclick=()=>loadMatches().catch(e=>alert(e.message));
function showModal(id){$('#'+id).classList.remove('hidden')}function closeModal(id){$('#'+id).classList.add('hidden');if(id==='matchModal'){stopChatRealtime();activeMatch=null}}$$('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));$$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));

async function signOut(){stopChatRealtime();planCache=null;await sb.auth.signOut();session=null;user=null;profile=null;launchStatus=null;showScreen('authScreen')}
$('#topSignOut').onclick=signOut;

sb.auth.onAuthStateChange((event,s)=>{session=s;user=s?.user||null;if(event==='SIGNED_OUT'){showScreen('authScreen')}});

let routeInFlight=null;
async function routeUserWithRetry(){
  if(routeInFlight)return routeInFlight;
  routeInFlight=(async()=>{
    let lastError=null;
    for(let attempt=0;attempt<4;attempt++){
      try{return await routeUser()}
      catch(e){
        lastError=e;
        console.warn('VERAMOR account load retry',attempt+1,e);
        if(attempt<3)await new Promise(r=>setTimeout(r,[400,900,1800][attempt]));
      }
    }
    throw lastError||new Error('Could not load account.');
  })();
  try{return await routeInFlight}finally{routeInFlight=null}
}
window.VERAMOR_ROUTE_USER=routeUserWithRetry;
window.VERAMOR_OPEN_PROFILE_EDITOR=openProfileEditor;
window.VERAMOR_REFRESH_MEDIA=refreshMedia;

(async()=>{
  try{
    const {data:{session:s},error}=await sb.auth.getSession();
    if(error)throw error;
    session=s;user=s?.user||null;
    if(user){
      try{await routeUserWithRetry()}
      catch(e){
        console.error(e);
        showScreen('waitingScreen');
        const host=document.getElementById('waitMsg');
        if(host)host.innerHTML='<div class="notice warn">You are signed in, but VERAMOR could not finish loading your account. <button class="btn" id="retryAccountLoad" type="button">Retry</button></div>';
        document.getElementById('retryAccountLoad')?.addEventListener('click',()=>routeUserWithRetry().catch(err=>console.error(err)));
      }
    }else showScreen('authScreen');
  }catch(e){
    console.error(e);
    showScreen('authScreen');
    message('#authMsg','VERAMOR could not load. Refresh and try again.','bad');
  }
})();
