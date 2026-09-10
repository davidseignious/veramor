// Enrich all 28 VERAMOR demo profiles with distinct, complete dating-profile facts.
(function(){
  if(typeof demos==='undefined'||!Array.isArray(demos))return;

  const rows={
    a:["5'6\"","University of Illinois Chicago","Christian","Chicago, IL","English · Amharic","Monogamy","Sometimes","No","Socially","Socially","No restrictions","Wants a dog","Wants kids","Moderate"],
    m:["5'4\"","DePaul University","Spiritual","Oak Park, IL","English · Spanish","Monogamy","Often","No","No","Socially","No restrictions","Has a cat","Wants kids","Liberal"],
    n:["5'7\"","University of Chicago","Christian","Detroit, MI","English","Monogamy","Often","No","No","Rarely","Pescatarian","Likes pets","Wants kids","Moderate"],
    zara:["5'5\"","Loyola University Chicago","Muslim","Skokie, IL","English · Arabic","Monogamy","Sometimes","No","No","Never","Halal","No pets","Wants kids","Moderate"],
    camille:["5'3\"","University of Illinois Chicago","Christian","Chicago, IL","English","Monogamy","Sometimes","No","Socially","Socially","Vegetarian","Wants a cat","Wants kids","Liberal"],
    sofia:["5'8\"","DePaul University","Catholic","Cicero, IL","English · Spanish","Monogamy","Often","No","No","Socially","No restrictions","Likes dogs","Open to kids","Moderate"],
    imani:["5'5\"","University of Illinois Chicago","Christian","Chicago, IL","English","Monogamy","Often","No","No","Socially","No restrictions","Wants a dog","Wants kids","Moderate"],
    elena:["5'7\"","Northwestern University","Christian","Evanston, IL","English · Polish","Monogamy","Often","No","No","Socially","High-protein","Has a dog","Open to kids","Moderate"],
    kiara:["5'6\"","University of Illinois Urbana-Champaign","Christian","Naperville, IL","English","Monogamy","Sometimes","No","No","Socially","No restrictions","Likes pets","Wants kids","Moderate"],
    leah:["5'4\"","Loyola University Chicago","Christian","Chicago, IL","English","Monogamy","Sometimes","No","Socially","Socially","No restrictions","Has a dog","Wants kids","Moderate"],
    naomi:["5'8\"","Northwestern University","Christian","Milwaukee, WI","English","Monogamy","Sometimes","No","No","Rarely","No restrictions","No pets","Open to kids","Liberal"],
    talia:["5'6\"","School of the Art Institute of Chicago","Spiritual","New York, NY","English · French","Monogamy","Sometimes","Socially","Socially","Socially","No restrictions","Likes pets","Open to kids","Liberal"],
    priya:["5'2\"","Northwestern University","Hindu","Schaumburg, IL","English · Hindi","Monogamy","Often","No","No","Rarely","Vegetarian","Wants a dog","Wants kids","Moderate"],
    brooke:["5'7\"","Illinois State University","Christian","Madison, WI","English","Monogamy","Sometimes","No","No","Socially","No restrictions","Has a dog","Wants kids","Moderate"],
    mar:["6'1\"","University of Illinois Chicago","Christian","Chicago, IL","English","Monogamy","Often","No","Socially","Socially","High-protein","Wants a dog","Wants kids","Moderate"],
    j:["5'11\"","DePaul University","Spiritual","Chicago, IL","English","Monogamy","Often","No","Socially","Socially","No restrictions","Likes pets","Open to kids","Moderate"],
    and:["6'2\"","University of Chicago","Christian","Atlanta, GA","English","Monogamy","Sometimes","No","No","Socially","No restrictions","Likes dogs","Wants kids","Moderate"],
    malik:["6'0\"","University of Illinois Chicago","Muslim","Chicago, IL","English","Monogamy","Sometimes","No","No","Never","Halal","No pets","Wants kids","Moderate"],
    evan:["5'11\"","Loyola University Chicago","Catholic","Boston, MA","English","Monogamy","Sometimes","No","Socially","Socially","No restrictions","Likes dogs","Open to kids","Moderate"],
    luis:["5'10\"","DePaul University","Catholic","Chicago, IL","English · Spanish","Monogamy","Sometimes","No","No","Socially","No restrictions","Has a dog","Wants kids","Moderate"],
    theo:["5'9\"","University of Illinois Chicago","Spiritual","Chicago, IL","English","Monogamy","Sometimes","Socially","Yes","Socially","No restrictions","Has a cat","Open to kids","Liberal"],
    devin:["6'1\"","Northwestern University","Christian","Washington, DC","English","Monogamy","Often","No","No","Socially","No restrictions","No pets","Wants kids","Moderate"],
    cameron:["6'0\"","Illinois State University","Christian","Chicago, IL","English","Monogamy","Often","No","No","Socially","High-protein","Has a dog","Wants kids","Moderate"],
    noah:["5'10\"","Columbia College Chicago","Jewish","Chicago, IL","English","Monogamy","Sometimes","No","Socially","Socially","Kosher-style","Wants a dog","Open to kids","Liberal"],
    julian:["6'2\"","Notre Dame Law School","Christian","Indianapolis, IN","English","Monogamy","Often","No","No","Socially","No restrictions","No pets","Wants kids","Moderate"],
    isaiah:["6'0\"","Chicago State University","Christian","Chicago, IL","English","Monogamy","Often","No","No","Rarely","High-protein","Likes dogs","Wants kids","Moderate"],
    ben:["5'11\"","University of Wisconsin–Madison","Agnostic","Madison, WI","English","Monogamy","Often","No","No","Socially","No restrictions","Has a cat","Open to kids","Liberal"],
    kai:["6'1\"","Harold Washington College","Spiritual","Chicago, IL","English · Japanese basics","Monogamy","Often","Socially","Yes","Socially","No restrictions","Has a dog","Open to kids","Moderate"]
  };
  const keys=['height','school','religion','hometown','languages','relationshipStyle','workout','cigarettes','weed','drink','diet','pets','kids','politics'];
  demos.forEach(function(p){
    const r=rows[p.id];if(!r)return;
    keys.forEach(function(k,i){p[k]=r[i]});
    p.education=p.school;
    p.lifestyle={workout:p.workout,cigarettes:p.cigarettes,weed:p.weed,drink:p.drink,diet:p.diet,pets:p.pets,kids:p.kids};
  });

  function factsHtml(p){
    const basics=[['Age',p.age],['Gender',p.gender],['Height',p.height],['School',p.school],['Job',p.job],['Religion',p.religion],['Hometown',p.hometown],['Languages',p.languages],['Relationship style',p.relationshipStyle],['Looking for',p.intent]];
    const life=[['Workout',p.workout],['Cigarettes',p.cigarettes],['Weed',p.weed],['Drink',p.drink],['Diet',p.diet],['Pets',p.pets],['Kids',p.kids],['Politics',p.politics]];
    const grid=function(title,items){return '<section class="profile-fact-section"><div class="profile-fact-title">'+esc(title)+'</div><div class="profile-fact-grid">'+items.filter(x=>x[1]).map(function(x){return '<div class="profile-fact"><small>'+esc(x[0])+'</small><b>'+esc(x[1])+'</b></div>'}).join('')+'</div></section>'};
    return grid('About',basics)+grid('Lifestyle',life);
  }

  function addQuickFacts(){
    const p=deck&&deck[idx];if(!p||!p.demo)return;
    const detail=document.querySelector('#deck .premium-profile-detail');if(!detail||detail.querySelector('.profile-quick-facts'))return;
    const loc=detail.querySelector('.location-line');
    const box=document.createElement('div');box.className='profile-quick-facts';
    box.innerHTML='<span>↕ '+esc(p.height||'')+'</span><span>🎓 '+esc(p.school||'')+'</span><span>◌ '+esc(p.religion||'')+'</span>';
    if(loc)loc.insertAdjacentElement('afterend',box);else detail.prepend(box);
  }

  const deckEl=document.getElementById('deck');
  if(deckEl)new MutationObserver(function(){setTimeout(addQuickFacts,0)}).observe(deckEl,{childList:true,subtree:true});

  const originalFull=window.fullProfile;
  if(typeof originalFull==='function'){
    window.fullProfile=function(){
      originalFull();
      const p=deck&&deck[idx];const full=document.getElementById('full');
      if(!p||!full||!p.demo)return;
      const old=full.querySelector('.profile-expanded-facts');if(old)old.remove();
      const wrap=document.createElement('div');wrap.className='profile-expanded-facts';wrap.innerHTML=factsHtml(p);
      const firstPrompt=full.querySelector('.prompt');
      if(firstPrompt&&!full.querySelector('.profile-prompts-heading')){
        const h=document.createElement('div');h.className='profile-prompts-heading';h.textContent='PROMPT ANSWERS';firstPrompt.insertAdjacentElement('beforebegin',h);
      }
      full.appendChild(wrap);
    };
  }

  if(typeof buildDeck==='function')buildDeck();
})();
