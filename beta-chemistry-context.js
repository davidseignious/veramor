import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const chemistrySb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}}
);

let chemistryContext=null;
let chemistryClock=null;
const cEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function cAge(date){if(!date)return '';const d=new Date(date+'T00:00:00'),n=new Date();let a=n.getFullYear()-d.getFullYear();if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;return a>=18&&a<=100?a:''}
async function cUser(){const {data:{session}}=await chemistrySb.auth.getSession();return session?.user||null}

async function activeRows(){
  const u=await cUser();if(!u)return [];
  const {data,error}=await chemistrySb.from('matches').select('*').eq('status','active').or(`user_a.eq.${u.id},user_b.eq.${u.id}`).order('created_at',{ascending:false});
  if(error)throw error;return data||[];
}
async function contextFromMatch(m){
  const u=await cUser();if(!u||!m)return null;
  const otherId=m.user_a===u.id?m.user_b:m.user_a;
  const {data:p,error}=await chemistrySb.from('profiles').select('*').eq('id',otherId).single();
  if(error)throw error;
  chemistryContext={match:m,other:p};return chemistryContext;
}
async function resolveByIndex(index){const rows=await activeRows();return contextFromMatch(rows[index])}
async function resolveByTitle(){
  const title=(document.getElementById('matchModalTitle')?.textContent||'').trim();if(!title)return null;
  const rows=await activeRows();const u=await cUser();if(!u)return null;
  for(const m of rows){const id=m.user_a===u.id?m.user_b:m.user_a;const {data:p}=await chemistrySb.from('profiles').select('*').eq('id',id).maybeSingle();if(p&&p.display_name===title)return contextFromMatch(m)}
  return null;
}
function timeLeft(expires){
  if(!expires)return null;const ms=new Date(expires).getTime()-Date.now();
  if(ms<=0)return {expired:true,text:'Expired'};
  const total=Math.ceil(ms/60000),days=Math.floor(total/1440),hours=Math.floor((total%1440)/60),mins=total%60;
  if(days>0)return {expired:false,text:`${days}d ${hours}h left`};
  if(hours>0)return {expired:false,text:`${hours}h ${mins}m left`,soon:hours<6};
  return {expired:false,text:`${mins}m left`,soon:true};
}
function paintCountdown(){
  const el=document.getElementById('chemistryDeadline');if(!el||!chemistryContext)return;
  const left=timeLeft(chemistryContext.match.expires_at);
  if(!left){el.textContent='Chemistry complete';el.className='vera-deadline done';return}
  el.textContent=left.expired?'48-hour Chemistry window expired':`⏳ ${left.text} in the 48-hour Chemistry window`;
  el.className=`vera-deadline ${left.expired?'expired':left.soon?'soon':''}`;
  if(left.expired){const submit=document.getElementById('submitChem');if(submit){submit.disabled=true;submit.textContent='Match expired'}}
}
async function ensureContext(){if(chemistryContext&&chemistryContext.match?.status==='active')return chemistryContext;return resolveByTitle()}

