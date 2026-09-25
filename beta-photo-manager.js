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

function sortBySavedOrder(rows,profile){
  const order=Array.isArray(profile?.photo_order)?profile.photo_order:[];
  const rank=new Map(order.map((path,i)=>[path,i]));
  return [...rows].sort((a,b)=>{
    const ar=rank.has(a.path)?rank.get(a.path):9999;
    const br=rank.has(b.path)?rank.get(b.path):9999;
    if(ar!==br)return ar-br;
    return (a.created_at||'').localeCompare(b.created_at||'');
  });
}

async function loadPhotoManager(){
  const u=await pmUser();
  if(!u)return;
  const [{data:list,error:le},{data:profile,error:pe}]=await Promise.all([
    pmSb.storage.from('profile-media').list(u.id,{limit:20,sortBy:{column:'created_at',order:'asc'}}),
    pmSb.from('profiles').select('avatar_path,photo_order,verification_status,liveness_verified,ai_media_verified,is_visible').eq('id',u.id).single()
  ]);
  if(le)throw le;
  if(pe)throw pe;
  pmProfile=profile||{};
  const rows=(list||[]).filter(x=>x?.id&&x?.name).map(f=>({
    path:`${u.id}/${f.name}`,
    name:f.name,
    created_at:f.created_at||''
  }));
  pmPhotos=[];
  for(const row of rows){
    const url=await signed(row.path);
    if(url)pmPhotos.push({...row,url});
  }
  pmPhotos=sortBySavedOrder(pmPhotos,pmProfile);
  if(pmPhotos.length&&!Array.isArray(pmProfile.photo_order)){
    pmProfile.photo_order=pmPhotos.map(x=>x.path);
  }
  renderPhotoManager();
}

function managerHost(){
  const profileView=document.getElementById('profileView');
  const onboarding=document.getElementById('onboardingScreen');
  const editing=!!(onboarding&&!onboarding.classList.contains('hidden'));
  const view=editing?onboarding:profileView;
  if(!view)return null;

  let panel=document.getElementById('veraPhotoManager');
  if(!panel){
    panel=document.createElement('section');
    panel.id='veraPhotoManager';
    panel.className='panel vera-photo-manager';
  }

  if(editing){
    const anchor=document.getElementById('photoMsg')||document.getElementById('photoGrid')||document.getElementById('uploadPhotos');
    if(anchor)anchor.insertAdjacentElement('afterend',panel);
    else view.appendChild(panel);
  }else{
    const edit=document.getElementById('editLiveProfile');
    if(edit)edit.insertAdjacentElement('beforebegin',panel);
    else view.appendChild(panel);
  }
  return panel;
}

function reviewCopy(){
  if(pmProfile?.verification_status==='verified'&&pmProfile?.liveness_verified&&pmProfile?.ai_media_verified===false){
    return '<div class="notice warn"><strong>Photo review pending</strong><br>Your identity verification is still saved. Only the changed photo needs media review before Discovery turns back on.</div>';
  }
  return '<div class="notice"><strong>Arrange your Discovery profile</strong><br>Photo 1 is your main Discovery image. Move photos earlier or later, replace one, or remove extras.</div>';
}

async function savePhotoOrder(nextPhotos=pmPhotos,success='Photo order saved.'){
  const u=await pmUser();if(!u)return;
  const order=nextPhotos.map(x=>x.path);
  const main=order[0]||null;
  const {error}=await pmSb.from('profiles')
    .update({photo_order:order,avatar_path:main,avatar_url:null,updated_at:new Date().toISOString()})
    .eq('id',u.id);
  if(error)throw error;
  pmProfile={...(pmProfile||{}),photo_order:order,avatar_path:main};
  pmMessage(success,'ok');
  window.dispatchEvent(new CustomEvent('veramor:photos-changed'));
}

async function movePhoto(from,to){
  if(to<0||to>=pmPhotos.length||from===to)return;
  const next=[...pmPhotos];
  const [item]=next.splice(from,1);
  next.splice(to,0,item);
  pmPhotos=next;
  renderPhotoManager();
  try{await savePhotoOrder(pmPhotos,'Photo order updated.')}catch(e){pmMessage(e.message||'Could not save photo order.','bad');await loadPhotoManager().catch(()=>{})}
}

