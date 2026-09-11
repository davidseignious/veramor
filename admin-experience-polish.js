(function(){
  var CHAT_KEY='veramor_admin_chats_v3';

  function readStore(){try{return JSON.parse(localStorage.getItem(CHAT_KEY)||'{}')||{}}catch(_){return {}}}
  function writeStore(v){try{localStorage.setItem(CHAT_KEY,JSON.stringify(v))}catch(_){}}
  function currentId(){try{return matched&&String(matched.id||matched.name||'match')}catch(_){return 'match'}}
  function getRows(){var s=readStore(),id=currentId();if(!Array.isArray(s[id]))s[id]=[];return s[id]}
  function saveRows(rows){var s=readStore();s[currentId()]=rows;writeStore(s)}
  function safe(v){return typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  function lastBot(rows){for(var i=rows.length-1;i>=0;i--)if(rows[i]&&rows[i][0]==='them')return String(rows[i][1]||'');return ''}
  function pick(options,rows){
    var prior=lastBot(rows);
    for(var i=0;i<options.length;i++)if(options[i]!==prior)return options[(rows.length+i)%options.length];
    return options[0];
  }

  function replyFor(text,rows){
    var t=String(text||'').trim();
    var l=t.toLowerCase();
    var name=(matched&&matched.name)||'Your match';
    var isAmina=name==='Amina';

    if(/what do you want to know|what do u want to know|ask me something|what should i tell/.test(l))return isAmina?'Hmm… tell me something I would never guess from your profile. What are you like when you’re really comfortable with someone?':'Tell me something that wouldn’t make it onto a dating profile. What are you like once you really open up?';
    if(/smile|pretty|beautiful|gorgeous|cute|eyes|attractive/.test(l))return isAmina?'Okayyy, that was smooth 😂 thank you. What actually made you swipe besides the smile?':'That’s sweet, thank you 😊 What else stood out to you?';
    if(/how are you|how r you|how's your day|hows your day|how was your day/.test(l))return 'I’m good — finally getting a chance to relax. How’s your day been?';
    if(/travel|trip|vacation|country|passport/.test(l))return isAmina?'Travel is definitely one of my weaknesses. I love a good weekend trip. If you could leave tomorrow, where are we going?':'I’m always down for a trip. What place is at the top of your list right now?';
    if(/food|cook|restaurant|dinner|taco|pizza|brunch/.test(l))return isAmina?'Food is an easy way to win me over 😂 I cook a lot, but I’m never turning down a good dinner out. What’s your go-to spot?':'Okay, important question then — what’s your ideal first-date food?';
    if(/music|concert|song|artist|afrobeats|rap|r&b|rnb/.test(l))return 'I’m big on music. My playlist changes constantly though. What have you had on repeat lately?';
    if(/date|meet|hang out|hangout|coffee|drinks/.test(l))return isAmina?'I like something simple where we can actually talk — coffee, drinks, a walk, dinner if the vibe is right. What would you plan?':'I’m into low-pressure first dates where we can actually talk. What did you have in mind?';
    if(/relationship|looking for|serious|long term|long-term/.test(l))return isAmina?'I’m dating with intention. I don’t need to force anything fast, but I do want something real if the connection is there. What about you?':'I’m open to seeing where a real connection goes, but I’m not here just to collect matches. What are you looking for?';
    if(/where.*from|from where|hometown/.test(l))return isAmina?'I’m in Chicago now, but I love hearing where people grew up. Where are you originally from?':'I’m local right now. What about you — are you from here?';
    if(/work|job|what do you do/.test(l))return isAmina?'I’m a brand strategist, so I spend way too much time noticing how companies present themselves 😂 What do you do?':'Work keeps me busy, but I try not to make it my whole personality. What do you do?';
    if(/weekend|sunday|free time|hobby|hobbies/.test(l))return isAmina?'Usually coffee, a walk, music, and probably cooking something that takes longer than it should. What does your ideal weekend look like?':'I’m usually doing something social or trying a new spot. What do you do when you actually have a free day?';
    if(/netflix|movie|show|watch/.test(l))return 'I’m down for a movie night if we can agree on what to watch 😂 What kind of shows are you into?';
    if(/lol|lmao|😂|haha|funny/.test(l))return pick(['See, now I know you can laugh with me 😂','Okay, I like your energy already 😂','Good, because I need somebody who can actually joke around.'],rows);
    if(l.endsWith('?'))return pick(['That’s a good question. I’d probably say I’m pretty easygoing once I’m comfortable. What about you?','Honestly, it depends on the situation, but I’m big on being direct. What’s your answer to that?','I like that question. I’d rather give you the real answer than the dating-app answer — what made you ask?'],rows);
    if(t.length<6)return pick(['You’re gonna have to give me a little more than that 😂','Okay, expand on that for me.','That was short lol — what do you mean?'],rows);
    return pick(isAmina?[
      'I can see that. I’m curious though — what made you say that?',
      'Okay, I like that answer. What’s something you’re really passionate about?',
      'That actually tells me a lot. Are you more spontaneous or do you like having a plan?',
      'I like where this is going 😊 what’s something people usually misunderstand about you?',
      'Fair. So what would make you excited to actually meet somebody from an app?'
    ]:[
      'I get that. What made you think of that?',
      'That makes sense. What are you usually like when you first meet someone?',
      'Okay, I like that. What’s something you could talk about for hours?',
      'That’s a solid answer. Are you more of a planner or spontaneous?'
    ],rows);
  }

  window.sendMsg=function(){
    var input=document.getElementById('chatInput');
    var text=(input&&input.value||'').trim();
    if(!text)return;
    var rows=getRows();rows.push(['me',text]);saveRows(rows);if(input)input.value='';
    var host=document.getElementById('chat');
    if(host){host.innerHTML=rows.map(function(m){return '<div class="msg '+(m[0]==='me'?'me':'')+'">'+safe(m[1])+'</div>'}).join('')+'<div class="msg demo-typing">typing…</div>';host.scrollTop=host.scrollHeight}
    var answer=replyFor(text,rows.slice());
    setTimeout(function(){var next=getRows();next.push(['them',answer]);saveRows(next);var h=document.getElementById('chat');if(h){h.innerHTML=next.map(function(m){return '<div class="msg '+(m[0]==='me'?'me':'')+'">'+safe(m[1])+'</div>'}).join('');h.scrollTop=h.scrollHeight}},520+Math.min(900,text.length*9));
  };

  function pics(p){var a=Array.isArray(p&&p.photos)?p.photos.filter(Boolean):[];if(!a.length&&p&&p.photo)a=[p.photo];return a}
  function promptRows(p){return Array.isArray(p&&p.prompts)?p.prompts:[]}
  function fact(label,value){return value?'<div class="profile-story-fact"><small>'+safe(label)+'</small><b>'+safe(value)+'</b></div>':''}

  window.fullProfile=function(){
    var inMatch=document.getElementById('matchModal')?.classList.contains('on');
    var p=(inMatch&&typeof matched!=='undefined'&&matched)||(typeof deck!=='undefined'&&deck[idx]);
    if(!p)return;
    var photos=pics(p),prompts=promptRows(p),first=photos[0]||'';
    var body='';
    if(first)body+='<div class="profile-story-hero"><img src="'+safe(first)+'" alt="'+safe(p.name||'Profile')+'"><div class="profile-story-shade"></div><div class="profile-story-identity"><h2>'+safe(p.name)+(p.age?', '+safe(p.age):'')+'</h2><p>'+safe(p.job||'')+(p.city?' · '+safe(p.city):'')+'</p></div></div>';
    body+='<div class="profile-story-card"><h3>About me</h3><p>'+safe(p.bio||'')+'</p>'+(Array.isArray(p.interests)&&p.interests.length?'<div class="profile-story-tags" style="margin-top:13px">'+p.interests.map(function(x){return '<span>'+safe(x)+'</span>'}).join('')+'</div>':'')+'</div>';
    if(p.video)body+='<div class="profile-story-card"><h3>Intro video</h3><video src="'+safe(p.video)+'" controls playsinline style="width:100%;border-radius:14px"></video></div>';
    var max=Math.max(prompts.length,Math.max(0,photos.length-1));
    for(var i=0;i<max;i++){
      if(prompts[i]){var q=prompts[i];body+='<div class="profile-story-card profile-story-prompt"><small>'+safe(q[0]||q.q||'Prompt')+'</small><b>'+safe(q[1]||q.a||'')+'</b></div>'}
      if(photos[i+1])body+='<div class="profile-story-photo"><img src="'+safe(photos[i+1])+'" alt="'+safe(p.name||'Profile')+' photo '+(i+2)+'"></div>';
    }
    body+='<div class="profile-story-card"><h3>Profile details</h3><div class="profile-story-facts">'+
      fact('Looking for',p.intent)+fact('Height',p.height)+fact('School',p.school||p.education)+fact('Religion',p.religion)+fact('Hometown',p.hometown)+fact('Languages',p.languages)+fact('Relationship style',p.relationshipStyle)+fact('Workout',p.workout)+fact('Drink',p.drink)+fact('Pets',p.pets)+fact('Kids',p.kids)+fact('Politics',p.politics)+'</div></div>';
    var name=document.getElementById('fullName');if(name)name.textContent='';
    var full=document.getElementById('full');if(full)full.innerHTML='<div class="profile-story">'+body+'</div>';
    var modal=document.getElementById('profileModal');if(modal){modal.classList.remove('hidden');modal.classList.add('on');modal.removeAttribute('aria-hidden');var sheet=modal.querySelector('.sheet');if(sheet)sheet.scrollTop=0}
  };

  function addPrivacy(){
    var host=document.getElementById('match');if(!host||host.querySelector('.streaming-privacy-note'))return;
    if(!document.getElementById('adminWatchProvider')&&!/WATCH TOGETHER/.test(host.textContent||''))return;
    var note=document.createElement('div');note.className='streaming-privacy-note';note.innerHTML='<strong>🔒 Streaming login stays private</strong>VERAMOR never asks for, sees, or stores your Netflix, Max, Hulu, Disney+, Prime Video, or other streaming password. Sign-in happens only on the streaming provider’s own site or app.';
    var msg=document.getElementById('adminWatchMsg');if(msg)msg.insertAdjacentElement('beforebegin',note);else host.appendChild(note);
  }
  var originalWatch=window.adminWatchTogether;
  if(typeof originalWatch==='function')window.adminWatchTogether=function(){originalWatch();setTimeout(addPrivacy,0)};
  new MutationObserver(function(){addPrivacy()}).observe(document.body,{childList:true,subtree:true});
})();
