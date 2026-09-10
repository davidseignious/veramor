import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const liveSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

let liveUser=null;
let currentContext=null;
let callState=null;
let incomingChannel=null;
let watchInviteChannel=null;
let watchState=null;

const lEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function liveToast(text,type=''){
  let t=document.getElementById('veraLiveToast');
  if(!t){t=document.createElement('div');t.id='veraLiveToast';t.className='vera-live-toast';document.body.appendChild(t)}
  t.className=`vera-live-toast ${type}`;t.textContent=text;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),3600);
}
async function sessionUser(){const {data:{session}}=await liveSb.auth.getSession();liveUser=session?.user||null;return liveUser}
async function profileName(id){const {data}=await liveSb.from('profiles').select('display_name').eq('id',id).maybeSingle();return data?.display_name||'Your match'}
async function activeMatches(){
  const u=await sessionUser();if(!u)return [];
  const {data,error}=await liveSb.from('matches').select('*').eq('status','active').or(`user_a.eq.${u.id},user_b.eq.${u.id}`).order('created_at',{ascending:false});
  if(error)throw error;return data||[];
}
async function resolveContext(){
  const u=await sessionUser();if(!u)return null;
  const title=(document.getElementById('matchModalTitle')?.textContent||'').trim();
  const rows=await activeMatches();
  if(currentContext&&rows.some(m=>m.id===currentContext.match.id))return currentContext;
  for(const m of rows){
    if(!(m.chemistry_complete_a&&m.chemistry_complete_b))continue;
    const otherId=m.user_a===u.id?m.user_b:m.user_a;
    const name=await profileName(otherId);
    if(name===title){currentContext={match:m,otherId,otherName:name};return currentContext}
  }
  if(rows.length===1&&rows[0].chemistry_complete_a&&rows[0].chemistry_complete_b){const m=rows[0],otherId=m.user_a===u.id?m.user_b:m.user_a;currentContext={match:m,otherId,otherName:await profileName(otherId)};return currentContext}
  return null;
}

function ensureLiveModal(){
  if(document.getElementById('veraLiveModal'))return;
  const m=document.createElement('div');m.id='veraLiveModal';m.className='modal hidden vera-live-modal';m.innerHTML='<div class="sheet vera-live-sheet"><div class="sheet-head"><div><span class="pill">VERAMOR LIVE</span><strong id="veraLiveTitle"></strong></div><button class="x" id="veraLiveClose" aria-label="Close">×</button></div><div id="veraLiveBody"></div></div>';document.body.appendChild(m);
  document.getElementById('veraLiveClose').onclick=async()=>{if(callState)await endCurrentCall(true);else if(watchState)await closeWatch(false);else m.classList.add('hidden')};
}
function showLive(title,html){ensureLiveModal();document.getElementById('veraLiveTitle').textContent=title;document.getElementById('veraLiveBody').innerHTML=html;document.getElementById('veraLiveModal').classList.remove('hidden')}
function hideLive(){document.getElementById('veraLiveModal')?.classList.add('hidden')}