function renderPhotoManager(){
  const root=managerHost();if(!root)return;
  const count=pmPhotos.length;
  root.innerHTML=`
    <div class="section-title">
      <div><span class="pill">PROFILE PHOTOS</span><h3 style="margin:7px 0 0">Arrange your photos</h3></div>
      <span class="pill ${count>=4?'ok':'warn'}">${count}/6</span>
    </div>
    <button class="btn primary full vera-preview-profile-btn" id="veraPreviewProfile" type="button">👁 Preview profile as others see it</button>
    ${reviewCopy()}
    <div class="vera-photo-manager-grid">
      ${pmPhotos.map((p,i)=>`
        <article class="vera-photo-slot ${i===0?'is-main':''}" data-photo-path="${pmEsc(p.path)}" data-photo-index="${i}">
          <div class="vera-photo-slot-image">
            <img src="${pmEsc(p.url)}" alt="Profile photo ${i+1}">
            <span class="vera-photo-number">PHOTO ${i+1}</span>
            ${i===0?'<span class="vera-photo-main">MAIN</span>':''}
          </div>
          <div class="vera-order-controls">
            <button class="btn" type="button" data-move-earlier="${i}" ${i===0?'disabled':''}>← Earlier</button>
            <button class="btn" type="button" data-move-later="${i}" ${i===count-1?'disabled':''}>Later →</button>
          </div>
          <div class="vera-photo-actions">
            <button class="btn" type="button" data-replace="${pmEsc(p.path)}">Swap photo</button>
            <button class="btn danger" type="button" data-remove="${pmEsc(p.path)}" ${count<=4?'disabled title="Keep at least 4 photos"':''}>Delete</button>
          </div>
        </article>`).join('')}
    </div>
    ${count?'' : '<div class="notice warn">No profile photos are showing yet. Reload this screen once; if you are signed in, VERAMOR will pull them from your private profile-media folder.</div>'}
    <div class="vera-photo-add">
      <input id="veraPhotoAddInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
      <input id="veraPhotoReplaceInput" type="file" accept="image/jpeg,image/png,image/webp" hidden>
      <button class="btn primary full" id="veraAddPhotos" type="button" ${count>=6?'disabled':''}>＋ Add photo${count<5?'s':''}</button>
      <p class="muted">Minimum 4 · Maximum 6 · Photo 1 is shown first in Discovery.</p>
    </div>
    <div id="veraPhotoManagerMsg"></div>`;

  document.getElementById('veraPreviewProfile').onclick=()=>window.VERAMOR_PREVIEW_MY_PROFILE?.();
  root.querySelectorAll('[data-move-earlier]').forEach(b=>b.onclick=()=>movePhoto(Number(b.dataset.moveEarlier),Number(b.dataset.moveEarlier)-1));
  root.querySelectorAll('[data-move-later]').forEach(b=>b.onclick=()=>movePhoto(Number(b.dataset.moveLater),Number(b.dataset.moveLater)+1));
  root.querySelectorAll('[data-replace]').forEach(b=>b.onclick=()=>beginReplace(b.dataset.replace));
  root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removePhotoEasy(b.dataset.remove));

  let dragFrom=null,startX=0,startY=0;
  const clearDrag=()=>{root.querySelectorAll('.vera-photo-slot.dragging,.vera-photo-slot.drag-over').forEach(x=>x.classList.remove('dragging','drag-over'));dragFrom=null};
  root.querySelectorAll('.vera-photo-slot-image').forEach((handle,i)=>{
    handle.setAttribute('title','Drag to reorder');
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      dragFrom=i;startX=e.clientX;startY=e.clientY;
      handle.closest('.vera-photo-slot')?.classList.add('dragging');
    });
    handle.addEventListener('pointermove',e=>{
      if(dragFrom===null)return;
      if(Math.hypot(e.clientX-startX,e.clientY-startY)<18)return;
      root.querySelectorAll('.vera-photo-slot.drag-over').forEach(x=>x.classList.remove('drag-over'));
      document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.vera-photo-slot')?.classList.add('drag-over');
    });
    handle.addEventListener('pointerup',e=>{
      if(dragFrom===null)return;
      const moved=Math.hypot(e.clientX-startX,e.clientY-startY)>=18;
      const target=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.vera-photo-slot');
      const to=target?Number(target.dataset.photoIndex):dragFrom;
      const from=dragFrom;clearDrag();
      if(moved&&Number.isInteger(to)&&to!==from)movePhoto(from,to);
    });
    handle.addEventListener('pointercancel',clearDrag);
  });

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

function beginReplace(path){
  replaceTarget=path;
  const input=document.getElementById('veraPhotoReplaceInput');
  input.value='';
  input.click();
}

