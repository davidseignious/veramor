import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const groupSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}}
);

let groupUser=null;
let groupState=null;
let groupInviteChannel=null;
const groupEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const GROUP_DEFAULT_ICE=[
  {urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']},
  {urls:'stun:stun.cloudflare.com:3478'}
];
let groupIceCache=null;
async function groupIceServers(){
  if(groupIceCache)return groupIceCache;
  try{
    const r=await fetch('/api/ice',{cache:'no-store',headers:{accept:'application/json'}});
    if(r.ok){
      const x=await r.json();
      if(Array.isArray(x?.iceServers)&&x.iceServers.length){
        groupIceCache=[...x.iceServers,...GROUP_DEFAULT_ICE];
        return groupIceCache;
      }
    }
  }catch(_e){}
  groupIceCache=GROUP_DEFAULT_ICE;
  return groupIceCache;
}
async function groupSessionUser(){
  const {data:{session}}=await groupSb.auth.getSession();
  groupUser=session?.user||null;
  return groupUser;
}
async function groupGetMedia(kind){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Calls are not supported by this browser.');
  try{
    return await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
      video:kind==='video'?{facingMode:'user',width:{ideal:1280},height:{ideal:720}}:false
    });
  }catch(e){
    if(e?.name==='NotAllowedError'||e?.name==='PermissionDeniedError')throw new Error(kind==='video'?'Allow camera and microphone access, then try again.':'Allow microphone access, then try again.');
    throw e;
  }
}
function groupToast(text,type=''){
  let el=document.getElementById('veraGroupToast');
  if(!el){el=document.createElement('div');el.id='veraGroupToast';el.className='vera-live-toast';document.body.appendChild(el)}
  el.className='vera-live-toast '+type;el.textContent=text;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),3600);
}
function installGroupStyles(){
  if(document.getElementById('veraGroupStyles'))return;
  const s=document.createElement('style');s.id='veraGroupStyles';s.textContent=`
    .vera-group-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:14px 0}
    .vera-group-tile{position:relative;min-height:170px;border-radius:18px;overflow:hidden;background:#121212;border:1px solid rgba(255,255,255,.12)}
    .vera-group-tile video{width:100%;height:100%;min-height:170px;object-fit:cover;background:#090909}
    .vera-group-tile.audio video{display:none}
    .vera-group-avatar{position:absolute;inset:0;display:grid;place-items:center;font-size:40px}
    .vera-group-name{position:absolute;left:8px;right:8px;bottom:8px;padding:6px 9px;border-radius:999px;background:rgba(0,0,0,.62);font-size:12px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .vera-group-controls{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin:12px 0}
    .vera-group-picker-list{display:grid;gap:8px;margin:12px 0}
    .vera-group-person{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:14px}
    .vera-group-person input{width:20px;height:20px}
    .vera-group-incoming{position:fixed;z-index:99999;left:12px;right:12px;bottom:18px;max-width:480px;margin:auto;background:#171717;color:white;border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.45)}
    .vera-group-incoming .actions{display:flex;gap:8px;margin-top:12px}
    .vera-group-incoming .actions>*{flex:1}
  `;document.head.appendChild(s);
}
function ensureGroupModal(){
  installGroupStyles();
  let m=document.getElementById('veraGroupModal');
  if(m)return m;
  m=document.createElement('div');m.id='veraGroupModal';m.className='modal hidden';
  m.innerHTML='<div class="sheet"><div class="sheet-head"><div><span class="pill">VERAMOR GROUP LIVE</span><strong id="veraGroupTitle"></strong></div><button class="x" id="veraGroupClose" aria-label="Close">×</button></div><div id="veraGroupBody"></div></div>';
  document.body.appendChild(m);
  document.getElementById('veraGroupClose').onclick=()=>{if(groupState)leaveGroupCall(true);else m.classList.add('hidden')};
  return m;
}
function showGroup(title,html){
  ensureGroupModal();
  document.getElementById('veraGroupTitle').textContent=title;
  document.getElementById('veraGroupBody').innerHTML=html;
  document.getElementById('veraGroupModal').classList.remove('hidden');
}
function hideGroup(){document.getElementById('veraGroupModal')?.classList.add('hidden')}
async function groupProfileName(id){
  const {data}=await groupSb.from('profiles').select('display_name').eq('id',id).maybeSingle();
  return data?.display_name||'Match';
}
async function groupContacts(){
  const u=await groupSessionUser();if(!u)return [];
  const {data:matches,error}=await groupSb.from('matches').select('*').eq('status','active').or(`user_a.eq.${u.id},user_b.eq.${u.id}`).order('created_at',{ascending:false});
  if(error)throw error;
  const ready=(matches||[]).filter(m=>m.chemistry_complete_a&&m.chemistry_complete_b);
  const ids=[...new Set(ready.map(m=>m.user_a===u.id?m.user_b:m.user_a))];
  if(!ids.length)return [];
  const {data:profiles,error:pe}=await groupSb.from('profiles').select('id,display_name,avatar_url').in('id',ids);
  if(pe)throw pe;
  const map=new Map((profiles||[]).map(p=>[p.id,p]));
  return ids.map(id=>map.get(id)||{id,display_name:'Match'}).filter(Boolean);
}
function installGroupButton(){
  const bar=document.querySelector('.vera-live-tools');
  if(!bar||document.getElementById('veraGroupCall'))return;
  const b=document.createElement('button');b.className='btn';b.id='veraGroupCall';b.textContent='👥 Group';
  b.onclick=()=>openGroupPicker().catch(e=>groupToast(e.message||'Could not open group calling.','bad'));
  bar.appendChild(b);
}
async function openGroupPicker(){
  const contacts=await groupContacts();
  showGroup('Group call',`<div class="vera-watch-lobby"><div class="vera-movie-mark">👥</div><h2>Start a group call</h2><p class="muted">Choose 2–5 people. Everyone must already be mutually matched with everyone else in the room.</p>
    <div class="vera-group-picker-list">${contacts.map(p=>`<label class="vera-group-person"><input type="checkbox" class="vera-group-choice" value="${groupEsc(p.id)}"><span><strong>${groupEsc(p.display_name)}</strong><small class="muted" style="display:block">Matched contact</small></span></label>`).join('')||'<div class="notice">You need at least two call-ready matches to start a group call.</div>'}</div>
    <div class="actions"><button class="btn" id="veraGroupVoice">📞 Group voice</button><button class="btn primary" id="veraGroupVideo">🎥 Group video</button></div>
    <div id="veraGroupPickerMsg"></div></div>`);
  const start=kind=>async()=>{
    const ids=[...document.querySelectorAll('.vera-group-choice:checked')].map(x=>x.value);
    if(ids.length<2)return document.getElementById('veraGroupPickerMsg').innerHTML='<div class="notice bad">Choose at least 2 people.</div>';
    if(ids.length>5)return document.getElementById('veraGroupPickerMsg').innerHTML='<div class="notice bad">Group calls support up to 6 people total.</div>';
    await startGroupCall(kind,ids);
  };
  const v=document.getElementById('veraGroupVoice'),x=document.getElementById('veraGroupVideo');
  if(v)v.onclick=start('audio');if(x)x.onclick=start('video');
}
async function startGroupCall(kind,invitees){
  if(groupState)return groupToast('You already have a group call open.','bad');
  let stream;
  try{stream=await groupGetMedia(kind)}catch(e){return groupToast(e.message,'bad')}
  try{
    const {data:room,error}=await groupSb.rpc('start_group_call',{p_kind:kind,p_invitees:invitees});
    if(error)throw error;
    await openGroupRoom(room,stream);
  }catch(e){
    stream?.getTracks().forEach(t=>t.stop());
    groupToast(e.message||'Could not start group call.','bad');
  }
}
function groupRoomMarkup(kind){
  return `<div><p id="veraGroupStatus" class="muted">Connecting group…</p><div id="veraGroupGrid" class="vera-group-grid"></div><div class="vera-group-controls"><button class="vera-round" id="veraGroupMute">🎙️</button>${kind==='video'?'<button class="vera-round" id="veraGroupCamera">📷</button>':''}<button class="vera-round danger" id="veraGroupHangup">✕</button></div><div class="notice">Group calls are live and are not recorded by VERAMOR. Up to 6 people total.</div><div class="notice ok"><strong>$0 Direct Mode</strong> · Group media is peer-to-peer only. No paid relay fallback is allowed.</div></div>`;
}
async function openGroupRoom(room,stream){
  if(groupState)await leaveGroupCall(false);
  showGroup(room.kind==='video'?'Group video call':'Group voice call',groupRoomMarkup(room.kind));
  groupState={room,stream,peers:new Map(),memberChannel:null,signalChannel:null,roomChannel:null,names:new Map(),closed:false};
  await ensureGroupTile(groupUser.id,true,stream);
  document.getElementById('veraGroupMute').onclick=()=>{const t=groupState?.stream?.getAudioTracks?.()[0];if(!t)return;t.enabled=!t.enabled;document.getElementById('veraGroupMute').textContent=t.enabled?'🎙️':'🔇'};
  const cam=document.getElementById('veraGroupCamera');if(cam)cam.onclick=()=>{const t=groupState?.stream?.getVideoTracks?.()[0];if(!t)return;t.enabled=!t.enabled;cam.textContent=t.enabled?'📷':'🚫'};
  document.getElementById('veraGroupHangup').onclick=()=>leaveGroupCall(true);
  await subscribeGroupRoom();
  await reconcileGroupMembers();
}
async function ensureGroupTile(id,isLocal=false,stream=null){
  if(!groupState)return null;
  let tile=document.getElementById('veraGroupTile-'+id);
  if(tile)return tile;
  const name=isLocal?'You':await groupProfileName(id);
  groupState.names.set(id,name);
  tile=document.createElement('div');tile.id='veraGroupTile-'+id;tile.className='vera-group-tile '+(groupState.room.kind==='audio'?'audio':'');
  tile.innerHTML=`<video id="veraGroupVideo-${groupEsc(id)}" autoplay playsinline ${isLocal?'muted':''}></video><div class="vera-group-avatar">♥</div><div class="vera-group-name">${groupEsc(name)}</div>`;
  document.getElementById('veraGroupGrid')?.appendChild(tile);
  if(stream){const v=tile.querySelector('video');v.srcObject=stream;v.play?.().catch(()=>{})}
  return tile;
}
async function sendGroupSignal(recipient,type,payload){
  if(!groupState)return;
  const {error}=await groupSb.from('group_call_signals').insert({room_id:groupState.room.id,sender_id:groupUser.id,recipient_id:recipient,signal_type:type,payload});
  if(error)throw error;
}
async function ensureGroupPeer(remoteId,initiate=false){
  if(!groupState||remoteId===groupUser.id)return null;
  let p=groupState.peers.get(remoteId);if(p)return p;
  const pc=new RTCPeerConnection({iceServers:await groupIceServers(),iceCandidatePoolSize:6,bundlePolicy:'max-bundle'});
  const remoteStream=new MediaStream();
  const pendingIce=[];
  groupState.stream.getTracks().forEach(t=>pc.addTrack(t,groupState.stream));
  p={pc,remoteStream,pendingIce,remoteId,restarting:false};
  groupState.peers.set(remoteId,p);
  await ensureGroupTile(remoteId,false,remoteStream);
  pc.ontrack=e=>{
    for(const t of e.streams[0]?.getTracks?.()||[e.track]){
      if(!remoteStream.getTracks().some(x=>x.id===t.id))remoteStream.addTrack(t);
    }
    const v=document.getElementById('veraGroupVideo-'+remoteId);if(v){v.srcObject=remoteStream;v.play?.().catch(()=>{})}
  };
  pc.onicecandidate=e=>{if(e.candidate)sendGroupSignal(remoteId,'ice',e.candidate.toJSON()).catch(()=>{})};
  pc.onconnectionstatechange=()=>{
    if(!groupState)return;
    if(pc.connectionState==='connected')document.getElementById('veraGroupStatus').textContent='Group connected';
    if(pc.connectionState==='failed'&&groupUser.id.localeCompare(remoteId)<0){
      restartGroupPeer(remoteId).catch(()=>{});
      setTimeout(()=>{
        if(groupState&&pc.connectionState==='failed'){
          const n=groupState.names.get(remoteId)||'a participant';
          const s=document.getElementById('veraGroupStatus');
          if(s)s.textContent='$0 Direct Mode could not connect to '+n+'. Try switching networks and rejoin.';
        }
      },4200);
    }
  };
  if(initiate){
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);await sendGroupSignal(remoteId,'offer',offer.toJSON());
  }
  return p;
}
async function restartGroupPeer(remoteId){
  const p=groupState?.peers.get(remoteId);if(!p||p.restarting)return;p.restarting=true;
  try{p.pc.restartIce?.();const offer=await p.pc.createOffer({iceRestart:true});await p.pc.setLocalDescription(offer);await sendGroupSignal(remoteId,'offer',offer.toJSON())}finally{if(p)p.restarting=false}
}
async function processGroupSignal(sig){
  if(!groupState||sig.room_id!==groupState.room.id||sig.recipient_id!==groupUser.id)return;
  const remote=sig.sender_id;
  const p=await ensureGroupPeer(remote,false);if(!p)return;
  try{
    if(sig.signal_type==='offer'){
      if(p.pc.signalingState!=='stable'){try{await p.pc.setLocalDescription({type:'rollback'})}catch(_e){}}
      await p.pc.setRemoteDescription(sig.payload);
      for(const ice of p.pendingIce.splice(0))await p.pc.addIceCandidate(ice);
      const answer=await p.pc.createAnswer();await p.pc.setLocalDescription(answer);await sendGroupSignal(remote,'answer',answer.toJSON());
    }else if(sig.signal_type==='answer'){
      if(p.pc.signalingState==='have-local-offer'){
        await p.pc.setRemoteDescription(sig.payload);
        for(const ice of p.pendingIce.splice(0))await p.pc.addIceCandidate(ice);
      }
    }else if(sig.signal_type==='ice'){
      const ice=new RTCIceCandidate(sig.payload);
      if(p.pc.remoteDescription)await p.pc.addIceCandidate(ice);else p.pendingIce.push(ice);
    }
  }catch(e){console.error('VERAMOR group signal error',e)}
}
async function subscribeGroupRoom(){
  const roomId=groupState.room.id;
  groupState.signalChannel=groupSb.channel('vera-group-sig-'+roomId+'-'+groupUser.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_call_signals',filter:`recipient_id=eq.${groupUser.id}`},p=>processGroupSignal(p.new))
    .subscribe();
  groupState.memberChannel=groupSb.channel('vera-group-members-'+roomId)
    .on('postgres_changes',{event:'*',schema:'public',table:'group_call_members',filter:`room_id=eq.${roomId}`},()=>reconcileGroupMembers().catch(()=>{}))
    .subscribe();
  groupState.roomChannel=groupSb.channel('vera-group-room-'+roomId)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'group_call_rooms',filter:`id=eq.${roomId}`},p=>{if(p.new?.status==='ended')leaveGroupCall(false)})
    .subscribe();
  const {data}=await groupSb.from('group_call_signals').select('*').eq('room_id',roomId).eq('recipient_id',groupUser.id).order('id',{ascending:true});
  for(const sig of data||[])await processGroupSignal(sig);
}
async function reconcileGroupMembers(){
  if(!groupState)return;
  const {data,error}=await groupSb.from('group_call_members').select('*').eq('room_id',groupState.room.id);
  if(error)throw error;
  const joined=(data||[]).filter(x=>x.status==='joined').map(x=>x.user_id);
  for(const id of joined){
    if(id===groupUser.id)continue;
    await ensureGroupTile(id,false,null);
    await ensureGroupPeer(id,groupUser.id.localeCompare(id)<0);
  }
  for(const [id,p] of [...groupState.peers]){
    if(!joined.includes(id)){
      try{p.pc.close()}catch(_e){};groupState.peers.delete(id);document.getElementById('veraGroupTile-'+id)?.remove();
    }
  }
  const waiting=(data||[]).filter(x=>x.status==='invited').length;
  const status=document.getElementById('veraGroupStatus');if(status)status.textContent=`${joined.length} joined${waiting?' · '+waiting+' invited':''}`;
}
async function leaveGroupCall(updateServer){
  const s=groupState;if(!s){hideGroup();return}groupState=null;
  if(updateServer)try{await groupSb.rpc('leave_group_call',{p_room:s.room.id})}catch(_e){}
  for(const p of s.peers.values()){try{p.pc.close()}catch(_e){};p.remoteStream?.getTracks?.().forEach(t=>t.stop())}
  s.stream?.getTracks?.().forEach(t=>t.stop());
  if(s.signalChannel)groupSb.removeChannel(s.signalChannel);if(s.memberChannel)groupSb.removeChannel(s.memberChannel);if(s.roomChannel)groupSb.removeChannel(s.roomChannel);
  hideGroup();
}
async function showGroupInvite(member){
  if(groupState||document.getElementById('veraGroupIncoming'))return;
  const {data:room}=await groupSb.from('group_call_rooms').select('*').eq('id',member.room_id).maybeSingle();
  if(!room||room.status!=='active')return;
  const host=await groupProfileName(room.host_id);
  const d=document.createElement('div');d.id='veraGroupIncoming';d.className='vera-group-incoming';
  d.innerHTML=`<span class="pill">GROUP ${room.kind==='video'?'VIDEO':'VOICE'} CALL</span><h2>${groupEsc(host)} invited you</h2><p>Join the live group call?</p><div class="actions"><button class="btn danger" id="veraGroupDecline">Decline</button><button class="btn primary" id="veraGroupAccept">Join</button></div>`;document.body.appendChild(d);
  document.getElementById('veraGroupDecline').onclick=async()=>{try{await groupSb.rpc('respond_group_call',{p_room:room.id,p_accept:false})}catch(_e){}d.remove()};
  document.getElementById('veraGroupAccept').onclick=async()=>{let stream;const b=document.getElementById('veraGroupAccept');b.disabled=true;b.textContent='Joining…';try{stream=await groupGetMedia(room.kind);const {error}=await groupSb.rpc('respond_group_call',{p_room:room.id,p_accept:true});if(error)throw error;d.remove();await openGroupRoom(room,stream)}catch(e){stream?.getTracks().forEach(t=>t.stop());groupToast(e.message||'Could not join group call.','bad');b.disabled=false;b.textContent='Join'}};
}
async function installGroupInvites(){
  const u=await groupSessionUser();if(!u)return;
  if(groupInviteChannel)groupSb.removeChannel(groupInviteChannel);
  groupInviteChannel=groupSb.channel('vera-group-invites-'+u.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_call_members',filter:`user_id=eq.${u.id}`},p=>{if(p.new?.status==='invited')showGroupInvite(p.new).catch(()=>{})})
    .subscribe();
  const {data}=await groupSb.from('group_call_members').select('*').eq('user_id',u.id).eq('status','invited').order('created_at',{ascending:false}).limit(1);
  if(data?.[0])showGroupInvite(data[0]).catch(()=>{});
}
function watchForGroupTools(){
  installGroupButton();
  new MutationObserver(()=>installGroupButton()).observe(document.body,{childList:true,subtree:true});
}
async function bootGroupLive(){
  await groupSessionUser();if(!groupUser)return;
  ensureGroupModal();watchForGroupTools();await installGroupInvites();
}
window.addEventListener('load',()=>bootGroupLive().catch(e=>console.error('VERAMOR group live failed',e)));
groupSb.auth.onAuthStateChange((event,session)=>{
  groupUser=session?.user||null;
  if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')bootGroupLive().catch(()=>{});
  if(event==='SIGNED_OUT'){if(groupInviteChannel)groupSb.removeChannel(groupInviteChannel);document.getElementById('veraGroupIncoming')?.remove();leaveGroupCall(false).catch(()=>{})}
});
