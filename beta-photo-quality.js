const MIN_SIDE=1080;

function qMessage(text,type='warn'){
  const host=document.getElementById('photoMsg');if(!host)return;
  host.innerHTML=`<div class="notice ${type}">${text}</div>`;
}
function readDims(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();const url=URL.createObjectURL(file);
    img.onload=()=>{const out={width:img.naturalWidth,height:img.naturalHeight};URL.revokeObjectURL(url);resolve(out)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error(`Could not read ${file.name||'that image'}.`))};
    img.src=url;
  });
}
async function validateSelected(){
  const input=document.getElementById('photoInput');const files=Array.from(input?.files||[]);
  if(!files.length)return {ok:true,files:[]};
  const bad=[];const good=[];
  for(const file of files){
    if(!file.type.startsWith('image/')){bad.push(`${file.name}: not an image`);continue}
    try{
      const d=await readDims(file);
      const shortest=Math.min(d.width,d.height);
      if(shortest<MIN_SIDE)bad.push(`${file.name}: ${d.width}×${d.height}px`);else good.push({...d,name:file.name});
    }catch(e){bad.push(`${file.name}: unreadable`)}
  }
  return {ok:bad.length===0,bad,good,files};
}
async function paintQuality(){
  const result=await validateSelected();
  const btn=document.getElementById('uploadPhotos');if(btn)btn.classList.toggle('quality-blocked',!result.ok);
  if(!result.files.length)return qMessage('Photo quality rule: every uploaded profile photo must have a shortest side of at least 1080px.','');
  if(!result.ok)return qMessage(`These photos are below the 1080 quality floor: ${result.bad.join(' · ')}. Replace them before uploading.`,'bad');
  qMessage(`✓ ${result.good.length} selected photo${result.good.length===1?'':'s'} passed the 1080px quality check.`,'ok');
}
function installPhotoGate(){
  const input=document.getElementById('photoInput'),btn=document.getElementById('uploadPhotos');if(!input||!btn||btn.dataset.qualityWrapped)return;
  btn.dataset.qualityWrapped='1';
  input.addEventListener('change',()=>paintQuality().catch(()=>{}));
  const original=btn.onclick;
  btn.onclick=async function(e){
    const result=await validateSelected();
    if(!result.ok){e?.preventDefault?.();qMessage(`Upload blocked. Every photo must be at least 1080px on its shortest side. ${result.bad.join(' · ')}`,'bad');return}
    if(typeof original==='function')return original.call(this,e);
  };
  if(!document.getElementById('photoQualityRule')){
    const target=input.closest('.field');if(target){const n=document.createElement('div');n.id='photoQualityRule';n.className='notice';n.innerHTML='<strong>1080 quality required</strong><br>Every profile photo must be sharp and at least 1080px on its shortest side. Low-resolution photos are blocked before upload.';target.insertAdjacentElement('afterend',n)}
  }
}
function boot(){installPhotoGate();const onboarding=document.getElementById('onboardingScreen');if(onboarding)new MutationObserver(()=>installPhotoGate()).observe(onboarding,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
