// VERAMOR approved admin preview shell.
// This intentionally preserves the approved dating-app visual language while keeping
// the newer admin simulation features (28 demos, 10-like cap, University Mode,
// 1-on-1 / 2 Man / Trio, Super Likes, galleries and match flow).
(function(){
  if(typeof demos==='undefined'||!Array.isArray(demos)||typeof buildDeck!=='function')return;

  const preview=document.getElementById('preview');
  if(!preview)return;

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

  // Use four truly different clean images for the original six demo people.
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
    }
    // Demo/bot verification media is private. It is not displayed as profile media.
    if(p.demo)p.video='';
  });

  const photoIndex={};
  const selectedGroup=new Set();

  function usedLikes(){
    try{
      const row=JSON.parse(localStorage.getItem('veramor_admin_demo_likes_v2')||'{}');
      const day=new Date().toISOString().slice(0,10);
      return row.day===day?Math.max(0,Number(row.count)||0):0;
    }catch(_){return 0}
  }
  function likesLeft(){return Math.max(0,10-usedLikes())}
  function pictures(p){
    const a=Array.isArray(p.photos)?p.photos.filter(Boolean):[];
    if(!a.length&&p.photo)a.push(p.photo);
    return a;
  }
  function initial(p){return esc(String(p&&p.name||'?').charAt(0).toUpperCase())}
  function updateLikesUI(){
    const n=likesLeft();
    const top=document.getElementById('approvedLikesLeft');if(top)top.textContent=n;
    const rail=document.getElementById('approvedRailLikes');if(rail)rail.textContent=n;
  }

  function buildShell(){
    preview.innerHTML=`
      <div class="approved-app-shell">
        <aside class="approved-rail">
          <div class="approved-brand"><strong>VERAMOR</strong><span>See love. Know it’s real.</span></div>
          <nav class="approved-side-nav">
            <button class="active" data-approved-nav="discover"><span>◉</span>Discover</button>
            <button data-approved-nav="matches"><span>♡</span>Matches <em>3</em></button>
            <button data-approved-nav="messages"><span>◌</span>Messages <em>2</em></button>
            <button data-approved-nav="profile"><span>♙</span>My profile</button>
            <button data-approved-nav="passport"><span>▤</span>Profile Passport <i>PLUS</i></button>
            <button data-approved-nav="upgrade"><span>♕</span>Upgrade</button>
            <button data-approved-nav="safety"><span>♢</span>Trust & safety</button>
            <button data-approved-nav="settings"><span>⚙</span>Settings</button>
            <button data-approved-nav="preferences"><span>☷</span>Discovery Preferences</button>
          </nav>
          <div class="approved-rail-bottom">
            <div class="approved-like-card"><span>ϟ</span><div><b><span id="approvedRailLikes">10</span> likes left today</b><small>Resets daily</small></div></div>
            <div class="approved-user"><div class="approved-avatar">V</div><div><b>Owner preview</b><small>● Admin simulation</small></div><span>⋮</span></div>
          </div>
        </aside>
        <main class="approved-main">
          <div class="approved-page-head">
            <div><span class="approved-overline">DISCOVER</span><h2>Find someone worth meeting.</h2><p>Profiles built around presence, personality, and intention.</p></div>
            <div class="approved-top-controls"><div class="approved-city">● <span>Chicago</span></div><div class="approved-likes">♡ <b id="approvedLikesLeft">10</b><small>likes left</small></div><button class="approved-back" id="back">Dashboard</button></div>
          </div>
          <div class="approved-trust-banner"><span class="approved-shield">♢</span><div><b>Verified-feeling demo pool</b><span>Simulated profiles are clearly labeled and never contact real users.</span></div></div>
          <div class="approved-controls-row">
            <div class="approved-segment" id="gender"><button class="active" data-g="everyone">Everyone</button><button data-g="men">Men</button><button data-g="women">Women</button><button data-g="university">🎓 University</button></div>
            <div class="approved-date-modes" id="mode"><button class="active" data-m="single"><b>1-on-1</b><small>Solo date</small></button><button data-m="duo"><b>2 Man</b><small>Bring a friend</small></button><button data-m="trio"><b>Trio</b><small>Three-person crew</small></button></div>
          </div>
          <div class="approved-deck" id="deck"></div>
        </main>
      </div>`;

    const gender=document.getElementById('gender');
    const modes=document.getElementById('mode');
    const back=document.getElementById('back');
    if(gender)gender.onclick=function(e){
      const b=e.target.closest('[data-g]');if(!b)return;
      g=b.dataset.g;
      gender.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
      selectedGroup.clear();buildDeck();
    };
    if(modes)modes.onclick=function(e){
      const b=e.target.closest('[data-m]');if(!b)return;
      mode=b.dataset.m;
      modes.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
      selectedGroup.clear();render();
    };
    if(back)back.onclick=function(){document.body.classList.remove('approved-preview-open');show('dashboard')};

    document.querySelectorAll('[data-approved-nav]').forEach(function(b){
      b.onclick=function(){
        document.querySelectorAll('[data-approved-nav]').forEach(x=>x.classList.toggle('active',x===b));
        const dest=b.dataset.approvedNav;
        if(dest==='discover'){buildDeck();return}
        if(dest==='matches'||dest==='messages')return renderMatchesPreview();
        if(dest==='profile')return renderOwnerPreview();
        renderFeaturePreview(dest);
      };
    });
  }

  function limitCard(){
    const host=document.getElementById('deck');if(!host)return;
    host.innerHTML=`<section class="approved-limit-card"><span class="approved-overline">FREE PLAN</span><div class="approved-limit-heart">♡</div><h2>That’s today’s 10.</h2><p>Free members get 10 intentional likes per day. Come back tomorrow or preview an upgrade.</p><div class="approved-limit-grid"><div><small>LIKES USED</small><b>10 / 10</b></div><div><small>DEMO POOL</small><b>28 profiles</b></div></div><button class="approved-primary" id="resetApprovedLikes">Reset admin demo likes</button></section>`;
    const r=document.getElementById('resetApprovedLikes');if(r)r.onclick=function(){localStorage.removeItem('veramor_admin_demo_likes_v2');idx=0;render()};
    updateLikesUI();
  }

  function renderSingle(){
    if(!deck.length){document.getElementById('deck').innerHTML='<div class="approved-empty"><h3>No profiles in this filter.</h3><p>Try another discovery filter.</p></div>';return}
    if(idx>=deck.length)idx=0;
    const p=deck[idx],pics=pictures(p),pi=Math.min(photoIndex[p.id]||0,Math.max(0,pics.length-1));
    photoIndex[p.id]=pi;
    const src=pics[pi]||p.photo||'';
    const pr=(p.prompts&&p.prompts[0])||['A little about me…',p.bio];
    const host=document.getElementById('deck');
    host.innerHTML=`
      <div class="approved-deck-meta"><span><b>Profile ${idx+1}</b> of ${deck.length}</span><span>${usedLikes()}/10 free likes used</span></div>
      <article class="premium-profile-card">
        <div class="premium-profile-media ${p.demo?'demo-user-media':'real-user-media'} ${src?'':'media-missing'}">
          <span class="premium-fallback">${initial(p)}</span>
          ${src?`<img src="${esc(src)}" alt="${esc(p.name)} profile photo ${pi+1}" onerror="this.style.display='none';this.parentNode.classList.add('media-missing')">`:''}
          <div class="profile-shade"></div>
          <div class="profile-top-badges"><span class="media-chip">${p.demo?'DEMO · SYNTHETIC PROFILE':'ADMIN VIEW'}</span><span class="media-chip">${pics.length||1} photos</span></div>
          ${pics.length>1?`<div class="media-pagination"><div class="media-dots">${pics.map((_,i)=>`<i class="${i===pi?'active':''}"></i>`).join('')}</div><div class="media-arrows"><button onclick="premiumPhotoStep(-1)" aria-label="Previous photo">‹</button><button onclick="premiumPhotoStep(1)" aria-label="Next photo">›</button></div></div>`:''}
          <div class="demo-disclosure">${p.demo?'AI DEMO · NOT A REAL USER':'REAL USER · ADMIN VIEW'}</div>
        </div>
        <div class="premium-profile-detail">
          <div class="detail-top"><span class="trust-chip">${p.demo?'♢ Demo preview':'✓ Verified real profile'}</span></div>
          <div class="profile-detail-head"><div><div class="profile-name">${esc(p.name)}${p.age?', '+esc(p.age):''}</div><div class="profile-meta">${esc(p.job||'')}</div></div><div class="presence-score"><b>${p.demo?'92':'LIVE'}</b><small>${p.demo?'fit':'status'}</small></div></div>
          <div class="location-line"><span class="pin">●</span>${esc(p.city||'Chicago')}<span>·</span><b>${esc(p.intent||'Looking for something real')}</b></div>
          <div class="profile-divider"></div>
          <div class="pro-prompt"><small>${esc(pr[0]||pr.q||'PROFILE PROMPT')}</small><b><span class="quote-mark">“</span>${esc(pr[1]||pr.a||'')}</b></div>
          <p class="profile-bio">${esc(p.bio||'')}</p>
          <div class="premium-tags">${(p.interests||[]).slice(0,6).map((x,i)=>`<span class="tag-chip"><i>${['♫','⌁','▣','✦','♡','◉'][i%6]}</i>${esc(x)}</span>`).join('')}</div>
          <div class="pro-actions"><button class="rewind-btn" onclick="premiumRewind()"><b>↶</b><span>Rewind</span></button><button class="pass-btn" onclick="pass()"><b>×</b><span>Pass</span></button><button class="vibe-btn" onclick="like(true)"><b>★</b><span>Super</span></button><button class="like-btn" onclick="like(false)"><b>♡</b><span>Like</span></button></div>
          <div class="secondary-actions"><button onclick="fullProfile()">View full profile</button><button onclick="premiumDemoSafety('Report')">Report</button><button onclick="premiumDemoSafety('Block')">Block</button></div>
        </div>
      </article>`;
    updateLikesUI();
  }

  function renderGroup(){
    if(!deck.length){document.getElementById('deck').innerHTML='<div class="approved-empty"><h3>No profiles in this filter.</h3></div>';return}
    if(idx>=deck.length)idx=0;
    const count=mode==='duo'?2:3,arr=[];
    for(let i=0;i<count;i++)arr.push(deck[(idx+i)%deck.length]);
    const label=mode==='duo'?'2 Man':'Trio';
    const cards=arr.map(function(p,k){
      const src=pictures(p)[0]||p.photo||'';
      const selected=selectedGroup.has(String(p.id));
      return `<article class="group-person ${p.demo?'demo-user-media':'real-user-media'} ${selected?'selected':''}"><div class="group-person-photo"><span class="group-fallback">${initial(p)}</span>${src?`<img src="${esc(src)}" alt="${esc(p.name)}" onerror="this.style.display='none'">`:''}<button class="group-select-btn" onclick="premiumToggleGroup(event,'${esc(String(p.id))}')">${selected?'✓':'+'}</button></div><div class="group-person-copy"><h4>${esc(p.name)}${p.age?', '+esc(p.age):''}</h4><p>${esc(p.job||'')} · ${esc(p.city||'Chicago')}</p><button class="one-on-one-btn" onclick="premiumBreakout(event,${k})">♡ Swipe 1-on-1</button></div></article>`;
    }).join('');
    const chosen=arr.filter(p=>selectedGroup.has(String(p.id))).map(p=>p.name);
    document.getElementById('deck').innerHTML=`
      <div class="approved-deck-meta"><span><b>${label}</b> discovery</span><span>${usedLikes()}/10 free likes used</span></div>
      <div class="group-discover-shell">
        <section class="squad-setup-card"><div class="squad-setup-head"><div><small>YOUR ${label.toUpperCase()}</small><h3>Build your crew</h3><p>${mode==='duo'?'You + one friend.':'You + two friends.'} Everyone keeps their own VERAMOR profile.</p></div><span class="group-mode-pill">${count} PEOPLE</span></div><div class="squad-slots"><div class="squad-slot you"><div class="squad-avatar">YOU</div><b>Owner preview</b><small>Your profile</small></div><div class="squad-slot"><div class="squad-avatar">+</div><b>Friend slot</b><small>Demo crew member</small></div>${count===3?'<div class="squad-slot"><div class="squad-avatar">+</div><b>Friend slot</b><small>Demo crew member</small></div>':'<div class="squad-slot squad-spacer"><small>2 Man mode</small></div>'}</div></section>
        <section class="group-browser-card"><div class="group-browser-head"><div><small>GROUP DISCOVERY</small><h3>Who are you interested in?</h3><p>Select one or more people for the group plan, or tap 1-on-1 to date someone individually.</p></div><span class="group-mode-pill">${arr.length} NEARBY</span></div><div class="group-people-grid ${mode==='trio'?'trio-grid':''}">${cards}</div><div class="group-selection-copy">${chosen.length?'Selected for the group: <b>'+esc(chosen.join(' + '))+'</b>':'Tap + on the people your group wants to meet.'}</div><div class="group-breakout-note"><span>↗</span><div><b>See one person you want for yourself?</b><small>Tap “Swipe 1-on-1.” VERAMOR opens their normal solo card and your friends are not included in that date.</small></div></div><div class="group-actions"><button class="group-pass-btn" onclick="nextGroup();premiumClearGroup()">Pass group</button><button class="group-like-btn" ${chosen.length?'':'disabled'} onclick="premiumGroupLike()">♡ ${chosen.length?'Group like '+chosen.length:'Select people first'}</button></div></section>
      </div>`;
    updateLikesUI();
  }

  const priorRender=render;
  render=function(){
    if(usedLikes()>=10)return limitCard();
    if(mode==='single')renderSingle();else renderGroup();
  };

  window.premiumPhotoStep=function(delta){
    const p=deck[idx];if(!p)return;const n=pictures(p).length;if(n<2)return;
    photoIndex[p.id]=((photoIndex[p.id]||0)+delta+n)%n;render();
  };
  window.premiumRewind=function(){idx=Math.max(0,idx-1);render()};
  window.premiumDemoSafety=function(action){
    const p=deck[idx];const status=document.getElementById('status');if(status)status.textContent=action+' preview · '+(p?p.name:'profile')+' is simulated';
  };
  window.premiumBreakout=function(e,k){if(e)e.stopPropagation();idx=(idx+k)%deck.length;mode='single';selectedGroup.clear();const m=document.getElementById('mode');if(m)m.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.m==='single'));render()};
  window.premiumToggleGroup=function(e,id){if(e)e.stopPropagation();selectedGroup.has(id)?selectedGroup.delete(id):selectedGroup.add(id);render()};
  window.premiumClearGroup=function(){selectedGroup.clear()};
  window.premiumGroupLike=function(){
    if(!selectedGroup.size)return;
    groupLike();selectedGroup.clear();
  };

  function renderMatchesPreview(){
    const host=document.getElementById('deck');if(!host)return;
    const pool=deck.slice(0,3);
    host.innerHTML=`<section class="approved-feature-page"><span class="approved-overline">MATCHES</span><h2>Your connections</h2><p>Simulated matches let you test chemistry and messaging without contacting real users.</p><div class="approved-match-list">${pool.map((p,i)=>`<button onclick="premiumOpenMatch(${i})"><span class="approved-match-avatar">${pictures(p)[0]?`<img src="${esc(pictures(p)[0])}" alt="">`:initial(p)}</span><span><b>${esc(p.name)}${p.age?', '+esc(p.age):''}</b><small>${i===0?'New match · Chemistry ready':'Demo conversation'}</small></span><em>›</em></button>`).join('')}</div></section>`;
  }
  window.premiumOpenMatch=function(i){matched=deck[i]||deck[0];if(matched)openMatch('This demo profile matched back so you can test the full match flow.')};
  function renderOwnerPreview(){
    const host=document.getElementById('deck');if(!host)return;
    host.innerHTML=`<section class="approved-feature-page"><span class="approved-overline">MY PROFILE</span><h2>Owner preview</h2><p>The real-user profile flow requires four public photos plus a private face-verification video. Demo/bot verification media stays private.</p><div class="approved-profile-checks"><div><b>4+</b><small>Public photos required</small></div><div><b>1</b><small>Private face video required</small></div><div><b>3</b><small>Prompt answers supported</small></div></div></section>`;
  }
  function renderFeaturePreview(dest){
    const labels={passport:'Profile Passport',upgrade:'Membership',safety:'Trust & safety',settings:'Settings',preferences:'Discovery Preferences'};
    const host=document.getElementById('deck');if(!host)return;
    host.innerHTML=`<section class="approved-feature-page"><span class="approved-overline">${esc((labels[dest]||dest).toUpperCase())}</span><h2>${esc(labels[dest]||dest)}</h2><p>This admin preview keeps the approved VERAMOR visual system while the underlying feature remains available in the friend-beta build.</p><button class="approved-primary" onclick="document.querySelector('[data-approved-nav=discover]').click()">Back to Discover</button></section>`;
  }

  document.addEventListener('error',function(e){
    const img=e.target;if(!(img instanceof HTMLImageElement)||!img.closest('#preview'))return;
    img.style.display='none';if(img.parentElement)img.parentElement.classList.add('media-missing');
  },true);

  buildShell();
  const previewBtn=document.getElementById('previewBtn');
  if(previewBtn){
    const old=previewBtn.onclick;
    previewBtn.onclick=function(e){document.body.classList.add('approved-preview-open');if(old)old.call(this,e);updateLikesUI()};
  }
  buildDeck();
})();
