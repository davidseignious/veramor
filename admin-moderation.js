(function(){
  const baseLoadAll=loadAll;

  function priorityLabel(n){
    n=Number(n)||1;
    if(n>=3)return 'URGENT';
    if(n===2)return 'HIGH';
    return 'NORMAL';
  }

  function renderReports(rows){
    const old=$('#reportsPanel');
    if(old) old.remove();
    const panel=document.createElement('div');
    panel.className='panel section';
    panel.id='reportsPanel';
    const list=Array.isArray(rows)?rows:[];
    if(!list.length){
      panel.innerHTML='<span class="pill">SAFETY QUEUE</span><h3 style="margin-bottom:6px">No open reports</h3><p class="muted">User safety reports will appear here with priority and moderation controls.</p>';
      $('#dash').appendChild(panel);
      return;
    }
    panel.innerHTML='<span class="pill">SAFETY QUEUE</span><h3>'+list.length+' open report'+(list.length===1?'':'s')+'</h3>'+
      list.map(function(r){
        const id=esc(r.id),name=esc(r.reported_name||'Unknown user'),reason=esc(r.reason||'Other'),details=esc(r.details||'No additional details');
        const ctx=r.safety_context&&typeof r.safety_context==='object'?r.safety_context:{};
        const contextHtml=(ctx.surface||ctx.message_id||ctx.message_excerpt)?'<div class="notice"><strong>Report context: '+esc(ctx.surface||'profile')+'</strong>'+(ctx.message_excerpt?'<div style="margin-top:6px">“'+esc(ctx.message_excerpt)+'”</div>':'')+(ctx.message_id?'<small class="muted">Message '+esc(ctx.message_id)+'</small>':'')+'</div>':'';
        const avatar=r.reported_avatar?'<img class="avatar" src="'+esc(r.reported_avatar)+'" alt="Reported profile">':'<div class="avatar" style="display:grid;place-items:center">?</div>';
        return '<div class="panel" style="margin-top:14px;text-align:left" data-report-card="'+id+'">'+
          '<div class="identity">'+avatar+'<div><div class="name">'+name+'</div><div class="meta">'+esc(r.reported_city||'Location unavailable')+' · '+esc(r.reported_profile_status||'unknown')+'</div></div></div>'+
          '<div class="tags" style="margin-top:10px"><span class="tag">'+priorityLabel(r.priority)+'</span><span class="tag">'+esc(r.status||'open')+'</span></div>'+
          '<p style="margin-bottom:6px"><strong>'+reason+'</strong></p><p class="muted">'+details+'</p>'+contextHtml+
          '<div class="actions"><button class="btn" data-report-action="reviewing" data-report="'+id+'">Reviewing</button><button class="btn danger" data-report-action="pause_profile" data-report="'+id+'">Pause profile</button><button class="btn danger" data-report-action="ban_profile" data-report="'+id+'">Ban</button><button class="btn" data-report-action="dismiss" data-report="'+id+'">Dismiss</button><button class="btn primary" data-report-action="resolve" data-report="'+id+'">Resolve</button></div>'+
          '<div id="report-msg-'+id+'"></div></div>';
      }).join('');
    $('#dash').appendChild(panel);
    panel.querySelectorAll('[data-report-action]').forEach(function(btn){
      btn.addEventListener('click',async function(){
        const action=btn.dataset.reportAction,reportId=btn.dataset.report;
        if((action==='ban_profile'||action==='pause_profile')&&!confirm(action==='ban_profile'?'Ban this profile and end its active connections?':'Pause this profile and suspend its active connections?'))return;
        const note=prompt('Optional moderation note (leave blank if none):','')||'';
        const msg=document.getElementById('report-msg-'+reportId);
        if(msg)msg.innerHTML='<div class="notice">Saving moderation action…</div>';
        try{
          await api('moderate_report',{report_id:reportId,moderation_action:action,note:note});
          await loadAll();
        }catch(e){
          if(msg)msg.innerHTML='<div class="notice">'+esc(e.message||'Could not save moderation action')+'</div>';
        }
      });
    });
  }

  loadAll=async function(){
    await baseLoadAll();
    try{renderReports(await api('reports'))}catch(e){console.error('Report queue unavailable',e)}
  };
})();
