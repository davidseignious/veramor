// VERAMOR gesture interaction: drag reveals choices, but the gesture itself never records a dating preference.
// This intentionally keeps Connect / Skip / Signal as explicit taps rather than copying swipe-to-like behavior.
(function(){
  const CARD='.profile-card';
  const IGNORE='button,a,input,textarea,select,video,[role="button"],.swipe-actions';
  const THRESHOLD=72;
  const MAX_DRAG=104;

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}

  function enhance(card){
    if(!card||card.dataset.veraGesture==='1')return;
    card.dataset.veraGesture='1';
    card.classList.add('vera-gesture-card');

    const pass=card.querySelector('#passBtn');
    const connect=card.querySelector('#likeBtn');
    const signal=card.querySelector('#superBtn');
    const actions=card.querySelector('.swipe-actions');
    if(!pass||!connect||!signal||!actions)return;

    pass.textContent='Skip';
    pass.setAttribute('aria-label','Skip this profile');
    pass.classList.add('vera-skip-action');
    connect.textContent='Connect';
    connect.setAttribute('aria-label','Connect with this profile');
    connect.classList.add('vera-connect-action');
    signal.textContent='Signal';
    signal.setAttribute('aria-label','Send a stronger interest signal');
    signal.classList.add('vera-signal-action');

    if(!card.querySelector('.vera-gesture-hint')){
      const hint=document.createElement('div');
      hint.className='vera-gesture-hint';
      hint.innerHTML='<span>↔</span><strong>Slide to reveal choices</strong><small>Your preference is only sent when you tap Skip, Connect, or Signal.</small>';
      actions.insertAdjacentElement('beforebegin',hint);
    }

    const cue=document.createElement('div');
    cue.className='vera-gesture-cue';
    cue.innerHTML='<span>CHOOSE</span>';
    card.appendChild(cue);

    let active=false,dragging=false,startX=0,startY=0,lastX=0,pointerId=null;

    function reset(open=false,dir=0){
      active=false;dragging=false;pointerId=null;
      card.classList.remove('vera-dragging');
      card.classList.toggle('vera-actions-open',open);
      card.style.transform=open?`translateX(${dir*18}px) rotate(${dir*0.45}deg)`:'';
      cue.style.opacity='';
      cue.style.transform='';
    }

    card.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      if(e.target.closest(IGNORE))return;
      active=true;dragging=false;startX=e.clientX;startY=e.clientY;lastX=0;pointerId=e.pointerId;
    });

    card.addEventListener('pointermove',e=>{
      if(!active||e.pointerId!==pointerId)return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      if(!dragging){
        if(Math.abs(dy)>Math.abs(dx)+8){active=false;return}
        if(Math.abs(dx)<8)return;
        dragging=true;
        card.classList.add('vera-dragging');
        try{card.setPointerCapture(pointerId)}catch(_e){}
      }
      e.preventDefault();
      lastX=clamp(dx,-MAX_DRAG,MAX_DRAG);
      const pct=Math.min(1,Math.abs(lastX)/THRESHOLD);
      card.style.transform=`translateX(${lastX}px) rotate(${lastX/42}deg)`;
      cue.style.opacity=String(.15+.78*pct);
      cue.style.transform=`translateY(-50%) scale(${.92+.08*pct})`;
    });

    function finish(e){
      if(!active||e.pointerId!==pointerId)return;
      const open=dragging&&Math.abs(lastX)>=THRESHOLD;
      const dir=lastX<0?-1:1;
      try{card.releasePointerCapture(pointerId)}catch(_e){}
      reset(open,dir);
    }
    card.addEventListener('pointerup',finish);
    card.addEventListener('pointercancel',()=>reset(false,0));

    card.addEventListener('click',e=>{
      if(e.target.closest(IGNORE))return;
      if(card.classList.contains('vera-actions-open'))reset(false,0);
    });
  }

  function scan(){document.querySelectorAll(CARD).forEach(enhance)}
  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
})();