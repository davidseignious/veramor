import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const billingSb=createClient(
  'https://rfcoworvfqcqallgpozn.supabase.co',
  'sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
let billingConfigured=false;
const bEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function money(cents){return '$'+(Number(cents||0)/100).toFixed(2)}
async function currentUser(){const {data:{session}}=await billingSb.auth.getSession();return session?.user||null}

async function billingStatus(){
  try{
    const {data,error}=await billingSb.functions.invoke('veramor-checkout',{body:{action:'status'}});
    if(error)throw error;
    billingConfigured=!!data?.configured&&!!data?.isolated;
    return data||{};
  }catch(e){
    billingConfigured=false;
    return {configured:false,isolated:true,message:'VERAMOR billing is not connected yet. Serviq billing is intentionally isolated.'};
  }
}

async function loadCatalog(){
  const {data,error}=await billingSb.from('billing_catalog')
    .select('product_key,product_type,display_name,plan_code,boost_type,quantity,amount_cents,currency,recurring_interval,active')
    .eq('active',true)
    .in('product_key',['plus_monthly','premium_monthly','plus_annual','rewind_1','rewind_5']);
  if(error)throw error;
  return data||[];
}

async function startCheckout(productKey,button){
  if(!billingConfigured){showBillingMessage('Payments are coming soon. VERAMOR billing is intentionally separate from Serviq.','warn');return}
  const u=await currentUser();if(!u){showBillingMessage('Sign in before purchasing.','warn');return}
  button.disabled=true;const prior=button.textContent;button.textContent='Opening secure checkout…';
  try{
    const {data,error}=await billingSb.functions.invoke('veramor-checkout',{body:{product_key:productKey}});
    if(error)throw error;
    if(!data?.url)throw new Error(data?.error||'Checkout URL was not returned.');
    location.assign(data.url);
  }catch(e){
    showBillingMessage(e?.context?.body?.error||e?.message||'Checkout could not be started.','bad');
    button.disabled=false;button.textContent=prior;
  }
}

function showBillingMessage(text,type=''){const el=document.getElementById('billingMsg');if(el)el.innerHTML='<div class="notice '+type+'">'+bEsc(text)+'</div>'}

async function installBilling(){
  const host=document.getElementById('settingsView');
  if(!host||document.getElementById('veramorBilling'))return;
  const [status,catalog]=await Promise.all([billingStatus(),loadCatalog().catch(()=>[])]);
  const planRows=catalog.filter(x=>x.product_type==='subscription'&&['plus_monthly','premium_monthly','plus_annual'].includes(x.product_key));
  const rewindRows=catalog.filter(x=>x.boost_type==='rewind');

  const {data:plan}=await billingSb.rpc('get_my_plan').catch(()=>({data:'free'}));
  const {data:rewind}=await billingSb.rpc('rewind_status').catch(()=>({data:null}));

  const panel=document.createElement('div');
  panel.id='veramorBilling';panel.className='panel vera-billing-panel';
  panel.innerHTML=`
    <div class="section-title"><div><span class="pill">VERAMOR BILLING</span><h3 style="margin:7px 0 0">Plans & rewind credits</h3></div><span class="pill ${billingConfigured?'ok':'warn'}">${billingConfigured?'CONNECTED':'NOT CONNECTED'}</span></div>
    <div class="notice ${billingConfigured?'ok':'warn'}">${billingConfigured?'Secure VERAMOR payments are connected.':'Payments are coming soon. VERAMOR billing is kept completely separate from Serviq, so purchases stay disabled until the dedicated VERAMOR Stripe account is connected.'}</div>
    <p class="muted">Current plan: <strong>${bEsc(String(plan||'free').toUpperCase())}</strong>. Your first rewind is free once; after that, rewinds use a purchased or weekly-gift credit.</p>
    <div class="vera-billing-grid">
      ${planRows.map(x=>`<article class="vera-billing-card"><span class="pill">${x.plan_code==='premium'?'PREMIUM':'PLUS'}</span><h4>${bEsc(x.display_name)}</h4><strong class="vera-price">${money(x.amount_cents)}${x.recurring_interval?'/'+bEsc(x.recurring_interval):''}</strong><button class="btn primary full" data-buy="${bEsc(x.product_key)}" ${billingConfigured?'':'disabled'}>Choose plan</button></article>`).join('')}
    </div>
    <div class="vera-billing-grid vera-rewind-grid">
      ${rewindRows.map(x=>`<article class="vera-billing-card"><span class="pill">REWIND CREDIT</span><h4>${bEsc(x.display_name)}</h4><strong class="vera-price">${money(x.amount_cents)}</strong><button class="btn full" data-buy="${bEsc(x.product_key)}" ${billingConfigured?'':'disabled'}>Buy</button></article>`).join('')}
    </div>
    <p class="muted">Rewind credits available: <strong>${Number(rewind?.rewind_credits)||0}</strong>.</p>
    <div id="billingMsg"></div>`;
  const danger=host.querySelector('.danger-zone');danger?host.insertBefore(panel,danger):host.appendChild(panel);
  panel.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>startCheckout(b.dataset.buy,b));

  const params=new URLSearchParams(location.search);
  if(params.get('billing')==='success')showBillingMessage('Payment completed. Your access updates after Stripe confirms the purchase.','ok');
  if(params.get('billing')==='cancelled')showBillingMessage('Checkout cancelled. You were not charged.','warn');
}

function boot(){installBilling().catch(e=>console.error('billing',e))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
billingSb.auth.onAuthStateChange(e=>{if(e==='SIGNED_IN'||e==='TOKEN_REFRESHED')setTimeout(boot,100)});
