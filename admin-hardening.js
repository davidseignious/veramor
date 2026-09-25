(function(){
  const baseRenderDash=renderDash;

  renderDash=function(d){
    baseRenderDash(d);
    const s=d.summary||{};
    const panel=document.createElement('div');
    panel.className='panel section';
    panel.id='betaReadiness';
    panel.innerHTML='<span class="pill">BETA READINESS</span><div class="grid" style="margin-top:10px">'
      +[['Launch ready',s.ready_profiles],['Awaiting review',s.awaiting_verification],['Media incomplete',s.media_incomplete],['Rejected',s.rejected_profiles]]
        .map(function(x){return '<div class="stat"><small>'+esc(x[0])+'</small><b>'+(Number(x[1])||0)+'</b></div>'}).join('')
      +'</div><div class="notice">A profile stays hidden until it has at least 4 photos, a private face-verification video, completed setup, and admin approval.</div>';
    $('#dash').appendChild(panel);
  };

  function launchSwitch(flag,label,checked,description,danger){
    return '<label class="notice" style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between">'
      +'<span><strong>'+esc(label)+'</strong><small class="muted" style="display:block;margin-top:4px">'+esc(description)+'</small></span>'
      +'<input type="checkbox" data-launch-flag="'+esc(flag)+'" '+(checked?'checked':'')+' style="width:22px;height:22px;flex:0 0 auto;accent-color:'+(danger?'#ff6b73':'#ff4f89')+'"></label>';
  }

  function renderLaunchControls(cfg,dashboard){
    document.getElementById('publicLaunchControls')?.remove();
    const s=dashboard?.summary||{},health=dashboard?.beta_health||{};
    const panel=document.createElement('div');
    panel.className='panel section';
    panel.id='publicLaunchControls';
    const publicOn=cfg?.public_launch===true,signups=cfg?.signup_open!==false,maintenance=cfg?.maintenance_mode===true;
    const openReports=Number(s.open_reports)||0,errors=Number(health.client_errors_24h)||0;
    panel.innerHTML='<span class="pill">PUBLIC LAUNCH CONTROL</span>'
      +'<h3 style="margin:8px 0 4px">'+(publicOn?'Public mode is ON':'Staged launch mode')+'</h3>'
      +'<p class="muted">These switches let you pause VERAMOR without a redeploy and move signup from Friend Beta activation to the public email-confirmed flow.</p>'
      +'<div class="grid" style="margin:12px 0">'
      +'<div class="stat"><small>Open reports</small><b>'+openReports+'</b></div>'
      +'<div class="stat"><small>Client errors · 24h</small><b>'+errors+'</b></div>'
      +'<div class="stat"><small>Launch-ready profiles</small><b>'+(Number(s.ready_profiles)||0)+'</b></div>'
      +'<div class="stat"><small>Signups</small><b>'+(signups?'OPEN':'PAUSED')+'</b></div>'
      +'</div>'
      +launchSwitch('public_launch','Public launch mode',publicOn,'Uses email-confirmed signup and removes Friend Beta labeling.',true)
      +launchSwitch('signup_open','Allow new signups',signups,'Turn this off instantly if abuse, spam, or capacity becomes a problem.',false)
      +launchSwitch('maintenance_mode','Maintenance mode',maintenance,'Shows a full-screen maintenance notice to users while you work.',true)
      +'<div class="notice '+(openReports===0&&errors===0?'success':'')+'"><strong>Launch gate:</strong> '+(openReports===0?'Safety queue clear.':'Resolve open safety reports before a larger rollout.')+' '+(errors===0?'No client errors recorded in the last 24 hours.':'Review client errors before increasing traffic.')+'</div>'
      +'<div id="launchControlMsg"></div>';
    $('#dash').appendChild(panel);
    panel.querySelectorAll('[data-launch-flag]').forEach(function(input){
      input.addEventListener('change',async function(){
        const flag=input.dataset.launchFlag,enabled=input.checked;
        if(flag==='public_launch'&&enabled&&!confirm('Turn on PUBLIC LAUNCH mode? New accounts will use the public email-confirmation signup flow.')){
          input.checked=false;return;
        }
        if(flag==='maintenance_mode'&&enabled&&!confirm('Turn on maintenance mode? Users will be blocked by the maintenance screen until you switch it off.')){
          input.checked=false;return;
        }
        input.disabled=true;
        const msg=document.getElementById('launchControlMsg');
        if(msg)msg.innerHTML='<div class="notice">Saving launch control…</div>';
        try{
          const next=await api('set_launch_flag',{flag:flag,enabled:enabled});
          renderLaunchControls(next,dashboard);
        }catch(e){
          input.checked=!enabled;
          if(msg)msg.innerHTML='<div class="notice">'+esc(e.message||'Could not update launch control')+'</div>';
        }finally{input.disabled=false}
      });
    });
  }

  function mediaStrip(p){
    const photos=Array.isArray(p.photos)?p.photos:[];
    if(!photos.length) return '<div class="notice">No profile photos uploaded yet.</div>';
    return '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0">'
      +photos.slice(0,8).map(function(x){return '<img src="'+esc(x.url)+'" alt="Profile photo" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:12px">'}).join('')
      +'</div>';
  }

  function renderPending(rows){
    const old=$('#pendingProfilesPanel');
    if(old) old.remove();
    const panel=document.createElement('div');
    panel.className='panel section';
    panel.id='pendingProfilesPanel';
    if(!rows.length){
      panel.innerHTML='<span class="pill">VERIFICATION QUEUE</span><h3 style="margin-bottom:6px">No profiles awaiting review</h3><p class="muted">A profile appears here after its owner submits the required details, three prompt answers, four photos, and a private face video.</p>';
      $('#dash').appendChild(panel);
      return;
    }
    panel.innerHTML='<span class="pill">VERIFICATION QUEUE</span><h3>'+rows.length+' profile'+(rows.length===1?'':'s')+' waiting</h3>'
      +rows.map(function(p){
        const st=p.launch_status||{};
        const ready=!!st.ready_for_review;
        const mediaOnly=p.review_type==='media_update';
        const name=esc(p.display_name||'New user');
        const id=esc(p.id);
        return '<div class="panel" style="margin-top:14px;text-align:left">'
          +'<div class="identity"><img class="avatar" src="'+esc(p.avatar||'')+'"><div><div class="name">'+name+'</div><div class="meta">'+esc(p.city||p.area_label||'Location not added')+' · '+(mediaOnly?'verified identity · media review':esc(p.verification_status||'unverified'))+'</div></div></div>'
          +'<div class="tags" style="margin-top:10px"><span class="tag">'+(mediaOnly?'PHOTO/MEDIA UPDATE':'FULL VERIFICATION')+'</span><span class="tag">Photos '+(Number(st.photo_count)||0)+'/4</span><span class="tag">Face video '+(st.face_video_submitted?'✓ saved':'missing')+'</span><span class="tag">Prompts '+(Array.isArray(p.prompts)?p.prompts.length:0)+'/3</span></div>'
          +mediaStrip(p)
          +'<div class="panel" style="margin:10px 0"><strong>Prompt answers</strong>'
          +(Array.isArray(p.prompts)?p.prompts:[]).map(function(row){
            const kind=String(row.type||'text');
            const media=kind==='audio'&&row.media_url?'<audio src="'+esc(row.media_url)+'" controls></audio>':kind==='video'&&row.media_url?'<video src="'+esc(row.media_url)+'" controls playsinline style="width:100%;max-height:280px"></video>':'';
            return '<div style="margin-top:10px"><small>'+esc(row.question||'Prompt')+'</small><p>'+esc(row.text||'')+'</p>'+media+'</div>';
          }).join('')+'</div>'
          +(p.face_video?'<video src="'+esc(p.face_video)+'" controls playsinline style="width:100%;max-height:340px;border-radius:14px;background:#000;margin:8px 0"></video>':'<div class="notice">Private face-verification video has not been submitted yet.</div>')
          +'<div class="actions" style="margin-top:10px">'
          +(ready?'<button class="btn primary" onclick="verifyPending(\''+id+'\',true)">'+(mediaOnly?'Approve media':'Approve profile')+'</button><button class="btn danger" onclick="verifyPending(\''+id+'\',false)">'+(mediaOnly?'Reject media':'Reject')+'</button>':'<button class="btn" disabled>Waiting for required uploads</button>')
          +'</div><div id="verify-'+id+'"></div></div>';
      }).join('');
    $('#dash').appendChild(panel);
  }

  window.verifyPending=async function(userId,approved){
    if(!approved && !confirm('Reject this verification submission? The profile will remain hidden.')) return;
    const el=document.getElementById('verify-'+userId);
    if(el) el.innerHTML='<div class="notice">Saving review…</div>';
    try{
      await api('verify_profile',{user_id:userId,approved:approved});
      await loadAll();
    }catch(e){
      if(el) el.innerHTML='<div class="notice">'+esc(e.message||'Could not save review')+'</div>';
    }
  };

  loadAll=async function(){
    const j=await api('all');
    live=(j.profiles||[]).map(normalize);
    renderDash(j.dashboard||{});
    renderPending(Array.isArray(j.pending_profiles)?j.pending_profiles:[]);
    try{renderLaunchControls(await api('launch_config'),j.dashboard||{})}catch(e){console.error('Launch controls unavailable',e)}
    buildDeck();
  };
})();
