import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const igSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
const IG_ENDPOINT='https://rfcoworvfqcqallgpozn.supabase.co/functions/v1/instagram-connect';
let igStatus=null;

const iEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function igSession(){const {data:{session}}=await igSb.auth.getSession();return session||null}
async function igCall(action){
  const session=await igSession();if(!session?.access_token)throw new Error('Log in to connect Instagram.');
  const r=await fetch(IG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({action})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Instagram is unavailable.');return data;
}
function igPanel(){
  const host=document.getElementById('myProfile');if(!host)return null;
  let p=document.getElementById('instagramPanel');
  if(!p){p=document.createElement('div');p.id='instagramPanel';p.className='panel hidden';p.style.marginTop='12px';host.appendChild(p)}
  return p;
}
async function loadCarousel(){
  const session=await igSession();if(!session?.user)return [];
  const {data,error}=await igSb.rpc('instagram_carousel',{p_target:session.user.id});if(error)throw error;return Array.isArray(data)?data:[];
}
function renderPanel(media=[]){
  const p=igPanel();if(!p||!igStatus?.configured){if(p)p.classList.add('hidden');return}
  p.classList.remove('hidden');
  if(!igStatus.connected){
    p.innerHTML='<div class="section-title" style="margin-top:0"><div><span class="pill">INSTAGRAM</span><h3 style="margin:7px 0 0">Add your photo carousel</h3></div><span class="muted">Optional</span></div><p class="muted">Connect an eligible Instagram professional account to show selected recent photos on your VERAMOR profile.</p><button class="btn full" id="igConnect">Connect Instagram</button><div id="igMsg"></div>';
    document.getElementById('igConnect').onclick=connectInstagram;return;
  }
  p.innerHTML=`<div class="section-title" style="margin-top:0"><div><span class="pill ok">INSTAGRAM CONNECTED</span><h3 style="margin:7px 0 0">@${iEsc(igStatus.username||'instagram')}</h3></div><span class="muted">${iEsc(igStatus.account_type||'')}</span></div>
    <p class="muted">Recent Instagram photos can appear as an optional carousel on your VERAMOR profile. Disconnecting removes them from VERAMOR.</p>
    ${media.length?`<div class="vera-ig-carousel">${media.map(x=>`<a href="${iEsc(x.permalink||'#')}" ${x.permalink?'target="_blank" rel="noopener"':''}><img src="${iEsc(x.thumbnail_url||x.media_url||'')}" alt="Instagram photo"></a>`).join('')}</div>`:'<div class="notice">No eligible Instagram photos are synced yet.</div>'}
    <div class="actions" style="margin-top:12px"><button class="btn" id="igSync">Refresh Instagram photos</button><button class="btn danger" id="igDisconnect">Disconnect</button></div><div id="igMsg"></div>`;
  document.getElementById('igSync').onclick=syncInstagram;document.getElementById('igDisconnect').onclick=disconnectInstagram;
}
function msg(text,type=''){const el=document.getElementById('igMsg');if(el)el.innerHTML=text?`<div class="notice ${type}">${iEsc(text)}</div>`:''}
async function refreshInstagram(){
  const session=await igSession();if(!session?.user)return;
  try{igStatus=await igCall('status');if(!igStatus.configured){renderPanel([]);return}const media=igStatus.connected?await loadCarousel().catch(()=>[]):[];renderPanel(media)}catch(_e){const p=igPanel();if(p)p.classList.add('hidden')}
}
async function connectInstagram(){const b=document.getElementById('igConnect');if(b){b.disabled=true;b.textContent='Opening Instagram…'}try{const d=await igCall('connect');if(!d.url)throw new Error('Instagram connection could not start.');location.href=d.url}catch(e){msg(e.message||'Could not connect Instagram.','bad');if(b){b.disabled=false;b.textContent='Connect Instagram'}}}
async function syncInstagram(){const b=document.getElementById('igSync');b.disabled=true;b.textContent='Syncing…';try{const d=await igCall('sync');msg(`Instagram refreshed${d.media_count!=null?` · ${d.media_count} photos found`:''}.`,'ok');await refreshInstagram()}catch(e){msg(e.message||'Could not refresh Instagram.','bad')}finally{b.disabled=false;b.textContent='Refresh Instagram photos'}}
async function disconnectInstagram(){if(!confirm('Disconnect Instagram from VERAMOR? The Instagram carousel will stop showing.'))return;const b=document.getElementById('igDisconnect');b.disabled=true;b.textContent='Disconnecting…';try{await igCall('disconnect');igStatus={configured:true,connected:false};renderPanel([])}catch(e){msg(e.message||'Could not disconnect Instagram.','bad');b.disabled=false;b.textContent='Disconnect'}}

function watchProfile(){const host=document.getElementById('myProfile');if(!host)return;new MutationObserver(()=>setTimeout(()=>refreshInstagram().catch(()=>{}),50)).observe(host,{childList:true,subtree:false})}
function handleReturn(){const q=new URLSearchParams(location.search);const state=q.get('instagram');if(!state)return;if(state==='connected')setTimeout(()=>refreshInstagram().then(()=>{const p=igPanel();if(p){p.classList.remove('hidden');p.scrollIntoView({behavior:'smooth',block:'center'})}}),250);else if(state==='error'){setTimeout(()=>{refreshInstagram().catch(()=>{});const p=igPanel();if(p&&!p.classList.contains('hidden')){const m=q.get('instagram_message')||'Instagram connection failed.';setTimeout(()=>msg(m,'bad'),50)}},250)}q.delete('instagram');q.delete('instagram_message');const next=q.toString()?`${location.pathname}?${q}`:location.pathname;history.replaceState({},'',next+location.hash)}

window.addEventListener('load',()=>{watchProfile();handleReturn();refreshInstagram().catch(()=>{})});
igSb.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')refreshInstagram().catch(()=>{});if(event==='SIGNED_OUT'){const p=igPanel();if(p)p.classList.add('hidden')}});
