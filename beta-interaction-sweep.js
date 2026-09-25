(function(){
  const VIEWS=new Set(['discoverView','matchesView','profileView','settingsView']);
  const LOCAL_PAGES=new Set(['safety.html','privacy.html','terms.html','copyright.html','passport.html','index.html','beta.html','admin.html']);
  let repairing=false;

  function closeStrayOverlays(){
    document.querySelectorAll('.modal.hidden').forEach(m=>{
      m.style.pointerEvents='none';
      m.setAttribute('aria-hidden','true');
    });
  }

  function repairNav(){
    const nav=document.getElementById('bottomNav');if(!nav)return;
    nav.setAttribute('role','tablist');
    nav.style.pointerEvents='auto';
    nav.querySelectorAll('button[data-view]').forEach(b=>{
      b.type='button';
      b.style.pointerEvents='auto';
      b.style.touchAction='manipulation';
      b.setAttribute('role','tab');
      const id=b.dataset.view;
      b.setAttribute('aria-controls',id||'');
      b.setAttribute('aria-selected',b.classList.contains('on')?'true':'false');
    });
  }

  function switchView(id){
    if(!VIEWS.has(id))return;
    document.querySelectorAll('.modal:not(#veraLiveModal)').forEach(m=>{
      if(!m.classList.contains('hidden'))m.classList.add('hidden');
      m.style.pointerEvents='';
    });
    if(typeof window.VERAMOR_SHOW_VIEW==='function'){
      window.VERAMOR_SHOW_VIEW(id);
      return;
    }
    document.querySelectorAll('.appView').forEach(v=>v.classList.toggle('hidden',v.id!==id));
    document.querySelectorAll('#bottomNav button[data-view]').forEach(b=>{
      const on=b.dataset.view===id;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');
    });
    window.dispatchEvent(new CustomEvent('veramor:view-change',{detail:{view:id}}));
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function repairLinks(){
    document.querySelectorAll('a[href]').forEach(a=>{
      const raw=(a.getAttribute('href')||'').trim();
      if(!raw)return;
      if(a.target==='_blank'){
        const rel=new Set((a.rel||'').split(/\s+/).filter(Boolean));rel.add('noopener');rel.add('noreferrer');a.rel=[...rel].join(' ');
      }
      if(/^javascript:/i.test(raw)){a.removeAttribute('href');a.setAttribute('role','button');return}
      try{
        const u=new URL(raw,location.href);
        if(u.origin===location.origin){
          const page=u.pathname.split('/').pop()||'index.html';
          if(page&&page.includes('.')&&!LOCAL_PAGES.has(page)&&!page.match(/\.(svg|png|jpg|jpeg|webp|css|js|webmanifest)$/i)){
            console.warn('VERAMOR local link target should be checked:',raw);
          }
        }
      }catch(_e){}
    });
  }

  function repairButtons(){
    document.querySelectorAll('button:not([type])').forEach(b=>{
      if(b.id==='authSubmit'||b.closest('#authForm'))return;
      b.type='button';
    });
  }

  function repair(){
    if(repairing)return;repairing=true;
    try{repairNav();repairLinks();repairButtons();closeStrayOverlays()}finally{repairing=false}
  }

  document.addEventListener('click',e=>{
    const tab=e.target?.closest?.('#bottomNav button[data-view]');
    if(!tab)return;
    const id=tab.dataset.view;if(!VIEWS.has(id))return;
    switchView(id);
  },true);

  document.addEventListener('keydown',e=>{
    const tab=e.target?.closest?.('#bottomNav button[data-view]');
    if(!tab||!['Enter',' '].includes(e.key))return;
    e.preventDefault();switchView(tab.dataset.view);
  },true);

  window.addEventListener('veramor:view-change',()=>setTimeout(repair,0));
  const mo=new MutationObserver(()=>repair());
  mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','href','disabled']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',repair,{once:true});else repair();
  window.addEventListener('load',repair,{once:true});
})();