const STREAMING_PRIVACY_HTML='<strong>🔒 Your streaming login stays private</strong><span>VERAMOR never asks for, sees, or stores your Netflix, Max, Hulu, Disney+, Prime Video, or other streaming password. Sign in only on the provider’s own site or app.</span>';

function decorateStreamingPrivacy(){
  document.querySelectorAll('.vera-watch-lobby,.vera-watch-room.external').forEach(host=>{
    if(host.querySelector('.streaming-privacy-note'))return;
    const note=document.createElement('div');
    note.className='streaming-privacy-note';
    note.innerHTML=STREAMING_PRIVACY_HTML;
    host.appendChild(note);
  });
}

decorateStreamingPrivacy();
new MutationObserver(decorateStreamingPrivacy).observe(document.body,{childList:true,subtree:true});
