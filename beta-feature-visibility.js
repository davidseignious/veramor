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
function bootFeaturePreview(){const body=document.getElementById('matchModalBody');if(!body)return;new MutationObserver(()=>setTimeout(installMatchFeaturePreview,35)).observe(body,{childList:true,subtree:true});installMatchFeaturePreview()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootFeaturePreview,{once:true});else bootFeaturePreview();
