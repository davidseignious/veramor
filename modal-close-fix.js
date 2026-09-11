(function(){
  function cleanupModalState(modal){
    if(!modal)return;
    modal.classList.remove('on');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    modal.style.pointerEvents='none';
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    if(modal.id==='matchModal'){
      try{if(typeof timer!=='undefined'&&timer)clearInterval(timer)}catch(_e){}
      try{if(typeof chatTimer!=='undefined'&&chatTimer)clearInterval(chatTimer)}catch(_e){}
      try{if(typeof activeMatch!=='undefined')activeMatch=null}catch(_e){}
    }
    requestAnimationFrame(function(){
      if(!modal.classList.contains('on'))modal.style.pointerEvents='';
    });
  }

  window.VeraCloseModal=function(idOrEl){
    var modal=typeof idOrEl==='string'?document.getElementById(idOrEl):idOrEl;
    if(modal&&!modal.classList.contains('modal'))modal=modal.closest&&modal.closest('.modal');
    cleanupModalState(modal);
    return false;
  };

  function closeFromTarget(target){
    if(!target||!target.closest)return false;
    var btn=target.closest('[data-close],.modal .close,.modal .x');
    if(!btn)return false;
    var id=btn.getAttribute('data-close');
    var modal=id?document.getElementById(id):btn.closest('.modal');
    cleanupModalState(modal);
    return true;
  }

  function bindDirect(){
    document.querySelectorAll('[data-close],.modal .close,.modal .x').forEach(function(btn){
      btn.setAttribute('type','button');
      btn.style.pointerEvents='auto';
      btn.style.touchAction='manipulation';
      btn.style.position=btn.style.position||'relative';
      btn.style.zIndex='99999';
      btn.onclick=function(e){
        if(e){e.preventDefault();e.stopPropagation()}
        closeFromTarget(btn);
        return false;
      };
    });
  }

  ['pointerdown','touchstart','click'].forEach(function(type){
    document.addEventListener(type,function(e){
      if(closeFromTarget(e.target)){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        return;
      }
      if(type==='click'&&e.target&&e.target.classList&&e.target.classList.contains('modal')){
        cleanupModalState(e.target);
      }
    },true);
  });

  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var open=Array.from(document.querySelectorAll('.modal')).reverse().find(function(m){
      return m.classList.contains('on')||!m.classList.contains('hidden');
    });
    if(open){e.preventDefault();cleanupModalState(open)}
  },true);

  var observer=new MutationObserver(function(){bindDirect()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindDirect,{once:true});
  else bindDirect();
})();
