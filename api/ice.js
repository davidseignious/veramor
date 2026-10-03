export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');

  const iceServers=[
    {urls:[
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302'
    ]},
    {urls:'stun:stun.cloudflare.com:3478'}
  ];

  const username=process.env.TURN_USERNAME||process.env.METERED_TURN_USERNAME||'';
  const credential=process.env.TURN_CREDENTIAL||process.env.METERED_TURN_CREDENTIAL||'';
  const customUrls=(process.env.TURN_URLS||'').split(',').map(x=>x.trim()).filter(Boolean);

  if(username&&credential){
    const urls=customUrls.length?customUrls:[
      'turn:global.relay.metered.ca:80',
      'turn:global.relay.metered.ca:80?transport=tcp',
      'turn:global.relay.metered.ca:443',
      'turns:global.relay.metered.ca:443?transport=tcp'
    ];
    for(const url of urls)iceServers.unshift({urls:url,username,credential});
  }

  const credentialUrl=process.env.TURN_CREDENTIAL_URL||'';
  if(credentialUrl){
    try{
      const r=await fetch(credentialUrl,{headers:{accept:'application/json'}});
      if(r.ok){
        const remote=await r.json();
        if(Array.isArray(remote))iceServers.unshift(...remote);
        else if(Array.isArray(remote?.iceServers))iceServers.unshift(...remote.iceServers);
      }
    }catch(_e){}
  }

  res.status(200).json({iceServers,relayConfigured:iceServers.some(x=>String(Array.isArray(x.urls)?x.urls[0]:x.urls).startsWith('turn'))});
}
