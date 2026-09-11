import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
if(new URLSearchParams(location.search).get('qa')==='1'){
  const sb=createClient('https://rfcoworvfqcqallgpozn.supabase.co','sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const root=document.createElement('aside');root.id='veraQa';root.innerHTML='<div class="vera-qa-head"><strong>VERAMOR Beta QA</strong><button id="veraQaClose">×</button></div><p>Run this in both tester sessions. It checks the live account path without creating fake matches or messages.</p><button class="btn primary full" id="veraQaRun">Run checks</button><div id="veraQaRows"></div>';
  document.body.appendChild(root);
  const style=document.createElement('style');style.textContent='#veraQa{position:fixed;z-index:300;right:12px;bottom:84px;width:min(390px,calc(100vw - 24px));max-height:70vh;overflow:auto;padding:14px;border-radius:18px;background:#121017;border:1px solid rgba(255,255,255,.14);box-shadow:0 24px 80px #000a;color:#fff}#veraQa p{font-size:11px;line-height:1.45;color:#b8afbf}.vera-qa-head{display:flex;align-items:center;justify-content:space-between}.vera-qa-head button{border:0;background:transparent;color:#fff;font-size:20px}.vera-qa-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:11px}.vera-qa-row b.ok{color:#63dba2}.vera-qa-row b.warn{color:#f2c56f}.vera-qa-row b.bad{color:#ff8a9b}';document.head.appendChild(style);
  document.getElementById('veraQaClose').onclick=()=>root.remove();
  const row=(name,status,kind='ok')=>`<div class="vera-qa-row"><span>${name}</span><b class="${kind}">${status}</b></div>`;
  document.getElementById('veraQaRun').onclick=async()=>{
    const host=document.getElementById('veraQaRows');host.innerHTML=row('Running','…','warn');const out=[];
    try{
      const {data:{session}}=await sb.auth.getSession();const u=session?.user;out.push(row('Signed in',u?'YES':'NO',u?'ok':'bad'));if(!u){host.innerHTML=out.join('');return}
      const {data:launch,error:le}=await sb.rpc('profile_launch_status');out.push(row('Profile launch',le?'ERROR':launch?.launch_ready?'READY':'NOT READY',le?'bad':launch?.launch_ready?'ok':'warn'));
      const {data:disc,error:de}=await sb.rpc('get_discovery_candidates');out.push(row('Discovery RPC',de?'ERROR':`${(disc||[]).length} candidates`,de?'bad':'ok'));
      const {data:matches,error:me}=await sb.from('matches').select('*').eq('status','active').or(`user_a.eq.${u.id},user_b.eq.${u.id}`);out.push(row('Active matches',me?'ERROR':String((matches||[]).length),me?'bad':'ok'));
      const chemistry=(matches||[]).filter(m=>m.chemistry_complete_a&&m.chemistry_complete_b).length;out.push(row('Chemistry unlocked',`${chemistry}/${(matches||[]).length}`,chemistry?'ok':'warn'));
      const {error:mge}=await sb.from('messages').select('id').limit(1);out.push(row('Messages access',mge?'ERROR':'OK',mge?'bad':'ok'));
      const {error:we}=await sb.from('watch_rooms').select('id').limit(1);out.push(row('Watch Together backend',we?'ERROR':'OK',we?'bad':'ok'));
      const {error:dae}=await sb.from('date_plans').select('id').limit(1);out.push(row('Plan a Date backend',dae?'ERROR':'OK',dae?'bad':'ok'));
      out.push(row('WebRTC',typeof RTCPeerConnection!=='undefined'?'SUPPORTED':'NO',typeof RTCPeerConnection!=='undefined'?'ok':'bad'));
      out.push(row('Camera / mic',navigator.mediaDevices?.getUserMedia?'SUPPORTED':'NO',navigator.mediaDevices?.getUserMedia?'ok':'bad'));
      const closeCount=document.querySelectorAll('[data-close],.modal .x,.modal .close').length;out.push(row('Popup close controls',closeCount?'FOUND':'MISSING',closeCount?'ok':'bad'));
    }catch(e){out.push(row('QA runner',e.message||'Failed','bad'))}
    host.innerHTML=out.join('');
  };
}
