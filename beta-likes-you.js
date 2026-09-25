import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const likesSb=createClient('https://rfcoworvfqcqallgpozn.supabase.co','sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}});
const lEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const age=p=>{const x=p.birthdate||p.birth_date;if(!x)return '';const d=new Date(x+'T00:00:00'),n=new Date();let a=n.getFullYear()-d.getFullYear();if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;return a>=18?a:''};
async function avatar(p){if(p.avatar_path){const {data}=await likesSb.storage.from('profile-media').createSignedUrl(p.avatar_path,900);if(data?.signedUrl)return data.signedUrl}return p.avatar_url||''}
function install(){
  const view=document.getElementById('matchesView');if(!view||document.getElementById('likesYouPanel'))return;
  const title=view.querySelector('.section-title');const p=document.createElement('div');p.id='likesYouPanel';p.className='panel vera-likes-panel';
  p.innerHTML='<div class="section-title" style="margin:0"><div><span class="pill">LIKES YOU</span><h3 style="margin:7px 0 0">People already interested</h3></div><button class="btn" id="openLikesYou">View</button></div><div id="likesYouPreview" class="muted" style="margin-top:8px">Checking…</div><div id="likesYouList" class="vera-likes-grid hidden"></div>';
  title?.insertAdjacentElement('afterend',p);document.getElementById('openLikesYou').onclick=()=>{document.getElementById('likesYouList').classList.toggle('hidden');loadLikes().catch(()=>{})};loadLikes().catch(()=>{});
}
async function loadLikes(){
  const preview=document.getElementById('likesYouPreview'),root=document.getElementById('likesYouList');if(!preview||!root)return;
  const {data,error}=await likesSb.rpc('get_likes_you');if(error)throw error;const rows=data||[];preview.textContent=rows.length?rows.length+' profile'+(rows.length===1?'':'s')+' liked you.':'No new likes waiting right now.';
  root.innerHTML='';
  for(const row of rows){const p=row.profile||{},img=await avatar(p),card=document.createElement('article');card.className='vera-like-card';
    card.innerHTML='<div class="vera-like-media">'+(img?'<img src="'+lEsc(img)+'" alt="'+lEsc(p.display_name||'Profile')+'">':'<div class="vera-like-placeholder">♥</div>')+'</div><div><strong>'+lEsc(p.display_name||'VERAMOR member')+(age(p)?', '+age(p):'')+'</strong><small>'+lEsc(p.city||'')+'</small><button class="btn primary full" data-like-back="'+lEsc(p.id)+'">Like back</button></div>';
    root.appendChild(card);
  }
  root.querySelectorAll('[data-like-back]').forEach(b=>b.onclick=async()=>{b.disabled=true;b.textContent='Matching…';const {error}=await likesSb.rpc('like_profile',{target_user:b.dataset.likeBack});if(error){b.disabled=false;b.textContent='Like back';alert(error.message);return}b.closest('.vera-like-card')?.remove();document.getElementById('refreshMatches')?.click();loadLikes().catch(()=>{})});
}
function boot(){install();const m=document.querySelector('#bottomNav button[data-view="matchesView"]');m?.addEventListener('click',()=>setTimeout(()=>loadLikes().catch(()=>{}),80))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
likesSb.auth.onAuthStateChange(e=>{if(e==='SIGNED_IN'||e==='TOKEN_REFRESHED')setTimeout(boot,80)});
