import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const filterSb=createClient('https://rfcoworvfqcqallgpozn.supabase.co','sb_publishable_Sa1IwBa9gr7NylS_EMjpnA_5j1HT5LF',{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:true}});
let plan='free';
const fEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=v=>v? [v] : [];
const heightLabel=n=>n?Math.floor(n/12)+'′'+(n%12)+'″':'Any';
function options(values,current=''){return '<option value="">Any</option>'+values.map(v=>'<option '+(v===current?'selected':'')+'>'+fEsc(v)+'</option>').join('')}
function heightOptions(){return '<option value="">Any</option>'+Array.from({length:61},(_,i)=>i+36).map(n=>'<option value="'+n+'">'+heightLabel(n)+'</option>').join('')}

async function getUser(){const {data:{session}}=await filterSb.auth.getSession();return session?.user||null}
async function installFilters(){
  const modes=document.getElementById('modeButtons');if(!modes||document.getElementById('discoveryFiltersPanel'))return;
  const panel=document.createElement('div');panel.id='discoveryFiltersPanel';panel.className='panel vera-filter-panel';
  panel.innerHTML=`<div class="section-title"><div><span class="pill">FILTERS</span><h3 style="margin:7px 0 0">Who do you want to see?</h3></div><button class="btn" id="toggleFilters">Edit filters</button></div>
  <div id="filterBody" class="hidden">
    <div class="vera-free-filter-head"><strong>Included for everyone</strong><span class="pill ok">FREE</span></div>
    <div class="grid">
      <div class="field"><label>Minimum age</label><input id="filterMinAge" type="number" min="18" max="100"></div>
      <div class="field"><label>Maximum age</label><input id="filterMaxAge" type="number" min="18" max="100"></div>
      <div class="field"><label>Maximum distance</label><select id="filterDistance"><option value="5">5 miles</option><option value="10">10 miles</option><option value="25">25 miles</option><option value="50">50 miles</option><option value="100">100 miles</option><option value="250">250 miles</option></select></div>
    </div>
    <div class="vera-premium-filter-head"><div><strong>Advanced filters</strong><small>Relationship goal, lifestyle, height and activity filters</small></div><span class="pill premium">PREMIUM</span></div>
    <div id="premiumFilterLock" class="notice warn hidden">Advanced filters require VERAMOR Premium. Age and distance stay free. <button class="btn" type="button" id="viewPremiumBilling" style="margin-top:8px">View VERAMOR Premium</button></div>
    <div id="premiumFilters" class="grid">
      <div class="field"><label>Relationship goal</label><select id="filterIntent"></select></div>
      <div class="field"><label>Cigarettes</label><select id="filterSmoking"></select></div>
      <div class="field"><label>Weed</label><select id="filterCannabis"></select></div>
      <div class="field"><label>Alcohol</label><select id="filterDrinking"></select></div>
      <div class="field"><label>Has children</label><select id="filterHasChildren"></select></div>
      <div class="field"><label>Wants children</label><select id="filterWantsChildren"></select></div>
      <div class="field"><label>Religion</label><input id="filterReligion" maxlength="50" placeholder="Any"></div>
      <div class="field"><label>Education</label><input id="filterEducation" maxlength="80" placeholder="Any"></div>
      <div class="field"><label>Minimum height</label><select id="filterMinHeight">${heightOptions()}</select></div>
      <div class="field"><label>Maximum height</label><select id="filterMaxHeight">${heightOptions()}</select></div>
    </div>
    <div id="premiumToggles"><label class="notice"><input id="filterVideoOnly" type="checkbox"> Only profiles with a public video</label><label class="notice"><input id="filterRecentOnly" type="checkbox"> Recently active profiles only</label></div>
    <button class="btn primary full" id="saveDiscoveryFilters">Apply filters</button><div id="filterMsg"></div>
  </div>`;
  modes.insertAdjacentElement('beforebegin',panel);
  document.getElementById('filterIntent').innerHTML=options(['Long-term relationship','Relationship, open to short','Short-term, open to long','Figuring it out']);
  document.getElementById('filterSmoking').innerHTML=options(['Never','Sometimes','Often','Quitting','Prefer not to say']);
  document.getElementById('filterCannabis').innerHTML=options(['Never','Sometimes','Often','Prefer not to say']);
  document.getElementById('filterDrinking').innerHTML=options(['Never','Socially','Often','Prefer not to say']);
  document.getElementById('filterHasChildren').innerHTML=options(['Yes','No','Prefer not to say']);
  document.getElementById('filterWantsChildren').innerHTML=options(['Yes','No','Open to it','Not sure','Prefer not to say']);
  document.getElementById('toggleFilters').onclick=()=>document.getElementById('filterBody').classList.toggle('hidden');
  document.getElementById('viewPremiumBilling').onclick=()=>{document.querySelector('#bottomNav button[data-view="settingsView"]')?.click();setTimeout(()=>document.getElementById('veramorBilling')?.scrollIntoView({behavior:'smooth',block:'center'}),120)};
  document.getElementById('saveDiscoveryFilters').onclick=saveFilters;
  await loadFilters();
}
async function loadFilters(){
  const u=await getUser();if(!u)return;
  const [{data:settings,error},{data:p,error:pe}]=await Promise.all([
    filterSb.from('user_settings').select('*').eq('user_id',u.id).single(),
    filterSb.rpc('get_my_plan')
  ]);
  if(error)throw error;if(pe)throw pe;plan=String(p||'free').toLowerCase();
  document.getElementById('filterMinAge').value=settings.min_age??18;document.getElementById('filterMaxAge').value=settings.max_age??100;document.getElementById('filterDistance').value=String(settings.max_distance_miles??50);
  const first=x=>Array.isArray(x)&&x.length?x[0]:'';
  document.getElementById('filterIntent').value=first(settings.relationship_intent_preferences);
  document.getElementById('filterSmoking').value=first(settings.smoking_preferences);
  document.getElementById('filterCannabis').value=first(settings.cannabis_preferences);
  document.getElementById('filterDrinking').value=first(settings.drinking_preferences);
  document.getElementById('filterHasChildren').value=first(settings.has_children_preferences);
  document.getElementById('filterWantsChildren').value=first(settings.wants_children_preferences);
  document.getElementById('filterReligion').value=first(settings.religion_preferences);
  document.getElementById('filterEducation').value=first(settings.education_preferences);
  document.getElementById('filterMinHeight').value=settings.min_height_inches||'';document.getElementById('filterMaxHeight').value=settings.max_height_inches||'';
  document.getElementById('filterVideoOnly').checked=!!settings.only_video_profiles;document.getElementById('filterRecentOnly').checked=!!settings.recently_active_only;
  const premium=plan==='premium';document.getElementById('premiumFilterLock').classList.toggle('hidden',premium);
  document.querySelectorAll('#premiumFilters input,#premiumFilters select,#premiumToggles input').forEach(x=>x.disabled=!premium);
}
async function saveFilters(){
  const u=await getUser();if(!u)return;const b=document.getElementById('saveDiscoveryFilters'),msg=document.getElementById('filterMsg');
  let min=Math.max(18,Math.min(100,Number(document.getElementById('filterMinAge').value)||18)),max=Math.max(18,Math.min(100,Number(document.getElementById('filterMaxAge').value)||100));if(min>max)[min,max]=[max,min];
  const row={min_age:min,max_age:max,max_distance_miles:Number(document.getElementById('filterDistance').value)||50,updated_at:new Date().toISOString()};
  if(plan==='premium')Object.assign(row,{
    relationship_intent_preferences:arr(document.getElementById('filterIntent').value),
    smoking_preferences:arr(document.getElementById('filterSmoking').value),
    cannabis_preferences:arr(document.getElementById('filterCannabis').value),
    drinking_preferences:arr(document.getElementById('filterDrinking').value),
    has_children_preferences:arr(document.getElementById('filterHasChildren').value),
    wants_children_preferences:arr(document.getElementById('filterWantsChildren').value),
    religion_preferences:arr(document.getElementById('filterReligion').value.trim()),
    education_preferences:arr(document.getElementById('filterEducation').value.trim()),
    min_height_inches:Number(document.getElementById('filterMinHeight').value)||null,
    max_height_inches:Number(document.getElementById('filterMaxHeight').value)||null,
    only_video_profiles:document.getElementById('filterVideoOnly').checked,
    recently_active_only:document.getElementById('filterRecentOnly').checked
  });
  b.disabled=true;b.textContent='Applying…';
  try{const {error}=await filterSb.from('user_settings').update(row).eq('user_id',u.id);if(error)throw error;msg.innerHTML='<div class="notice ok">Filters applied.</div>';document.getElementById('refreshDiscovery')?.click()}
  catch(e){msg.innerHTML='<div class="notice bad">'+fEsc(e.message||'Could not save filters.')+'</div>'}
  finally{b.disabled=false;b.textContent='Apply filters'}
}
function boot(){installFilters().catch(e=>console.error('filters',e))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
filterSb.auth.onAuthStateChange(e=>{if(e==='SIGNED_IN')setTimeout(()=>installFilters().then(loadFilters).catch(()=>{}),100)});
