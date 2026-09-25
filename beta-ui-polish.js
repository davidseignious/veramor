import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const polishSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}}
);

const THEME_KEY='veramor_theme';
let polishObserver=null;
let currentIntl=false;

function applyTheme(theme){
  const value=theme==='light'?'light':'dark';
  document.documentElement.dataset.theme=value;
  document.documentElement.style.colorScheme=value;
  localStorage.setItem(THEME_KEY,value);
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=value==='light'?'#f6f4f8':'#09080d';
  const b=document.getElementById('themeToggle');
  if(b){
    b.textContent=value==='dark'?'☀️':'🌙';
    b.setAttribute('aria-label',value==='dark'?'Switch to light mode':'Switch to dark mode');
    b.title=value==='dark'?'Light mode':'Dark mode';
  }
}
function installThemeToggle(){
  const top=document.querySelector('.topbar .inner');
  if(!top)return;
  if(!document.getElementById('themeToggle')){
    const b=document.createElement('button');
    b.id='themeToggle';b.className='btn theme-toggle';b.type='button';
    const sign=document.getElementById('topSignOut');
    if(sign)sign.insertAdjacentElement('beforebegin',b);else top.appendChild(b);
    b.onclick=()=>applyTheme(document.documentElement.dataset.theme==='light'?'dark':'light');
  }
  applyTheme(localStorage.getItem(THEME_KEY)||'dark');
}

async function getSession(){const {data:{session}}=await polishSb.auth.getSession();return session}
function eduDomain(email){const e=String(email||'').toLowerCase();const d=e.split('@')[1]||'';return d.endsWith('.edu')?d:null}
async function installUniversityBanner(){
  const session=await getSession();
  const old=document.getElementById('universityLoginBanner');
  if(!session?.user){old?.remove();return}
  const domain=eduDomain(session.user.email);if(!domain){old?.remove();return}
  let school=domain;
  try{const {data}=await polishSb.from('profiles').select('university_name,university_verified').eq('id',session.user.id).maybeSingle();if(data?.university_name)school=data.university_name}catch(_e){}
  const shell=document.querySelector('main.shell');if(!shell||old)return;
  const banner=document.createElement('div');banner.id='universityLoginBanner';banner.className='university-login-banner';
  banner.innerHTML=`<span class="university-cap">🎓</span><span><strong>University account detected</strong><small>${school} · University Mode is available after profile setup</small></span><button class="btn" id="openUniversityMode">University Mode</button>`;
  shell.insertAdjacentElement('afterbegin',banner);
  document.getElementById('openUniversityMode').onclick=()=>{
    const campus=document.getElementById('universityModeCard')||document.getElementById('universitySettings');
    if(campus)campus.scrollIntoView({behavior:'smooth',block:'center'});else alert('University Mode will appear in Discover as soon as your verified profile is ready.');
  };
}

function installDateModeStrip(){
  const modes=document.getElementById('modeButtons');if(!modes)return;
  if(!document.getElementById('dateModeStripLabel')){
    const head=document.createElement('div');head.id='dateModeStripLabel';head.className='date-mode-strip-label';
    head.innerHTML='<div><span class="pill">DATE MODE</span><strong>Choose how you want to meet</strong></div><span class="pill warn">GROUP MODE · BETA</span>';
    modes.insertAdjacentElement('beforebegin',head);
  }
  const single=modes.querySelector('[data-mode="single"]'),duo=modes.querySelector('[data-mode="duo"]'),trio=modes.querySelector('[data-mode="trio"]');
  if(single&&!single.dataset.polished){single.dataset.polished='1';single.innerHTML='<strong>Solo</strong><small>1-on-1 dating</small>'}
  if(duo&&!duo.dataset.polished){duo.dataset.polished='1';duo.innerHTML='<strong>2 Man</strong><small>Bring 1 friend</small>'}
  if(trio&&!trio.dataset.polished){trio.dataset.polished='1';trio.innerHTML='<strong>Trio</strong><small>Bring 2 friends</small>'}
  modes.classList.add('date-mode-strip');
}

async function readInternational(){
  const session=await getSession();if(!session?.user)return false;
  const {data}=await polishSb.from('user_settings').select('international_discovery_enabled').eq('user_id',session.user.id).maybeSingle();
  currentIntl=!!data?.international_discovery_enabled;paintInternational();return currentIntl;
}
function paintInternational(){
  const b=document.getElementById('internationalQuickBtn');if(!b)return;
  b.classList.toggle('primary',currentIntl);
  b.textContent=currentIntl?'🌍 International ON':'🌍 International';
  b.title=currentIntl?'Switch back to nearby discovery':'Browse verified people internationally';
}
async function toggleInternational(){
  const session=await getSession();if(!session?.user)return;
  const b=document.getElementById('internationalQuickBtn');if(b)b.disabled=true;
  try{
    const next=!currentIntl;
    const {error}=await polishSb.from('user_settings').update({international_discovery_enabled:next,updated_at:new Date().toISOString()}).eq('user_id',session.user.id);if(error)throw error;
    currentIntl=next;paintInternational();
    const legacy=document.getElementById(next?'scopeInternational':'scopeLocal');if(legacy)legacy.classList.add('primary');
    document.getElementById('refreshDiscovery')?.click();
  }catch(e){alert(e.message||'Could not change discovery area.')}finally{if(b)b.disabled=false}
}
function installInternationalQuickButton(){
  const title=document.querySelector('#discoverView > .section-title');if(!title||document.getElementById('internationalQuickBtn'))return;
  const refresh=document.getElementById('refreshDiscovery');
  const actions=document.createElement('div');actions.className='discover-title-actions';
  const b=document.createElement('button');b.id='internationalQuickBtn';b.className='btn';b.type='button';b.textContent='🌍 International';b.onclick=toggleInternational;
  if(refresh){refresh.replaceWith(actions);actions.append(b,refresh)}else{actions.appendChild(b);title.appendChild(actions)}
  readInternational().catch(()=>{});
}

function polishProfileCard(){
  const card=document.querySelector('#deck .profile-card');if(!card)return;
  const details=card.querySelector('.details');
  const bio=details?.querySelector(':scope > p');
  const full=details?.querySelector('#fullProfileBtn');
  if(bio&&full&&!details.querySelector('.bio-toggle-row')){
    const row=document.createElement('div');row.className='bio-toggle-row';
    bio.insertAdjacentElement('beforebegin',row);row.append(bio,full);
    full.className='bio-arrow';full.textContent='⌄';full.title='View full profile';full.setAttribute('aria-label','View full profile');
  }
  const actions=details?.querySelector('.actions');
  const safety=details?.querySelector('#safetyBtn');
  if(actions&&safety&&actions.children.length===1){actions.classList.add('safety-only')}
}

function installObservers(){
  const deck=document.getElementById('deck');
  if(deck&&!polishObserver){polishObserver=new MutationObserver(()=>polishProfileCard());polishObserver.observe(deck,{childList:true,subtree:true});}
  polishProfileCard();
}

function install(){
  installThemeToggle();
  installDateModeStrip();
  installInternationalQuickButton();
  installObservers();
  installUniversityBanner().catch(()=>{});
  readInternational().catch(()=>{});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.addEventListener('load',install,{once:true});
polishSb.auth.onAuthStateChange((event)=>{
  if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')setTimeout(install,60);
  if(event==='SIGNED_OUT')document.getElementById('universityLoginBanner')?.remove();
});
