import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_ID=Deno.env.get('INSTAGRAM_APP_ID')||Deno.env.get('META_INSTAGRAM_APP_ID')||'';
const APP_SECRET=Deno.env.get('INSTAGRAM_APP_SECRET')||Deno.env.get('META_INSTAGRAM_APP_SECRET')||'';
const GRAPH_VERSION=Deno.env.get('INSTAGRAM_GRAPH_VERSION')||'v25.0';
const CALLBACK=`${SUPABASE_URL}/functions/v1/instagram-connect`;
const BETA='https://veramor.vercel.app/beta.html';
const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}});

function cors(req:Request){
  const o=req.headers.get('origin')||'';
  const allowed=['https://veramor.vercel.app','https://veramor-app.netlify.app'].includes(o)?o:'https://veramor.vercel.app';
  return {'Access-Control-Allow-Origin':allowed,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
}
const json=(req:Request,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors(req)});
const redirect=(status:string,msg='')=>Response.redirect(`${BETA}?instagram=${encodeURIComponent(status)}${msg?`&instagram_message=${encodeURIComponent(msg)}`:''}#profile`,302);
const configured=()=>Boolean(APP_ID&&APP_SECRET);

async function signedUser(req:Request){
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return null;
  const {data:{user},error}=await admin.auth.getUser(token);
  return error?null:user;
}
async function serviceConnection(userId:string){
  const {data,error}=await admin.rpc('instagram_service_connection',{p_user:userId});
  if(error)throw error;return data||{connected:false};
}
async function store(userId:string,profile:any,token:string,expiresIn:number|null,media:any[]){
  const expiresAt=expiresIn?new Date(Date.now()+expiresIn*1000).toISOString():null;
  const {error}=await admin.rpc('instagram_service_store_connection',{p_user:userId,p_ig_user:String(profile.id||''),p_username:String(profile.username||''),p_account_type:String(profile.account_type||''),p_token:token,p_expires_at:expiresAt,p_media:media});
  if(error)throw error;
}
async function graphJson(url:string,init?:RequestInit){
  const r=await fetch(url,init);const data=await r.json().catch(()=>({}));
  if(!r.ok||data?.error)throw new Error(data?.error?.message||data?.error_message||`Instagram request failed (${r.status})`);
  return data;
}
async function exchangeCode(code:string){
  const form=new URLSearchParams({client_id:APP_ID,client_secret:APP_SECRET,grant_type:'authorization_code',redirect_uri:CALLBACK,code:code.replace(/#_$/,'')});
  const short=await graphJson('https://api.instagram.com/oauth/access_token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
  if(!short?.access_token)throw new Error('Instagram did not return an access token.');
  let token=String(short.access_token),expiresIn=3600;
  try{
    const u=new URL('https://graph.instagram.com/access_token');u.searchParams.set('grant_type','ig_exchange_token');u.searchParams.set('client_secret',APP_SECRET);u.searchParams.set('access_token',token);
    const long=await graphJson(u.toString());if(long?.access_token){token=String(long.access_token);expiresIn=Number(long.expires_in)||5184000}
  }catch(_e){}
  return {token,expiresIn};
}
async function refreshLongToken(token:string){
  const u=new URL('https://graph.instagram.com/refresh_access_token');u.searchParams.set('grant_type','ig_refresh_token');u.searchParams.set('access_token',token);
  const d=await graphJson(u.toString());return {token:String(d.access_token||token),expiresIn:Number(d.expires_in)||5184000};
}
async function fetchInstagram(token:string){
  const p=new URL(`https://graph.instagram.com/${GRAPH_VERSION}/me`);p.searchParams.set('fields','id,username,account_type');p.searchParams.set('access_token',token);
  const profile=await graphJson(p.toString());
  const m=new URL(`https://graph.instagram.com/${GRAPH_VERSION}/me/media`);m.searchParams.set('fields','id,media_type,media_url,thumbnail_url,permalink,caption,timestamp');m.searchParams.set('limit','25');m.searchParams.set('access_token',token);
  const mediaData=await graphJson(m.toString());
  const media=(Array.isArray(mediaData?.data)?mediaData.data:[]).filter((x:any)=>x&&x.id&&(x.media_type==='IMAGE'||x.media_type==='CAROUSEL_ALBUM')).slice(0,24);
  return {profile,media};
}
async function syncUser(userId:string,token:string,expiresIn:number|null){
  const {profile,media}=await fetchInstagram(token);await store(userId,profile,token,expiresIn,media);return {profile,media_count:media.length};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  const url=new URL(req.url);
  try{
    if(req.method==='GET'&&(url.searchParams.has('code')||url.searchParams.has('error'))){
      if(!configured())return redirect('error','Instagram connection is not configured yet.');
      const state=url.searchParams.get('state')||'';const code=url.searchParams.get('code')||'';
      if(!state||!code)return redirect('error',url.searchParams.get('error_description')||'Instagram authorization was cancelled.');
      const {data:userId,error:stateError}=await admin.rpc('instagram_service_take_state',{p_state:state});
      if(stateError||!userId)return redirect('error','Instagram authorization expired. Try connecting again.');
      const exchanged=await exchangeCode(code);await syncUser(String(userId),exchanged.token,exchanged.expiresIn);
      return redirect('connected');
    }
    if(req.method!=='POST')return json(req,{error:'method not allowed'},405);
    const user=await signedUser(req);if(!user)return json(req,{error:'authentication required'},401);
    const body=await req.json().catch(()=>({}));const action=String(body?.action||'status');
    if(action==='status'){
      const c=configured()?await serviceConnection(user.id):{connected:false};return json(req,{configured:configured(),connected:!!c.connected,username:c.username||null,account_type:c.account_type||null,last_synced_at:c.last_synced_at||null,token_expires_at:c.token_expires_at||null});
    }
    if(action==='connect'){
      if(!configured())return json(req,{error:'Instagram needs the Meta App ID and App Secret before connections can be enabled.',configured:false},503);
      const state=`${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const {error}=await admin.rpc('instagram_service_begin_state',{p_user:user.id,p_state:state});if(error)throw error;
      const auth=new URL('https://www.instagram.com/oauth/authorize');auth.searchParams.set('force_reauth','true');auth.searchParams.set('enable_fb_login','0');auth.searchParams.set('client_id',APP_ID);auth.searchParams.set('redirect_uri',CALLBACK);auth.searchParams.set('response_type','code');auth.searchParams.set('scope','instagram_business_basic');auth.searchParams.set('state',state);
      return json(req,{url:auth.toString(),callback:CALLBACK});
    }
    if(action==='sync'){
      if(!configured())return json(req,{error:'Instagram connection is not configured.',configured:false},503);
      const c=await serviceConnection(user.id);if(!c.connected||!c.access_token)return json(req,{error:'Connect Instagram first.'},400);
      let token=String(c.access_token),expiresIn:number|null=null;
      const exp=c.token_expires_at?new Date(c.token_expires_at).getTime():0;
      if(exp&&exp-Date.now()<14*86400000){try{const refreshed=await refreshLongToken(token);token=refreshed.token;expiresIn=refreshed.expiresIn}catch(_e){}}
      const result=await syncUser(user.id,token,expiresIn||Math.max(3600,Math.floor((exp-Date.now())/1000)));
      return json(req,{ok:true,username:result.profile.username||null,media_count:result.media_count});
    }
    if(action==='disconnect'){
      const {error}=await admin.rpc('instagram_service_disconnect',{p_user:user.id});if(error)throw error;return json(req,{ok:true});
    }
    return json(req,{error:'unknown action'},400);
  }catch(e){console.error(e);return req.method==='GET'?redirect('error',e instanceof Error?e.message:'Instagram connection failed.'):json(req,{error:e instanceof Error?e.message:'Instagram connection failed.'},500)}
});
