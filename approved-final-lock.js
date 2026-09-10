// Final DOM lock to the exact approved VERAMOR Discover composition.
(function(){
  function lock(){
    const preview=document.getElementById('preview');
    if(!preview||!preview.querySelector('.approved-app-shell'))return;
    const h=preview.querySelector('.approved-page-head h2');if(h)h.textContent='People worth meeting';
    const sub=preview.querySelector('.approved-page-head p');if(sub)sub.remove();
    const city=preview.querySelector('.approved-city');if(city&&!city.querySelector('.approved-chevron'))city.insertAdjacentHTML('beforeend','<span class="approved-chevron">⌄</span>');
    const modes=preview.querySelectorAll('#mode [data-m]');
    if(modes[0])modes[0].innerHTML='<b>Solo</b><small>1-on-1 dating</small>';
    if(modes[1])modes[1].innerHTML='<b>2 Man</b><small>Bring 1 friend</small>';
    if(modes[2])modes[2].innerHTML='<b>Trio</b><small>Bring 2 friends</small>';
    const top=preview.querySelector('.approved-top-controls');
    const gender=preview.querySelector('#gender');
    if(top&&gender&&!preview.querySelector('#approvedFilterBtn')){
      const b=document.createElement('button');b.id='approvedFilterBtn';b.className='approved-filter-trigger';b.type='button';b.setAttribute('aria-label','Discovery preferences');b.textContent='☷';
      top.appendChild(b);
      gender.classList.add('approved-filter-popover');
      gender.insertAdjacentHTML('afterbegin','<div class="approved-filter-title"><span>DISCOVERY</span><b>Who do you want to see?</b></div>');
      b.onclick=function(e){e.stopPropagation();gender.classList.toggle('open')};
      gender.addEventListener('click',function(e){e.stopPropagation();const q=e.target.closest('[data-g]');if(q)setTimeout(()=>gender.classList.remove('open'),80)});
      document.addEventListener('click',function(){gender.classList.remove('open')});
    }
    const trust=preview.querySelector('.approved-trust-banner');
    if(trust){trust.innerHTML='<span class="approved-shield">✓</span><b>Admin simulation pool.</b><span>Demo profiles are synthetic, clearly labeled, and never contact real users.</span>'}
  }
  lock();
  const btn=document.getElementById('previewBtn');if(btn)btn.addEventListener('click',()=>setTimeout(lock,0));
})();
