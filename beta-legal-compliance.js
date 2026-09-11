import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const legalSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

const TERMS_VERSION='2026-09-11.1';
const PRIVACY_VERSION='2026-09-11.1';
const SAFETY_VERSION='2026-09-11.1';
const BACKGROUND_NOTICE='VERAMOR DOES NOT CONDUCT CRIMINAL BACKGROUND SCREENINGS ON ITS MEMBERS.';

function visible(el){return !!el&&!el.classList.contains('hidden')}
function authMessage(text){const el=document.getElementById('authMsg');if(el)el.innerHTML=`<div class="notice bad">${text}</div>`}

function installSignupDisclosures(){
  const form=document.getElementById('authForm');
  const age=document.getElementById('ageRow');
  if(!form||!age||document.getElementById('veraLegalSignup'))return;
  const wrap=document.createElement('div');
  wrap.id='veraLegalSignup';
  wrap.className='hidden';
  wrap.innerHTML=`
    <div class="vera-background-disclosure">${BACKGROUND_NOTICE}</div>
    <div class="vera-safety-registration">
      <strong>Dating safety notice</strong>
      <p>Use caution when communicating with anyone you have not met. Do not put your home address, phone number, workplace, financial information, passwords, or one-time codes in your profile or early messages.</p>
      <p>If you meet in person, tell someone you trust where you are going, arrange your own transportation, and meet in a public place.</p>
      <a href="safety.html" target="_blank" rel="noopener">Read the full Dating Safety Center</a>
    </div>
    <label class="notice vera-legal-check"><input id="termsConfirm" type="checkbox"> <span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Beta Terms</a> and acknowledge the <a href="privacy.html" target="_blank" rel="noopener">Privacy Notice</a>.</span></label>
    <label class="notice vera-legal-check"><input id="safetyConfirm" type="checkbox"> <span>I have read the dating safety notice and understand that verification does not guarantee another person’s identity, history, intentions, or behavior.</span></label>
    <label class="notice vera-legal-check"><input id="backgroundConfirm" type="checkbox"> <span>I acknowledge that VERAMOR does not conduct criminal background screenings on members.</span></label>`;
  age.insertAdjacentElement('afterend',wrap);

  const sync=()=>wrap.classList.toggle('hidden',!visible(age));
  new MutationObserver(sync).observe(age,{attributes:true,attributeFilter:['class']});
  sync();

  form.addEventListener('submit',e=>{
    if(!visible(age))return;
    const required=['termsConfirm','safetyConfirm','backgroundConfirm'];
    const missing=required.some(id=>!document.getElementById(id)?.checked);
    if(missing){e.preventDefault();e.stopImmediatePropagation();authMessage('Please accept the Terms, Privacy Notice, dating-safety notice, and background-screening disclosure to create an account.');return}
    localStorage.setItem('veramor_pending_legal_acceptance',JSON.stringify({terms:TERMS_VERSION,privacy:PRIVACY_VERSION,safety:SAFETY_VERSION,background:true,accepted_at:new Date().toISOString()}));
  },true);
}

async function persistPendingAcceptance(){
  const raw=localStorage.getItem('veramor_pending_legal_acceptance');if(!raw)return;
  let payload;try{payload=JSON.parse(raw)}catch(_e){return}
  const {data:{session}}=await legalSb.auth.getSession();if(!session?.user)return;
  const prior=session.user.user_metadata||{};
  const {error}=await legalSb.auth.updateUser({data:{...prior,veramor_legal_acceptance:payload}});
  if(!error)localStorage.removeItem('veramor_pending_legal_acceptance');
}

function addBackgroundNotice(target,position='afterbegin'){
  if(!target||target.querySelector?.('.vera-background-disclosure'))return;
  const n=document.createElement('div');n.className='vera-background-disclosure';n.textContent=BACKGROUND_NOTICE;
  target.insertAdjacentElement(position,n);
}

function decorateProfiles(){
  document.querySelectorAll('.profile-card').forEach(card=>addBackgroundNotice(card.querySelector('.details')||card));
  const modal=document.getElementById('profileModal');
  const body=document.getElementById('profileModalBody');
  if(modal&&body&&!modal.classList.contains('hidden'))addBackgroundNotice(body);
}

function renameRiskyPublicCopy(){
  const title=document.getElementById('matchModalTitle');
  if(title&&/^it['’]s a match!?$/i.test(title.textContent.trim()))title.textContent='You connected';
  document.querySelectorAll('button,.pill,strong,h2,h3,p,small').forEach(el=>{
    if(el.children.length)return;
    const t=el.textContent.trim();
    if(/^profile passport$/i.test(t))el.textContent='PROFILE LINK';
    if(/^super like$/i.test(t))el.textContent='Signal';
  });
}

function strengthenReportReasons(){
  const select=document.getElementById('reportReason');if(!select)return;
  if(!Array.from(select.options).some(o=>/child sexual exploitation/i.test(o.textContent))){
    const o=document.createElement('option');o.textContent='Child sexual exploitation or sexual content involving minors';select.appendChild(o);
  }
}

function installSettingsLegalPanel(){
  const host=document.getElementById('settingsView');if(!host||document.getElementById('veraLegalPanel'))return;
  const p=document.createElement('div');p.id='veraLegalPanel';p.className='panel';
  p.innerHTML='<h3>Legal, privacy & safety</h3><p class="muted">Review the documents that govern Friend Beta use and VERAMOR’s safety disclosures.</p><div class="actions"><a class="btn" href="terms.html" target="_blank" rel="noopener">Terms</a><a class="btn" href="privacy.html" target="_blank" rel="noopener">Privacy</a><a class="btn" href="safety.html" target="_blank" rel="noopener">Dating Safety</a><a class="btn" href="copyright.html" target="_blank" rel="noopener">Copyright</a></div><div class="vera-background-disclosure" style="margin-top:12px">'+BACKGROUND_NOTICE+'</div>';
  const danger=host.querySelector('.danger-zone');if(danger)host.insertBefore(p,danger);else host.appendChild(p);
}

function installEntrySafetyLink(){
  const hero=document.querySelector('#authScreen .hero');if(!hero||document.getElementById('veraEntrySafety'))return;
  const a=document.createElement('a');a.id='veraEntrySafety';a.className='vera-entry-safety';a.href='safety.html';a.target='_blank';a.rel='noopener';a.textContent='Dating Safety Center';hero.appendChild(a);
}

function scan(){installSignupDisclosures();installEntrySafetyLink();decorateProfiles();renameRiskyPublicCopy();strengthenReportReasons();installSettingsLegalPanel()}
const observer=new MutationObserver(()=>scan());
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
window.addEventListener('load',()=>{scan();persistPendingAcceptance().catch(()=>{})});
legalSb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN')persistPendingAcceptance().catch(()=>{})});
