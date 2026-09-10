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
      panel.innerHTML='<span class="pill">VERIFICATION QUEUE</span><h3 style="margin-bottom:6px">No pending profiles</h3><p class="muted">New friend accounts will appear here until they meet the media requirements and you approve them.</p>';
      $('#dash').appendChild(panel);
      return;
    }
    panel.innerHTML='<span class="pill">VERIFICATION QUEUE</span><h3>'+rows.length+' profile'+(rows.length===1?'':'s')+' waiting</h3>'
      +rows.map(function(p){
        const st=p.launch_status||{};
        const ready=!!st.ready_for_review;
        const name=esc(p.display_name||'New user');
        const id=esc(p.id);
        return '<div class="panel" style="margin-top:14px;text-align:left">'
          +'<div class="identity"><img class="avatar" src="'+esc(p.avatar||'')+'"><div><div class="name">'+name+'</div><div class="meta">'+esc(p.city||p.area_label||'Location not added')+' · '+esc(p.verification_status||'unverified')+'</div></div></div>'
          +'<div class="tags" style="margin-top:10px"><span class="tag">Photos '+(Number(st.photo_count)||0)+'/4</span><span class="tag">Face video '+(st.face_video_submitted?'✓':'missing')+'</span><span class="tag">Setup '+(st.profile_complete?'✓':'incomplete')+'</span></div>'
          +mediaStrip(p)
          +(p.face_video?'<video src="'+esc(p.face_video)+'" controls playsinline style="width:100%;max-height:340px;border-radius:14px;background:#000;margin:8px 0"></video>':'<div class="notice">Private face-verification video has not been submitted yet.</div>')
          +'<div class="actions" style="margin-top:10px">'
          +(ready?'<button class="btn primary" onclick="verifyPending(\''+id+'\',true)">Approve profile</button><button class="btn danger" onclick="verifyPending(\''+id+'\',false)">Reject</button>':'<button class="btn" disabled>Waiting for required uploads</button>')
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
    buildDeck();
  };
})();
