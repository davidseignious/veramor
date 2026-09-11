function installMatchFeaturePreview(){
  const body=document.getElementById('matchModalBody');if(!body)return;
  const chemistry=!!document.getElementById('chemAnswer')||/Waiting on/i.test(body.textContent||'');
  if(chemistry&&!document.getElementById('lockedMatchFeatures')){
    const strip=document.createElement('div');strip.id='lockedMatchFeatures';strip.className='friend-feature-strip locked';
    strip.innerHTML='<button class="btn" disabled>📞 Voice</button><button class="btn" disabled>🎥 Video</button><button class="btn" disabled>📍 Plan a Date</button><small>These unlock after both Chemistry Checks are complete.</small>';
    const tools=document.getElementById('chemistryContextTools');if(tools)tools.insertAdjacentElement('afterend',strip);else body.insertAdjacentElement('afterbegin',strip);
  }
  if(!chemistry)document.getElementById('lockedMatchFeatures')?.remove();
}
function enforcePromptCopy(){
  const panel=document.getElementById('promptEditorPanel');if(!panel)return;
  const title=panel.querySelector('h3');if(title)title.textContent='Answer 3 prompts';
  const intro=panel.querySelector('p.muted');if(intro)intro.textContent='Three completed prompts are required before your profile can enter discovery. Answers can be text, voice, or short video.';
  const pill=panel.querySelector('.pill');if(pill)pill.textContent='PROMPTS · REQUIRED';
}
function bootFeaturePreview(){
  const body=document.getElementById('matchModalBody');if(body)new MutationObserver(()=>setTimeout(installMatchFeaturePreview,35)).observe(body,{childList:true,subtree:true});
  const onboarding=document.getElementById('onboardingScreen');if(onboarding)new MutationObserver(()=>setTimeout(enforcePromptCopy,25)).observe(onboarding,{childList:true,subtree:true});
  installMatchFeaturePreview();enforcePromptCopy();setTimeout(enforcePromptCopy,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootFeaturePreview,{once:true});else bootFeaturePreview();
