import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const pmSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}}
);

let pmPhotos=[];
let pmProfile=null;
let replaceTarget=null;

const pmEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pmExt=file=>{
  const n=(file.name||'').split('.').pop()?.toLowerCase();
  if(n&&/^(jpg|jpeg|png|webp)$/.test(n))return n==='jpeg'?'jpg':n;
  const m=(file.type||'').split('/')[1]||'jpg';
  return m==='jpeg'?'jpg':m;
};
const pmUuid=()=>crypto.randomUUID();

async function pmUser(){
  const {data:{session}}=await pmSb.auth.getSession();
  return session?.user||null;
}

async function signed(path){
  const {data,error}=await pmSb.storage.from('profile-media').createSignedUrl(path,1800);
  if(error)throw error;
  return data?.signedUrl||'';
}

async function loadPhotoManager(){
  const u=await pmUser();
  if(!u)return;
  const [{data:list,error:le},{data:profile,error:pe}]=await Promise.all([
    pmSb.storage.from('profile-media').list(u.id,{limit:20,sortBy:{column:'created_at',order:'asc'}}),
    pmSb.from('profiles').select('avatar_path,verification_status,liveness_verified,ai_media_verified,is_visible').eq('id',u.id).single()
  ]);
  if(le)throw le;if(pe)throw pe;
  pmProfile=profile||{};
  const files=(list||[]).filter(x=>x?.id&&x?.name);
  pmPhotos=[];
  for(const f of files){
    const path=`${u.id}/${f.name}`;
    pmPhotos.push({path,name:f.name,url:await signed(path)});
  }
  if(pmProfile.avatar_path){
    pmPhotos.sort((a,b)=>Number(b.path===pmProfile.avatar_path)-Number(a.path===pmProfile.avatar_path));
  }
  renderPhotoManager();
}

function managerHost(){
  const view=document.getElementById('profileView');
  if(!view)return null;
  let panel=document.getElementById('veraPhotoManager');
  if(panel)return panel;
  panel=document.createElement('section');
  panel.id='veraPhotoManager';
  panel.className='panel vera-photo-manager';
  const edit=document.getElementById('editLiveProfile');
  edit?.insertAdjacentElement('beforebegin',panel);
  return panel;
}

function reviewCopy(){
  if(pmProfile?.verification_status==='verified'&&pmProfile?.liveness_verified&&pmProfile?.ai_media_verified===false){
    return '<div class="notice warn"><strong>Photo review pending</strong><br>Your face verification is still saved. Only the new/changed profile media needs review before discovery turns back on.</div>';
  }
  return '<div class="notice"><strong>Easy photo editing</strong><br>Keep at least 4 photos. Adding or replacing a photo sends only that media back for review — you do not need to redo your face verification.</div>';
}

function renderPhotoManager(){
  const root=managerHost();if(!root)return;
  const count=pmPhotos.length;
  root.innerHTML=`
    <div class="section-title">
      <div><span class="pill">PROFILE PHOTOS</span><h3 style="margin:7px 0 0">Manage photos</h3></div>
      <span class="pill ${count>=4?'ok':'warn'}">${count}/6</span>
    </div>
    ${reviewCopy()}
    <div class="vera-photo-manager-grid">
      ${pmPhotos.map((p,i)=>`
        <article class="vera-photo-slot" data-photo-path="${pmEsc(p.path)}">
          <div class="vera-photo-slot-image">
            <img src="${pmEsc(p.url)}" alt="Profile photo ${i+1}">
            <span class="vera-photo-number">${i+1}</span>
            ${p.path===pmProfile?.avatar_path?'<span class="vera-photo-main">MAIN</span>':''}
          </div>
          <div class="vera-photo-actions">
            <button class="btn" type="button" data-set-main="${pmEsc(p.path)}" ${p.path===pmProfile?.avatar_path?'disabled':''}>Set main</button>
            <button class="btn" type="button" data-replace="${pmEsc(p.path)}">Replace</button>
            <button class="btn danger" type="button" data-remove="${pmEsc(p.path)}" ${count<=4?'disabled title="Keep at least 4 photos"':''}>Remove</button>
          </div>
        </article>`).join('')}
    </div>
    <div class="vera-photo-add">
      <input id="veraPhotoAddInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
      <input id="veraPhotoReplaceInput" type="file" accept="image/jpeg,image/png,image/webp" hidden>
      <button class="btn primary full" id="veraAddPhotos" type="button" ${count>=6?'disabled':''}>＋ Add photo${count<5?'s':''}</button>
      <p class="muted">Minimum 4 · Maximum 6 · JPG, PNG or WebP · 10 MB max each</p>
    </div>
    <div id="veraPhotoManagerMsg"></div>`;

  root.querySelectorAll('[data-set-main]').forEach(b=>b.onclick=()=>setMainPhoto(b.dataset.setMain));
  root.querySelectorAll('[data-replace]').forEach(b=>b.onclick=()=>beginReplace(b.dataset.replace));
  root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removePhotoEasy(b.dataset.remove));
  document.getElementById('veraAddPhotos').onclick=()=>document.getElementById('veraPhotoAddInput').click();
  document.getElementById('veraPhotoAddInput').onchange=e=>addPhotosEasy(Array.from(e.target.files||[]));
  document.getElementById('veraPhotoReplaceInput').onchange=e=>replacePhotoEasy(e.target.files?.[0]||null);
}

