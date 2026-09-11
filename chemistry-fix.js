(function(){
  var CHEM_KEY='veramor_admin_chemistry_v3';
  var CHAT_KEY='veramor_admin_chats_v3';
  var DATE_KEY='veramor_admin_dates_v1';

  function readStore(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(_){return {}}}
  function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
  function matchId(){return matched&&String(matched.id||matched.name||'match')}
  function chemistryDone(){var s=readStore(CHEM_KEY);return !!s[matchId()]}
  function markChemistry(answer){var s=readStore(CHEM_KEY);s[matchId()]={done:true,answer:answer,completedAt:new Date().toISOString()};writeStore(CHEM_KEY,s)}
  function getMessages(){var s=readStore(CHAT_KEY),id=matchId();if(!Array.isArray(s[id]))s[id]=[];return s[id]}
  function saveMessages(rows){var s=readStore(CHAT_KEY);s[matchId()]=rows;writeStore(CHAT_KEY,s)}
  function getDatePlan(){return readStore(DATE_KEY)[matchId()]||null}
  function saveDatePlan(plan){var s=readStore(DATE_KEY);s[matchId()]=plan;writeStore(DATE_KEY,s)}

  function seedConversation(){
    var rows=getMessages();
    if(rows.length)return rows;
    var name=matched&&matched.name||'Your match';
    rows=[['them',name==='Amina'?'Hey! Glad we matched 😊 What caught your attention on my profile?':'Hey! Glad we matched. What stood out to you on my profile?']];
    saveMessages(rows);
    return rows;
  }

  openMatch=function(msg){
    if(!matched)return;
    if(chemistryDone()){
      chat();
      return;
    }
    $('#match').innerHTML='<div style="font-size:48px">♥</div><h2>You + '+esc(matched.name)+'</h2><p class="muted">'+esc(msg)+'</p><div class="notice">Before messaging unlocks, answer one Chemistry Check question for this match. You only do this once.</div><button class="btn primary" onclick="chemistry()">Answer chemistry question</button>';
    $('#matchModal').classList.add('on');
  };

  chemistry=function(){
    clearInterval(timer);
    $('#match').innerHTML='<span class="pill">CHEMISTRY CHECK</span><h2 style="margin-bottom:6px">One quick question</h2><p>Say one thing you noticed about '+esc(matched.name)+'’s profile.</p><p class="muted">This unlocks the conversation for this match permanently in the demo.</p><textarea id="chemInput" rows="4" maxlength="500" placeholder="Write your answer…" style="width:100%;resize:vertical;padding:12px;border-radius:12px;border:1px solid var(--line);background:#0d0b10;color:white;font:inherit;margin:10px 0"></textarea><div id="chemMsg"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn" onclick="fullProfile()">View profile again</button><button class="btn primary" onclick="finishChemistry()">Unlock conversation</button></div>';
  };

  finishChemistry=function(){
    var input=$('#chemInput');
    var answer=(input&&input.value||'').trim();
    if(!answer){
      $('#chemMsg').innerHTML='<div class="notice">Answer the one question to continue.</div>';
      input&&input.focus();
      return;
    }
    markChemistry(answer);
    var rows=seedConversation();
    rows.unshift(['me','Chemistry answer: '+answer]);
    saveMessages(rows);
    chat();
  };

  function renderMessages(){
    var host=$('#chat');if(!host)return;
    var rows=getMessages();
    host.innerHTML=rows.map(function(m){return '<div class="msg '+(m[0]==='me'?'me':'')+'">'+esc(m[1])+'</div>'}).join('');
    host.scrollTop=host.scrollHeight;
  }

  chat=function(){
    if(!matched)return;
    seedConversation();
    var plan=getDatePlan();
    $('#match').innerHTML='<span class="pill">SIMULATED CHAT</span><h2>'+esc(matched.name)+'</h2><div class="notice success">✓ Chemistry Check complete · conversation unlocked</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button class="btn" onclick="adminVoiceCall()">📞 Voice</button><button class="btn" onclick="adminVideoCall()">🎥 Video</button><button class="btn primary" onclick="adminDateMode()">📍 Date Mode</button><button class="btn" onclick="fullProfile()">View profile</button></div>'+(plan?'<div class="notice success">📍 Date plan: '+esc(plan.whenLabel)+' · '+esc(plan.place)+'</div>':'')+'<div class="chat" id="chat"></div><div class="compose"><input id="chatInput" placeholder="Message '+esc(matched.name)+'…"><button class="btn primary" onclick="sendMsg()">Send</button></div><button class="btn" style="margin-top:10px" onclick="closeMatch()">Back to swiping</button>';
    renderMessages();
    var input=$('#chatInput');if(input)input.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}};
  };

  sendMsg=function(){
    var input=$('#chatInput');
    var text=(input&&input.value||'').trim();
    if(!text)return;
    var rows=getMessages();
    rows.push(['me',text]);
    rows.push(['them',matched.demo?(matched.name==='Amina'?'I like that 😊 Tell me more.':'Nice — I like that. Tell me more.'):'Admin simulation reply — no real user received this.']);
    saveMessages(rows);
    input.value='';
    renderMessages();
  };

  adminDateMode=function(){
    var plan=getDatePlan();
    $('#match').innerHTML='<span class="pill">DATE MODE</span><h2>Plan a date with '+esc(matched.name)+'</h2><p class="muted">Turn the match into a real plan. This is a demo and does not contact anyone.</p>'+(plan?'<div class="notice success">Current plan: '+esc(plan.whenLabel)+' · '+esc(plan.place)+(plan.note?' · '+esc(plan.note):'')+'</div>':'')+'<div style="display:grid;gap:10px;margin:14px 0"><label class="muted">Date & time<input id="adminDateWhen" type="datetime-local" style="width:100%;margin-top:6px;padding:12px;border-radius:12px;border:1px solid var(--line);background:#0d0b10;color:white"></label><label class="muted">Place or plan<input id="adminDatePlace" maxlength="160" placeholder="Coffee, dinner, museum…" style="width:100%;margin-top:6px;padding:12px;border-radius:12px;border:1px solid var(--line);background:#0d0b10;color:white"></label><label class="muted">Optional note<textarea id="adminDateNote" maxlength="300" rows="3" placeholder="Saturday around 7?" style="width:100%;margin-top:6px;padding:12px;border-radius:12px;border:1px solid var(--line);background:#0d0b10;color:white;resize:vertical"></textarea></label></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn" onclick="chat()">Back to chat</button><button class="btn primary" onclick="saveAdminDate()">Send date idea</button></div>';
    var d=new Date(Date.now()+86400000);d.setMinutes(Math.ceil(d.getMinutes()/15)*15,0,0);var f=$('#adminDateWhen');if(f)f.value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    if(plan){if($('#adminDatePlace'))$('#adminDatePlace').value=plan.place||'';if($('#adminDateNote'))$('#adminDateNote').value=plan.note||''}
  };

  saveAdminDate=function(){
    var when=$('#adminDateWhen')&&$('#adminDateWhen').value;
    var place=($('#adminDatePlace')&&$('#adminDatePlace').value||'').trim();
    var note=($('#adminDateNote')&&$('#adminDateNote').value||'').trim();
    if(!when||!place){alert('Add a date, time, and place first.');return}
    var dt=new Date(when);var label=isNaN(dt.getTime())?when:dt.toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    saveDatePlan({when:when,whenLabel:label,place:place,note:note,status:'accepted',savedAt:new Date().toISOString()});
    var rows=getMessages();rows.push(['me','Date idea: '+place+' · '+label]);rows.push(['them','That works for me — it’s a date 💘']);saveMessages(rows);
    chat();
  };

  adminVoiceCall=function(){
    $('#match').innerHTML='<span class="pill">VOICE CALL · DEMO</span><div style="font-size:54px;margin:14px 0">📞</div><h2>'+esc(matched.name)+'</h2><p class="muted">Voice-call UI is available here in the admin simulation. No real call is placed to a demo profile.</p><button class="btn primary" onclick="chat()">End demo call</button>';
  };
  adminVideoCall=function(){
    $('#match').innerHTML='<span class="pill">VIDEO CALL · DEMO</span><div style="font-size:54px;margin:14px 0">🎥</div><h2>'+esc(matched.name)+'</h2><p class="muted">Video-call UI is available here in the admin simulation. No real call is placed to a demo profile.</p><button class="btn primary" onclick="chat()">End demo call</button>';
  };
})();
