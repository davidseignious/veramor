import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const v2Sb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}}
);

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storyTimer=null;
let theater={room:null,user:null,otherId:null,otherName:'Your match',stream:null,remoteStream:null,pc:null,signalChannel:null,stateChannel:null,remoteId:null,pendingIce:[],offered:false,helloTimer:null,movieMuted:false};

function toast(text,type=''){
  let t=document.getElementById('veraV2Toast');
  if(!t){t=document.createElement('div');t.id='veraV2Toast';t.className='vera-v2-toast';document.body.appendChild(t)}
  t.textContent=text;t.className=`vera-v2-toast show ${type}`;clearTimeout(t._hide);t._hide=setTimeout(()=>t.classList.remove('show'),3300);
}

function scheduleStory(){clearTimeout(storyTimer);storyTimer=setTimeout(buildProfileStory,260)}
function buildProfileStory(){
  const modal=document.getElementById('profileModal'),body=document.getElementById('profileModalBody');
  if(!modal||modal.classList.contains('hidden')||!body||body.dataset.veraStory==='1')return;
  const grid=body.querySelector('.photo-grid');if(!grid)return;
  const photos=Array.from(grid.querySelectorAll(':scope > .photo'));
  if(!photos.length)return;
  const title=body.querySelector(':scope > h2');
  const meta=title?.nextElementSibling?.classList.contains('muted')?title.nextElementSibling:null;
  const bio=Array.from(body.children).find(x=>x.tagName==='P'&&x!==meta&&!x.closest('.vera-prompt-profile-section'));
  const tags=body.querySelector(':scope > .tags');
  const looking=body.querySelector(':scope > .prompt');
  const promptSection=body.querySelector('.vera-prompt-profile-section');
  const promptCards=promptSection?Array.from(promptSection.querySelectorAll('.vera-prompt-card,.vera-prompt-mini')):[];

  const story=document.createElement('div');story.className='vera-beta-story';
  const hero=document.createElement('section');hero.className='vera-beta-story-hero';
  const first=photos.shift();hero.appendChild(first);
  const overlay=document.createElement('div');overlay.className='vera-beta-story-overlay';
  if(title)overlay.appendChild(title);if(meta)overlay.appendChild(meta);hero.appendChild(overlay);story.appendChild(hero);

  const about=document.createElement('section');about.className='vera-beta-story-card';about.innerHTML='<small class="vera-beta-kicker">ABOUT ME</small>';
  if(bio)about.appendChild(bio);if(tags)about.appendChild(tags);story.appendChild(about);

  const max=Math.max(photos.length,promptCards.length);
  for(let i=0;i<max;i++){
    if(promptCards[i]){promptCards[i].classList.add('vera-beta-story-prompt');story.appendChild(promptCards[i])}
    if(photos[i]){photos[i].classList.add('vera-beta-story-photo');story.appendChild(photos[i])}
  }
  if(looking){looking.classList.add('vera-beta-story-looking');story.appendChild(looking)}
  if(promptSection)promptSection.remove();
  grid.remove();
  body.appendChild(story);body.dataset.veraStory='1';
  const sheet=modal.querySelector('.sheet');if(sheet)sheet.scrollTop=0;
}

