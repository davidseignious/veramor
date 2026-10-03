export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');

  // VERAMOR $0 Direct Mode:
  // Never return TURN credentials or any billable relay.
  // Calls use peer-to-peer WebRTC with free STUN discovery only.
  const iceServers=[
    {urls:[
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302'
    ]},
    {urls:'stun:stun.cloudflare.com:3478'}
  ];

  res.status(200).json({
    iceServers,
    relayConfigured:false,
    zeroCostMode:true,
    transport:'peer-to-peer',
    paidFallback:false
  });
}