function pmMessage(text,type=''){
  const el=document.getElementById('veraPhotoManagerMsg');
  if(el)el.innerHTML=text?`<div class="notice ${type}">${pmEsc(text)}</div>`:'';
}

function validate(file){
  if(!file)return;
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('Choose a JPG, PNG, or WebP image.');
  if(file.size>10*1024*1024)throw new Error('Each photo must be 10 MB or smaller.');
}

async function uploadOne(file,u){
  validate(file);
  const path=`${u.id}/${pmUuid()}.${pmExt(file)}`;
  const {error}=await pmSb.storage.from('profile-media').upload(path,file,{contentType:file.type,upsert:false});
  if(error)throw error;
  return path;
}

async function setMainPhoto(path){
  try{
    const u=await pmUser();if(!u)return;
    const {error}=await pmSb.from('profiles').update({avatar_path:path,avatar_url:null,updated_at:new Date().toISOString()}).eq('id',u.id);
    if(error)throw error;
    pmMessage('Main photo updated.','ok');
    await loadPhotoManager();
    window.dispatchEvent(new CustomEvent('veramor:photos-changed'));
  }catch(e){pmMessage(e.message||'Could not set the main photo.','bad')}
}

function beginReplace(path){
  replaceTarget=path;
  const input=document.getElementById('veraPhotoReplaceInput');
  input.value='';
  input.click();
}

async function replacePhotoEasy(file){
  if(!file||!replaceTarget)return;
  const oldPath=replaceTarget;replaceTarget=null;
  pmMessage('Replacing photo…');
  try{
    const u=await pmUser();if(!u)return;
    validate(file);
    const newPath=await uploadOne(file,u);
    if(pmProfile?.avatar_path===oldPath){
      const {error:ae}=await pmSb.from('profiles').update({avatar_path:newPath,avatar_url:null,updated_at:new Date().toISOString()}).eq('id',u.id);
      if(ae)throw ae;
    }
    const {error:de}=await pmSb.storage.from('profile-media').remove([oldPath]);
    if(de)throw de;
    pmMessage('Photo replaced. Your face verification is still saved; the new photo is now in media review.','ok');
    await loadPhotoManager();
    window.dispatchEvent(new CustomEvent('veramor:photos-changed'));
  }catch(e){pmMessage(e.message||'Could not replace that photo.','bad')}
}

async function removePhotoEasy(path){
  if(pmPhotos.length<=4)return pmMessage('VERAMOR requires at least 4 photos. Replace this photo instead of removing it.','warn');
  if(!confirm('Remove this profile photo?'))return;
  pmMessage('Removing photo…');
  try{
    const u=await pmUser();if(!u)return;
    const remaining=pmPhotos.filter(x=>x.path!==path);
    const {error}=await pmSb.storage.from('profile-media').remove([path]);
    if(error)throw error;
    if(pmProfile?.avatar_path===path){
      const next=remaining[0]?.path||null;
      const {error:ae}=await pmSb.from('profiles').update({avatar_path:next,avatar_url:null,updated_at:new Date().toISOString()}).eq('id',u.id);
      if(ae)throw ae;
    }
    pmMessage('Photo removed.','ok');
    await loadPhotoManager();
    window.dispatchEvent(new CustomEvent('veramor:photos-changed'));
  }catch(e){pmMessage(e.message||'Could not remove that photo.','bad')}
}

async function addPhotosEasy(files){
  if(!files.length)return;
  const room=Math.max(0,6-pmPhotos.length);
  if(!room)return pmMessage('You already have the 6-photo maximum.','warn');
  if(files.length>room)return pmMessage(`You can add ${room} more photo${room===1?'':'s'}.`,'warn');
  pmMessage('Uploading photo'+(files.length>1?'s':'')+'…');
  try{
    const u=await pmUser();if(!u)return;
    for(const f of files)await uploadOne(f,u);
    pmMessage('Photo'+(files.length>1?'s':'')+' added. Your face verification is still saved; new media is sent for photo review.','ok');
    document.getElementById('veraPhotoAddInput').value='';
    await loadPhotoManager();
    window.dispatchEvent(new CustomEvent('veramor:photos-changed'));
  }catch(e){pmMessage(e.message||'Could not upload the photo.','bad')}
}

function bootPhotoManager(){
  if(document.getElementById('profileView'))loadPhotoManager().catch(()=>{});
  document.querySelector('#bottomNav button[data-view="profileView"]')?.addEventListener('click',()=>setTimeout(()=>loadPhotoManager().catch(()=>{}),60));
}

window.addEventListener('veramor:photos-changed',()=>setTimeout(()=>loadPhotoManager().catch(()=>{}),150));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootPhotoManager,{once:true});else bootPhotoManager();
