// Final signup guard: the Friend Beta account creator must not bypass the legal/safety acknowledgements.
(function(){
  const TERMS_VERSION='2026-09-11.1';
  const PRIVACY_VERSION='2026-09-11.1';
  const SAFETY_VERSION='2026-09-11.1';

  function isSignup(){
    const age=document.getElementById('ageRow');
    return !!age&&!age.classList.contains('hidden');
  }
  function show(text){
    const host=document.getElementById('authMsg');
    if(!host)return alert(text);
    host.innerHTML='';
    const d=document.createElement('div');d.className='notice bad';d.textContent=text;host.appendChild(d);
  }
  document.addEventListener('submit',e=>{
    if(e.target?.id!=='authForm'||!isSignup())return;
    const ids=['termsConfirm','safetyConfirm','backgroundConfirm'];
    const boxes=ids.map(id=>document.getElementById(id));
    if(boxes.some(x=>!x)){
      e.preventDefault();e.stopImmediatePropagation();
      show('Signup safety checks did not finish loading. Refresh the page and try again.');
      return;
    }
    if(boxes.some(x=>!x.checked)){
      e.preventDefault();e.stopImmediatePropagation();
      show('Please accept the Terms, Privacy Notice, dating-safety notice, and background-screening disclosure to create an account.');
      return;
    }
    localStorage.setItem('veramor_pending_legal_acceptance',JSON.stringify({
      terms:TERMS_VERSION,
      privacy:PRIVACY_VERSION,
      safety:SAFETY_VERSION,
      background:true,
      accepted_at:new Date().toISOString()
    }));
  },true);
})();