async function replacePhotoEasy(file){
  if(!file||!replaceTarget)return;
  const oldPath=replaceTarget;replaceTarget=null;
  pmMessage('Swapping photo…');
  try{
    const u=await pmUser();if(!u)return;
    validate(file);
    const oldIndex=Math.max(0,pmPhotos.findIndex(x=>x.path===oldPath));
    const newPath=await uploadOne(file,u);
    const {error:de}=await pmSb.storage.from('profile-media').remove([oldPath]);
    if(de)throw de;
    const order=pmPhotos.map(x=>x.path);
    order.splice(oldIndex,1,newPath);
    const {error:ue}=await pmSb.from('profiles').update({
      photo_order:order,
      avatar_path:order[0]||null,
      avatar_url:null,
      updated_at:new Date().toISOString()
    }).eq('id',u.id);
    if(ue)throw ue;
    pmMessage('Photo swapped. Your identity verification stays saved; only the new media needs review.','ok');
    await loadPhotoManager();
    window.dispatchEvent(new CustomEvent('veramor:photos-changed'));
  }catch(e){pmMessage(e.message||'Could not swap that photo.','bad')}
}

async function removePhotoEasy(path){
  if(pmPhotos.length<=4)return pmMessage('VERAMOR requires at least 4 photos. Swap this photo instead of deleting it.','warn');
  if(!confirm('Delete this profile photo?'))return;
  pmMessage('Deleting photo…');
  try{
    const u=await pmUser();if(!u)return;
    const next=pmPhotos.filter(x=>x.path!==path);
    const {error}=await pmSb.storage.from('profile-media').remove([path]);
    if(error)throw error;
    const order=next.map(x=>x.path);
    const {error:ue}=await pmSb.from('profiles').update({
      photo_order:order,
      avatar_path:order[0]||null,
      avatar_url:null,
      updated_at:new Date().toISOString()
    }).eq('id',u.id);
    if(ue)throw ue;
    pmPhotos=next;
    pmMessage('Photo deleted.','ok');
    await loadPhotoManager();
    window.dispatchEvent(new CustomEvent('veramor:photos-changed'));
  }catch(e){pmMessage(e.message||'Could not delete that photo.','bad')}
}

async function addPhotosEasy(files){
  if(!files.length)return;
  const room=Math.max(0,6-pmPhotos.length);
  if(!room)return pmMessage('You already have the 6-photo maximum.','warn');
  if(files.length>room)return pmMessage(`You can add ${room} more photo${room===1?'':'s'}.`,'warn');
  pmMessage('Uploading photo'+(files.length>1?'s':'')+'…');
  try{
    const u=await pmUser();if(!u)return;
    const newPaths=[];
    for(const f of files)newPaths.push(await uploadOne(f,u));
    const order=[...pmPhotos.map(x=>x.path),...newPaths];
    const {error:ue}=await pmSb.from('profiles').update({
      photo_order:order,
      avatar_path:order[0]||null,
      avatar_url:null,
      updated_at:new Date().toISOString()
    }).eq('id',u.id);
    if(ue)throw ue;
    pmMessage('Photo'+(files.length>1?'s':'')+' added. Your identity verification stays saved; new media is sent for photo review.','ok');
    document.getElementById('veraPhotoAddInput').value='';
    await loadPhotoManager();
    window.dispatchEvent(new CustomEvent('veramor:photos-changed'));
  }catch(e){pmMessage(e.message||'Could not upload the photo.','bad')}
}

function bootPhotoManager(){
  const schedule=(delay=80)=>setTimeout(()=>loadPhotoManager().catch(e=>pmMessage(e.message||'Could not load profile photos.','bad')),delay);

  document.querySelector('#bottomNav button[data-view="profileView"]')?.addEventListener('click',()=>schedule());
  document.getElementById('editLiveProfile')?.addEventListener('click',()=>schedule(180));
  document.getElementById('editProfile')?.addEventListener('click',()=>schedule(180));

  window.addEventListener('veramor:view-change',e=>{
    if(e.detail?.view==='profileView')schedule();
  });

  const onboarding=document.getElementById('onboardingScreen');
  if(onboarding){
    new MutationObserver(()=>{
      if(!onboarding.classList.contains('hidden'))schedule(120);
    }).observe(onboarding,{attributes:true,attributeFilter:['class']});
  }

  const profile=document.getElementById('profileView');
  if((profile&&!profile.classList.contains('hidden'))||(onboarding&&!onboarding.classList.contains('hidden')))schedule(20);
}

window.addEventListener('veramor:photos-changed',()=>setTimeout(()=>loadPhotoManager().catch(()=>{}),160));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootPhotoManager,{once:true});else bootPhotoManager();
