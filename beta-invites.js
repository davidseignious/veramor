import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const inviteSb=createClient('https://rfcoworvfqcqallgpozn.supabase.co','sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}});
const refFromLink=new URLSearchParams(location.search).get('ref');
if(refFromLink&&/^[A-Za-z0-9]{8}$/.test(refFromLink))sessionStorage.setItem('veramor_pending_ref',refFromLink.toUpperCase());

let inviteUrl='';let inviteUserId=null;let inviteLoading=null;
function invitePanel(id){
  const host=document.createElement('div');host.id=id;host.className='panel';
  host.innerHTML='<span class="pill">BRING REAL FRIENDS</span><h3>Good connections start with your circle</h3><p class="muted">Invite friends you trust. They build their own profile and go through the same verification review. When a friend is approved, you both earn an extra Signal.</p><div class="field"><label>Your invitation link</label><input class="input invite-link" readonly aria-label="Your invitation link" placeholder="Loading your link…"></div><div class="actions"><button class="btn primary invite-share" type="button">Share invite</button><button class="btn invite-copy" type="button">Copy link</button></div><p class="muted invite-count" aria-live="polite"></p><div class="invite-message" role="status"></div>';
  host.querySelector('.invite-share').onclick=()=>shareInvite(host);
  host.querySelector('.invite-copy').onclick=()=>copyInvite(host);
  if(inviteUrl)host.querySelector('.invite-link').value=inviteUrl;
  return host;
}
function installInvitePanels(){
  const waiting=document.getElementById('waitingScreen');
  if(waiting&&!document.getElementById('waitingInvite'))waiting.appendChild(invitePanel('waitingInvite'));
  const settings=document.getElementById('settingsView');
  if(settings&&!document.getElementById('settingsInvite')){
    const panel=invitePanel('settingsInvite'),danger=settings.querySelector('.danger-zone');
    if(danger)settings.insertBefore(panel,danger);else settings.appendChild(panel);
  }
  installEmptyDeckInvite();
}
function installEmptyDeckInvite(){
  const deck=document.getElementById('deck');
  if(!deck||!deck.querySelector('.empty')||deck.querySelector('.invite-empty'))return;
  const box=document.createElement('div');box.className='panel invite-empty';
  box.innerHTML='<strong>Want more real people here?</strong><p class="muted">Invite a friend to build a verified profile. No demo accounts appear in your dating feed.</p><button class="btn primary" type="button">Copy your invite link</button><span role="status" style="margin-left:8px"></span>';
  box.querySelector('button').onclick=async()=>{
    const status=box.querySelector('[role="status"]');
    try{if(!inviteUrl)await ensureInvite();await navigator.clipboard.writeText(inviteUrl);status.textContent='Link copied ✓'}
    catch(e){status.textContent=e.message||'Open Settings to copy your invite link.'}
  };
  deck.appendChild(box);
}
function paintInvite(){
  document.querySelectorAll('.invite-link').forEach(x=>x.value=inviteUrl);
}
async function ensureInvite(){
  if(inviteLoading)return inviteLoading;
  inviteLoading=(async()=>{
    const {data:{session}}=await inviteSb.auth.getSession();
    if(!session?.user)throw new Error('Log in to get your invite link.');
    if(inviteUserId!==session.user.id){inviteUserId=session.user.id;inviteUrl=''}
    if(!inviteUrl){
      const {data,error}=await inviteSb.rpc('get_or_create_referral_code');if(error)throw error;
      inviteUrl=`${location.origin}/?ref=${encodeURIComponent(data)}`;paintInvite();
    }
    const {data:rows,error}=await inviteSb.from('referrals').select('status').eq('referrer_id',session.user.id);
    if(!error){const completed=(rows||[]).filter(x=>x.status==='completed').length;
      document.querySelectorAll('.invite-count').forEach(x=>x.textContent=`${completed} verified friend${completed===1?'':'s'} joined through your link.`)}
    return inviteUrl;
  })();
  try{return await inviteLoading}finally{inviteLoading=null}
}
function inviteMessage(host,text){host.querySelector('.invite-message').textContent=text}
async function copyInvite(host){
  try{if(!inviteUrl)await ensureInvite();await navigator.clipboard.writeText(inviteUrl);inviteMessage(host,'Invitation link copied ✓')}
  catch(e){inviteMessage(host,e.message||'Copy the link from the field above.')}
}
async function shareInvite(host){
  try{if(!inviteUrl)await ensureInvite();
    if(navigator.share)await navigator.share({title:'Join me on VERAMOR',text:'Build a real, verified profile and meet intentional people.',url:inviteUrl});
    else await copyInvite(host);
  }catch(e){if(e?.name!=='AbortError')inviteMessage(host,e.message||'Could not share the invitation.')}
}
async function applyPendingInvite(){
  const code=sessionStorage.getItem('veramor_pending_ref');if(!code)return;
  const {data:{session}}=await inviteSb.auth.getSession();if(!session?.user)return;
  const attempt=`veramor_ref_attempt_${session.user.id}_${code}`;
  if(sessionStorage.getItem(attempt))return;
  sessionStorage.setItem(attempt,'1');
  const {data:member,error:memberError}=await inviteSb.from('profiles').select('profile_complete,verification_status').eq('id',session.user.id).maybeSingle();
  if(memberError){sessionStorage.removeItem(attempt);return}
  if(member?.profile_complete||['pending','verified'].includes(member?.verification_status)){
    sessionStorage.removeItem('veramor_pending_ref');return;
  }
  const {data,error}=await inviteSb.rpc('apply_referral_code',{referral_code:code});
  if(error)sessionStorage.removeItem(attempt);
  else sessionStorage.removeItem('veramor_pending_ref');
  const status=document.getElementById('inviteAppliedStatus')||document.createElement('div');
  status.id='inviteAppliedStatus';status.className=`notice ${error?'bad':'ok'}`;
  status.textContent=error?`Invite link: ${error.message}`:data?.applied?'Friend invitation saved. Your reward unlocks after verification.':'Invitation was already applied.';
  const screen=document.getElementById('onboardingScreen');if(screen)screen.insertAdjacentElement('afterbegin',status);
}
function startInvites(){installInvitePanels();inviteSb.auth.getSession().then(({data})=>{
  if(data.session){ensureInvite().catch(()=>{});applyPendingInvite().catch(()=>{})}
}).catch(()=>{});
  const deck=document.getElementById('deck');if(deck)new MutationObserver(installEmptyDeckInvite).observe(deck,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startInvites,{once:true});else startInvites();
inviteSb.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'){inviteUrl='';inviteUserId=null;paintInvite();document.querySelectorAll('.invite-count').forEach(x=>x.textContent='');return}
  if(event==='SIGNED_IN'&&session?.user)setTimeout(()=>{ensureInvite().catch(()=>{});applyPendingInvite().catch(()=>{})},0);
});
