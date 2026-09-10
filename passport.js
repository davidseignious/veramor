const endpoint='https://rfcoworvfqcqallgpozn.supabase.co/functions/v1/profile-passport';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function load(){
  const token=new URLSearchParams(location.search).get('token')||'';
  if(!token)return fail('This Profile Passport link is incomplete.');
  try{
    const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get',token})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data?.profile)throw new Error(data.error||'This Profile Passport is unavailable.');
    render(data.profile);
  }catch(e){fail(e.message||'This Profile Passport is unavailable.')}
}
function render(p){
  const photos=Array.isArray(p.photos)?p.photos:[];
  const media=photos.length?`<div class="photo-grid">${photos.map((u,i)=>`<div class="photo"><img src="${esc(u)}" alt="${esc(p.display_name)} profile photo ${i+1}"></div>`).join('')}</div>`:'';
  const video=p.video?`<video src="${esc(p.video)}" controls playsinline style="width:100%;border-radius:16px;margin-top:12px"></video>`:'';
  $('#passportView').classList.remove('hero');
  $('#passportView').innerHTML=`<span class="pill ok">VERIFIED VERAMOR PROFILE</span><h1>${esc(p.display_name)}${p.age?`, ${esc(p.age)}`:''}</h1><p class="muted">${esc(p.occupation||'')}${p.city?` · ${esc(p.city)}`:''}</p>${media}<p>${esc(p.bio||'')}</p><div class="tags">${(p.interests||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div><div class="prompt"><small>Looking for</small><strong>${esc(p.relationship_intent||'Not specified')}</strong></div>${video}<div class="notice" style="margin-top:14px">Shared directly by this VERAMOR member. This link can be revoked at any time.</div>`;
  document.title=`${p.display_name} · VERAMOR`;
}
function fail(msg){$('#passportView').innerHTML=`<span class="pill warn">PROFILE PASSPORT</span><h1>Link unavailable</h1><p>${esc(msg)}</p><p class="muted">The link may have been revoked, the profile may be under review, or Profile Passport access may have ended.</p>`}
load();