async function session(){const {data:{session}}=await v2Sb.auth.getSession();return session?.user||null}
async function watchContext(){
  const user=await session();if(!user)return null;
  const title=(document.getElementById('matchModalTitle')?.textContent||'').trim();
  const {data:matches,error}=await v2Sb.from('matches').select('*').eq('status','active').or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order('created_at',{ascending:false});
  if(error)throw error;
  let chosen=null,otherId=null,otherName='Your match';
  for(const m of matches||[]){
    const oid=m.user_a===user.id?m.user_b:m.user_a;
    const {data:p}=await v2Sb.from('profiles').select('display_name').eq('id',oid).maybeSingle();
    const n=p?.display_name||'Your match';
    if(n===title){chosen=m;otherId=oid;otherName=n;break}
  }
  if(!chosen&&(matches||[]).length===1){chosen=matches[0];otherId=chosen.user_a===user.id?chosen.user_b:chosen.user_a;const {data:p}=await v2Sb.from('profiles').select('display_name').eq('id',otherId).maybeSingle();otherName=p?.display_name||'Your match'}
  if(!chosen)return null;
  const {data:room,error:re}=await v2Sb.from('watch_rooms').select('*').eq('match_id',chosen.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(re)throw re;if(!room)return null;
  return {user,match:chosen,room,otherId,otherName};
}

function videoTile(id,label,local=false){return `<aside class="vera-v2-person ${local?'local':''}"><div class="vera-v2-video-wrap"><video id="${id}" autoplay playsinline ${local?'muted':''}></video><div class="vera-v2-video-placeholder">${local?'YOU':'♥'}</div></div><span>${esc(label)}</span></aside>`}
function installTheater(ctx,roomEl){
  if(roomEl.dataset.veraV2==='1')return;roomEl.dataset.veraV2='1';
  const youtube=document.getElementById('veraYoutubePlayer');
  const grid=document.createElement('div');grid.className='vera-v2-theater-grid';
  const center=document.createElement('main');center.className='vera-v2-media-center';
  grid.innerHTML=videoTile('veraV2Remote',ctx.otherName,false);grid.appendChild(center);grid.insertAdjacentHTML('beforeend',videoTile('veraV2Local','You',true));
  if(youtube){youtube.parentNode.insertBefore(grid,youtube);center.appendChild(youtube)}
  else{
    const mark=roomEl.querySelector('.vera-movie-mark');
    const target=mark||roomEl.querySelector('.pill')||roomEl.firstChild;
    if(target?.parentNode)target.parentNode.insertBefore(grid,target.nextSibling);
    center.innerHTML='<div class="vera-v2-provider-stage"><div>🍿</div><strong>Private streaming tab</strong><small>The movie stays inside your own streaming account.</small></div>';
  }
  const controls=document.createElement('div');controls.className='vera-v2-watch-controls';controls.innerHTML=`<button class="btn primary" id="veraV2StartCam">🎥 Start cameras</button><button class="btn" id="veraV2Mic" disabled>🎙️ Mic</button><button class="btn" id="veraV2Cam" disabled>📷 Camera</button><button class="btn" id="veraV2Speaker" disabled>🔊 Match</button>${youtube?'<button class="btn" id="veraV2MovieAudio">🔊 Movie</button>':''}<button class="btn" id="veraV2Fullscreen">⛶ Fullscreen</button>`;
  grid.insertAdjacentElement('afterend',controls);

  if(ctx.room.provider==='external'){
    const together=document.createElement('div');together.className='vera-v2-together';together.innerHTML='<div><strong>Pause Together</strong><small>For Netflix/Max/etc., VERAMOR coordinates the exact moment; each person taps pause/play in the provider tab.</small></div><div class="actions"><button class="btn" id="veraV2Pause">⏸ Pause together</button><button class="btn" id="veraV2Resume">▶ Resume together</button></div><div id="veraV2TogetherStatus"></div>';
    controls.insertAdjacentElement('afterend',together);
    document.getElementById('veraV2Pause').onclick=()=>sendTogether('paused');
    document.getElementById('veraV2Resume').onclick=()=>sendTogether('playing');
  }
  document.getElementById('veraV2StartCam').onclick=startCameras;
  document.getElementById('veraV2Mic').onclick=toggleMic;
  document.getElementById('veraV2Cam').onclick=toggleCamera;
  document.getElementById('veraV2Speaker').onclick=toggleSpeaker;
  document.getElementById('veraV2Fullscreen').onclick=()=>grid.requestFullscreen?.().catch(()=>{});
  const movie=document.getElementById('veraV2MovieAudio');if(movie)movie.onclick=toggleMovieAudio;
}

async function enhanceWatch(){
  const roomEl=document.querySelector('#veraLiveBody .vera-watch-room');if(!roomEl||roomEl.dataset.veraV2==='1')return;
  try{const ctx=await watchContext();if(!ctx)return;theater.room=ctx.room;theater.user=ctx.user;theater.otherId=ctx.otherId;theater.otherName=ctx.otherName;installTheater(ctx,roomEl);subscribeWatchState()}catch(e){console.error('VERAMOR Watch Together polish failed',e)}
}

async function ensurePeer(){
  if(theater.pc)return theater.pc;
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  theater.pendingIce=[];
  theater.stream?.getTracks().forEach(t=>pc.addTrack(t,theater.stream));
  pc.ontrack=e=>{const s=e.streams?.[0];if(s){theater.remoteStream=s;const v=document.getElementById('veraV2Remote');if(v)v.srcObject=s}}
  pc.onicecandidate=e=>{if(e.candidate)signal('ice',e.candidate.toJSON()).catch(()=>{})};
  pc.onconnectionstatechange=()=>{const b=document.getElementById('veraV2StartCam');if(!b)return;if(pc.connectionState==='connected'){b.textContent='✓ Cameras connected';b.classList.remove('primary');clearInterval(theater.helloTimer)}else if(pc.connectionState==='failed'){b.textContent='Camera connection failed';b.classList.add('danger')}};
  theater.pc=pc;return pc;
}
async function signal(kind,data,to=theater.remoteId){if(!theater.signalChannel||!theater.user)return;await theater.signalChannel.send({type:'broadcast',event:'signal',payload:{roomId:theater.room?.id,from:theater.user.id,to:to||null,kind,data}})}
async function maybeOffer(){
  if(!theater.remoteId||theater.offered||!theater.stream)return;
  if(String(theater.user.id)>String(theater.remoteId))return;
  const pc=await ensurePeer();theater.offered=true;const offer=await pc.createOffer();await pc.setLocalDescription(offer);await signal('offer',offer.toJSON());
}
async function onSignal(payload){
  if(!payload||payload.roomId!==theater.room?.id||payload.from===theater.user?.id)return;
  if(payload.to&&payload.to!==theater.user?.id)return;
  theater.remoteId=payload.from;
  if(payload.kind==='hello'){await signal('hello-ack',{},payload.from);await maybeOffer();return}
  if(payload.kind==='hello-ack'){await maybeOffer();return}
  if(!theater.stream)return;
  const pc=await ensurePeer();
  try{
    if(payload.kind==='offer'){
      await pc.setRemoteDescription(payload.data);for(const c of theater.pendingIce.splice(0))await pc.addIceCandidate(c);const ans=await pc.createAnswer();await pc.setLocalDescription(ans);await signal('answer',ans.toJSON(),payload.from);
    }else if(payload.kind==='answer'){
      await pc.setRemoteDescription(payload.data);for(const c of theater.pendingIce.splice(0))await pc.addIceCandidate(c);
    }else if(payload.kind==='ice'){
      const c=new RTCIceCandidate(payload.data);if(pc.remoteDescription)await pc.addIceCandidate(c);else theater.pendingIce.push(c);
    }
  }catch(e){console.error('Watch camera signal error',e)}
}
async function startCameras(){
  if(theater.stream){stopCameras();return}
  if(!theater.room||!theater.user)return toast('Open an active Watch Together room first.','bad');
  if(!navigator.mediaDevices?.getUserMedia)return toast('Camera and microphone are not supported by this browser.','bad');
  const b=document.getElementById('veraV2StartCam');if(b){b.disabled=true;b.textContent='Opening camera…'}
  try{
    theater.stream=await navigator.mediaDevices.getUserMedia({audio:true,video:{facingMode:'user'}});
    const local=document.getElementById('veraV2Local');if(local)local.srcObject=theater.stream;
    document.querySelectorAll('#veraV2Mic,#veraV2Cam,#veraV2Speaker').forEach(x=>x.disabled=false);
    await ensurePeer();
    theater.signalChannel=v2Sb.channel(`vera-watch-video-${theater.room.id}`,{config:{broadcast:{self:false}}}).on('broadcast',{event:'signal'},({payload})=>onSignal(payload)).subscribe(async status=>{
      if(status==='SUBSCRIBED'){
        await signal('hello',{},null);clearInterval(theater.helloTimer);theater.helloTimer=setInterval(()=>signal('hello',{},null).catch(()=>{}),1800);
      }
    });
    if(b){b.disabled=false;b.textContent=`Waiting for ${theater.otherName}…`}
  }catch(e){theater.stream?.getTracks().forEach(t=>t.stop());theater.stream=null;if(b){b.disabled=false;b.textContent='🎥 Start cameras'}toast(e.message||'Camera permission was not granted.','bad')}
}
function stopCameras(){
  clearInterval(theater.helloTimer);theater.helloTimer=null;
  theater.stream?.getTracks().forEach(t=>t.stop());theater.stream=null;theater.remoteStream=null;
  theater.pc?.close();theater.pc=null;theater.remoteId=null;theater.offered=false;theater.pendingIce=[];
  if(theater.signalChannel){v2Sb.removeChannel(theater.signalChannel);theater.signalChannel=null}
  ['veraV2Local','veraV2Remote'].forEach(id=>{const v=document.getElementById(id);if(v)v.srcObject=null});
  const b=document.getElementById('veraV2StartCam');if(b){b.disabled=false;b.textContent='🎥 Start cameras';b.classList.add('primary')}
  document.querySelectorAll('#veraV2Mic,#veraV2Cam,#veraV2Speaker').forEach(x=>{x.disabled=true;x.classList.remove('active')});
}
function toggleMic(){const t=theater.stream?.getAudioTracks?.()[0];if(!t)return;t.enabled=!t.enabled;const b=document.getElementById('veraV2Mic');b.textContent=t.enabled?'🎙️ Mic':'🔇 Muted';b.classList.toggle('active',!t.enabled)}
function toggleCamera(){const t=theater.stream?.getVideoTracks?.()[0];if(!t)return;t.enabled=!t.enabled;const b=document.getElementById('veraV2Cam');b.textContent=t.enabled?'📷 Camera':'🚫 Camera off';b.classList.toggle('active',!t.enabled)}
function toggleSpeaker(){const v=document.getElementById('veraV2Remote');if(!v)return;v.muted=!v.muted;const b=document.getElementById('veraV2Speaker');b.textContent=v.muted?'🔈 Match muted':'🔊 Match';b.classList.toggle('active',v.muted)}
function toggleMovieAudio(){
  theater.movieMuted=!theater.movieMuted;const iframe=document.querySelector('#veraYoutubePlayer iframe');
  if(iframe?.contentWindow)iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:theater.movieMuted?'mute':'unMute',args:[]}), '*');
  const b=document.getElementById('veraV2MovieAudio');if(b){b.textContent=theater.movieMuted?'🔈 Movie muted':'🔊 Movie';b.classList.toggle('active',theater.movieMuted)}
}

