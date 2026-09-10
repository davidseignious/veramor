(function(){
  openMatch=function(msg){
    $('#match').innerHTML='<div style="font-size:48px">♥</div><h2>You + '+esc(matched.name)+'</h2><p class="muted">'+esc(msg)+'</p><button class="btn primary" onclick="chemistry()">Answer chemistry question</button>';
    $('#matchModal').classList.add('on');
  };

  chemistry=function(){
    clearInterval(timer);
    $('#match').innerHTML='<span class="pill">CHEMISTRY CHECK</span><h2 style="margin-bottom:6px">One quick question</h2><p>Say one thing you noticed about '+esc(matched.name)+'’s profile.</p><p class="muted">Take as long as you need. There is no countdown and there are no follow-up questions.</p><textarea id="chemInput" rows="4" maxlength="500" placeholder="Write your answer…" style="width:100%;resize:vertical;padding:12px;border-radius:12px;border:1px solid var(--line);background:#0d0b10;color:white;font:inherit;margin:10px 0"></textarea><div id="chemMsg"></div><button class="btn primary" style="width:100%" onclick="finishChemistry()">Continue to messages</button>';
  };

  finishChemistry=function(){
    var input=$('#chemInput');
    var answer=input.value.trim();
    if(!answer){
      $('#chemMsg').innerHTML='<div class="notice">Answer the one question to continue.</div>';
      input.focus();
      return;
    }
    chat();
  };

  chat=function(){
    window.vmsgs=[];
    $('#match').innerHTML='<span class="pill">SIMULATED CHAT</span><h2>'+esc(matched.name)+'</h2><div class="notice success">✓ Chemistry Check complete · messaging unlocked</div><div class="chat" id="chat"></div><div class="compose"><input id="chatInput" placeholder="Simulated message…"><button class="btn primary" onclick="sendMsg()">Send</button></div><button class="btn" style="margin-top:10px" onclick="closeMatch()">Back to swiping</button>';
  };

  sendMsg=function(){
    var input=$('#chatInput');
    var text=input.value.trim();
    if(!text)return;
    window.vmsgs.push(['me',text]);
    window.vmsgs.push(['them',matched.demo?'Nice — I like that.':'Admin simulation reply — no real user received this.']);
    input.value='';
    $('#chat').innerHTML=window.vmsgs.map(function(m){return '<div class="msg '+(m[0]==='me'?'me':'')+'">'+esc(m[1])+'</div>'}).join('');
  };
})();