function installSettings(){
  const host=document.getElementById('settingsView');if(!host||document.getElementById('livePrivacySettings'))return;
  const p=document.createElement('div');p.id='livePrivacySettings';p.className='panel';p.innerHTML=`<div class="section-title"><div><span class="pill">LIVE</span><h3 style="margin:7px 0 0">Calls & Watch Together</h3></div><span style="font-size:25px">◉</span></div>
    <p class="muted">Calls only work with active matches after both Chemistry Checks. You always choose whether to accept.</p>
    <label class="vera-live-setting"><span><strong>Allow voice & video call requests</strong><small>You can still decline any call.</small></span><input id="callsEnabled" type="checkbox" checked></label>
    <label class="vera-live-setting"><span><strong>Allow Watch Together invites</strong><small>YouTube sync + movie-night countdown.</small></span><input id="watchEnabled" type="checkbox" checked></label>
    <button class="btn full" id="saveLiveSettings">Save live settings</button><div id="liveSettingsMsg"></div>`;
  const danger=host.querySelector('.danger-zone');if(danger)host.insertBefore(p,danger);else host.appendChild(p);
  document.getElementById('saveLiveSettings').onclick=saveLiveSettings;
  loadLiveSettings().catch(()=>{});
}
async function loadLiveSettings(){const u=await sessionUser();if(!u)return;const {data}=await liveSb.from('user_settings').select('calls_enabled,watch_together_enabled').eq('user_id',u.id).maybeSingle();if(document.getElementById('callsEnabled'))document.getElementById('callsEnabled').checked=data?.calls_enabled!==false;if(document.getElementById('watchEnabled'))document.getElementById('watchEnabled').checked=data?.watch_together_enabled!==false}
async function saveLiveSettings(){const u=await sessionUser();if(!u)return;const b=document.getElementById('saveLiveSettings');b.disabled=true;b.textContent='Saving…';try{const {error}=await liveSb.from('user_settings').update({calls_enabled:!!document.getElementById('callsEnabled')?.checked,watch_together_enabled:!!document.getElementById('watchEnabled')?.checked,updated_at:new Date().toISOString()}).eq('user_id',u.id);if(error)throw error;document.getElementById('liveSettingsMsg').innerHTML='<div class="notice ok">Live settings saved.</div>'}catch(e){document.getElementById('liveSettingsMsg').innerHTML=`<div class="notice bad">${lEsc(e.message||'Could not save settings.')}</div>`}finally{b.disabled=false;b.textContent='Save live settings'}}

function installChatTools(){
  const chat=document.getElementById('chatMessages');if(!chat||document.getElementById('veraLiveTools'))return;
  const bar=document.createElement('div');bar.id='veraLiveTools';bar.className='vera-live-tools';bar.innerHTML='<button class="btn" id="veraVoiceCall">📞 Voice</button><button class="btn" id="veraVideoCall">🎥 Video</button><button class="btn vera-movie-btn" id="veraWatchTogether">🎬 Watch Together</button>';
  chat.insertAdjacentElement('beforebegin',bar);
  document.getElementById('veraVoiceCall').onclick=()=>startOutgoingCall('audio');
  document.getElementById('veraVideoCall').onclick=()=>startOutgoingCall('video');
  document.getElementById('veraWatchTogether').onclick=()=>openWatchLobby();
}

async function getMedia(kind){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Calls are not supported by this browser.');
  return navigator.mediaDevices.getUserMedia({audio:true,video:kind==='video'?{facingMode:'user'}:false});
}
function callMarkup(name,kind,status){return `<div class="vera-call-stage ${kind}">
  <div class="vera-call-name"><span class="pill">${kind==='video'?'VIDEO':'VOICE'} CALL</span><h2>${lEsc(name)}</h2><p id="veraCallStatus" class="muted">${lEsc(status)}</p></div>
  <div class="vera-video-stage ${kind==='audio'?'audio-only':''}"><video id="veraRemoteVideo" autoplay playsinline></video><video id="veraLocalVideo" autoplay playsinline muted></video><div class="vera-call-avatar">♥</div></div>
  <div class="vera-call-controls"><button class="vera-round" id="veraMute" title="Mute">🎙️</button>${kind==='video'?'<button class="vera-round" id="veraCamera" title="Camera">📷</button>':''}<button class="vera-round" id="veraSpeaker" title="Speaker">🔊</button><button class="vera-round danger" id="veraHangup" title="End call">✕</button></div>
  <button class="btn full" id="veraCallSafety">Safety / report</button><div class="notice">Calls are live and are not recorded by VERAMOR.</div></div>`}
