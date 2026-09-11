import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const dateSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
let dateContext=null;
const dEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function dUser(){const {data:{session}}=await dateSb.auth.getSession();return session?.user||null}
async function activeMatches(){const u=await dUser();if(!u)return[];const {data,error}=await dateSb.from('matches').select('*').eq('status','active').or(`user_a.eq.${u.id},user_b.eq.${u.id}`).order('created_at',{ascending:false});if(error)throw error;return data||[]}
async function profileName(id){const {data}=await dateSb.from('profiles').select('display_name').eq('id',id).maybeSingle();return data?.display_name||'Your match'}
async function resolveContext(){
  const u=await dUser();if(!u)return null;
  const title=(document.getElementById('matchModalTitle')?.textContent||'').trim();
  const rows=await activeMatches();
  for(const m of rows){
    const otherId=m.user_a===u.id?m.user_b:m.user_a;
    const name=await profileName(otherId);
    if(name===title||rows.length===1){dateContext={match:m,otherId,otherName:name,user:u};return dateContext}
  }
  return null;
}
function ensureDateModal(){
  if(document.getElementById('veraDateModal'))return;
  const modal=document.createElement('div');modal.id='veraDateModal';modal.className='modal hidden';
  modal.innerHTML='<div class="sheet vera-date-sheet"><div class="sheet-head"><div><span class="pill">DATE MODE</span><strong id="veraDateTitle">Plan a date</strong></div><button class="x" id="veraDateClose">×</button></div><div id="veraDateBody"></div></div>';
  document.body.appendChild(modal);document.getElementById('veraDateClose').onclick=()=>modal.classList.add('hidden');modal.onclick=e=>{if(e.target===modal)modal.classList.add('hidden')};
}
function formatWhen(v){try{return new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(v))}catch(_e){return String(v||'')}}
async function plans(matchId){const {data,error}=await dateSb.from('date_plans').select('*').eq('match_id',matchId).order('created_at',{ascending:false});if(error)throw error;return data||[]}
async function renderDateMode(){
  ensureDateModal();const ctx=await resolveContext();if(!ctx)throw new Error('Open a match first.');
  if(!(ctx.match.chemistry_complete_a&&ctx.match.chemistry_complete_b))throw new Error('Date Mode unlocks after both Chemistry Checks.');
  const rows=await plans(ctx.match.id);const body=document.getElementById('veraDateBody');document.getElementById('veraDateTitle').textContent=`You + ${ctx.otherName}`;
  const list=rows.length?rows.map(p=>{const mine=p.proposer_id===ctx.user.id;const open=p.status==='proposed';return `<div class="date-plan ${dEsc(p.status)}"><div class="date-plan-head"><strong>📍 ${dEsc(p.venue)}</strong><span class="pill">${dEsc(p.status.toUpperCase())}</span></div><div class="date-when">${dEsc(formatWhen(p.proposed_for))}</div>${p.note?`<p>${dEsc(p.note)}</p>`:''}<small>${mine?'You proposed this':`${dEsc(ctx.otherName)} proposed this`}</small>${open&&!mine?`<div class="actions"><button class="btn primary" data-date-accept="${p.id}">Accept</button><button class="btn" data-date-decline="${p.id}">Decline</button></div>`:''}${(p.status==='proposed'||p.status==='accepted')&&mine?`<button class="btn danger date-cancel" data-date-cancel="${p.id}">Cancel date</button>`:''}</div>`}).join(''):'<div class="notice">No date plans yet. Be the first to suggest something.</div>';
  body.innerHTML=`<div class="date-hero"><div class="date-heart">💘</div><h2>Take it off the app</h2><p class="muted">Suggest a real plan after you both finish Chemistry.</p></div><div class="panel date-compose"><div class="field"><label>Date & time</label><input id="dateWhen" type="datetime-local"></div><div class="field"><label>Place or plan</label><input id="dateVenue" maxlength="160" placeholder="Coffee at Sawada, Art Institute, dinner in Pilsen…"></div><div class="field"><label>Note <span class="muted">(optional)</span></label><textarea id="dateNote" maxlength="500" placeholder="Keep it simple and specific."></textarea></div><button class="btn primary full" id="sendDatePlan">Suggest date</button><div id="dateMsg"></div></div><h3>Plans</h3>${list}`;
  const input=document.getElementById('dateWhen');if(input&&!input.value){const d=new Date(Date.now()+24*60*60*1000);d.setMinutes(Math.ceil(d.getMinutes()/15)*15,0,0);input.value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
  document.getElementById('sendDatePlan').onclick=submitDate;
  body.querySelectorAll('[data-date-accept]').forEach(b=>b.onclick=()=>respondDate(b.dataset.dateAccept,true));
  body.querySelectorAll('[data-date-decline]').forEach(b=>b.onclick=()=>respondDate(b.dataset.dateDecline,false));
  body.querySelectorAll('[data-date-cancel]').forEach(b=>b.onclick=()=>cancelDate(b.dataset.dateCancel));
}
async function submitDate(){const ctx=dateContext||await resolveContext(),when=document.getElementById('dateWhen')?.value,venue=document.getElementById('dateVenue')?.value.trim(),note=document.getElementById('dateNote')?.value.trim();const b=document.getElementById('sendDatePlan');if(!when||!venue){document.getElementById('dateMsg').innerHTML='<div class="notice warn">Add a date, time, and place.</div>';return}b.disabled=true;b.textContent='Sending…';try{const {error}=await dateSb.rpc('propose_date',{match_uuid:ctx.match.id,proposed_at:new Date(when).toISOString(),venue_text:venue,note_text:note||null});if(error)throw error;await renderDateMode()}catch(e){document.getElementById('dateMsg').innerHTML=`<div class="notice bad">${dEsc(e.message||'Could not suggest date.')}</div>`;b.disabled=false;b.textContent='Suggest date'}}
async function respondDate(id,accept){try{const {error}=await dateSb.rpc('respond_date',{plan_uuid:id,accept_plan:!!accept});if(error)throw error;await renderDateMode()}catch(e){alert(e.message||'Could not respond to date.') }}
async function cancelDate(id){if(!confirm('Cancel this date plan?'))return;try{const {error}=await dateSb.rpc('cancel_date',{plan_uuid:id});if(error)throw error;await renderDateMode()}catch(e){alert(e.message||'Could not cancel date.')}}
function installDateButton(){
  const chat=document.getElementById('chatMessages');
  if(chat&&!document.getElementById('veraDateMode')){
    const host=document.getElementById('veraLiveTools');
    const b=document.createElement('button');b.className='btn date-mode-btn';b.id='veraDateMode';b.textContent='📍 Date Mode';b.onclick=()=>{renderDateMode().then(()=>document.getElementById('veraDateModal').classList.remove('hidden')).catch(e=>alert(e.message))};
    if(host)host.appendChild(b);else chat.insertAdjacentElement('beforebegin',b);
  }
  const body=document.getElementById('matchModalBody');
  const chemistry=body&&(document.getElementById('chemAnswer')||/Waiting on/i.test(body.textContent||''));
  if(chemistry&&!document.getElementById('dateModeLocked')){
    const note=document.createElement('div');note.id='dateModeLocked';note.className='notice date-mode-locked';note.textContent='📍 Date Mode unlocks as soon as both Chemistry Checks are complete.';body.appendChild(note);
  }
}
function initDateMode(){ensureDateModal();const body=document.getElementById('matchModalBody');if(body)new MutationObserver(()=>setTimeout(installDateButton,30)).observe(body,{childList:true,subtree:true});installDateButton()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initDateMode,{once:true});else initDateMode();
dateSb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')setTimeout(initDateMode,50)});
