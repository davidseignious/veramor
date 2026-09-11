(function(){
  var CHAT_KEY='veramor_admin_chats_v3';

  function readStore(){try{return JSON.parse(localStorage.getItem(CHAT_KEY)||'{}')||{}}catch(_){return {}}}
  function writeStore(v){try{localStorage.setItem(CHAT_KEY,JSON.stringify(v))}catch(_){}}
  function currentId(){try{return matched&&String(matched.id||matched.name||'match')}catch(_){return 'match'}}
  function getRows(){var s=readStore(),id=currentId();if(!Array.isArray(s[id]))s[id]=[];return s[id]}
  function saveRows(rows){var s=readStore();s[currentId()]=rows;writeStore(s)}
  function safe(v){return typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function norm(v){return String(v||'').trim().toLowerCase()}
  function profile(){try{return matched||{}}catch(_){return {}}}
  function userRows(rows){return rows.filter(function(r){return r&&r[0]==='me'&&!/^chemistry answer:/i.test(String(r[1]||''))})}
  function botRows(rows){return rows.filter(function(r){return r&&r[0]==='them'})}
  function lastUser(rows,skip){var seen=0;for(var i=rows.length-1;i>=0;i--){if(rows[i]&&rows[i][0]==='me'&&!/^chemistry answer:/i.test(String(rows[i][1]||''))){if(seen++>=(skip||0))return String(rows[i][1]||'')}}return ''}
  function lastBot(rows){for(var i=rows.length-1;i>=0;i--)if(rows[i]&&rows[i][0]==='them')return String(rows[i][1]||'');return ''}
  function botSaid(rows,needle){needle=norm(needle);return botRows(rows).some(function(r){return norm(r[1]).indexOf(needle)>=0})}
  function userSaid(rows,re){return userRows(rows).some(function(r){return re.test(norm(r[1]))})}
  function countUser(rows,re){return userRows(rows).reduce(function(n,r){return n+(re.test(norm(r[1]))?1:0)},0)}
  function different(options,rows){
    var recent=botRows(rows).slice(-4).map(function(r){return norm(r[1])});
    for(var i=0;i<options.length;i++){var x=options[(rows.length+i)%options.length];if(recent.indexOf(norm(x))<0)return x}
    return options[(rows.length||0)%options.length];
  }
  function firstInterest(p){return Array.isArray(p.interests)&&p.interests.length?p.interests[0]:''}
  function askFresh(rows,questions){
    for(var i=0;i<questions.length;i++){var q=questions[(userRows(rows).length+i)%questions.length];var stem=norm(q).replace(/[?.!]/g,'').slice(0,26);if(!botSaid(rows,stem))return q}
    return questions[(rows.length||0)%questions.length];
  }

  function complimentReply(text,rows,p){
    var n=countUser(rows,/(eyes|smile|pretty|beautiful|gorgeous|cute|attractive|fine|handsome|hot|look good|looks good)/);
    var l=norm(text);
    if(n>=3)return different([
      'Okayyy, you are laying it on thick now 😂 I’ll take it. Tell me something about you that I can’t see in your pictures.',
      'You’re sweet 😂 but I want to know you too. What’s something you get genuinely excited talking about?',
      'At this rate I’m going to start believing you 😂 Your turn though — what’s one thing you’re proud of about yourself?'
    ],rows);
    if(/eyes/.test(l))return different([
      'Thank you 😊 I actually hear that sometimes. What do people usually notice about you first?',
      'That’s sweet. I like eye contact, so that might work in your favor 😂 Are you shy in person or pretty confident?',
      'Okay, I’ll take that one 😊 What made you stop on my profile long enough to notice?'
    ],rows);
    if(/smile/.test(l))return different([
      'Now you’re trying to make me blush 😂 thank you. What’s something that always puts you in a good mood?',
      'I’ll take that 😊 I smile a lot when I’m comfortable. What are you like once you really warm up to somebody?',
      'That’s cute. I’m curious about you now — what’s your best quality that doesn’t show in a photo?'
    ],rows);
    return different([
      'Thank you 😊 that’s really sweet. What caught your attention about my personality from the profile?',
      'Okay, points for the compliment 😂 What’s something about you I’d probably notice first in person?',
      'I appreciate that. Now I need something besides looks — what do you actually want to know about me?'
    ],rows);
  }

  function replyFor(text,rows){
    var t=String(text||'').trim(),l=norm(t),p=profile();
    var name=p.name||'Your match';
    var isAmina=name==='Amina';
    var turns=userRows(rows).length;
    var prev=norm(lastUser(rows,1));

    if(prev&&l===prev)return different([
      'You already said that 😂 I heard you the first time. Give me something new.',
      'Lol you’re repeating yourself now. Tell me something I don’t know about you yet.',
      'I got you 😂 now switch it up — what are you actually curious about?'
    ],rows);

    if(/^(hi|hey|hello|heyy|heyyy|yo|what's up|whats up|sup)[!. ]*$/.test(l))return different([
      'Hey 😊 how’s your day going?',
      'Hey you 😂 what are you up to right now?',
      'Hi 😊 okay, we matched — tell me one thing about you that your profile doesn’t say.'
    ],rows);

    if(/what do you want to know|what do u want to know|ask me something|what should i tell|what you wanna know/.test(l))return different([
      'Okay, real question: what’s something you could talk about for an hour without getting bored?',
      'Tell me what you’re like when you’re completely comfortable with someone — quiet, goofy, chaotic, affectionate?',
      'What’s something you’re working toward right now that actually matters to you?',
      'What’s one thing people usually get wrong about you when they first meet you?'
    ],rows);

    if(/eyes|smile|pretty|beautiful|gorgeous|cute|attractive|\bfine\b|handsome|\bhot\b|look good|looks good/.test(l))return complimentReply(t,rows,p);

    if(/how are you|how r you|how's your day|hows your day|how was your day|how you doing|wyd|what are you doing/.test(l))return different([
      'I’m good — finally slowing down a little. I had a busy day, so I’m happy to just relax and talk. How about you?',
      'Pretty good 😊 I’m in that part of the day where I’m deciding whether to be productive or do absolutely nothing. What are you doing?',
      'I’m good. A little tired, but in a good mood. What was the best part of your day?'
    ],rows);

    if(/photograph|photography|camera|photos|shoot|street photo/.test(l))return different([
      'That’s actually cool. I like people who notice details. What do you usually like photographing?',
      'Photography says a lot about how somebody sees the world. Are you more into people, street stuff, events, or landscapes?',
      'Okay, that would definitely give us something to talk about. What’s the best photo you’ve taken lately?'
    ],rows);

    if(/travel|trip|vacation|country|passport|fly|flight/.test(l))return isAmina?different([
      'Travel is definitely one of my weaknesses. I love a good weekend trip. If we had a free three-day weekend, where would you take me?',
      'I’m always looking for an excuse to go somewhere. I’m more into exploring a city than sitting at a resort all day. What kind of traveler are you?',
      'My passport gets used 😂 I like food, neighborhoods, and actually wandering around. What place have you been that you’d go back to tomorrow?'
    ],rows):different([
      'I’m always down for a trip. What place is at the top of your list right now?',
      'I like traveling when there’s actually something to explore. Are you more beach vacation or city weekend?',
      'That sounds fun. What’s the best trip you’ve taken so far?'
    ],rows);

    if(/food|cook|restaurant|dinner|taco|pizza|brunch|burger|eat/.test(l))return isAmina?different([
      'Food is an easy way to win me over 😂 I cook a lot, but I’ll never turn down a good dinner out. What’s your go-to meal?',
      'Okay, this matters: are you somebody who orders the same thing every time or tries something new?',
      'I love cooking on Sundays, but I’m also very serious about finding good restaurants. What would you pick for a first dinner date?'
    ],rows):different([
      'Important question then — what’s your ideal first-date food?',
      'I’m always down to try a new spot. What’s one place you could eat at every week?',
      'Okay, food is a safe topic with me 😂 can you actually cook?'
    ],rows);

    if(/music|concert|song|artist|afrobeats|rap|r&b|rnb|playlist/.test(l))return different([
      'I’m big on music. I always have something playing. What have you had on repeat lately?',
      'Music taste can make or break the aux 😂 what are the first three artists on your playlist right now?',
      'I love live music when the crowd is right. Are you more concert, lounge, or music-at-home type?'
    ],rows);

    if(/date|meet|hang out|hangout|coffee|drinks|take you out|take u out/.test(l))return isAmina?different([
      'I like something simple where we can actually talk — coffee, drinks, a walk, or dinner if the vibe is right. What would you plan?',
      'I’m not hard to impress, but I do like effort. Pick a place, pick a time, and make it feel intentional. What’s your first-date idea?',
      'Honestly, if the conversation is good I’d rather meet than text forever. What would you have in mind?'
    ],rows):different([
      'I’m into low-pressure first dates where we can actually talk. What did you have in mind?',
      'I like when somebody actually has a plan. What would you choose?',
      'If the vibe keeps being good, I’d be open to meeting. What kind of date do you usually like?'
    ],rows);

    if(/relationship|looking for|serious|long term|long-term|boyfriend|girlfriend|dating/.test(l))return isAmina?different([
      'I’m dating with intention. I don’t need to force anything fast, but I do want something real if the connection is there. What about you?',
      'I’m definitely looking for something meaningful. I care more about consistency than somebody saying all the right things. What does a good relationship look like to you?',
      'Long-term is the goal for me, but only if it feels natural. I’d rather build something than rush into a label. Where are you at with dating?'
    ],rows):different([
      'I’m open to seeing where a real connection goes, but I’m not here just to collect matches. What are you looking for?',
      'I want something genuine if the chemistry is right. I’m not in a rush, but I’m not trying to waste time either. You?',
      'For me it’s more about the person than forcing a timeline. What are you hoping to find?'
    ],rows);

    if(/where.*from|from where|hometown|where did you grow up/.test(l)){
      var place=p.hometown||p.city||'Chicago';
      return 'I’m from '+place.replace(/ · .*/, '')+'. What about you — where did you grow up?';
    }

    if(/work|job|what do you do|career|occupation/.test(l)){
      var job=p.job||'work that keeps me busy';
      return isAmina?'I’m a '+job.toLowerCase()+', so I spend way too much time noticing how brands present themselves 😂 What do you do?':'I work in '+job.toLowerCase()+'. I like it, but I try not to make work my whole personality. What about you?';
    }

    if(/weekend|sunday|free time|hobby|hobbies|fun/.test(l)){
      var interest=firstInterest(p);
      return isAmina?different([
        'Usually coffee, a long walk, music, and probably cooking something that takes longer than it should. What does your ideal weekend look like?',
        'I like having one plan and then leaving the rest of the day open. A market, food, music, maybe a spontaneous stop somewhere. What do you do for fun?',
        'My favorite weekends feel relaxed but not boring. '+(interest?'I’m usually doing something around '+interest.toLowerCase()+'. ':'')+'Are you more stay-in or always-out?'
      ],rows):different([
        'I’m usually doing something social or trying a new spot. What do you do when you actually have a free day?',
        'I like a mix — one good plan, then see where the day goes. What’s your ideal weekend?',
        'I need at least one reason to leave the house 😂 what do you usually do for fun?'
      ],rows);
    }

    if(/netflix|movie|show|watch|series|film/.test(l))return different([
      'I’m down for a movie night if we can agree on what to watch 😂 What kind of shows are you into?',
      'I’m picky about shows but once I’m into one, I binge it. What’s the last thing you watched that was actually good?',
      'Movie night can work, but I need snacks and veto power 😂 comedy, thriller, or drama?'
    ],rows);

    if(/what about you|and you|how about you|yourself/.test(l))return different([
      'Me? I’m pretty intentional, but I’m also goofy once I’m comfortable. I like people who can actually talk and don’t take themselves too seriously. How would your friends describe you?',
      'I’m a mix of planned and spontaneous. I like having something to look forward to, but I’ll change the plan if something better comes up. Are you like that too?',
      'I’m pretty easygoing until I care about something, then I’m all in. What’s something you’re like that about?'
    ],rows);

    if(/yes|yeah|yep|definitely|for sure|absolutely/.test(l)&&t.length<22){
      return askFresh(rows,[
        'Okay good 😂 are you more spontaneous or do you need a plan?',
        'I like that. What’s something you want to do this year that you haven’t done yet?',
        'So what’s your idea of a really good first date?',
        'What’s one thing that instantly makes you like somebody more?'
      ]);
    }

    if(/no|nah|not really/.test(l)&&t.length<22){
      return askFresh(rows,[
        'Fair enough 😂 what are you into instead?',
        'Okay, I respect it. What does sound fun to you?',
        'Got it. So what’s more your speed?',
        'That tells me something already. What would you rather be doing?'
      ]);
    }

    if(/lol|lmao|😂|haha|funny/.test(l))return different([
      'See, now I know you can laugh with me 😂 What kind of humor always gets you?',
      'Okay, I like your energy already 😂 are you this playful in person too?',
      'Good, because I need somebody who can actually joke around. Are you the funny friend or the one laughing at everybody else?'
    ],rows);

    if(l.endsWith('?')){
      if(/favorite/.test(l))return different([
        'That’s hard because mine changes all the time 😂 give me a category and I can answer properly. What’s yours?',
        'I’m terrible at picking one favorite. I usually have a top three. What’s yours?',
        'I need specifics 😂 favorite what — food, movie, place, artist?'
      ],rows);
      return different([
        'That’s a good question. My real answer is probably more nuanced than the dating-app answer 😂 What’s your answer first?',
        'I like that question. I’d say it depends, but I’m usually pretty direct when I actually care about somebody. How about you?',
        'Hmm. I’d probably need to think about that for a second. What made you ask me that?'
      ],rows);
    }

    if(t.length<6)return different([
      'You’re gonna have to give me a little more than that 😂',
      'Okay, expand on that for me.',
      'That was short lol — what do you mean?'
    ],rows);

    if(turns>=7&&!userSaid(rows,/date|meet|hang out|hangout|coffee|drinks/)&&!botSaid(rows,'better in person'))return different([
      'You know what, this actually feels easier than most app conversations. I feel like we’d probably have better conversation in person 😂 what’s your ideal first date?',
      'I like your vibe so far. I’m curious whether it would translate in person — what kind of first date would you actually enjoy?',
      'Okay, we’ve talked enough that I’m curious now 😂 if we met, what would you plan?'
    ],rows);

    return different(isAmina?[
      'I get what you mean. What made you think of that?',
      'Okay, that tells me a little more about you. What’s something you’re really passionate about?',
      'I like that. Are you usually pretty open with people, or does it take you a while to warm up?',
      'That makes sense. What’s something people usually misunderstand about you at first?',
      'Fair. What’s one thing you’ve done recently that you’re actually proud of?',
      'I can work with that 😂 what’s something you want to know about me that you haven’t asked yet?'
    ]:[
      'I get that. What made you think of that?',
      'That makes sense. What are you usually like when you first meet someone?',
      'Okay, I like that. What’s something you could talk about for hours?',
      'That’s a solid answer. Are you more of a planner or spontaneous?',
      'Interesting. What’s something you’re looking forward to right now?'
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
    var delay=650+Math.min(1450,text.length*12);
    setTimeout(function(){var next=getRows();next.push(['them',answer]);saveRows(next);var h=document.getElementById('chat');if(h){h.innerHTML=next.map(function(m){return '<div class="msg '+(m[0]==='me'?'me':'')+'">'+safe(m[1])+'</div>'}).join('');h.scrollTop=h.scrollHeight}},delay);
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
