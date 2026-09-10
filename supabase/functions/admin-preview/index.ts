import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const allowedOrigin=(origin:string|null)=>{
  if(!origin) return null;
  if(origin==='https://veramor.vercel.app') return origin;
  if(origin==='https://veramor-app.netlify.app') return origin;
  if(/^https:\/\/[a-z0-9-]+--veramor-app\.netlify\.app$/i.test(origin)) return origin;
  if(/^https:\/\/veramor(?:-[a-z0-9-]+)?-ai-company4\.vercel\.app$/i.test(origin)) return origin;
  if(origin==='https://veramor-dating.ddseign.chatgpt.site') return origin;
  if(/^http:\/\/localhost(?::\d+)?$/i.test(origin)) return origin;
  if(/^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)) return origin;
  return null;
};
const headersFor=(req:Request)=>{
  const origin=allowedOrigin(req.headers.get('origin'));
  return {
    ...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}),
    'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Content-Type':'application/json',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  };
};
const json=(req:Request,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:headersFor(req)});
const url=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sb=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});

async function signed(bucket:string,path?:string|null){
  if(!path) return null;
  if(/^https?:\/\//i.test(path)) return path;
  const {data,error}=await sb.storage.from(bucket).createSignedUrl(path,900);
  return error?null:data?.signedUrl||null;
}
async function signedFolder(bucket:string,userId:string,limit=8){
  const {data,error}=await sb.storage.from(bucket).list(userId,{limit,sortBy:{column:'created_at',order:'asc'}});
  if(error||!Array.isArray(data)) return [];
  const out=[];
  for(const f of data){
    if(!f?.name) continue;
    const path=`${userId}/${f.name}`;
    const u=await signed(bucket,path);
    if(u) out.push({name:f.name,url:u,path,metadata:f.metadata||null});
  }
  return out;
}
async function decorateLive(rows:any[]){
  const out=[];
  for(const p of rows){
    const [avatar,video]=await Promise.all([p.avatar_url || signed('profile-media',p.avatar_path),signed('profile-videos',p.intro_video_path)]);
    out.push({...p,avatar:avatar||p.avatar_url||null,video:video||null,admin_real:true});
  }
  return out;
}
async function decoratePending(rows:any[]){
  const out=[];
  for(const p of rows){
    const [photos,verificationFiles,avatarByPath]=await Promise.all([
      signedFolder('profile-media',String(p.id),8),
      signedFolder('verification-media',String(p.id),4),
      p.avatar_url ? Promise.resolve(p.avatar_url) : signed('profile-media',p.avatar_path)
    ]);
    let faceVideo=null;
    if(p.presence_video_path) faceVideo=await signed('verification-media',p.presence_video_path);
    if(!faceVideo){
      const candidate=verificationFiles.find((x:any)=>String(x.metadata?.mimetype||'').startsWith('video/') || /\.(mp4|mov|webm)$/i.test(String(x.name||'')));
      faceVideo=candidate?.url||null;
    }
    out.push({...p,avatar:avatarByPath||photos[0]?.url||null,photos,face_video:faceVideo,admin_real:true});
  }
  return out;
}
async function decorateReports(rows:any[]){
  const out=[];
  for(const r of rows){
    const avatar=r.reported_avatar_url || await signed('profile-media',r.reported_avatar_path);
    out.push({...r,reported_avatar:avatar||r.reported_avatar_url||null});
  }
  return out;
}

Deno.serve(async(req)=>{
  const origin=req.headers.get('origin');
  if(origin && !allowedOrigin(origin)) return json(req,{error:'origin not allowed'},403);
  if(req.method==='OPTIONS') return new Response('ok',{headers:headersFor(req)});
  if(req.method!=='POST') return json(req,{error:'method not allowed'},405);
  try{
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||'');
    const ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'').split(',')[0].trim().slice(0,120)||null;
    const ua=(req.headers.get('user-agent')||'').slice(0,500)||null;

    if(action==='login'){
      const {data,error}=await sb.rpc('admin_preview_login',{p_email:String(body.email||''),p_passcode:String(body.passcode||''),p_ip:ip,p_user_agent:ua});
      if(error) return json(req,{error:error.message},error.message.includes('too many')?429:401);
      return json(req,data);
    }
    const token=String(body.token||'');
    if(!token) return json(req,{error:'admin session required'},401);

    if(action==='logout'){
      const {data,error}=await sb.rpc('admin_preview_logout',{p_token:token});
      if(error) return json(req,{error:error.message},401);
      return json(req,{ok:!!data});
    }
    if(action==='dashboard'){
      const {data,error}=await sb.rpc('admin_preview_dashboard',{p_token:token});
      if(error) return json(req,{error:error.message},401);
      return json(req,data);
    }
    if(action==='profiles'){
      const {data,error}=await sb.rpc('admin_preview_profiles',{p_token:token});
      if(error) return json(req,{error:error.message},401);
      return json(req,await decorateLive(Array.isArray(data)?data:[]));
    }
    if(action==='pending_profiles'){
      const {data,error}=await sb.rpc('admin_preview_pending_profiles',{p_token:token});
      if(error) return json(req,{error:error.message},401);
      return json(req,await decoratePending(Array.isArray(data)?data:[]));
    }
    if(action==='verify_profile'){
      const userId=String(body.user_id||'');
      if(!/^[0-9a-f-]{36}$/i.test(userId)) return json(req,{error:'invalid user'},400);
      const approved=body.approved===true;
      const {data,error}=await sb.rpc('admin_preview_set_verification',{p_token:token,p_user:userId,p_approved:approved,p_note:String(body.note||'').slice(0,500)||null});
      if(error) return json(req,{error:error.message},400);
      return json(req,data);
    }
    if(action==='reports'){
      const {data,error}=await sb.rpc('admin_preview_reports',{p_token:token});
      if(error) return json(req,{error:error.message},401);
      return json(req,await decorateReports(Array.isArray(data)?data:[]));
    }
    if(action==='moderate_report'){
      const reportId=String(body.report_id||'');
      if(!/^[0-9a-f-]{36}$/i.test(reportId)) return json(req,{error:'invalid report'},400);
      const {data,error}=await sb.rpc('admin_preview_moderate_report',{
        p_token:token,p_report:reportId,p_action:String(body.moderation_action||''),p_note:String(body.note||'').slice(0,500)||null
      });
      if(error) return json(req,{error:error.message},400);
      return json(req,data);
    }
    if(action==='all'){
      const [d,p,q,r]=await Promise.all([
        sb.rpc('admin_preview_dashboard',{p_token:token}),
        sb.rpc('admin_preview_profiles',{p_token:token}),
        sb.rpc('admin_preview_pending_profiles',{p_token:token}),
        sb.rpc('admin_preview_reports',{p_token:token})
      ]);
      if(d.error) return json(req,{error:d.error.message},401);
      if(p.error) return json(req,{error:p.error.message},401);
      if(q.error) return json(req,{error:q.error.message},401);
      if(r.error) return json(req,{error:r.error.message},401);
      const [profiles,pending_profiles,reports]=await Promise.all([
        decorateLive(Array.isArray(p.data)?p.data:[]),
        decoratePending(Array.isArray(q.data)?q.data:[]),
        decorateReports(Array.isArray(r.data)?r.data:[])
      ]);
      return json(req,{dashboard:d.data,profiles,pending_profiles,reports});
    }
    return json(req,{error:'unknown action'},400);
  }catch(e){
    console.error(e);
    return json(req,{error:'admin preview unavailable'},500);
  }
});