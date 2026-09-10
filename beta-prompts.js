import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const promptSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const QUESTIONS=[
  'A green flag I look for is…',
  'The quickest way to make me laugh is…',
  'My perfect first date is…',
  'Something I could talk about for hours is…',
  'A random fact about me is…',
  'My most spontaneous story is…',
  'The way to win me over is…',
  'My ideal Sunday looks like…',
  'A life goal I care about is…',
  'One thing you should know about me is…'
];

let promptUser=null;
let promptRows=[];
let editingIndex=null;
let selectedType='text';
let modalDecorating=false;
let profileDecorating=false;
const pEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function ensureCss(){if(document.querySelector('link[href="beta-prompts.css"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='beta-prompts.css';document.head.appendChild(l)}
async function getUser(){const {data:{session}}=await promptSb.auth.getSession();promptUser=session?.user||null;return promptUser}
async function loadOwnPrompts(){const u=await getUser();if(!u){promptRows=[];return []}const {data,error}=await promptSb.from('profiles').select('prompts').eq('id',u.id).single();if(error)throw error;promptRows=Array.isArray(data?.prompts)?data.prompts:[];return promptRows}
function fileExt(file){const raw=(file.name||'').split('.').pop()?.toLowerCase();if(raw&&/^[a-z0-9]{2,5}$/.test(raw))return raw;const type=(file.type||'').split('/')[1]||'bin';return type==='quicktime'?'mov':type==='mpeg'?'mp3':type}
async function signed(path){if(!path)return null;const {data,error}=await promptSb.storage.from('prompt-media').createSignedUrl(path,900);return error?null:data?.signedUrl||null}
function typeIcon(type){return type==='audio'?'🎙️':type==='video'?'🎥':'✍️'}
function typeLabel(type){return type==='audio'?'VOICE':type==='video'?'VIDEO':'TEXT'}
async function mediaDuration(file,type){return new Promise((resolve,reject)=>{const el=document.createElement(type==='audio'?'audio':'video');const url=URL.createObjectURL(file);el.preload='metadata';el.onloadedmetadata=()=>{const d=Number(el.duration)||0;URL.revokeObjectURL(url);resolve(d)};el.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read this media file.'))};el.src=url})}

async function answerHtml(row,compact=false){
  const q=`<small>${pEsc(row.question||'Prompt')}</small>`;
  const badge=`<span class="vera-prompt-format-pill">${typeIcon(row.type)} ${typeLabel(row.type)}</span>`;
  if(row.type==='text')return `${badge}${q}<p>${pEsc(row.text||'')}</p>`;
  const url=await signed(row.media_path);
  if(!url)return `${badge}${q}<p class="muted">Media unavailable.</p>`;
  if(row.type==='audio')return `${badge}${q}<audio src="${pEsc(url)}" controls preload="metadata"></audio>`;
  return `${badge}${q}<video src="${pEsc(url)}" controls playsinline preload="metadata"></video>`;
}

async function renderSaved(){
  const root=document.getElementById('promptSaved');if(!root)return;
  if(!promptRows.length){root.innerHTML='<div class="vera-prompt-empty">No prompts yet. Add one below to give people more to respond to.</div>';return}
  root.innerHTML='';
  for(let i=0;i<promptRows.length;i++){
    const row=promptRows[i];const card=document.createElement('div');card.className='vera-prompt-card';
    card.innerHTML=`${await answerHtml(row)}<div class="vera-prompt-actions"><button class="btn" data-edit-prompt="${i}">Edit</button><button class="btn danger" data-remove-prompt="${i}">Remove</button></div>`;
    root.appendChild(card);
  }
  root.querySelectorAll('[data-edit-prompt]').forEach(b=>b.onclick=()=>editPrompt(Number(b.dataset.editPrompt)));
  root.querySelectorAll('[data-remove-prompt]').forEach(b=>b.onclick=()=>removePrompt(Number(b.dataset.removePrompt)));
}

function builderQuestionOptions(value=''){return `<option value="">Choose a prompt</option>${QUESTIONS.map(q=>`<option ${q===value?'selected':''}>${pEsc(q)}</option>`).join('')}`}
function paintType(type){selectedType=type;document.querySelectorAll('[data-prompt-type]').forEach(b=>b.classList.toggle('primary',b.dataset.promptType===type));const text=document.getElementById('promptTextWrap'),media=document.getElementById('promptMediaWrap'),file=document.getElementById('promptMediaFile'),note=document.getElementById('promptFormatNote');if(text)text.classList.toggle('hidden',type!=='text');if(media)media.classList.toggle('hidden',type==='text');if(file){file.value='';file.accept=type==='audio'?'audio/*':'video/mp4,video/quicktime,video/webm,video/*';file.setAttribute('capture',type==='audio'?'microphone':'user')}if(note)note.textContent=type==='text'?'Up to 500 characters.':type==='audio'?'Voice answers can be up to 60 seconds.':'Video answers can be up to 30 seconds.'}
function resetBuilder(){editingIndex=null;selectedType='text';const q=document.getElementById('promptQuestion'),txt=document.getElementById('promptText'),file=document.getElementById('promptMediaFile'),save=document.getElementById('savePromptAnswer'),cancel=document.getElementById('cancelPromptEdit');if(q)q.value='';if(txt)txt.value='';if(file)file.value='';if(save)save.textContent='Save prompt';if(cancel)cancel.classList.add('hidden');paintType('text');updatePromptCounter()}
function editPrompt(i){const row=promptRows[i];if(!row)return;editingIndex=i;document.getElementById('promptQuestion').innerHTML=builderQuestionOptions(row.question);document.getElementById('promptQuestion').value=row.question;document.getElementById('promptText').value=row.type==='text'?(row.text||''):'';document.getElementById('savePromptAnswer').textContent='Save changes';document.getElementById('cancelPromptEdit').classList.remove('hidden');paintType(row.type||'text');updatePromptCounter();document.getElementById('promptBuilder')?.scrollIntoView({behavior:'smooth',block:'center'})}
function updatePromptCounter(){const n=promptRows.length;const el=document.getElementById('promptCounter');if(el)el.textContent=`${n}/3 prompts`;const save=document.getElementById('savePromptAnswer');if(save&&editingIndex===null)save.disabled=n>=3}

async function savePrompt(){
  const u=await getUser();if(!u)return;
  const question=document.getElementById('promptQuestion')?.value||'';
  const text=(document.getElementById('promptText')?.value||'').trim();
  const file=document.getElementById('promptMediaFile')?.files?.[0]||null;
  const msg=document.getElementById('promptMsg');const btn=document.getElementById('savePromptAnswer');
  if(!question){if(msg)msg.innerHTML='<div class="notice warn">Choose a prompt first.</div>';return}
  if(selectedType==='text'&&!text){if(msg)msg.innerHTML='<div class="notice warn">Write your answer first.</div>';return}
  if(text.length>500){if(msg)msg.innerHTML='<div class="notice bad">Text answers must be 500 characters or less.</div>';return}
  if(editingIndex===null&&promptRows.length>=3){if(msg)msg.innerHTML='<div class="notice warn">You already have 3 prompts. Edit or remove one first.</div>';return}

  const current=editingIndex===null?null:promptRows[editingIndex];
  let newPath=current?.type===selectedType?current?.media_path||'':'';
  let uploadedPath=null;
  btn.disabled=true;btn.textContent='Saving…';if(msg)msg.innerHTML='';
  try{
    if(selectedType!=='text'){
      if(file){
        if(selectedType==='audio'&&!file.type.startsWith('audio/'))throw new Error('Choose an audio file for a voice prompt.');
        if(selectedType==='video'&&!file.type.startsWith('video/'))throw new Error('Choose a video file for a video prompt.');
        const max=selectedType==='audio'?20*1024*1024:50*1024*1024;if(file.size>max)throw new Error(selectedType==='audio'?'Voice prompt must be 20 MB or smaller.':'Video prompt must be 50 MB or smaller.');
        const duration=await mediaDuration(file,selectedType);const maxSeconds=selectedType==='audio'?60:30;if(duration>maxSeconds+0.25)throw new Error(`${selectedType==='audio'?'Voice':'Video'} prompts can be up to ${maxSeconds} seconds.`);
        uploadedPath=`${u.id}/${crypto.randomUUID()}.${fileExt(file)}`;
        const {error:up}=await promptSb.storage.from('prompt-media').upload(uploadedPath,file,{contentType:file.type,upsert:false});if(up)throw up;newPath=uploadedPath;
      }
      if(!newPath)throw new Error(`Record or choose a ${selectedType==='audio'?'voice':'video'} answer first.`);
    }

    const row={id:current?.id||crypto.randomUUID(),question,type:selectedType,text:selectedType==='text'?text:'',media_path:selectedType==='text'?'':newPath};
    const next=[...promptRows];if(editingIndex===null)next.push(row);else next[editingIndex]=row;
    const {error}=await promptSb.from('profiles').update({prompts:next}).eq('id',u.id);if(error)throw error;
    const oldPath=current?.media_path||'';if(oldPath&&oldPath!==newPath){await promptSb.storage.from('prompt-media').remove([oldPath]).catch(()=>{})}
    promptRows=next;await renderSaved();resetBuilder();if(msg)msg.innerHTML='<div class="notice ok">Prompt saved.</div>';
  }catch(e){if(uploadedPath)await promptSb.storage.from('prompt-media').remove([uploadedPath]).catch(()=>{});if(msg)msg.innerHTML=`<div class="notice bad">${pEsc(e.message||'Could not save prompt.')}</div>`}
  finally{btn.disabled=false;if(editingIndex===null)btn.textContent='Save prompt';updatePromptCounter()}
}

async function removePrompt(i){const row=promptRows[i];if(!row||!confirm('Remove this prompt?'))return;const u=await getUser();if(!u)return;const next=promptRows.filter((_,idx)=>idx!==i);try{const {error}=await promptSb.from('profiles').update({prompts:next}).eq('id',u.id);if(error)throw error;if(row.media_path)await promptSb.storage.from('prompt-media').remove([row.media_path]).catch(()=>{});promptRows=next;await renderSaved();resetBuilder()}catch(e){alert(e.message||'Could not remove prompt.')}}

function installEditor(){
  if(document.getElementById('promptEditorPanel'))return;
  const onboarding=document.getElementById('onboardingScreen');if(!onboarding)return;
  const first=onboarding.querySelector('.panel');if(!first)return;
  const panel=document.createElement('div');panel.id='promptEditorPanel';panel.className='panel vera-prompt-editor';
  panel.innerHTML=`<div class="section-title"><div><span class="pill">PROMPTS</span><h3>Add some personality</h3></div><span id="promptCounter" class="vera-prompt-counter">0/3 prompts</span></div><p class="muted">Answer up to three prompts. Each answer can be text, a voice clip, or a short video.</p><div id="promptSaved" class="vera-prompt-saved"></div><div id="promptBuilder" class="vera-prompt-builder"><div class="field"><label>Prompt</label><select id="promptQuestion">${builderQuestionOptions()}</select></div><div class="vera-prompt-type"><button class="btn primary" type="button" data-prompt-type="text">✍️ Text</button><button class="btn" type="button" data-prompt-type="audio">🎙️ Voice</button><button class="btn" type="button" data-prompt-type="video">🎥 Video</button></div><div id="promptTextWrap" class="field"><label>Your answer</label><textarea id="promptText" maxlength="500" placeholder="Say something people can actually respond to."></textarea></div><div id="promptMediaWrap" class="field hidden"><label>Record or upload your answer</label><input id="promptMediaFile" type="file"></div><div id="promptFormatNote" class="vera-prompt-format-note">Up to 500 characters.</div><div class="vera-prompt-actions"><button id="savePromptAnswer" class="btn primary" type="button">Save prompt</button><button id="cancelPromptEdit" class="btn hidden" type="button">Cancel edit</button></div><div id="promptMsg"></div></div>`;
  first.insertAdjacentElement('afterend',panel);
  panel.querySelectorAll('[data-prompt-type]').forEach(b=>b.onclick=()=>paintType(b.dataset.promptType));
  document.getElementById('savePromptAnswer').onclick=savePrompt;
  document.getElementById('cancelPromptEdit').onclick=resetBuilder;
}

async function renderPromptSection(host,profile,mode='full'){
  if(!host||!profile||!Array.isArray(profile.prompts)||!profile.prompts.length)return;
  host.querySelectorAll('.vera-prompt-profile-section').forEach(x=>x.remove());
  const sec=document.createElement('section');sec.className='vera-prompt-profile-section';sec.dataset.promptOwner=profile.id||'';sec.innerHTML='<h3>Get to know me</h3>';
  for(const row of profile.prompts){const card=document.createElement('div');card.className=mode==='mini'?'vera-prompt-mini':'vera-prompt-card';card.innerHTML=await answerHtml(row,mode==='mini');sec.appendChild(card)}
  host.appendChild(sec);
}

async function decorateMyProfile(){if(profileDecorating)return;const host=document.getElementById('myProfile');if(!host||host.querySelector('.vera-prompt-profile-section'))return;profileDecorating=true;try{const u=await getUser();if(!u)return;const {data}=await promptSb.from('profiles').select('id,prompts').eq('id',u.id).single();if(data)await renderPromptSection(host,data)}finally{profileDecorating=false}}
async function profileFromModal(){const body=document.getElementById('profileModalBody');if(!body)return null;const h=body.querySelector('h2');if(!h)return null;const name=(h.textContent||'').split(',')[0].trim();if(!name)return null;const {data}=await promptSb.from('profiles').select('id,display_name,city,prompts').eq('display_name',name).limit(10);const rows=data||[];if(rows.length<=1)return rows[0]||null;const txt=body.textContent||'';return rows.find(p=>p.city&&txt.includes(p.city))||rows[0]}
async function decorateModal(){if(modalDecorating)return;const body=document.getElementById('profileModalBody');if(!body||body.querySelector('.vera-prompt-profile-section'))return;modalDecorating=true;try{const p=await profileFromModal();if(p)await renderPromptSection(body,p)}finally{modalDecorating=false}}
async function decorateDeck(){const card=document.querySelector('#deck .profile-card');if(!card||card.querySelector('.vera-prompt-profile-section'))return;const h=card.querySelector('.profile-overlay h2');if(!h)return;const name=(h.textContent||'').split(',')[0].trim();const {data}=await promptSb.from('profiles').select('id,display_name,city,prompts').eq('display_name',name).limit(10);const p=(data||[]).find(x=>x.prompts?.length);if(!p)return;const details=card.querySelector('.details');if(!details)return;const sec=document.createElement('section');sec.className='vera-prompt-profile-section';const first=p.prompts[0];const mini=document.createElement('div');mini.className='vera-prompt-mini';mini.innerHTML=await answerHtml(first,true);sec.appendChild(mini);details.insertBefore(sec,details.querySelector('.actions'))}

async function init(){ensureCss();installEditor();await loadOwnPrompts().catch(()=>[]);await renderSaved();updatePromptCounter();const onboarding=document.getElementById('onboardingScreen');if(onboarding)new MutationObserver(()=>{if(!document.getElementById('promptEditorPanel'))installEditor();loadOwnPrompts().then(renderSaved).then(updatePromptCounter).catch(()=>{})}).observe(onboarding,{attributes:true,attributeFilter:['class']});const my=document.getElementById('myProfile');if(my)new MutationObserver(()=>setTimeout(()=>decorateMyProfile().catch(()=>{}),30)).observe(my,{childList:true});const modal=document.getElementById('profileModalBody');if(modal)new MutationObserver(()=>setTimeout(()=>decorateModal().catch(()=>{}),30)).observe(modal,{childList:true,subtree:false});const deck=document.getElementById('deck');if(deck)new MutationObserver(()=>setTimeout(()=>decorateDeck().catch(()=>{}),30)).observe(deck,{childList:true,subtree:false});decorateMyProfile().catch(()=>{});decorateModal().catch(()=>{});decorateDeck().catch(()=>{})}

if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',init,{once:true});else init();
promptSb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'){loadOwnPrompts().then(renderSaved).then(updatePromptCounter).catch(()=>{})}if(event==='SIGNED_OUT'){promptRows=[];editingIndex=null}});
