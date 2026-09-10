// Mobile navigation from the approved VERAMOR build.
(function(){
  const preview=document.getElementById('preview');
  if(!preview||preview.querySelector('#approvedBottomNav'))return;
  const nav=document.createElement('nav');
  nav.className='approved-bottom-nav';
  nav.id='approvedBottomNav';
  nav.innerHTML='<button class="active" data-mobile-go="discover"><span>✦</span><small>Discover</small></button><button data-mobile-go="matches"><span>♡</span><small>Matches</small></button><button data-mobile-go="profile"><span>◉</span><small>Profile</small></button><button data-mobile-go="rewards"><span>🎁</span><small>Rewards</small></button>';
  preview.appendChild(nav);
  nav.addEventListener('click',function(e){
    const b=e.target.closest('[data-mobile-go]');if(!b)return;
    nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
    const dest=b.dataset.mobileGo;
    if(dest==='discover'){const side=document.querySelector('[data-approved-nav="discover"]');if(side)side.click();return}
    if(dest==='matches'){const side=document.querySelector('[data-approved-nav="matches"]');if(side)side.click();return}
    if(dest==='profile'){const side=document.querySelector('[data-approved-nav="profile"]');if(side)side.click();return}
    const side=document.querySelector('[data-approved-nav="upgrade"]');if(side)side.click();
  });
})();