async function sendTogether(state){
  if(!theater.room)return;const at=new Date(Date.now()+3500).toISOString();
  try{const {error}=await v2Sb.rpc('update_watch_together',{p_room:theater.room.id,p_state:state,p_position:0,p_countdown_at:at});if(error)throw error;paintTogether(state,at)}catch(e){toast(e.message||'Could not coordinate playback.','bad')}
}
function paintTogether(state,at){
  const host=document.getElementById('veraV2TogetherStatus');if(!host)return;clearInterval(host._timer);
  const action=state==='paused'?'PAUSE':'RESUME',end=new Date(at).getTime();
  const draw=()=>{const ms=end-Date.now();if(ms<=0){host.innerHTML=`<div class="notice ok"><strong>${action} NOW</strong> · tap ${state==='paused'?'pause':'play'} in your streaming tab.</div>`;clearInterval(host._timer);return}host.innerHTML=`<div class="vera-v2-sync-count">${action} IN ${Math.max(1,Math.ceil(ms/1000))}</div>`};draw();host._timer=setInterval(draw,180);
}
function subscribeWatchState(){
  if(!theater.room||theater.stateChannel)return;
  theater.stateChannel=v2Sb.channel(`vera-v2-watch-state-${theater.room.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'watch_rooms',filter:`id=eq.${theater.room.id}`},p=>{
    theater.room=p.new;if(theater.room.provider==='external'&&['paused','playing'].includes(p.new.playback_state)&&p.new.countdown_at)paintTogether(p.new.playback_state,p.new.countdown_at);
  }).subscribe();
}
function cleanupWatchEnhancement(){
  stopCameras();if(theater.stateChannel){v2Sb.removeChannel(theater.stateChannel);theater.stateChannel=null}
  theater.room=null;theater.user=null;theater.otherId=null;theater.otherName='Your match';theater.movieMuted=false;
}

const observer=new MutationObserver(()=>{
  scheduleStory();
  enhanceWatch();
  const live=document.getElementById('veraLiveModal');if(live?.classList.contains('hidden')&&theater.room)cleanupWatchEnhancement();
});
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
window.addEventListener('beforeunload',cleanupWatchEnhancement);
window.addEventListener('load',()=>{scheduleStory();enhanceWatch()});