async function signed(bucket,path){if(!path)return null;if(/^https?:\/\//i.test(path))return path;const {data,error}=await chemistrySb.storage.from(bucket).createSignedUrl(path,900);return error?null:data?.signedUrl||null}
async function profileMedia(id){
  const {data:rows}=await chemistrySb.storage.from('profile-media').list(id,{limit:12,sortBy:{column:'created_at',order:'asc'}});
  const photos=[];for(const f of rows||[]){if(!f?.id||!f?.name)continue;const u=await signed('profile-media',`${id}/${f.name}`);if(u)photos.push(u)}
  return photos;
}
async function openChemistryProfile(){
  const ctx=await ensureContext();if(!ctx)return;
  const p=ctx.other;const modal=document.getElementById('profileModal'),body=document.getElementById('profileModalBody');if(!modal||!body)return;
  const photos=await profileMedia(p.id).catch(()=>[]);
  let intro=null;if(p.intro_video_path)intro=await signed('profile-videos',p.intro_video_path);
  let insta=[];try{const {data}=await chemistrySb.rpc('instagram_carousel',{p_target:p.id});insta=Array.isArray(data)?data:[]}catch(_e){}
  const age=cAge(p.birthdate||p.birth_date);
  body.innerHTML=`<div class="vera-review-head"><span class="pill ok">MATCH PROFILE</span><h2>${cEsc(p.display_name)}${age?`, ${age}`:''}</h2><p class="muted">${cEsc(p.occupation||'')}${p.city?` · ${cEsc(p.city)}`:''}</p></div>
    ${photos.length?`<div class="vera-review-gallery">${photos.map((u,i)=>`<img src="${cEsc(u)}" alt="${cEsc(p.display_name)} profile photo ${i+1}">`).join('')}</div>`:''}
    <div class="panel vera-review-copy"><p>${cEsc(p.bio||'')}</p><div class="tags">${(p.interests||[]).map(x=>`<span class="tag">${cEsc(x)}</span>`).join('')}</div><div class="prompt"><small>Looking for</small><strong>${cEsc(p.relationship_intent||'Not specified')}</strong></div></div>
    ${intro?`<div class="panel"><span class="pill">PROFILE VIDEO</span><video class="vera-review-video" src="${cEsc(intro)}" controls playsinline preload="metadata"></video></div>`:''}
    ${insta.length?`<div class="panel"><div class="section-title" style="margin-top:0"><div><span class="pill">INSTAGRAM</span><h3 style="margin:7px 0 0">Recent photos</h3></div><span class="muted">Connected</span></div><div class="vera-ig-carousel">${insta.map(x=>`<a href="${cEsc(x.permalink||'#')}" ${x.permalink?'target="_blank" rel="noopener"':''}><img src="${cEsc(x.thumbnail_url||x.media_url||'')}" alt="Instagram photo"></a>`).join('')}</div></div>`:''}
    <div class="notice ok">Your Chemistry answer is still waiting behind this screen. Close this profile when you are ready to finish it.</div>`;
  modal.classList.add('vera-review-open');
  modal.classList.remove('hidden');
}

async function decorateChemistry(){
  const body=document.getElementById('matchModalBody');if(!body||document.getElementById('chemistryContextTools'))return;
  const isChem=!!document.getElementById('chemAnswer')||/Waiting on/i.test(body.textContent||'');
  if(!isChem)return;
  const ctx=await ensureContext().catch(()=>null);if(!ctx)return;
  const tools=document.createElement('div');tools.id='chemistryContextTools';tools.className='vera-chemistry-tools';
  tools.innerHTML=`<button class="btn vera-profile-revisit" id="chemistryViewProfile">👀 View ${cEsc(ctx.other.display_name)}’s profile again</button><div id="chemistryDeadline" class="vera-deadline"></div>`;
  const field=document.getElementById('chemAnswer')?.closest('.field');
  if(field)field.insertAdjacentElement('beforebegin',tools);else body.insertAdjacentElement('afterbegin',tools);
  document.getElementById('chemistryViewProfile').onclick=()=>openChemistryProfile().catch(e=>alert(e.message||'Could not open profile.'));
  clearInterval(chemistryClock);paintCountdown();chemistryClock=setInterval(paintCountdown,30000);
}

async function decorateMatchRows(){
  const root=document.getElementById('matchesList');if(!root)return;
  const rows=await activeRows().catch(()=>[]);
  root.querySelectorAll('[data-match]').forEach(el=>{
    const i=Number(el.dataset.match);const m=rows[i];if(!m||!m.expires_at||el.querySelector('.vera-match-expiry'))return;
    const left=timeLeft(m.expires_at);if(!left||left.expired)return;
    const chip=document.createElement('span');chip.className=`vera-match-expiry ${left.soon?'soon':''}`;chip.textContent=left.text;const grow=el.querySelector('.grow');if(grow)grow.appendChild(chip);
  });
}

document.addEventListener('click',e=>{
  const row=e.target.closest?.('[data-match]');if(row){chemistryContext=null;resolveByIndex(Number(row.dataset.match)).catch(()=>{})}
  if(e.target.closest?.('#openNewMatch')){chemistryContext=null;setTimeout(()=>resolveByTitle().then(()=>decorateChemistry()).catch(()=>{}),180)}
  if(e.target.closest?.('[data-close="profileModal"]'))document.getElementById('profileModal')?.classList.remove('vera-review-open');
});

window.addEventListener('load',()=>{
  const matchBody=document.getElementById('matchModalBody');if(matchBody)new MutationObserver(()=>setTimeout(()=>decorateChemistry().catch(()=>{}),20)).observe(matchBody,{childList:true,subtree:true});
  const matches=document.getElementById('matchesList');if(matches)new MutationObserver(()=>setTimeout(()=>decorateMatchRows().catch(()=>{}),40)).observe(matches,{childList:true,subtree:true});
});
