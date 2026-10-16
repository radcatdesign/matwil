/* Matt Wilhelmsen site redesign by RADCAT: anonymous engagement tracking
   No cookies and no personal data. A random visitor id lives in this browser only.
   Skipped for Global Privacy Control, Do Not Track, and devices marked as Matt's own. */
(function(){
  var API=/github\.io$/.test(location.hostname)||location.protocol==='file:'?'https://matwil.vercel.app':'';
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
  var optOut=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1'||ls('mw-no-track')==='1';
  var noop={event:function(){}};
  if(optOut){window.MWTrack=noop;return;}

  var ABC='abcdefghijklmnopqrstuvwxyz0123456789';
  function rid(){var a=new Uint8Array(14);if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(a);else for(var i=0;i<14;i++)a[i]=Math.floor(Math.random()*256);return Array.prototype.map.call(a,function(x){return ABC[x%36];}).join('');}
  var isNew=false,vid=ls('mw-vid');
  if(!vid||!/^[a-z0-9]{8,24}$/.test(vid)){vid=rid();ls('mw-vid',vid);isNew=true;}
  var now=Date.now(),sess=null;
  try{sess=JSON.parse(ls('mw-sess')||'null');}catch(e){}
  if(!sess||now-sess.last>30*60*1000||!/^[a-z0-9]{8,24}$/.test(sess.id))sess={id:rid(),last:now};
  function touch(){sess.last=Date.now();ls('mw-sess',JSON.stringify(sess));}
  touch();

  var path=location.pathname.replace(/^\/matwil(?=\/)/,'')||'/';
  var pv=rid(),queue=[];
  // the pageview and key moments (chat, check, forms, leads) go out within seconds, so a visit still counts if the closing beacon is lost
  var soon=null;
  function later(ms){if(!soon)soon=setTimeout(function(){soon=null;flush();},ms);}
  function push(t,d){var e={t:t,p:path,pv:pv,ts:Date.now()};for(var k in d)e[k]=d[k];queue.push(e);touch();
    if(queue.length>=40)flush();else if(t!=='cta'&&t!=='eng')later(t==='pv'?1000:800);}

  // pageview
  var ref='';try{if(document.referrer){var h=new URL(document.referrer).hostname;if(h&&h!==location.hostname)ref=h;}}catch(e){}
  var q=new URLSearchParams(location.search);
  var w=Math.min(window.innerWidth,screen.width||window.innerWidth);
  var dev=w<640?'mobile':(w<1024&&matchMedia('(pointer: coarse)').matches?'tablet':'desktop');
  push('pv',{ref:ref,us:q.get('utm_source')||'',um:q.get('utm_medium')||'',uc:q.get('utm_campaign')||'',dev:dev,nv:isNew});

  // active time: counts only while the tab is visible and the visitor did something in the last 15 seconds
  var active=0,lastAct=Date.now(),sentMs=0,maxSd=0,sentSd=-1;
  ['scroll','mousemove','keydown','touchstart','click','wheel'].forEach(function(ev){addEventListener(ev,function(){lastAct=Date.now();},{passive:true});});
  setInterval(function(){if(document.visibilityState==='visible'&&Date.now()-lastAct<15000)active+=1000;},1000);
  function depth(){var d=document.documentElement,h=Math.max(d.scrollHeight,document.body.scrollHeight)-innerHeight;var pct=h<=0?100:Math.round((scrollY/h)*100);if(pct>maxSd)maxSd=Math.min(100,pct);}
  addEventListener('scroll',depth,{passive:true});setTimeout(depth,1500);

  // clicks worth knowing about
  document.addEventListener('click',function(e){
    var el=e.target.closest&&e.target.closest('a,button');if(!el)return;
    var href=el.getAttribute('href')||'',k=null;
    if(el.hasAttribute('data-chat'))k='chat';
    else if(el.hasAttribute('data-guide'))k='guide';
    else if(/^mailto:/.test(href))k='email';
    else if(/^tel:/.test(href))k='phone';
    else if(/book-a-session/.test(href))k='book';
    else if(/bottleneck-check/.test(href))k='check';
    else if(el.classList.contains('btn')||el.classList.contains('card')||el.classList.contains('link'))k='cta';
    if(!k)return;
    push('cta',{k:k,l:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,60)});
  },true);

  function flush(final){
    if(soon){clearTimeout(soon);soon=null;}
    depth();
    var ms=active-sentMs;
    if(ms>0||(final&&maxSd!==sentSd)){queue.push({t:'eng',p:path,pv:pv,ts:Date.now(),ms:Math.max(0,ms),sd:maxSd});sentMs=active;sentSd=maxSd;}
    if(!queue.length)return;
    var body=JSON.stringify({v:vid,s:sess.id,cn:Date.now(),e:queue.splice(0,queue.length)});
    var url=API+'/api/track',ok=false;
    try{if(navigator.sendBeacon)ok=navigator.sendBeacon(url,new Blob([body],{type:'text/plain'}));}catch(e){}
    if(!ok){try{fetch(url,{method:'POST',body:body,keepalive:true,headers:{'Content-Type':'text/plain'}});}catch(e){}}
  }
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush(true);});
  addEventListener('pagehide',function(){flush(true);});
  setInterval(function(){if(queue.length||active-sentMs>=10000)flush();},20000);

  window.MWTrack={event:push,flush:flush};
})();
