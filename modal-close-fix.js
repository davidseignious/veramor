(function(){
  function closeModalElement(modal){
    if(!modal)return;
    modal.classList.remove('on');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    if(modal.id==='matchModal'){
      try{if(typeof timer!=='undefined'&&timer)clearInterval(timer)}catch(_e){}
      try{if(typeof chatTimer!=='undefined'&&chatTimer)clearInterval(chatTimer)}catch(_e){}
    }
  }

  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-close],.modal .close,.modal .x');
    if(btn){
      var id=btn.getAttribute('data-close');
      var modal=id?document.getElementById(id):btn.closest('.modal');
      closeModalElement(modal);
      return;
    }
    var modal=e.target.classList&&e.target.classList.contains('modal')?e.target:null;
    if(modal)closeModalElement(modal);
  },true);

  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var open=Array.from(document.querySelectorAll('.modal')).reverse().find(function(m){
      return m.classList.contains('on')||!m.classList.contains('hidden');
    });
    if(open)closeModalElement(open);
  });
})();
