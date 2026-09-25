let deferredInstallPrompt=null;
const nativeIcons={
  discoverView:'♥',
  matchesView:'◉',
  profileView:'●',
  settingsView:'⚙'
};
function installNativeShell(){
  document.body.classList.add('vera-native');
  document.querySelectorAll('#bottomNav button[data-view]').forEach(b=>{
    if(b.dataset.nativeDone==='1')return;
    const label=b.textContent.trim();
    b.innerHTML='<span class="vera-nav-icon" aria-hidden="true">'+(nativeIcons[b.dataset.view]||'•')+'</span><span>'+label+'</span>';
    b.dataset.nativeDone='1';
  });
  installAppCard();
  syncStandaloneClass();
}
function syncStandaloneClass(){
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  document.documentElement.classList.toggle('vera-standalone',!!standalone);
}
function toastNative(text){
  let t=document.getElementById('veraNativeToast');
  if(!t){t=document.createElement('div');t.id='veraNativeToast';t.className='vera-native-toast';document.body.appendChild(t)}
  t.textContent=text;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);
}
function installAppCard(){
  const host=document.getElementById('settingsView');if(!host||document.getElementById('installVeramorCard'))return;
  const card=document.createElement('div');card.id='installVeramorCard';card.className='panel vera-install-card';
  card.innerHTML='<div class="section-title"><div style="display:flex;gap:12px;align-items:center"><img class="vera-install-icon" src="/veramor-icon.svg" alt=""><div><span class="pill">APP MODE</span><h3 style="margin:7px 0 0">Put VERAMOR on your Home Screen</h3></div></div></div><p class="muted">Launch full-screen like an app, keep the bottom tab bar, and get the best mobile experience.</p><button class="btn primary full" id="installVeramorBtn">Install VERAMOR</button><div id="installVeramorHelp" class="muted" style="margin-top:10px;font-size:12px"></div>';
  const first=host.querySelector('.panel');first?host.insertBefore(card,first):host.appendChild(card);
  document.getElementById('installVeramorBtn').onclick=promptInstall;
  updateInstallCard();
}
function updateInstallCard(){
  const b=document.getElementById('installVeramorBtn'),help=document.getElementById('installVeramorHelp');if(!b||!help)return;
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(standalone){b.textContent='VERAMOR is installed';b.disabled=true;help.textContent='You are already using the app-style Home Screen version.';return}
  if(deferredInstallPrompt){b.disabled=false;b.textContent='Install VERAMOR';help.textContent='Adds VERAMOR to your device without an App Store download.';return}
  if(ios){b.disabled=false;b.textContent='How to install on iPhone';help.textContent='Safari: tap Share, then “Add to Home Screen.”';return}
  b.disabled=false;b.textContent='Install VERAMOR';help.textContent='Your browser may show an install option after you use VERAMOR a little longer.';
}
async function promptInstall(){
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    const result=await deferredInstallPrompt.userChoice.catch(()=>null);
    deferredInstallPrompt=null;updateInstallCard();
    if(result?.outcome==='accepted')toastNative('VERAMOR added to your device');
    return;
  }
  if(ios){toastNative('Safari → Share → Add to Home Screen');return}
  toastNative('Open your browser menu and choose Install app / Add to Home Screen');
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;updateInstallCard()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;updateInstallCard();toastNative('VERAMOR installed')});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installNativeShell,{once:true});else installNativeShell();
window.addEventListener('load',installNativeShell,{once:true});
