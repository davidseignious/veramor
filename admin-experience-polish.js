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
  function countUser(rows,re){return userRows(rows).reduce(function(n,r){return n+(re.test(norm(r[1]))?1:0)},0)}
  function different(options,rows){var recent=botRows(rows).slice(-5).map(function(r){return norm(r[1])});for(var i=0;i<options.length;i++){var x=options[(rows.length+i)%options.length];if(recent.indexOf(norm(x))<0)return x}return options[(rows.length||0)%options.length]}
  function firstInterest(p){return Array.isArray(p.interests)&&p.interests.length?p.interests[0]:''}
  function lastQuestionContext(rows){return norm(lastBot(rows))}

  function answerAboutSelf(rows,p){
    var q=lastQuestionContext(rows),isAmina=(p.name==='Amina');
    if(/planner|spontaneous/.test(q))return isAmina?'I’m definitely more of a planner too. I like knowing the basics are handled, then I can be spontaneous inside the plan 😂 I’m the person making the reservation but still down to change where we go after.':'I lean planner, but not rigid. I like having a plan and then leaving room for the night to surprise me.';
    if(/first meet|first time|shy|confident|warm up|comfortable/.test(q))return isAmina?'I’m usually a little observant at first. I’ll talk, but I’m reading the room. Once I’m comfortable I’m way more playful and probably talking too much 😂':'I’m a little reserved at first, then pretty easygoing once I know the vibe is good.';
    if(/weekend|free day|do for fun/.test(q))return isAmina?'My ideal weekend is coffee, a long walk, maybe a market or live music, then cooking something way too ambitious at home.':'I like one good plan, good food, and enough free time that the day doesn’t feel scheduled to death.';
    if(/good mood|makes you happy/.test(q))return isAmina?'Good music, good food, and being around people I can completely relax with. Also a really good coffee fixes a lot 😂':'Music, food, and being around people I can actually be myself with.';
    if(/best quality|quality.*photo/.test(q))return isAmina?'Probably that I’m intentional. If I care about somebody, they never have to guess whether I care.':'Probably consistency. I’m big on actually showing up for people.';
    if(/passionate|talk about for hours/.test(q))return isAmina?'Travel, branding, food, and why some places just have better energy than others. I can overanalyze a restaurant or a city for way too long 😂':'I can talk forever about the things I care about once somebody gets me started.';
    if(/first date|date idea/.test(q))return isAmina?'I like something where we can actually talk. Drinks, dinner, a walk somewhere nice, maybe live music after if we’re having a good time.':'Something low-pressure where we can actually talk, then extend it if the vibe is good.';
    if(/relationship|looking for/.test(q))return isAmina?'I want something real and consistent. I’m not trying to rush into a label, but I am dating with intention.':'Something genuine. I’d rather build it naturally than force it, but I’m not looking for endless casual texting either.';
    return isAmina?'I’m pretty calm at first too, but once I’m comfortable I’m way more playful. I’m definitely the type to joke around and talk a lot once I know somebody.':'I’m usually pretty calm at first, then more playful once I’m comfortable.';
  }

  function complimentReply(text,rows,p){
    var n=countUser(rows,/(eyes|smile|hair|pretty|beautiful|gorgeous|cute|attractive|fine|handsome|hot|look good|looks good)/),l=norm(text),isAmina=p.name==='Amina';
    if(n>=3)return different([
      'Okayyy, you are really paying attention 😂 I’ll take the compliments. I want to know you too though — what’s something I’d notice about you in person that isn’t obvious from your pictures?',
      'You’re sweet 😂 I’m going to run out of ways to say thank you. Tell me something real about you now — what are you like when you really like somebody?',
      'At this point I believe you 😂 but I’m curious about you too. What’s something you’re proud of that has nothing to do with how you look?'
    ],rows);
    if(/hair/.test(l))return isAmina?different([
      'Thank you 😂 I’m weirdly picky about my hair, so I appreciate that. I actually changed it a couple times before I liked how it looked in those photos. What’s something you’re picky about with your own style?',
      'Okay, the hair compliment gets points 😂 I spend more time on it than I’d admit. Are you somebody who cares a lot about style or do you keep it simple?'
    ],rows):'Thank you 😂 I’ll take that. What’s one thing about your own style you actually care about?';
    if(/eyes/.test(l))return different([
      'That’s sweet 😊 I actually hear that sometimes. I’m big on eye contact too, so I notice that right away in people. Are you confident in person or more quiet at first?',
      'Thank you 😊 eye contact tells me a lot about somebody. I’m usually a little observant at first — what are you like when you first meet someone?'
    ],rows);
    if(/smile/.test(l))return different([
      'Now you’re trying to make me blush 😂 thank you. I smile a lot once I’m comfortable with somebody. What are you like once you really warm up?',
      'I’ll take that 😊 I’m honestly pretty reserved for the first few minutes, then I get goofy. Are you the same way or pretty much yourself right away?'
    ],rows);
    return different([
      'Thank you 😊 that’s really sweet. I’m curious about you too — what do people usually notice about you first?',
      'Okay, points for the compliment 😂 now give me something real about you that I wouldn’t know from your profile.'
    ],rows);
  }

  function contextualAnswer(text,rows,p){
    var l=norm(text),q=lastQuestionContext(rows),isAmina=p.name==='Amina';
    if(/planner/.test(l)&&/planner|spontaneous/.test(q))return isAmina?'Same. I’m a planner too — reservations, timing, all of that. I just don’t like the whole day feeling scripted. I want a plan with room to change it if we’re having fun.':'Same, I like having a plan. I just need enough flexibility that it doesn’t feel like an itinerary.';
    if(/spontaneous/.test(l)&&/planner|spontaneous/.test(q))return isAmina?'I like that. I need somebody spontaneous enough to pull me out of my planner brain sometimes 😂 I’ll make the reservation, you can convince me to stay out later.':'That balances me out. I like a plan, but I also like somebody who can change the whole night if the vibe is right.';
    if(/calm|collected|quiet|shy|reserved|confident|outgoing/.test(l)&&/first meet|warm up|comfortable|shy|confident/.test(q))return isAmina?'I get that. I’m pretty calm at first too — more observant than shy. Once I’m comfortable I’m a lot more playful and talkative. I like when somebody doesn’t force the first five minutes to be perfect.':'I’m similar. I’m usually calm at first, then much more playful once I know the vibe is good.';
    if(/stay in|homebody|inside/.test(l)&&/weekend|free day|stay-in|always-out/.test(q))return isAmina?'I like staying in too, especially if there’s good food and something to watch. But I need at least one reason to leave the house on the weekend 😂':'I get that. I like a good night in as long as the whole weekend doesn’t disappear on the couch.';
    if(/go out|outside|social|party|club/.test(l)&&/weekend|free day|stay-in|always-out/.test(q))return isAmina?'I like going out when there’s actually a reason — good food, music, somewhere with a vibe. I’m not trying to be out just to be out though.':'Same. I like being social, but I’d rather have one good plan than bounce around everywhere.';
    return '';
  }

  function replyFor(text,rows){
    var t=String(text||'').trim(),l=norm(t),p=profile(),isAmina=p.name==='Amina',prev=norm(lastUser(rows,1)),q=lastQuestionContext(rows);
    if(prev&&l===prev)return different(['You already said that 😂 I heard you the first time. Give me something new.','Lol you’re repeating yourself now. Tell me something I don’t know about you yet.'],rows);

    if(/\b(hbu|how about you|what about you|and you|you\?)\b/.test(l)){
      var self=answerAboutSelf(rows,p);
      if(/calm|collected|quiet|shy|reserved|confident|outgoing/.test(l))return self+' What usually makes you feel comfortable around somebody fast?';
      if(/planner|spontaneous/.test(l))return self+' What’s something you always like to plan ahead?';
      return self+' What about that sounds most like you?';
    }

    var contextual=contextualAnswer(t,rows,p);if(contextual)return contextual;

    if(/^(hi|hey|hello|heyy|heyyy|yo|what's up|whats up|sup)[!. ]*$/.test(l))return different(['Hey 😊 how’s your day going?','Hey you 😂 what are you up to right now?','Hi 😊 okay, we matched — tell me something about you that your profile doesn’t say.'],rows);

    if(/what do you want to know|what do u want to know|ask me something|what should i tell|what you wanna know/.test(l))return different(['Okay, real question: what’s something you could talk about for an hour without getting bored?','Tell me what you’re like when you’re completely comfortable with someone — quiet, goofy, chaotic, affectionate?','What’s something you’re working toward right now that actually matters to you?'],rows);

    if(/eyes|smile|hair|pretty|beautiful|gorgeous|cute|attractive|\bfine\b|handsome|\bhot\b|look good|looks good/.test(l))return complimentReply(t,rows,p);

    if(/how are you|how r you|how's your day|hows your day|how was your day|how you doing|wyd|what are you doing/.test(l))return different(['I’m good — finally slowing down a little. I had a busy day, so I’m happy to just relax and talk. I spent part of it working and now I’m deciding what to eat 😂 How about you?','Pretty good 😊 I’m in that part of the day where I’m deciding whether to be productive or do absolutely nothing. What was the best part of your day?'],rows);

    if(/photograph|photography|camera|photos|shoot|street photo/.test(l))return different(['That’s actually cool. I like people who notice details. I’m the kind of person who remembers little things people say, so photography makes sense to me. What do you usually like photographing?','Photography says a lot about how somebody sees the world. I love city details and candid moments. Are you more into people, street stuff, events, or landscapes?'],rows);

    if(/travel|trip|vacation|country|passport|fly|flight/.test(l))return isAmina?different(['Travel is definitely one of my weaknesses. I love a good weekend trip. I’m more city-and-food than sit-at-a-resort-all-day. If we had a free three-day weekend, where would you take me?','My passport gets used 😂 I love walking around a new city with no strict schedule and finding food along the way. What place have you been that you’d go back to tomorrow?'],rows):different(['I’m always down for a trip. I’m more city weekend than resort. What place is at the top of your list right now?','I like traveling when there’s actually something to explore. What’s the best trip you’ve taken so far?'],rows);

    if(/food|cook|restaurant|dinner|taco|pizza|brunch|burger|eat/.test(l))return isAmina?different(['Food is an easy way to win me over 😂 I cook a lot, especially on Sundays, but I’ll never turn down a good dinner out. What’s your go-to meal?','I’m the person who saves restaurants I want to try for months. I also cook when I have time. Are you somebody who orders the same thing every time or tries something new?'],rows):different(['I’m always down to try a new spot. I can cook too, but I definitely have lazy-day meals. What’s one place you could eat at every week?','Okay, food is a safe topic with me 😂 can you actually cook?'],rows);

    if(/music|concert|song|artist|afrobeats|rap|r&b|rnb|playlist/.test(l))return different(['I’m big on music. I always have something playing, especially when I’m cooking or driving. What have you had on repeat lately?','Music taste can make or break the aux 😂 I bounce around a lot, but I love live music. Who are the first three artists on your playlist right now?'],rows);

    if(/date|meet|hang out|hangout|coffee|drinks|take you out|take u out/.test(l))return isAmina?different(['I like something simple where we can actually talk — coffee, drinks, a walk, or dinner if the vibe is right. I’d rather somebody make a real plan than just say “we should hang out.” What would you plan?','Honestly, if the conversation is good I’d rather meet than text forever. I like a place where we can talk and then extend the night if we want. What did you have in mind?'],rows):different(['I’m into low-pressure first dates where we can actually talk. I like when somebody has a real plan though. What did you have in mind?','If the vibe keeps being good, I’d be open to meeting. What kind of date do you usually like?'],rows);

    if(/relationship|looking for|serious|long term|long-term|boyfriend|girlfriend|dating/.test(l))return isAmina?different(['I’m dating with intention. I don’t need to force anything fast, but I do want something real if the connection is there. Consistency matters more to me than somebody saying all the perfect things. What about you?','Long-term is the goal for me, but only if it feels natural. I’d rather build something than rush into a label. What does a good relationship look like to you?'],rows):different(['I’m open to seeing where a real connection goes, but I’m not here just to collect matches. I care a lot about consistency. What are you looking for?','I want something genuine if the chemistry is right. I’m not in a rush, but I’m not trying to waste time either. You?'],rows);

    if(/where.*from|from where|hometown|where did you grow up/.test(l)){var place=p.hometown||p.city||'Chicago';return 'I’m from '+place.replace(/ · .*/, '')+'. I’ve been in Chicago for a while though, so it feels like home too. What about you — where did you grow up?'}

    if(/work|job|what do you do|career|occupation/.test(l)){var job=p.job||'work that keeps me busy';return isAmina?'I’m a '+job.toLowerCase()+'. I like the creative side of it, but I try not to make work my whole personality 😂 What do you do?':'I work in '+job.toLowerCase()+'. I like it, but I try not to make work my whole personality. What about you?'}

    if(/weekend|sunday|free time|hobby|hobbies|fun/.test(l)){var interest=firstInterest(p);return isAmina?different(['Usually coffee, a long walk, music, and probably cooking something that takes longer than it should. I like having one plan and leaving the rest open. What does your ideal weekend look like?','My favorite weekends feel relaxed but not boring. '+(interest?'I’m usually doing something around '+interest.toLowerCase()+'. ':'')+'Are you more stay-in or always-out?'],rows):different(['I’m usually doing something social or trying a new spot, but I like a chill day too. What do you do when you actually have a free day?','I like a mix — one good plan, then see where the day goes. What’s your ideal weekend?'],rows)}

    if(/netflix|movie|show|watch|series|film/.test(l))return different(['I’m down for a movie night if we can agree on what to watch 😂 I’m more thriller/comedy than super serious drama. What kind of shows are you into?','I’m picky about shows, but once I’m into one I binge it. What’s the last thing you watched that was actually good?'],rows);

    if(/planner/.test(l))return isAmina?'I’m a planner too 😂 I like knowing where we’re going and roughly what the night looks like, but I still want room for it to be spontaneous. What do you usually plan way ahead?':'Same, I lean planner. I like having the basics figured out and leaving the rest open.';
    if(/spontaneous/.test(l))return isAmina?'I like spontaneous people because they balance me out. I’ll make the reservation, you can convince me to do something random after 😂 What’s the most spontaneous thing you’ve done lately?':'I like that. I’m more planned, so spontaneous people keep things interesting.';

    if(/lol|lmao|😂|haha|funny/.test(l))return different(['See, now I know you can laugh with me 😂 I’m pretty playful once I’m comfortable. What kind of humor always gets you?','Okay, I like your energy already 😂 I’m definitely a tease once I know somebody. Are you like that in person too?'],rows);

    if(l.endsWith('?'))return different(['That’s a good question. I’d probably say I’m pretty easygoing once I’m comfortable, but I’m also intentional about people I care about. What made you ask?','I’d rather give you the real answer than the dating-app answer 😂 I’m pretty direct and I pay attention to consistency. What’s your answer to that?'],rows);

    if(t.length<6)return different(['You’re gonna have to give me a little more than that 😂','Okay, expand on that for me.','That was short lol — what do you mean?'],rows);

    if(/calm|collected|quiet|shy|reserved|confident|outgoing/.test(l))return isAmina?'I like calm energy. I’m pretty observant at first myself, then way more playful once I’m comfortable. What usually brings that side out of you?':'I like that. I’m a little observant at first too, then much more open once I’m comfortable.';

    return different(isAmina?[
      'I get that. For me, I’m big on people being comfortable enough to just be themselves instead of trying to perform. What usually makes you feel like you can relax around somebody?',
      'That makes sense. I’m pretty intentional, but I like conversations that can bounce between serious and completely random. What’s something you can talk about forever?',
      'I like that. I’m somebody who pays attention to consistency more than big gestures. What’s one thing that makes you trust somebody pretty quickly?',
      'Okay, I can see that. I’m more playful than my profile probably makes me look 😂 what’s something about you your profile doesn’t really capture?'
    ]:[
      'I get that. I’m pretty easygoing once I’m comfortable too. What’s something your profile doesn’t really show about you?',
      'That makes sense. I like conversations that actually go somewhere instead of interview questions. What’s something you genuinely care about?',
      'I can see that. I’m big on consistency and good energy. What makes you feel comfortable around somebody?'
    ],rows);
  }

  window.sendMsg=function(){
    var input=document.getElementById('chatInput'),text=(input&&input.value||'').trim();if(!text)return;
    var rows=getRows();rows.push(['me',text]);saveRows(rows);if(input)input.value='';
    var host=document.getElementById('chat');if(host){host.innerHTML=rows.map(function(m){return '<div class="msg '+(m[0]==='me'?'me':'')+'">'+safe(m[1])+'</div>'}).join('')+'<div class="msg demo-typing">typing…</div>';host.scrollTop=host.scrollHeight}
    var answer=replyFor(text,rows.slice());
    setTimeout(function(){var next=getRows();next.push(['them',answer]);saveRows(next);var h=document.getElementById('chat');if(h){h.innerHTML=next.map(function(m){return '<div class="msg '+(m[0]==='me'?'me':'')+'">'+safe(m[1])+'</div>'}).join('');h.scrollTop=h.scrollHeight}},650+Math.min(1100,text.length*12));
  };

  function pics(p){var a=Array.isArray(p&&p.photos)?p.photos.filter(Boolean):[];if(!a.length&&p&&p.photo)a=[p.photo];return a}
  function promptRows(p){return Array.isArray(p&&p.prompts)?p.prompts:[]}
  function fact(label,value){return value?'<div class="profile-story-fact"><small>'+safe(label)+'</small><b>'+safe(value)+'</b></div>':''}

  window.fullProfile=function(){
    var inMatch=document.getElementById('matchModal')&&document.getElementById('matchModal').classList.contains('on');
    var p=(inMatch&&typeof matched!=='undefined'&&matched)||(typeof deck!=='undefined'&&deck[idx]);if(!p)return;
    var photos=pics(p),prompts=promptRows(p),first=photos[0]||'',body='';
    if(first)body+='<div class="profile-story-hero"><img src="'+safe(first)+'" alt="'+safe(p.name||'Profile')+'"><div class="profile-story-shade"></div><div class="profile-story-identity"><h2>'+safe(p.name)+(p.age?', '+safe(p.age):'')+'</h2><p>'+safe(p.job||'')+(p.city?' · '+safe(p.city):'')+'</p></div></div>';
    body+='<div class="profile-story-card"><h3>About me</h3><p>'+safe(p.bio||'')+'</p>'+(Array.isArray(p.interests)&&p.interests.length?'<div class="profile-story-tags" style="margin-top:13px">'+p.interests.map(function(x){return '<span>'+safe(x)+'</span>'}).join('')+'</div>':'')+'</div>';
    if(p.video)body+='<div class="profile-story-card"><h3>Intro video</h3><video src="'+safe(p.video)+'" controls playsinline style="width:100%;border-radius:14px"></video></div>';
    var max=Math.max(prompts.length,Math.max(0,photos.length-1));for(var i=0;i<max;i++){if(prompts[i]){var q=prompts[i];body+='<div class="profile-story-card profile-story-prompt"><small>'+safe(q[0]||q.q||'Prompt')+'</small><b>'+safe(q[1]||q.a||'')+'</b></div>'}if(photos[i+1])body+='<div class="profile-story-photo"><img src="'+safe(photos[i+1])+'" alt="'+safe(p.name||'Profile')+' photo '+(i+2)+'"></div>'}
    body+='<div class="profile-story-card"><h3>Profile details</h3><div class="profile-story-facts">'+fact('Looking for',p.intent)+fact('Height',p.height)+fact('School',p.school||p.education)+fact('Religion',p.religion)+fact('Hometown',p.hometown)+fact('Languages',p.languages)+fact('Relationship style',p.relationshipStyle)+fact('Workout',p.workout)+fact('Drink',p.drink)+fact('Pets',p.pets)+fact('Kids',p.kids)+fact('Politics',p.politics)+'</div></div>';
    var name=document.getElementById('fullName');if(name)name.textContent='';var full=document.getElementById('full');if(full)full.innerHTML='<div class="profile-story">'+body+'</div>';var modal=document.getElementById('profileModal');if(modal){modal.classList.remove('hidden');modal.classList.add('on');modal.removeAttribute('aria-hidden');var sheet=modal.querySelector('.sheet');if(sheet)sheet.scrollTop=0}
  };

  function addPrivacy(){var host=document.getElementById('match');if(!host||host.querySelector('.streaming-privacy-note'))return;if(!document.getElementById('adminWatchProvider')&&!/WATCH TOGETHER/.test(host.textContent||''))return;var note=document.createElement('div');note.className='streaming-privacy-note';note.innerHTML='<strong>🔒 Streaming login stays private</strong>VERAMOR never asks for, sees, or stores your Netflix, Max, Hulu, Disney+, Prime Video, or other streaming password. Sign-in happens only on the streaming provider’s own site or app.';var msg=document.getElementById('adminWatchMsg');if(msg)msg.insertAdjacentElement('beforebegin',note);else host.appendChild(note)}
  var originalWatch=window.adminWatchTogether;if(typeof originalWatch==='function')window.adminWatchTogether=function(){originalWatch();setTimeout(addPrivacy,0)};new MutationObserver(function(){addPrivacy()}).observe(document.body,{childList:true,subtree:true});
})();
