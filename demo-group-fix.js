// Keeps the 2 Man / Trio preview rendering clean after the 28-profile demo upgrade.
(function(){
  if(typeof render!=='function')return;
  const baseRender=render;
  function usedLikes(){
    try{const row=JSON.parse(localStorage.getItem('veramor_admin_demo_likes_v2')||'{}');const day=new Date().toISOString().slice(0,10);return row.day===day?Math.max(0,Number(row.count)||0):0}catch(_){return 0}
  }
  render=function(){
    const used=usedLikes();
    if(mode==='single'||used>=10)return baseRender();
    if(!deck.length){$('#deck').innerHTML='<div class="panel section">No profiles in this filter.</div>';return}
    if(idx>=deck.length)idx=0;
    const count=mode==='duo'?2:3,arr=[];
    for(let i=0;i<count;i++)arr.push(deck[(idx+i)%deck.length]);
    $('#deck').innerHTML='<div class="progress"><span><b>'+(mode==='duo'?'2 Man':'Trio')+'</b></span><span>'+used+'/10 free likes used</span></div><div class="group '+(count===2?'two':'three')+'">'+arr.map(function(p,k){return '<button class="mini" onclick="breakout('+k+')"><img src="'+esc(p.photo)+'" alt="'+esc(p.name)+'"><div>'+esc(p.name)+(p.age?', '+p.age:'')+'</div></button>'}).join('')+'</div><div class="swipe"><button class="btn" onclick="nextGroup()">✕ Pass</button><button class="btn primary" onclick="groupLike()">♥ Like group</button><button class="btn super" onclick="groupLike()">★ Super</button></div>';
  };
  buildDeck();
})();