function setCallStatus(text){const el=document.getElementById('veraCallStatus');if(el)el.textContent=text}
async function insertSignal(callId,type,payload){const u=await sessionUser();if(!u)return;const {error}=await liveSb.from('call_signals').insert({call_id:callId,sender_id:u.id,signal_type:type,payload});if(error)throw error}
async function buildPeer(row,stream,isCaller){
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  const remoteStream=new MediaStream();
  stream.getTracks().forEach(t=>pc.addTrack(t,stream));
  pc.ontrack=e=>{for(const t of e.streams[0]?.getTracks?.()||[e.track])if(!remoteStream.getTracks().some(x=>x.id===t.id))remoteStream.addTrack(t);const v=document.getElementById('veraRemoteVideo');if(v&&!v.srcObject)v.srcObject=remoteStream};
  pc.onicecandidate=e=>{if(e.candidate)insertSignal(row.id,'ice',e.candidate.toJSON()).catch(()=>{})};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected')setCallStatus('Connected');if(['failed','disconnected'].includes(pc.connectionState))setCallStatus(pc.connectionState==='failed'?'Connection failed':'Reconnecting…')};
  callState={...(callState||{}),row,pc,stream,remoteStream,isCaller,pendingIce:[],processed:new Set()};
  const local=document.getElementById('veraLocalVideo');if(local){local.srcObject=stream;local.classList.toggle('hidden',row.kind!=='video')}
  return pc;
}
async function processSignal(sig){
  if(!callState||sig.call_id!==callState.row.id||sig.sender_id===liveUser?.id||callState.processed.has(sig.id))return;
  callState.processed.add(sig.id);const pc=callState.pc;
  try{
    if(sig.signal_type==='offer'&&!callState.isCaller){await pc.setRemoteDescription(sig.payload);for(const c of callState.pendingIce.splice(0))await pc.addIceCandidate(c);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await insertSignal(sig.call_id,'answer',answer.toJSON());setCallStatus('Connecting…')}
    else if(sig.signal_type==='answer'&&callState.isCaller){await pc.setRemoteDescription(sig.payload);for(const c of callState.pendingIce.splice(0))await pc.addIceCandidate(c);setCallStatus('Connecting…')}
    else if(sig.signal_type==='ice'){const candidate=new RTCIceCandidate(sig.payload);if(pc.remoteDescription)await pc.addIceCandidate(candidate);else callState.pendingIce.push(candidate)}
  }catch(e){console.error('VERAMOR call signal error',e)}
}
async function subscribeCall(row){
  const sig=liveSb.channel(`vera-call-sig-${row.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'call_signals',filter:`call_id=eq.${row.id}`},p=>processSignal(p.new)).subscribe();
  const status=liveSb.channel(`vera-call-state-${row.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'call_sessions',filter:`id=eq.${row.id}`},p=>handleCallStatus(p.new)).subscribe();
  callState.signalChannel=sig;callState.statusChannel=status;
  const {data}=await liveSb.from('call_signals').select('*').eq('call_id',row.id).order('id',{ascending:true});for(const x of data||[])await processSignal(x);
}
async function handleCallStatus(row){
  if(!callState||row.id!==callState.row.id)return;callState.row=row;
  if(row.status==='accepted'){setCallStatus('Connecting…')}
  if(['declined','missed','cancelled','ended'].includes(row.status)){setCallStatus(row.status==='missed'?'No answer':row.status==='declined'?'Call declined':'Call ended');await sleep(650);await endCurrentCall(false)}
}
function bindCallControls(){
  document.getElementById('veraMute').onclick=()=>{const t=callState?.stream?.getAudioTracks?.()[0];if(!t)return;t.enabled=!t.enabled;document.getElementById('veraMute').textContent=t.enabled?'🎙️':'🔇'};
  const cam=document.getElementById('veraCamera');if(cam)cam.onclick=()=>{const t=callState?.stream?.getVideoTracks?.()[0];if(!t)return;t.enabled=!t.enabled;cam.textContent=t.enabled?'📷':'🚫'};
  document.getElementById('veraSpeaker').onclick=()=>{const v=document.getElementById('veraRemoteVideo');if(!v)return;v.muted=!v.muted;document.getElementById('veraSpeaker').textContent=v.muted?'🔈':'🔊'};
  document.getElementById('veraHangup').onclick=()=>endCurrentCall(true);
  document.getElementById('veraCallSafety').onclick=async()=>{await endCurrentCall(true);document.getElementById('chatSafety')?.click()};
}
async function startOutgoingCall(kind){
  if(callState)return liveToast('You already have a call open.','bad');
  const ctx=await resolveContext();if(!ctx)return liveToast('Open an active match first.','bad');
  let stream;try{stream=await getMedia(kind)}catch(e){return liveToast(e.message||'Camera or microphone permission was not granted.','bad')}
  try{
    const {data:row,error}=await liveSb.rpc('request_veramor_call',{p_match:ctx.match.id,p_kind:kind});if(error)throw error;
    showLive(`${kind==='video'?'Video':'Voice'} call`,callMarkup(ctx.otherName,kind,'Ringing…'));
    callState={row,stream};await buildPeer(row,stream,true);bindCallControls();await subscribeCall(row);
    const offer=await callState.pc.createOffer();await callState.pc.setLocalDescription(offer);await insertSignal(row.id,'offer',offer.toJSON());
  }catch(e){stream?.getTracks().forEach(t=>t.stop());callState=null;hideLive();liveToast(e.message||'Could not start the call.','bad')}
}
async function showIncomingCall(row){
  if(callState||document.getElementById('veraIncomingCall'))return;
  const name=await profileName(row.caller_id);const w=document.createElement('div');w.id='veraIncomingCall';w.className='vera-incoming';w.innerHTML=`<div class="vera-incoming-ring">${row.kind==='video'?'🎥':'📞'}</div><span class="pill">INCOMING ${row.kind==='video'?'VIDEO':'VOICE'} CALL</span><h2>${lEsc(name)}</h2><p>${row.kind==='video'?'Wants to video chat':'Wants to talk'}</p><div class="actions"><button class="btn danger" id="declineIncoming">Decline</button><button class="btn primary" id="acceptIncoming">Accept</button></div>`;document.body.appendChild(w);
  const dismiss=()=>w.remove();
  document.getElementById('declineIncoming').onclick=async()=>{try{await liveSb.rpc('respond_veramor_call',{p_call:row.id,p_accept:false})}catch(_e){}dismiss()};
  document.getElementById('acceptIncoming').onclick=async()=>{let stream;const b=document.getElementById('acceptIncoming');b.disabled=true;b.textContent='Opening…';try{stream=await getMedia(row.kind);const {data:updated,error}=await liveSb.rpc('respond_veramor_call',{p_call:row.id,p_accept:true});if(error)throw error;dismiss();showLive(`${row.kind==='video'?'Video':'Voice'} call`,callMarkup(name,row.kind,'Connecting…'));callState={row:updated||row,stream};await buildPeer(updated||row,stream,false);bindCallControls();await subscribeCall(updated||row)}catch(e){stream?.getTracks().forEach(t=>t.stop());liveToast(e.message||'Could not accept call.','bad');b.disabled=false;b.textContent='Accept'}};
  const ms=Math.max(0,new Date(row.expires_at).getTime()-Date.now());setTimeout(()=>{if(document.body.contains(w))dismiss()},Math.min(ms+500,65000));
}
async function endCurrentCall(endServer){
  const c=callState;if(!c){hideLive();return}callState=null;
  if(endServer)try{await liveSb.rpc('end_veramor_call',{p_call:c.row.id})}catch(_e){}
  try{c.pc?.close()}catch(_e){};c.stream?.getTracks?.().forEach(t=>t.stop());c.remoteStream?.getTracks?.().forEach(t=>t.stop());
  if(c.signalChannel)liveSb.removeChannel(c.signalChannel);if(c.statusChannel)liveSb.removeChannel(c.statusChannel);hideLive();
}

