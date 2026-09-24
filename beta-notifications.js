import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const notifySb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

let notifyUser=null;
let notifyTimer=null;
let notifyRows=[];
let browserSeen=new Set(JSON.parse(sessionStorage.getItem('veramor_browser_notified')||'[]'));

const nEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prettyReward=v=>String(v||'reward').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());
function ago(value){
  const ms=Date.now()-new Date(value).getTime();
  const min=Math.max(0,Math.floor(ms/60000));
  if(min<1)return 'now';
  if(min<60)return `${min}m`;
  const hr=Math.floor(min/60);if(hr<24)return `${hr}h`;
  return `${Math.floor(hr/24)}d`;
}
function safeToast(text,type='ok'){
  let t=document.getElementById('veraToast');
  if(!t){t=document.createElement('div');t.id='veraToast';t.className='vera-toast';document.body.appendChild(t)}
  t.className=`vera-toast ${type}`;t.textContent=text;t.classList.add('show');
  clearTimeout(t._hide);t._hide=setTimeout(()=>t.classList.remove('show'),3200);
}
function categoryLabel(c){return ({match:'MATCH',message:'MESSAGE',group:'DUO / TRIO',date:'DATE',reward:'GIFT',product:'VERAMOR',verification:'VERIFIED',system:'VERAMOR'})[c]||'VERAMOR'}

