// Restores the polished VERAMOR preview after the admin/demo feature upgrades.
(function(){
  if(typeof demos==='undefined'||!Array.isArray(demos)||typeof render!=='function')return;

  function sheet(version,name){
    const root='https://res.cloudinary.com/hxnwueko/image/upload/';
    const id='/v'+version+'/veramor/original-demo-v3/'+name+'-sheet.png';
    return [
      root+'c_crop,g_north_west,h_701,w_561,x_0,y_0/f_auto/q_auto'+id,
      root+'c_crop,g_north_west,h_701,w_561,x_561,y_0/f_auto/q_auto'+id,
      root+'c_crop,g_north_west,h_701,w_561,x_0,y_701/f_auto/q_auto'+id,
      root+'c_crop,g_north_west,h_701,w_561,x_561,y_701/f_auto/q_auto'+id
    ];
  }

  // The six original demo people now use four genuinely different, clean images
  // from their own same-person contact sheets instead of video-frame snapshots.
  const clean={
    a:sheet(1789021971,'amina'),
    m:sheet(1789021974,'maya'),
    n:sheet(1789021976,'nia'),
    mar:sheet(1789021980,'marcus'),
    j:sheet(1789021983,'jordan'),
    and:sheet(1789021986,'andre')
  };
  demos.forEach(function(p){
    if(clean[p.id]){
      p.photos=clean[p.id].slice();
      p.photo=p.photos[0];
      p.video=''; // demo/bot verification media stays private; it is not a dating-profile tile
    } else if(p.demo){
      p.video='';
    }
  });

  function usedLikes(){
    try{
      const row=JSON.parse(localStorage.getItem('veramor_admin_demo_likes_v2')||'{}');
      const day=new Date().toISOString().slice(0,10);
      return row.day===day?Math.max(0,Number(row.count)||0):0;
    }catch(_){return 0}
  }

  const previousRender=render;
  render=function(){
    const used=usedLikes();
    if(mode==='single'||used>=10)return previousRender();
    if(!deck.length){$('#deck').innerHTML='<div class="panel section">No profiles in this filter.</div>';return}
    if(idx>=deck.length)idx=0;

    const count=mode==='duo'?2:3,arr=[];
    for(let i=0;i<count;i++)arr.push(deck[(idx+i)%deck.length]);
    const label=mode==='duo'?'2 Man':'Trio';
    const cards=arr.map(function(p,k){
      const src=(p.photos&&p.photos[0])||p.photo||'';
      const meta=[p.job,p.city].filter(Boolean).join(' · ');
      const initial=esc(String(p.name||'?').charAt(0).toUpperCase());
      return '<button class="premium-person" onclick="breakout('+k+')" aria-label="Open '+esc(p.name)+' one-on-one profile">'+
        '<div class="premium-person-media" data-initial="'+initial+'">'+
          '<span class="premium-person-initial">'+initial+'</span>'+
          (src?'<img src="'+esc(src)+'" alt="'+esc(p.name)+'" onerror="this.onerror=null;this.style.display=\'none\';this.parentNode.classList.add(\'media-missing\')">':'')+
          '<span class="premium-one-on-one">♡</span>'+
          '<div class="premium-person-copy"><b>'+esc(p.name)+(p.age?', '+esc(p.age):'')+'</b><span>'+esc(meta||'View profile')+'</span></div>'+
        '</div></button>';
    }).join('');

    $('#deck').innerHTML=
      '<div class="progress"><span><b>'+label+'</b> discovery</span><span>'+used+'/10 free likes used</span></div>'+
      '<section class="premium-group-shell">'+
        '<div class="premium-group-head"><div><small>VERAMOR GROUP MODE</small><h3>Choose who catches your eye.</h3><p>Browse together, like the group, or tap any person to break out into a normal 1-on-1 profile.</p></div><span class="premium-group-pill">'+count+' PEOPLE</span></div>'+
        '<div class="premium-group-grid '+(count===2?'two':'three')+'">'+cards+'</div>'+
        '<div class="premium-group-note"><span>↗</span><div><strong>Want one person for yourself?</strong> Tap their card. VERAMOR instantly switches to their full 1-on-1 dating profile.</div></div>'+
        '<div class="premium-group-actions"><button class="btn" onclick="nextGroup()">✕ Pass</button><button class="btn primary" onclick="groupLike()">♥ Like group</button><button class="btn super" onclick="groupLike()">★ Super</button></div>'+
      '</section>';
  };

  // Replace the developer-looking broken-image icon with an intentional fallback.
  document.addEventListener('error',function(e){
    const img=e.target;
    if(!(img instanceof HTMLImageElement)||!img.closest('#preview'))return;
    const box=img.parentElement;
    img.style.display='none';
    if(box)box.classList.add('media-missing');
  },true);

  buildDeck();
})();
