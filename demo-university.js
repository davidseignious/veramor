// University Mode for the VERAMOR owner simulation. All profiles remain clearly marked AI DEMO.
(function(){
  if(typeof demos==='undefined'||!Array.isArray(demos)||typeof buildDeck!=='function')return;

  const campusById={
    a:'uic.edu',m:'depaul.edu',n:'uchicago.edu',zara:'luc.edu',camille:'uic.edu',sofia:'depaul.edu',imani:'uic.edu',elena:'northwestern.edu',
    mar:'uic.edu',j:'depaul.edu',and:'uchicago.edu',malik:'uic.edu',evan:'luc.edu',luis:'depaul.edu',theo:'uic.edu',devin:'northwestern.edu'
  };
  demos.forEach(function(p){if(campusById[p.id]){p.university=campusById[p.id];p.university_verified=true}});

  const gender=document.getElementById('gender');
  if(gender&&!gender.querySelector('[data-g="university"]')){
    const b=document.createElement('button');b.className='btn';b.dataset.g='university';b.textContent='🎓 University';gender.appendChild(b);
  }

  filtered=function(){
    let all=live.concat(demos);
    if(g==='men')all=all.filter(function(p){const x=String(p.gender||'').toLowerCase();return x==='man'||x==='male'});
    else if(g==='women')all=all.filter(function(p){const x=String(p.gender||'').toLowerCase();return x==='woman'||x==='female'});
    else if(g==='university')all=all.filter(function(p){return !!(p.university||p.university_name||p.university_verified)});
    return all;
  };

  function current(){return deck&&deck[idx]||null}
  function addCardBadge(){
    if(g!=='university')return;
    const p=current(),body=document.querySelector('#deck .body');
    if(!p||!body||body.querySelector('.demo-campus-badge'))return;
    const badge=document.createElement('div');badge.className='demo-campus-badge';badge.textContent='🎓 Verified campus demo · '+(p.university||p.university_name||'.edu');
    const bio=body.querySelector('.bio');if(bio)bio.insertAdjacentElement('beforebegin',badge);else body.prepend(badge);
  }
  function addFullBadge(){
    if(g!=='university')return;
    const p=current(),full=document.getElementById('full');
    if(!p||!full||full.querySelector('.demo-campus-banner'))return;
    const box=document.createElement('div');box.className='demo-campus-banner';box.innerHTML='<strong>🎓 University Mode</strong><small>Simulated institutional-email verification · '+esc(p.university||p.university_name||'.edu')+'</small>';
    full.prepend(box);
  }
  const deckEl=document.getElementById('deck');if(deckEl)new MutationObserver(addCardBadge).observe(deckEl,{childList:true,subtree:true});
  const fullEl=document.getElementById('full');if(fullEl)new MutationObserver(addFullBadge).observe(fullEl,{childList:true,subtree:true});

  if(gender){
    gender.addEventListener('click',function(e){
      const b=e.target.closest('[data-g="university"]');if(!b)return;
      setTimeout(function(){
        const d=document.getElementById('deck');
        if(d&&!d.querySelector('.demo-campus-banner-top')){
          const note=document.createElement('div');note.className='demo-campus-banner demo-campus-banner-top';note.innerHTML='<strong>🎓 University Mode preview</strong><small>Shows only simulated profiles with verified .edu campus status. 1-on-1, 2 Man, and Trio modes still work inside this pool.</small>';
          d.prepend(note);
        }
        addCardBadge();
      },0);
    });
  }
  buildDeck();
})();
