(function(){
  const raw=(location.hash||'').replace(/^#/,'');
  const params=new URLSearchParams(raw);
  const token=params.get('adminPair');
  if(!token)return;
  if(/^[a-f0-9]{64}$/i.test(token)){
    localStorage.setItem('veramor_admin_token',token);
    history.replaceState({},'',location.pathname+location.search);
  }
})();