function installNotificationUI(){
  const top=document.querySelector('.topbar .inner');
  const sign=document.getElementById('topSignOut');
  if(top&&!document.getElementById('notificationBell')){
    const bell=document.createElement('button');
    bell.id='notificationBell';bell.className='vera-bell hidden';bell.type='button';
    bell.setAttribute('aria-label','Notifications');
    bell.innerHTML='<span class="vera-bell-icon">♡</span><span id="notificationBadge" class="vera-badge hidden">0</span>';
    if(sign)sign.insertAdjacentElement('beforebegin',bell);else top.appendChild(bell);
    bell.onclick=()=>openNotifications();
  }
  if(!document.getElementById('notificationDrawer')){
    const modal=document.createElement('div');
    modal.id='notificationDrawer';modal.className='modal hidden';
    modal.innerHTML=`<div class="sheet vera-notify-sheet">
      <div class="sheet-head"><div><span class="pill">VERAMOR SIGNALS</span><h2 class="vera-notify-title">Notifications</h2></div><button class="x" id="closeNotifications" aria-label="Close">×</button></div>
      <div class="vera-notify-actions"><button class="btn" id="markAllNotifications">Mark all read</button><button class="btn" id="notificationSettingsJump">Settings</button></div>
      <div id="notificationFeed" class="vera-feed"><div class="vera-feed-empty">Loading your signals…</div></div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('closeNotifications').onclick=()=>modal.classList.add('hidden');
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden')});
    document.getElementById('markAllNotifications').onclick=markAllRead;
    document.getElementById('notificationSettingsJump').onclick=()=>{modal.classList.add('hidden');document.querySelector('#bottomNav button[data-view="settingsView"]')?.click();setTimeout(()=>document.getElementById('notificationPrefs')?.scrollIntoView({behavior:'smooth',block:'center'}),120)};
  }
  installNotificationSettings();
  installWeeklyGift();
}

function installWeeklyGift(){
  const settings=document.getElementById('settingsView');
  if(!settings||document.getElementById('weeklyGift'))return;
  const panel=document.createElement('div');panel.id='weeklyGift';panel.className='panel';
  panel.innerHTML='<div class="section-title"><div><span class="pill">WEEKLY GIFT</span><h3 style="margin:7px 0 0">Your weekly progress</h3></div><span style="font-size:25px">🎁</span></div><p class="muted">Visit 7 days, connect with someone on 5 days, and send a message on 3 days within a rolling 7-day window. Claim an extra Signal when complete.</p><div id="weeklyGiftProgress" class="muted">Loading progress…</div><button id="weeklyGiftClaim" class="btn primary full" style="margin-top:12px" disabled>Claim extra Signal</button><div id="weeklyGiftMsg"></div>';
  const danger=settings.querySelector('.danger-zone');
  if(danger)settings.insertBefore(panel,danger);else settings.appendChild(panel);
  document.getElementById('weeklyGiftClaim').onclick=()=>claimGift(null);
  document.querySelector('#bottomNav button[data-view="settingsView"]')?.addEventListener('click',()=>loadWeeklyGift().catch(()=>{}));
  loadWeeklyGift().catch(()=>{});
}

async function loadWeeklyGift(){
  const root=document.getElementById('weeklyGiftProgress'),button=document.getElementById('weeklyGiftClaim');
  if(!root||!button)return;
  const s=await currentSession();if(!s?.user)return;
  const [{data:status,error},{data:wallet}]=await Promise.all([
    notifySb.rpc('weekly_reward_status'),
    notifySb.from('reward_wallets').select('super_likes').eq('user_id',s.user.id).maybeSingle()
  ]);
  if(error){root.textContent=error.message;return}
  root.innerHTML=`<div class="notice">Visits ${Number(status.login_days)||0}/7 · Connect days ${Number(status.swipe_days)||0}/5 · Message days ${Number(status.chat_days)||0}/3</div><p>Extra Signals available: <strong>${Number(wallet?.super_likes)||0}</strong>. A Signal uses your daily allowance first, then one earned extra.</p>`;
  button.disabled=!status.eligible;
  button.textContent=status.already_claimed?'Gift claimed for this week':status.eligible?'Claim extra Signal':'Keep going to unlock';
}

async function recordVisit(){
  const s=await currentSession();if(!s?.user)return;
  const key=`veramor_visit_${s.user.id}_${new Date().toISOString().slice(0,10)}`;
  if(sessionStorage.getItem(key))return;
  const {error}=await notifySb.rpc('record_engagement',{activity_kind:'login'});
  if(!error){sessionStorage.setItem(key,'1');loadWeeklyGift().catch(()=>{})}
}

function installNotificationSettings(){
  const settings=document.getElementById('settingsView');
  if(!settings||document.getElementById('notificationPrefs'))return;
  const panel=document.createElement('div');panel.id='notificationPrefs';panel.className='panel vera-notify-settings';
  panel.innerHTML=`<div class="section-title"><div><span class="pill">SIGNALS</span><h3 style="margin:7px 0 0">Notifications</h3></div><span class="vera-spark">✦</span></div>
    <p class="muted">Keep the fun stuff, mute what you do not want. Match and safety activity stays inside VERAMOR even if browser alerts are off.</p>
    <label class="vera-toggle master"><span><strong>All notifications</strong><small>Master switch</small></span><input id="nMaster" type="checkbox"><i></i></label>
    <div class="vera-toggle-grid">
      <label class="vera-toggle"><span><strong>💘 Matches & Chemistry</strong><small>Matches, Chemistry unlocks, 48-hour reminders</small></span><input id="nMatch" type="checkbox"><i></i></label>
      <label class="vera-toggle"><span><strong>💬 Messages</strong><small>New messages and chat activity</small></span><input id="nMessage" type="checkbox"><i></i></label>
      <label class="vera-toggle"><span><strong>👯 Duo & Trio</strong><small>Group invites and group activity</small></span><input id="nGroup" type="checkbox"><i></i></label>
      <label class="vera-toggle"><span><strong>📍 Dates</strong><small>Date proposals, changes and reminders</small></span><input id="nDate" type="checkbox"><i></i></label>
      <label class="vera-toggle"><span><strong>🎁 Weekly gifts</strong><small>Reward ready and streak reminders</small></span><input id="nReward" type="checkbox"><i></i></label>
      <label class="vera-toggle"><span><strong>✨ Product updates</strong><small>Occasional new-feature notes</small></span><input id="nProduct" type="checkbox"><i></i></label>
    </div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" id="saveNotificationPrefs">Save notification settings</button><button class="btn" id="enableBrowserNotifications">Enable browser alerts</button></div>
    <div id="notificationPrefsMsg"></div>`;
  const danger=settings.querySelector('.danger-zone');
  if(danger)settings.insertBefore(panel,danger);else settings.appendChild(panel);
  document.getElementById('saveNotificationPrefs').onclick=saveNotificationPrefs;
  document.getElementById('enableBrowserNotifications').onclick=requestBrowserNotifications;
  loadNotificationPrefs().catch(()=>{});
}

async function currentSession(){
  const {data:{session}}=await notifySb.auth.getSession();
  notifyUser=session?.user||null;
  document.getElementById('notificationBell')?.classList.toggle('hidden',!notifyUser);
  return session;
}

async function loadNotificationPrefs(){
  const s=await currentSession();if(!s?.user)return;
  const {data,error}=await notifySb.from('user_settings').select('notifications_enabled,notification_matches,notification_messages,notification_groups,notification_dates,notification_rewards,notification_product').eq('user_id',s.user.id).single();
  if(error)throw error;
  const map={nMaster:'notifications_enabled',nMatch:'notification_matches',nMessage:'notification_messages',nGroup:'notification_groups',nDate:'notification_dates',nReward:'notification_rewards',nProduct:'notification_product'};
  Object.entries(map).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.checked=data?.[key]!==false});
  paintBrowserButton();
}
async function saveNotificationPrefs(){
  const s=await currentSession();if(!s?.user)return;
  const b=document.getElementById('saveNotificationPrefs');b.disabled=true;b.textContent='Saving…';
  const row={
    notifications_enabled:document.getElementById('nMaster')?.checked!==false,
    notification_matches:!!document.getElementById('nMatch')?.checked,
    notification_messages:!!document.getElementById('nMessage')?.checked,
    notification_groups:!!document.getElementById('nGroup')?.checked,
    notification_dates:!!document.getElementById('nDate')?.checked,
    notification_rewards:!!document.getElementById('nReward')?.checked,
    notification_product:!!document.getElementById('nProduct')?.checked,
    updated_at:new Date().toISOString()
  };
  try{
    const {error}=await notifySb.from('user_settings').update(row).eq('user_id',s.user.id);if(error)throw error;
    document.getElementById('notificationPrefsMsg').innerHTML='<div class="notice ok">Notification settings saved.</div>';
    await refreshNotifications(false);
  }catch(e){document.getElementById('notificationPrefsMsg').innerHTML=`<div class="notice bad">${nEsc(e.message||'Could not save notification settings.')}</div>`}
  finally{b.disabled=false;b.textContent='Save notification settings'}
}

function paintBrowserButton(){
  const b=document.getElementById('enableBrowserNotifications');if(!b)return;
  if(!('Notification' in window)){b.disabled=true;b.textContent='Browser alerts unavailable';return}
  if(Notification.permission==='granted'){b.disabled=true;b.textContent='Browser alerts enabled ✓'}
  else if(Notification.permission==='denied'){b.disabled=true;b.textContent='Browser alerts blocked in browser'}
  else{b.disabled=false;b.textContent='Enable browser alerts'}
}
async function requestBrowserNotifications(){
  if(!('Notification' in window))return;
  const p=await Notification.requestPermission();paintBrowserButton();
  if(p==='granted')safeToast('Browser alerts are on ✦');
}

async function refreshNotifications(browserAlerts=true){
  const s=await currentSession();if(!s?.user)return;
  try{await notifySb.rpc('refresh_notifications')}catch(_e){}
  const {data,error}=await notifySb.from('notifications').select('id,category,title,body,emoji,action,related_id,deliver_at,read_at,created_at').order('deliver_at',{ascending:false}).limit(50);
  if(error)throw error;
  notifyRows=data||[];
  const unread=notifyRows.filter(n=>!n.read_at).length;
  const badge=document.getElementById('notificationBadge');
  if(badge){badge.textContent=unread>99?'99+':String(unread);badge.classList.toggle('hidden',unread===0)}
  const bell=document.getElementById('notificationBell');if(bell)bell.classList.toggle('has-signal',unread>0);
  renderNotificationFeed();
  if(browserAlerts&&'Notification' in window&&Notification.permission==='granted'){
    const now=Date.now();
    const fresh=notifyRows.filter(n=>!n.read_at&&!browserSeen.has(n.id)&&Math.abs(now-new Date(n.deliver_at).getTime())<5*60*1000).slice(0,2);
    fresh.forEach(n=>{try{new Notification(`${n.emoji||'♥'} ${n.title}`,{body:n.body,tag:`veramor-${n.id}`})}catch(_e){}browserSeen.add(n.id)});
    sessionStorage.setItem('veramor_browser_notified',JSON.stringify([...browserSeen].slice(-100)));
  }
}

function renderNotificationFeed(){
  const root=document.getElementById('notificationFeed');if(!root)return;
  if(!notifyRows.length){root.innerHTML='<div class="vera-feed-empty"><div class="vera-empty-heart">♡</div><strong>You’re all caught up.</strong><span>Matches, messages, Duo/Trio invites and gifts will show here.</span></div>';return}
  root.innerHTML=notifyRows.map(n=>`<button class="vera-notification ${n.read_at?'':'unread'}" data-notification="${n.id}">
      <span class="vera-notify-emoji">${nEsc(n.emoji||'♥')}</span>
      <span class="vera-notify-copy"><span class="vera-notify-meta">${nEsc(categoryLabel(n.category))} · ${ago(n.deliver_at)}</span><strong>${nEsc(n.title)}</strong><small>${nEsc(n.body)}</small>${n.category==='reward'&&!n.read_at?'<span class="vera-gift-cta" data-claim-gift="1">Claim gift →</span>':''}</span>
      ${n.read_at?'':'<i class="vera-unread-dot"></i>'}
    </button>`).join('');
  root.querySelectorAll('[data-notification]').forEach(el=>el.onclick=e=>notificationClicked(e,el.dataset.notification));
}

async function markRead(id){
  try{await notifySb.rpc('mark_notification_read',{p_notification:id})}catch(_e){}
  const n=notifyRows.find(x=>x.id===id);if(n)n.read_at=new Date().toISOString();
  renderNotificationFeed();
  const unread=notifyRows.filter(n=>!n.read_at).length;const badge=document.getElementById('notificationBadge');if(badge){badge.textContent=String(unread);badge.classList.toggle('hidden',unread===0)}
}
async function markAllRead(){
  const b=document.getElementById('markAllNotifications');b.disabled=true;
  try{await notifySb.rpc('mark_all_notifications_read');notifyRows.forEach(n=>n.read_at=n.read_at||new Date().toISOString());renderNotificationFeed();const badge=document.getElementById('notificationBadge');if(badge)badge.classList.add('hidden');document.getElementById('notificationBell')?.classList.remove('has-signal')}
  finally{b.disabled=false}
}
async function notificationClicked(event,id){
  const n=notifyRows.find(x=>x.id===id);if(!n)return;
  if(event.target.closest('[data-claim-gift]')){event.stopPropagation();await claimGift(id);return}
  await markRead(id);navigateAction(n.action);document.getElementById('notificationDrawer')?.classList.add('hidden');
}
function navigateAction(action){
  const view=action==='#matches'?'matchesView':action==='#profile'?'profileView':action==='#settings'?'settingsView':action==='#discover'?'discoverView':null;
  if(view)document.querySelector(`#bottomNav button[data-view="${view}"]`)?.click();
}
async function claimGift(id){
  try{
    const {data,error}=await notifySb.rpc('claim_weekly_reward');if(error)throw error;
    for(const reward of notifyRows.filter(n=>n.category==='reward'&&!n.read_at))await markRead(reward.id);
    if(id&&!notifyRows.some(n=>n.id===id))await markRead(id);
    safeToast(`Gift claimed: ${data?.amount||1} ${prettyReward(data?.reward_type)} 🎁`);
    await Promise.all([refreshNotifications(false),loadWeeklyGift()]);
  }catch(e){safeToast(e.message||'Gift is not ready yet.','bad');loadWeeklyGift().catch(()=>{})}
}
async function openNotifications(){
  document.getElementById('notificationDrawer')?.classList.remove('hidden');
  await refreshNotifications(false).catch(e=>{const r=document.getElementById('notificationFeed');if(r)r.innerHTML=`<div class="notice bad">${nEsc(e.message||'Could not load notifications.')}</div>`});
}

function startNotifications(){
  clearInterval(notifyTimer);
  currentSession().then(s=>{if(!s?.user)return;recordVisit().catch(()=>{});refreshNotifications(false).catch(()=>{});notifyTimer=setInterval(()=>refreshNotifications(true).catch(()=>{}),15000)});
}

window.addEventListener('load',()=>{installNotificationUI();startNotifications()});
notifySb.auth.onAuthStateChange((event,session)=>{
  notifyUser=session?.user||null;
  document.getElementById('notificationBell')?.classList.toggle('hidden',!notifyUser);
  if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')startNotifications();
  if(event==='SIGNED_OUT'){clearInterval(notifyTimer);notifyRows=[];document.getElementById('notificationBell')?.classList.add('hidden');document.getElementById('notificationDrawer')?.classList.add('hidden')}
});