async function installIncomingCalls(){
  const u=await sessionUser();if(!u)return;if(incomingChannel)liveSb.removeChannel(incomingChannel);
  incomingChannel=liveSb.channel(`vera-incoming-${u.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'call_sessions',filter:`callee_id=eq.${u.id}`},p=>{if(p.new?.status==='ringing')showIncomingCall(p.new).catch(()=>{})}).subscribe();
  const {data}=await liveSb.from('call_sessions').select('*').eq('callee_id',u.id).eq('status','ringing').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1);if(data?.[0])showIncomingCall(data[0]).catch(()=>{});
}

function youtubeId(raw){try{const u=new URL(raw);if(u.hostname==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]?.slice(0,11)||null;if(/(^|\.)youtube\.com$/.test(u.hostname)||/(^|\.)youtube-nocookie\.com$/.test(u.hostname)){if(u.pathname.startsWith('/shorts/')||u.pathname.startsWith('/embed/'))return u.pathname.split('/')[2]?.slice(0,11)||null;return u.searchParams.get('v')?.slice(0,11)||null}}catch(_e){}return /^[A-Za-z0-9_-]{11}$/.test(raw)?raw:null}
function supportedExternal(raw){try{const h=new URL(raw).hostname.toLowerCase().replace(/^www\./,'');return ['netflix.com','play.max.com','max.com','hulu.com','disneyplus.com','primevideo.com','amazon.com','peacocktv.com','paramountplus.com','tubitv.com','pluto.tv','tv.apple.com'].some(d=>h===d||h.endsWith('.'+d))}catch(_e){return false}}
async function activeWatch(matchId){const {data,error}=await liveSb.from('watch_rooms').select('*').eq('match_id',matchId).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data||null}
async function openWatchLobby(){
  const ctx=await resolveContext();if(!ctx)return liveToast('Open an active match first.','bad');
  const existing=await activeWatch(ctx.match.id).catch(()=>null);if(existing)return openWatchRoom(existing,ctx.otherName);
  showLive('Watch Together',`<div class="vera-watch-lobby"><div class="vera-movie-mark">🎬</div><h2>Movie night with ${lEsc(ctx.otherName)}</h2><p class="muted">Paste a YouTube link for synchronized playback, or a supported streaming-service link for a shared 3…2…1 start.</p><div class="field"><label>Video or movie link</label><input class="input" id="veraWatchUrl" inputmode="url" placeholder="https://youtu.be/... or your streaming-service link"></div><div class="field"><label>Title <span class="muted">(optional)</span></label><input class="input" id="veraWatchTitle" maxlength="160" placeholder="Tonight’s pick"></div><button class="btn primary full" id="veraStartWatch">Start Watch Together</button><div id="veraWatchMsg"></div><div class="notice">VERAMOR does not copy or rebroadcast movies. For Netflix, Max and similar services, each person uses their own authorized account.</div></div>`);
  document.getElementById('veraStartWatch').onclick=async()=>{const raw=document.getElementById('veraWatchUrl').value.trim(),title=document.getElementById('veraWatchTitle').value.trim();const yid=youtubeId(raw);const provider=yid?'youtube':'external';if(!yid&&!supportedExternal(raw)){document.getElementById('veraWatchMsg').innerHTML='<div class="notice bad">Use a YouTube, Netflix, Max, Hulu, Disney+, Prime Video, Peacock, Paramount+, Tubi, Pluto TV, or Apple TV link.</div>';return}const b=document.getElementById('veraStartWatch');b.disabled=true;b.textContent='Starting…';try{const {data,error}=await liveSb.rpc('start_watch_together',{p_match:ctx.match.id,p_provider:provider,p_video_id:yid||null,p_source_url:yid?null:raw,p_title:title||null});if(error)throw error;await openWatchRoom(data,ctx.otherName)}catch(e){document.getElementById('veraWatchMsg').innerHTML=`<div class="notice bad">${lEsc(e.message||'Could not start Watch Together.')}</div>`;b.disabled=false;b.textContent='Start Watch Together'}};
}

let ytPromise=null;
function loadYouTubeAPI(){
  if(window.YT?.Player)return Promise.resolve(window.YT);if(ytPromise)return ytPromise;
  ytPromise=new Promise((resolve,reject)=>{const prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{try{prev?.()}catch(_e){}resolve(window.YT)};const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;s.onerror=()=>reject(new Error('YouTube player could not load.'));document.head.appendChild(s)});return ytPromise;
}
async function openWatchRoom(room,otherName='Your match'){
  if(watchState)await closeWatch(false);watchState={room,otherName,applyingUntil:0,channel:null,player:null,syncTimer:null,countTimer:null};
  if(room.provider==='youtube'){
    showLive('Watch Together',`<div class="vera-watch-room"><div class="section-title"><div><span class="pill">SYNCED YOUTUBE</span><h2 style="margin:7px 0 0">${lEsc(room.title||'Watch Together')}</h2></div><span class="vera-live-dot">● LIVE</span></div><div id="veraYoutubePlayer" class="vera-youtube-player"></div><p id="veraWatchStatus" class="muted">Loading synchronized player…</p><div class="actions"><button class="btn" id="veraResync">Resync</button><button class="btn danger" id="veraEndWatch">End room</button></div><div class="notice">Either person can play, pause or seek. VERAMOR syncs the controls; YouTube still serves the video.</div></div>`);
    document.getElementById('veraEndWatch').onclick=()=>closeWatch(true);document.getElementById('veraResync').onclick=()=>applyWatchState(watchState.room,true);
    try{const YT=await loadYouTubeAPI();if(!watchState||watchState.room.id!==room.id)return;watchState.player=new YT.Player('veraYoutubePlayer',{videoId:room.video_id,playerVars:{playsinline:1,rel:0,origin:location.origin},events:{onReady:()=>{applyWatchState(watchState.room,true);startWatchHeartbeat()},onStateChange:e=>youtubeLocalState(e),onError:()=>{const x=document.getElementById('veraWatchStatus');if(x)x.textContent='This YouTube video may not allow embedded playback. Try another video.'}}})}catch(e){const x=document.getElementById('veraWatchStatus');if(x)x.textContent=e.message||'YouTube player could not load.'}
  }else{
    let host='streaming service';try{host=new URL(room.source_url).hostname.replace(/^www\./,'')}catch(_e){}
    showLive('Movie Night',`<div class="vera-watch-room external"><div class="vera-movie-mark">🍿</div><span class="pill">MOVIE NIGHT</span><h2>${lEsc(room.title||'Watch together')}</h2><p class="muted">Both of you open ${lEsc(host)} on your own accounts. Then use the synchronized countdown.</p><a class="btn primary full vera-open-stream" href="${lEsc(room.source_url)}" target="_blank" rel="noopener noreferrer">Open ${lEsc(host)}</a><button class="btn full" id="veraCountdown" style="margin-top:9px">Start 3…2…1 countdown</button><div id="veraCountdownDisplay" class="vera-countdown-display"></div><button class="btn danger full" id="veraEndWatch" style="margin-top:9px">End movie night</button><div class="notice">VERAMOR never receives or rebroadcasts the movie stream.</div></div>`);
    document.getElementById('veraEndWatch').onclick=()=>closeWatch(true);document.getElementById('veraCountdown').onclick=startExternalCountdown;if(room.playback_state==='countdown')paintCountdown(room.countdown_at);
  }
  await subscribeWatch(room.id);
}
async function subscribeWatch(id){
  if(!watchState)return;watchState.channel=liveSb.channel(`vera-watch-${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'watch_rooms',filter:`id=eq.${id}`},p=>{if(!watchState||p.new.id!==watchState.room.id)return;watchState.room=p.new;if(p.new.status==='ended'){liveToast('Watch Together ended.');closeWatch(false);return}if(p.new.updated_by!==liveUser?.id)applyWatchState(p.new,false)}).subscribe();
}
function youtubeLocalState(e){
  if(!watchState?.player||Date.now()<watchState.applyingUntil)return;
  const YT=window.YT;if(!YT)return;let state=null;if(e.data===YT.PlayerState.PLAYING)state='playing';else if(e.data===YT.PlayerState.PAUSED)state='paused';else return;
  const pos=Math.max(0,Number(watchState.player.getCurrentTime?.()||0));updateWatch(state,pos).catch(()=>{});
}
async function updateWatch(state,pos,countdown=null){if(!watchState)return;const {data,error}=await liveSb.rpc('update_watch_together',{p_room:watchState.room.id,p_state:state,p_position:Number(pos||0),p_countdown_at:countdown});if(error)throw error;if(data)watchState.room=data}
function startWatchHeartbeat(){clearInterval(watchState?.syncTimer);if(!watchState)return;watchState.syncTimer=setInterval(()=>{if(watchState?.player&&window.YT&&watchState.player.getPlayerState?.()===window.YT.PlayerState.PLAYING&&Date.now()>=watchState.applyingUntil){updateWatch('playing',watchState.player.getCurrentTime?.()||0).catch(()=>{})}},5000)}
function applyWatchState(row,force){
  if(!watchState)return;if(row.provider==='external'){if(row.playback_state==='countdown')paintCountdown(row.countdown_at);return}
  const p=watchState.player;if(!p?.seekTo)return;watchState.applyingUntil=Date.now()+1200;const local=Number(p.getCurrentTime?.()||0),remote=Number(row.position_seconds||0);if(force||Math.abs(local-remote)>1.8)p.seekTo(remote,true);if(row.playback_state==='playing')p.playVideo?.();else p.pauseVideo?.();const s=document.getElementById('veraWatchStatus');if(s)s.textContent=row.playback_state==='playing'?'▶ Synced and playing':'❚❚ Synced and paused';
}
async function startExternalCountdown(){if(!watchState)return;const at=new Date(Date.now()+4000).toISOString();try{await updateWatch('countdown',0,at);paintCountdown(at)}catch(e){liveToast(e.message||'Could not start countdown.','bad')}}
function paintCountdown(at){if(!at||!watchState)return;clearInterval(watchState.countTimer);const el=document.getElementById('veraCountdownDisplay');const tick=()=>{if(!el)return;const ms=new Date(at).getTime()-Date.now();if(ms<=0){el.textContent='GO ▶';clearInterval(watchState.countTimer);setTimeout(()=>{if(el)el.textContent=''},2200);return}el.textContent=String(Math.ceil(ms/1000))};tick();watchState.countTimer=setInterval(tick,150)}
async function closeWatch(endServer){const w=watchState;if(!w){hideLive();return}watchState=null;if(endServer)try{await liveSb.rpc('end_watch_together',{p_room:w.room.id})}catch(_e){}clearInterval(w.syncTimer);clearInterval(w.countTimer);if(w.channel)liveSb.removeChannel(w.channel);try{w.player?.destroy?.()}catch(_e){}hideLive()}
async function showWatchInvite(row){if(watchState||document.getElementById('veraWatchInvite'))return;const u=await sessionUser();if(!u||row.created_by===u.id)return;const matchRows=await activeMatches();const m=matchRows.find(x=>x.id===row.match_id);if(!m)return;const otherId=m.user_a===u.id?m.user_b:m.user_a,name=await profileName(otherId);const d=document.createElement('div');d.id='veraWatchInvite';d.className='vera-watch-invite';d.innerHTML=`<div class="vera-movie-mark small">🎬</div><div><span class="pill">WATCH TOGETHER</span><strong>${lEsc(name)} started ${row.provider==='youtube'?'a video':'movie night'}</strong></div><div class="actions"><button class="btn" id="ignoreWatch">Later</button><button class="btn primary" id="joinWatch">Join</button></div>`;document.body.appendChild(d);document.getElementById('ignoreWatch').onclick=()=>d.remove();document.getElementById('joinWatch').onclick=()=>{d.remove();openWatchRoom(row,name).catch(e=>liveToast(e.message,'bad'))}}
async function installWatchInvites(){const u=await sessionUser();if(!u)return;if(watchInviteChannel)liveSb.removeChannel(watchInviteChannel);watchInviteChannel=liveSb.channel(`vera-watch-invites-${u.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'watch_rooms'},p=>showWatchInvite(p.new).catch(()=>{})).subscribe()}

function bootObservers(){
  ensureLiveModal();installSettings();
  const matchBody=document.getElementById('matchModalBody');if(matchBody)new MutationObserver(()=>{currentContext=null;setTimeout(installChatTools,25)}).observe(matchBody,{childList:true,subtree:true});
  const settings=document.getElementById('settingsView');if(settings)new MutationObserver(()=>installSettings()).observe(settings,{childList:true});
  installChatTools();
}
async function startLiveExperience(){await sessionUser();if(!liveUser)return;bootObservers();await Promise.all([installIncomingCalls(),installWatchInvites(),loadLiveSettings().catch(()=>{})])}

window.addEventListener('load',()=>startLiveExperience().catch(e=>console.error('VERAMOR Live failed',e)));
liveSb.auth.onAuthStateChange((event,session)=>{liveUser=session?.user||null;if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')startLiveExperience().catch(()=>{});if(event==='SIGNED_OUT'){if(incomingChannel)liveSb.removeChannel(incomingChannel);if(watchInviteChannel)liveSb.removeChannel(watchInviteChannel);document.getElementById('veraIncomingCall')?.remove();document.getElementById('veraWatchInvite')?.remove();endCurrentCall(false).catch(()=>{});closeWatch(false).catch(()=>{})}});
