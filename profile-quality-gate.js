// VERAMOR hard profile quality gate.
(function(){
  if(typeof demos==='undefined'||!Array.isArray(demos))return;
  const MIN_PROMPTS=3,MIN_PHOTOS=4,MIN_SHORT_SIDE=1080,MIN_ANSWER_CHARS=12;
  const APPROVED_DEMO_IDS=new Set(['a','m','n','mar','j','and']);
  const BLOCKED_HOSTS=['randomuser.me','images.unsplash.com'];

  function promptParts(p){if(Array.isArray(p))return[p[0],p[1]];if(p&&typeof p==='object')return[p.q||p.question,p.a||p.answer];return['','']}
  function validPrompts(profile){return(Array.isArray(profile.prompts)?profile.prompts:[]).filter(function(row){const x=promptParts(row);return String(x[0]||'').trim().length>=5&&String(x[1]||'').trim().length>=MIN_ANSWER_CHARS})}
  function photoUrl(photo){return typeof photo==='string'?photo:(photo&&photo.url)||''}
  function photos(profile){const a=Array.isArray(profile.photos)?profile.photos.map(photoUrl).filter(Boolean):[];if(!a.length&&profile.photo)a.push(photoUrl(profile.photo));return a}
  function upgradeApprovedCloudinary(url){
    if(!url||url.indexOf('res.cloudinary.com/hxnwueko/image/upload/')<0)return url;
    if(url.indexOf('/c_fill,w_1080,h_1350')>=0)return url;
    if(url.indexOf('/f_auto/q_auto/')>=0)return url.replace('/f_auto/q_auto/','/c_fill,w_1080,h_1350,g_auto/f_auto/q_auto:best/');
    return url.replace('/image/upload/','/image/upload/c_fill,w_1080,h_1350,g_auto/f_auto/q_auto:best/');
  }
  function isBlockedHost(url){try{const h=new URL(url,location.href).hostname.toLowerCase();return BLOCKED_HOSTS.some(function(x){return h===x||h.endsWith('.'+x)})}catch(_){return true}}
  function urlLooks1080(url){return !!url&&(/c_fill,w_1080,h_1350/.test(url)||/[?&,/_-](?:w|width|h|height)_?=?1[0-9]{3}/i.test(url))}

  demos.forEach(function(profile){
    if(!APPROVED_DEMO_IDS.has(String(profile.id)))return;
    const upgraded=photos(profile).slice(0,4).map(upgradeApprovedCloudinary);
    if(upgraded.length>=4){profile.photos=upgraded;profile.photo=upgraded[0];profile.photoQuality={approved:true,samePerson:true,minShortSide:MIN_SHORT_SIDE,delivery:'1080x1350'}}
  });

  function validate(profile){
    const reasons=[],ps=validPrompts(profile),pics=photos(profile),unique=new Set(pics);
    const demoApproved=profile.demo&&APPROVED_DEMO_IDS.has(String(profile.id));
    const manualApproved=!!(profile.photoQuality&&profile.photoQuality.approved===true&&profile.photoQuality.samePerson===true);
    if(ps.length<MIN_PROMPTS)reasons.push('Needs at least 3 completed prompts');
    if(pics.length<MIN_PHOTOS)reasons.push('Needs at least 4 photos');
    if(unique.size<MIN_PHOTOS)reasons.push('Needs 4 different photos');
    if(pics.some(isBlockedHost))reasons.push('Contains low-quality or filler photo source');
    if(!(demoApproved||manualApproved))reasons.push('Same-person photo set is not approved');
    if(pics.length>=MIN_PHOTOS&&pics.slice(0,MIN_PHOTOS).some(function(u){return !urlLooks1080(u)}))reasons.push('Photo delivery is below the 1080 quality floor');
    ['name','age','gender','height','city','job','religion','intent','bio'].forEach(function(k){if(profile[k]===undefined||profile[k]===null||String(profile[k]).trim()==='')reasons.push('Missing '+k)});
    profile.qualityGate={approved:reasons.length===0,reasons:reasons,validPromptCount:ps.length,photoCount:pics.length,uniquePhotoCount:unique.size,minShortSide:MIN_SHORT_SIDE};
    return profile.qualityGate;
  }
  function isEligible(profile){return validate(profile).approved}
  const baseFiltered=typeof filtered==='function'?filtered:null;
  if(baseFiltered)filtered=function(){return baseFiltered().filter(isEligible)};
  function counts(){const total=demos.length,approved=demos.filter(isEligible).length;return{total:total,approved:approved,blocked:total-approved}}
  function addQualityBanner(){
    const host=document.querySelector('.approved-main');if(!host)return;const c=counts();let b=document.getElementById('profileQualityGateBanner');
    const html='<b>PROFILE QUALITY GATE ON</b><span>'+c.approved+' of '+c.total+' demo profiles pass · '+c.blocked+' blocked until they have 4 same-person 1080 photos and 3 completed prompts.</span>';
    if(b){b.innerHTML=html;return}b=document.createElement('div');b.id='profileQualityGateBanner';b.className='profile-quality-gate-banner';b.innerHTML=html;const controls=host.querySelector('.approved-controls-row');if(controls)controls.insertAdjacentElement('beforebegin',b);else host.prepend(b)
  }
  function addQualityChip(){const p=deck&&deck[idx];if(!p||!isEligible(p))return;const row=document.querySelector('#deck .profile-top-badges');if(row&&!row.querySelector('.quality-1080-chip')){const chip=document.createElement('span');chip.className='media-chip quality-1080-chip';chip.textContent='1080 QUALITY · 3+ PROMPTS';row.appendChild(chip)}}
  const style=document.createElement('style');style.textContent='.profile-quality-gate-banner{margin:0 0 16px;padding:13px 16px;border:1px solid rgba(247,154,185,.28);border-radius:14px;background:rgba(247,154,185,.07);display:flex;gap:12px;align-items:center;flex-wrap:wrap}.profile-quality-gate-banner b{font-size:11px;letter-spacing:.12em;color:#f79ab9}.profile-quality-gate-banner span{font-size:13px;color:rgba(255,255,255,.72)}.premium-profile-media img,.group-person-photo img{image-rendering:auto;object-fit:cover}';document.head.appendChild(style);
  window.VERAMOR_PROFILE_QUALITY_RULES={minPrompts:MIN_PROMPTS,minPhotos:MIN_PHOTOS,minShortSide:MIN_SHORT_SIDE,validate:validate,isEligible:isEligible,counts:counts};
  const deckEl=document.getElementById('deck');if(deckEl)new MutationObserver(function(){setTimeout(function(){addQualityBanner();addQualityChip()},0)}).observe(deckEl,{childList:true,subtree:true});
  if(typeof buildDeck==='function')buildDeck();setTimeout(function(){addQualityBanner();addQualityChip()},0);
})();
