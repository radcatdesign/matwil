/* Matt Wilhelmsen site redesign by RADCAT: lead capture
   A conversation with Matt, the Bottleneck Check, gentle guide downloads and the contact forms.
   Everything posts to /api/lead and lands in Matt's CRM at /portal/. */
(function(){
  var API=/github\.io$/.test(location.hostname)||location.protocol==='file:'?'https://matwil.vercel.app':'';
  var root=document.body.getAttribute('data-root')||'';
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G=function(){return !reduce&&window.gsap;};
  function T(t,d){try{if(window.MWTrack)window.MWTrack.event(t,d||{});}catch(e){}}

  /* ---------- storage + attribution */
  function save(k,v,session){try{(session?sessionStorage:localStorage).setItem(k,JSON.stringify(v));}catch(e){}}
  function load(k,session){try{return JSON.parse((session?sessionStorage:localStorage).getItem(k));}catch(e){return null;}}
  var attr=load('mw-attr');
  if(!attr){
    var q=new URLSearchParams(location.search);
    attr={utm:{source:q.get('utm_source')||'',medium:q.get('utm_medium')||'',campaign:q.get('utm_campaign')||'',term:q.get('utm_term')||'',content:q.get('utm_content')||''},
          landing:location.pathname,referrer:document.referrer&&document.referrer.indexOf(location.host)<0?document.referrer:''};
    save('mw-attr',attr);
  }
  function send(payload){
    var body=Object.assign({page:location.pathname,landing:attr.landing,referrer:attr.referrer,utm:attr.utm,website:''},payload);
    return fetch(API+'/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.error||'Something went wrong sending that.');return j;});});
  }
  function first(n){return (n||'').trim().split(/\s+/)[0]||'';}
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  var EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* =========================================================== conversation */
  var PAINS=[
    {v:'decisions',label:'I’m in every decision',reply:'That’s one of the most common things I hear, and one of the most fixable. It usually means the business has outgrown the way decisions get made.'},
    {v:'alignment',label:'My team isn’t aligned',reply:'Busy, but pulling in different directions. That’s exhausting, and it’s rarely about effort. It’s usually about clarity.'},
    {v:'growth',label:'Growth is breaking things',reply:'Growth has a way of finding every crack. The good news is there’s real demand behind it, worth building the right systems for.'},
    {v:'unpredictable',label:'Results feel unpredictable',reply:'Great months, rough months, and no clear reason why. That usually means the business needs a few numbers that tell the truth, and a rhythm for using them.'},
    {v:'leaders',label:'My leaders aren’t leading yet',reply:'Capable people, but the hard calls still float back up to you. That’s a bench that can be built.'},
    {v:'stretched',label:'I’m stretched too thin',reply:'Running the business shouldn’t cost you everything else. Let’s figure out what only you should be doing.'},
    {v:'other',label:'Something else',reply:null}
  ];
  var STEPS=[
    {id:'pain',say:function(){return ['Hi, I’m Matt.','What’s weighing on you most in the business right now?'];},type:'choice',options:PAINS},
    {id:'painDetail',say:function(d){return d.pain==='other'?['Tell me in your own words. What’s going on?']:['What does that look like in a typical week?'];},
      type:'text',multiline:true,optional:function(d){return d.pain!=='other';},skip:'I’d rather talk it through',placeholder:'A sentence or two is plenty'},
    {id:'companySize',say:function(d){return [d.pain==='other'?'Thanks for putting that into words. That’s often the hardest part.':'That helps. A few quick ones so I have the full picture.','How big is the team?'];},
      type:'choice',options:[{v:'Just me',label:'Just me'},{v:'2 to 10',label:'2 to 10'},{v:'11 to 50',label:'11 to 50'},{v:'51 to 200',label:'51 to 200'},{v:'200+',label:'200+'}]},
    {id:'role',say:function(){return ['And your role?'];},type:'choice',
      options:[{v:'Founder or owner',label:'Founder or owner'},{v:'CEO',label:'CEO'},{v:'President',label:'President'},{v:'Leadership team',label:'On the leadership team'},{v:'Other',label:'Something else'}]},
    {id:'duration',say:function(){return ['How long has this been going on?'];},type:'choice',
      options:[{v:'A few weeks',label:'A few weeks'},{v:'A few months',label:'A few months'},{v:'A year or more',label:'A year or more'}]},
    {id:'name',say:function(){return ['Thanks for being straight with me. That’s where good work starts.','What should I call you?'];},type:'text',input:'text',autocomplete:'name',placeholder:'Your name'},
    {id:'company',say:function(d){return ['Good to meet you, '+first(d.name)+'. What’s the company?'];},type:'text',input:'text',autocomplete:'organization',optional:true,skip:'Skip',placeholder:'Company name'},
    {id:'email',say:function(d){return ['Where can I reach you, '+first(d.name)+'?'];},type:'text',input:'email',autocomplete:'email',placeholder:'you@company.com',validate:function(v){return EMAIL_RE.test(v)?'':'That email doesn’t look quite right. Mind checking it?';}},
    {id:'phone',say:function(){return ['If a call is easier, drop your number. Totally optional.'];},type:'text',input:'tel',autocomplete:'tel',optional:true,skip:'Email is fine',placeholder:'Phone number'},
    {id:'nextStep',say:function(){return ['Last one. What would be most helpful as a next step?'];},type:'choice',
      options:[{v:'Free 30-minute call',label:'A free 30-minute call'},{v:'Thoughts by email first',label:'A few thoughts by email first'},{v:'Just exploring',label:'I’m just exploring for now'}]}
  ];
  var chat={open:false,i:0,data:{},log:[],started:0,done:false};
  var saved=load('mw-chat',true); if(saved)chat=Object.assign(chat,saved,{open:false});
  function persist(){save('mw-chat',{i:chat.i,data:chat.data,log:chat.log,started:chat.started,done:chat.done},true);}

  var panel,logEl,inputEl,launch,nudge;
  function buildChat(){
    launch=el('button','chat-launch');launch.type='button';launch.setAttribute('aria-controls','mwChat');launch.setAttribute('aria-expanded','false');
    launch.innerHTML='<span class="chat-avatar photo" aria-hidden="true"></span><span class="chat-launch-label">Talk it through with Matt</span>';
    panel=el('div','chat');panel.id='mwChat';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','mwChatTitle');panel.setAttribute('data-lenis-prevent','');
    panel.innerHTML='<div class="chat-head"><span class="chat-avatar photo" role="img" aria-label="Matt Wilhelmsen"></span><div class="chat-who"><strong id="mwChatTitle">Matt Wilhelmsen</strong><span>Replies personally, usually within a day</span></div>'+
      '<button type="button" class="chat-close" aria-label="Close the conversation"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>'+
      '<div class="chat-log" aria-live="polite"></div><div class="chat-input"></div><p class="chat-foot">Matt only uses what you share here to reply to you.</p>';
    nudge=el('div','chat-nudge');nudge.hidden=true;
    nudge.innerHTML='<span class="chat-avatar photo" aria-hidden="true"></span><button type="button" class="chat-nudge-text">What’s the hardest part of running the business right now?</button><button type="button" class="chat-nudge-x" aria-label="Dismiss"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>';
    document.body.appendChild(nudge);document.body.appendChild(panel);document.body.appendChild(launch);
    logEl=panel.querySelector('.chat-log');inputEl=panel.querySelector('.chat-input');
    launch.addEventListener('click',function(){chat.open?closeChat():openChat({origin:'launcher'});});
    panel.querySelector('.chat-close').addEventListener('click',closeChat);
    panel.addEventListener('keydown',function(e){if(e.key==='Escape')closeChat();});
    nudge.querySelector('.chat-nudge-text').addEventListener('click',function(){T('chat',{a:'nudge_click'});hideNudge();openChat({origin:'nudge'});});
    nudge.querySelector('.chat-nudge-x').addEventListener('click',function(){hideNudge();save('mw-nudge',1,true);});
    document.addEventListener('click',function(e){
      var t=e.target.closest&&e.target.closest('[data-chat]');
      if(t){e.preventDefault();openChat({pain:t.getAttribute('data-chat-pain'),origin:'cta'});}
    });
  }
  function isSmall(){return window.matchMedia('(max-width: 640px)').matches;}
  function openChat(opts){
    hideNudge();save('mw-nudge',1,true);
    if(!chat.open){
      T('chat',{a:'open',o:(opts&&opts.origin)||'launcher'});
      chat.open=true;panel.hidden=false;launch.setAttribute('aria-expanded','true');launch.classList.add('is-open');
      if(isSmall()){document.documentElement.classList.add('chat-lock');}
      if(window.MWLenis)window.MWLenis.stop();
      if(G())gsap.fromTo(panel,{autoAlpha:0,y:24,scale:.97,transformOrigin:'100% 100%'},{autoAlpha:1,y:0,scale:1,duration:.55,ease:'expo.out'});
      if(!logEl.children.length){
        if(chat.log.length){chat.log.forEach(function(m){addBubble(m.from,m.text,true);});renderStep();}
        else startChat(opts&&opts.pain);
      }else if(opts&&opts.pain&&chat.i===0){choose(STEPS[0],PAINS.filter(function(p){return p.v===opts.pain;})[0]);}
      setTimeout(focusInput,350);
    }else if(opts&&opts.pain&&chat.i===0){choose(STEPS[0],PAINS.filter(function(p){return p.v===opts.pain;})[0]);}
  }
  function closeChat(){
    if(!chat.open)return;chat.open=false;launch.setAttribute('aria-expanded','false');launch.classList.remove('is-open');
    document.documentElement.classList.remove('chat-lock');if(window.MWLenis)window.MWLenis.start();
    var finish=function(){panel.hidden=true;};
    if(G())gsap.to(panel,{autoAlpha:0,y:16,scale:.98,duration:.3,ease:'power2.in',onComplete:finish});else finish();
    launch.focus();
  }
  function scrollLog(){logEl.scrollTop=logEl.scrollHeight;}
  function addBubble(from,text,instant){
    var b=el('div','bubble '+(from==='matt'?'from-matt':'from-them'),text);
    logEl.appendChild(b);
    if(!instant&&G())gsap.fromTo(b,{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:.45,ease:'power3.out'});
    scrollLog();return b;
  }
  function record(from,text){chat.log.push({from:from,text:text});persist();}
  function mattSays(lines,cb){
    lines=lines.filter(Boolean);var k=0;
    (function next(){
      if(k>=lines.length){cb&&cb();return;}
      var line=lines[k++];
      var typing=el('div','bubble from-matt typing');typing.innerHTML='<i></i><i></i><i></i>';typing.setAttribute('aria-label','Matt is typing');
      logEl.appendChild(typing);scrollLog();
      var wait=reduce?0:Math.min(1300,450+line.length*12);
      setTimeout(function(){typing.remove();addBubble('matt',line);record('matt',line);next();},wait);
    })();
  }
  function startChat(pain){
    chat.started=Date.now();chat.i=0;chat.data={};chat.log=[];chat.done=false;persist();
    mattSays(STEPS[0].say(chat.data),function(){
      if(pain){var p=PAINS.filter(function(x){return x.v===pain;})[0];if(p){choose(STEPS[0],p);return;}}
      renderStep();
    });
  }
  function focusInput(){var f=inputEl.querySelector('input,textarea,button');if(f&&!isSmall())f.focus();}
  function renderStep(){
    inputEl.innerHTML='';
    if(chat.done){renderDone();return;}
    var s=STEPS[chat.i];if(!s)return;
    if(s.type==='choice'){
      var wrap=el('div','chat-choices');
      s.options.forEach(function(o){
        var b=el('button','chip',o.label);b.type='button';
        b.addEventListener('click',function(){choose(s,o);});wrap.appendChild(b);
      });
      inputEl.appendChild(wrap);
      if(G())gsap.fromTo(wrap.children,{autoAlpha:0,y:8},{autoAlpha:1,y:0,duration:.4,stagger:.04,ease:'power3.out'});
    }else{
      var f=el('form','chat-form');f.noValidate=true;
      var field=s.multiline?el('textarea'):el('input');
      if(!s.multiline){field.type=s.input||'text';}else{field.rows=2;}
      if(s.autocomplete)field.autocomplete=s.autocomplete;
      field.placeholder=s.placeholder||'';field.setAttribute('aria-label',s.placeholder||s.id);
      var go=el('button','chat-send');go.type='submit';go.setAttribute('aria-label','Send');
      go.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var err=el('p','chat-err');err.hidden=true;
      f.appendChild(field);f.appendChild(go);inputEl.appendChild(f);inputEl.appendChild(err);
      var optional=typeof s.optional==='function'?s.optional(chat.data):s.optional;
      if(optional){var sk=el('button','chat-skip',s.skip||'Skip');sk.type='button';sk.addEventListener('click',function(){answer(s,'',s.skip||'Skip');});inputEl.appendChild(sk);}
      if(s.multiline)field.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true}));}});
      f.addEventListener('submit',function(e){
        e.preventDefault();var v=field.value.trim();
        if(!v){if(optional){answer(s,'',s.skip||'Skip');return;}err.textContent='Add a quick answer, or close this and email matt@mattwil.com.';err.hidden=false;return;}
        var bad=s.validate&&s.validate(v);if(bad){err.textContent=bad;err.hidden=false;return;}
        answer(s,v,v);
      });
      if(chat.open)setTimeout(function(){if(!isSmall())field.focus();},60);
    }
  }
  function choose(s,o){
    if(!o)return;
    if(s.id==='pain'){chat.data.painLabel=o.label;}
    answer(s,o.v,o.label,o.reply);
  }
  function answer(s,value,shown,reply){
    inputEl.innerHTML='';
    chat.data[s.id]=value;T('chat',{a:'step',st:s.id});
    if(shown){addBubble('them',shown);record('them',shown);}
    chat.i++;persist();
    var lines=[];if(reply)lines.push(reply);
    if(chat.i>=STEPS.length){finish(lines);return;}
    lines=lines.concat(STEPS[chat.i].say(chat.data));
    mattSays(lines,renderStep);
  }
  function finish(pre){
    var d=chat.data;
    var payload={source:'conversation',name:d.name,email:d.email,phone:d.phone,company:d.company,role:d.role,companySize:d.companySize,
      painCategory:d.pain,painLabel:d.painLabel,painDetail:d.painDetail,duration:d.duration,nextStep:d.nextStep,
      transcript:chat.log,elapsed:Date.now()-(chat.started||Date.now())};
    inputEl.innerHTML='<p class="chat-sending">Sending to Matt…</p>';
    send(payload).then(function(){
      chat.done=true;persist();T('chat',{a:'complete'});T('lead',{src:'conversation'});
      var lines=(pre||[]).concat(['Got it, '+first(d.name)+'. I read every one of these myself, and I’ll get back to you within one business day.']);
      if(d.nextStep==='Free 30-minute call')lines.push('If you’d like to lock in a time now, you can grab one below.');
      mattSays(lines,renderDone);
    }).catch(function(err){
      inputEl.innerHTML='';
      mattSays(['Hmm, that didn’t go through on my end. '+(err.message||'')],function(){
        var wrap=el('div','chat-choices');
        var retry=el('button','chip','Try sending again');retry.type='button';retry.addEventListener('click',function(){finish();});
        var mail=el('a','chip','Email Matt instead');mail.href='mailto:matt@mattwil.com?subject='+encodeURIComponent('Talking it through')+'&body='+encodeURIComponent(chat.log.map(function(m){return (m.from==='matt'?'Matt: ':'Me: ')+m.text;}).join('\n'));
        wrap.appendChild(retry);wrap.appendChild(mail);inputEl.appendChild(wrap);
      });
    });
  }
  function renderDone(){
    inputEl.innerHTML='';var wrap=el('div','chat-choices');
    if(chat.data.nextStep==='Free 30-minute call'){var a=el('a','chip chip-primary','Pick a time');a.href=root+'contact/book-a-session/';wrap.appendChild(a);}
    var again=el('button','chip','Start a new conversation');again.type='button';
    again.addEventListener('click',function(){logEl.innerHTML='';startChat();});
    wrap.appendChild(again);inputEl.appendChild(wrap);
  }
  function showNudge(){
    if(chat.open||load('mw-nudge',true)||chat.log.length)return;
    nudge.hidden=false;save('mw-nudge',1,true);T('chat',{a:'nudge_shown'});
    if(G())gsap.fromTo(nudge,{autoAlpha:0,y:12},{autoAlpha:1,y:0,duration:.6,ease:'expo.out'});
  }
  function hideNudge(){if(nudge)nudge.hidden=true;}

  /* =========================================================== guide downloads */
  function buildGuideGate(){
    var links=[].slice.call(document.querySelectorAll('a[data-guide]'));
    if(!links.length)return;
    var dlg=el('dialog','gate');dlg.setAttribute('aria-labelledby','gateTitle');
    dlg.innerHTML='<form method="dialog" class="gate-x"><button aria-label="Close"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></form>'+
      '<p class="gate-kicker">Free guide</p><h2 id="gateTitle"></h2><p class="gate-lede">Want a copy in your inbox too? Matt will send it over with a short note. No newsletter, no spam.</p>'+
      '<form class="form gate-form" novalidate><div class="field"><label for="gateName">First name <span class="opt">(optional)</span></label><input id="gateName" name="name" autocomplete="given-name"></div>'+
      '<div class="field"><label for="gateEmail">Email</label><input id="gateEmail" name="email" type="email" autocomplete="email" required></div>'+
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'+
      '<div class="actions"><button class="btn" type="submit">Send it and download</button><a class="link gate-skip" href="#">Just download it</a></div><p class="form-err" hidden></p></form>';
    document.body.appendChild(dlg);
    var current=null,opened=0;
    function download(href){var a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener';a.setAttribute('download','');document.body.appendChild(a);a.click();a.remove();}
    links.forEach(function(a){a.addEventListener('click',function(e){
      if(!dlg.showModal)return;e.preventDefault();current=a;opened=Date.now();
      dlg.querySelector('#gateTitle').textContent=a.getAttribute('data-guide');
      dlg.querySelector('.form-err').hidden=true;dlg.showModal();T('guide',{a:'click'});
      if(G())gsap.fromTo(dlg,{autoAlpha:0,y:20},{autoAlpha:1,y:0,duration:.5,ease:'expo.out'});
    });});
    dlg.querySelector('.gate-skip').addEventListener('click',function(e){e.preventDefault();T('guide',{a:'skip'});dlg.close();download(current.href);});
    var f=dlg.querySelector('.gate-form');
    f.addEventListener('submit',function(e){
      e.preventDefault();var err=f.querySelector('.form-err');
      var email=f.email.value.trim();
      if(!EMAIL_RE.test(email)){err.textContent='Add an email so Matt can send it, or choose “Just download it.”';err.hidden=false;return;}
      var btn=f.querySelector('.btn');btn.disabled=true;btn.textContent='Sending…';
      send({source:'guide',guide:current.getAttribute('data-guide'),name:f.name.value.trim(),email:email,website:f.website.value,elapsed:Date.now()-opened})
        .then(function(){T('guide',{a:'send'});T('lead',{src:'guide'});dlg.close();download(current.href);f.reset();})
        .catch(function(x){err.textContent=x.message+' The download will still start.';err.hidden=false;setTimeout(function(){dlg.close();download(current.href);},1400);})
        .finally(function(){btn.disabled=false;btn.textContent='Send it and download';});
    });
  }

  /* =========================================================== contact + booking forms */
  /* ---------- plans: seat request and membership dialogs, and the "which fits" picker */
  function wirePlans(){
    [].forEach.call(document.querySelectorAll('[data-plan-open]'),function(b){
      var dlg=document.getElementById('plan-'+b.getAttribute('data-plan-open'));if(!dlg)return;
      b.addEventListener('click',function(){
        if(!dlg.showModal){location.hash=b.getAttribute('data-plan-open');return;}
        dlg.showModal();var f=dlg.querySelector('input:not(.hp)');if(f)f.focus();
        if(G())gsap.fromTo(dlg,{autoAlpha:0,y:20},{autoAlpha:1,y:0,duration:.5,ease:'expo.out'});
      });
      dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close();});
    });
    var pk=document.getElementById('planPicker');if(!pk)return;
    var out=document.getElementById('pickOut');
    var PICK={
      advisory:['Private Advisory','Matt works alongside you and your leadership team for a year. It’s the fastest way to change how the company runs.','Apply for Advisory','#advisory'],
      cohort:['Founder Cohort','Structure, a peer group and monthly time with Matt, without a twelve-month commitment.','See the cohort','#cohort'],
      membership:['Operator Membership','Templates, a monthly live session and answers from Matt, month to month.','See the membership','#membership']};
    function pick(){
      var size=Number((pk.querySelector('[name=size]:checked')||{}).value||0),want=(pk.querySelector('[name=want]:checked')||{}).value;
      if(!size||!want)return;
      var key=want==='tools'?'membership':want==='peers'?(size>=4?'advisory':'cohort'):(size>=2?'advisory':'cohort');
      var note=want==='embedded'&&size<2?' Advisory works best once there’s a leadership team to work with, so start here and move up when you’re ready.':'';
      var p=PICK[key];out.hidden=false;out.innerHTML='';
      var k=el('p','gate-kicker','Start with'),h=el('h3',null,p[0]),t=el('p',null,p[1]+note),a=el('a','btn',p[2]);
      a.href=key==='advisory'?(document.querySelector('.tier-top .btn')||{}).href||p[3]:p[3];
      if(key!=='advisory')a.addEventListener('click',function(e){var card=document.querySelector(p[3]);if(!card)return;e.preventDefault();
        if(window.MWLenis)window.MWLenis.scrollTo(card,{offset:-100});else card.scrollIntoView({behavior:'smooth',block:'start'});
        card.classList.add('flash');setTimeout(function(){card.classList.remove('flash');},1600);});
      out.appendChild(k);out.appendChild(h);out.appendChild(t);out.appendChild(a);
      T('cta',{k:'pick',l:'Picker: '+p[0]});
      if(G())gsap.fromTo(out,{autoAlpha:0,y:12},{autoAlpha:1,y:0,duration:.5,ease:'expo.out'});
    }
    pk.addEventListener('change',pick);
    pk.addEventListener('submit',function(e){e.preventDefault();});
  }

  function wireForms(){
    [].forEach.call(document.querySelectorAll('form[data-lead]'),function(form){
      var started=0,kind=form.getAttribute('data-lead');form.addEventListener('focusin',function(){if(!started){started=Date.now();T('form',{a:'start',f:kind});}});
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var err=form.querySelector('.form-err');if(err)err.hidden=true;
        if(!form.reportValidity())return;
        var v=function(n){var x=form.elements.namedItem(n);if(!x)return '';if(x.length&&x[0]&&x[0].type==='radio'){for(var i=0;i<x.length;i++)if(x[i].checked)return x[i].value;return '';}return (x.value||'').trim();};
        // anything marked data-q goes along as a question and answer, so the CRM shows the whole application
        var qa=[];[].forEach.call(form.querySelectorAll('[data-q]'),function(x){
          var a='';if(x.tagName==='FIELDSET'){var c=x.querySelector('input:checked');a=c?c.value:'';}
          else if(x.type==='checkbox')a=x.checked?x.value:'';else a=(x.value||'').trim();
          if(a)qa.push({q:x.getAttribute('data-q'),a:a});});
        var payload={source:form.getAttribute('data-lead'),plan:form.getAttribute('data-plan')||'',name:v('name'),email:v('email'),phone:v('phone'),company:v('company'),
          role:v('role'),companySize:v('companySize'),interest:v('topic'),message:v('message'),preferredContact:v('format'),availability:v('times'),website:v('website'),
          painDetail:v('message'),qa:qa,elapsed:started?Date.now()-started:0};
        var btn=form.querySelector('[type=submit]'),label=btn.textContent;btn.disabled=true;btn.textContent='Sending…';
        send(payload).then(function(){
          T('form',{a:'submit',f:kind});T('lead',{src:kind});
          var done=el('div','form-done');
          done.innerHTML='<span class="done-mark" aria-hidden="true"></span><h3></h3><p></p>';
          done.querySelector('h3').textContent='Thanks, '+(first(payload.name)||'friend')+'. It’s with Matt.';
          var thanks={application:['Application received, '+(first(payload.name)||'friend')+'.','Matt reads every application himself. Expect a reply within two business days, either with times for a fit call or an honest note about what would fit better.'],
            cohort:['You’re on Matt’s list, '+(first(payload.name)||'friend')+'.','He’ll reach out within one business day to set up a 20-minute fit call. Your seat is confirmed after that.'],
            membership:['Welcome in, '+(first(payload.name)||'friend')+'.','Matt will send your welcome and payment link within one business day.'],
            booking:[null,'He’ll reply personally within one business day to confirm a time that works.']}[kind];
          if(thanks&&thanks[0])done.querySelector('h3').textContent=thanks[0];
          done.querySelector('p').textContent=thanks?thanks[1]:'He reads every message himself and will reply within one business day.';
          form.replaceWith(done);done.setAttribute('tabindex','-1');done.focus();
          if(kind==='application')done.scrollIntoView({block:'center',behavior:'smooth'});
          if(G())gsap.fromTo(done,{autoAlpha:0,y:16},{autoAlpha:1,y:0,duration:.6,ease:'expo.out'});
        }).catch(function(x){
          if(err){err.innerHTML='';err.appendChild(document.createTextNode(x.message+' You can also email '));var m=el('a','inline-link','matt@mattwil.com');m.href='mailto:matt@mattwil.com';err.appendChild(m);err.appendChild(document.createTextNode('.'));err.hidden=false;}
          btn.disabled=false;btn.textContent=label;T('form',{a:'error',f:kind});
        });
      });
    });
  }

  /* =========================================================== bottleneck check */
  var CHECK=[
    {area:'decisions',q:'Decisions wait for me before anything moves.'},
    {area:'decisions',q:'When I take a few days off, things slow down or stall.'},
    {area:'alignment',q:'People on my team would describe our top priorities differently.'},
    {area:'alignment',q:'We’re busy, but it isn’t always clear the work is the right work.'},
    {area:'rhythm',q:'Good months and bad months come and go without a clear reason.'},
    {area:'rhythm',q:'We set goals, but there’s no regular rhythm for checking progress.'},
    {area:'bench',q:'Problems land on my desk that my managers could solve.'},
    {area:'bench',q:'I’m not sure who would step up if I stepped back.'}
  ];
  var SCALE=['Rarely','Sometimes','Often','Almost always'];
  var AREAS={
    decisions:{name:'Decisions run through you',short:'Decisions',pain:'decisions',service:'services/one-on-one-coaching/',serviceName:'One-on-one coaching',
      text:'The business is waiting on you more than it should. That caps growth at your own capacity and wears you down.',
      moves:['List the decisions only you should make. Everything else gets an owner.','Write down how you make the common calls, so others can make them the same way.','Pick one area to hand off completely this month.']},
    alignment:{name:'The team isn’t pulling the same way',short:'Alignment',pain:'alignment',service:'services/group-coaching/',serviceName:'Group coaching',
      text:'People are working hard on different versions of the plan. Effort is high and progress is uneven.',
      moves:['Agree on the three priorities that matter most this quarter.','Make sure every leader can name them without looking.','Tie each person’s work to at least one of them.']},
    rhythm:{name:'There’s no steady operating rhythm',short:'Rhythm',pain:'unpredictable',service:'services/one-on-one-coaching/',serviceName:'One-on-one coaching',
      text:'Results swing because there’s no regular habit of checking the numbers and adjusting course.',
      moves:['Pick five numbers that show how the business is really doing.','Review them with your leaders every week, same time, same format.','Turn every miss into one next action with a named owner.']},
    bench:{name:'Your leaders aren’t leading yet',short:'Leadership bench',pain:'leaders',service:'services/leadership-development/',serviceName:'Leadership development',
      text:'Capable people are bringing problems up instead of solving them. The bench needs building.',
      moves:['Give each leader clear decision rights in their area.','Ask “what do you recommend?” before you give an answer.','Coach one leader on purpose every week.']}
  };
  function buildCheck(){
    var host=document.getElementById('check');if(!host)return;
    var state={i:-1,answers:[],started:0};
    function swap(node){
      host.innerHTML='';host.appendChild(node);
      if(G())gsap.fromTo(node.children,{opacity:0,y:18},{opacity:1,y:0,duration:.6,stagger:.06,ease:'expo.out',clearProps:'transform'});
      var f=node.querySelector('.check-opt,.btn,input');if(f&&state.i>=0&&!isSmall())f.focus({preventScroll:true});
    }
    function intro(){
      var n=el('div','check-card');
      n.innerHTML='<p class="check-kicker">8 statements, about 2 minutes</p><h2>How often is each of these true in your business?</h2><p class="lede">Answer honestly. You’ll see your results right away, no email required.</p>';
      var b=el('button','btn','Start the check');b.type='button';b.addEventListener('click',function(){state.started=Date.now();state.i=0;T('check',{a:'start'});question();});
      n.appendChild(b);swap(n);
    }
    function question(){
      var item=CHECK[state.i];var n=el('div','check-card');
      var prog=el('div','check-progress');prog.innerHTML='<span>'+(state.i+1)+' of '+CHECK.length+'</span><i><b style="width:'+((state.i)/CHECK.length*100)+'%"></b></i>';
      n.appendChild(prog);
      n.appendChild(el('p','check-q',item.q));
      var opts=el('div','check-opts');opts.setAttribute('role','group');opts.setAttribute('aria-label','How often is this true?');
      SCALE.forEach(function(label,k){
        var b=el('button','check-opt');b.type='button';b.innerHTML='<kbd>'+(k+1)+'</kbd>';b.appendChild(document.createTextNode(label));
        if(state.answers[state.i]&&state.answers[state.i].v===k+1)b.classList.add('is-on');
        b.addEventListener('click',function(){pick(k);});opts.appendChild(b);
      });
      n.appendChild(opts);
      if(state.i>0){var back=el('button','check-back','Back');back.type='button';back.addEventListener('click',function(){state.i--;question();});n.appendChild(back);}
      swap(n);
      var bar=n.querySelector('.check-progress b');
      if(G())gsap.to(bar,{width:((state.i+1)/CHECK.length*100)+'%',duration:.8,ease:'expo.out',delay:.1});else bar.style.width=((state.i+1)/CHECK.length*100)+'%';
    }
    function pick(k){
      var item=CHECK[state.i];
      state.answers[state.i]={q:item.q,a:SCALE[k],v:k+1,area:item.area};T('check',{a:'answer',i:state.i+1});
      if(state.i<CHECK.length-1){state.i++;question();}else result();
    }
    document.addEventListener('keydown',function(e){
      var t=(document.activeElement||{}).tagName||'';
      if(/INPUT|TEXTAREA|SELECT/.test(t)||e.metaKey||e.ctrlKey||e.altKey)return;
      if(state.i>=0&&state.i<CHECK.length&&/^[1-4]$/.test(e.key)){e.preventDefault();pick(Number(e.key)-1);}
    });
    function result(){
      state.i=CHECK.length;T('check',{a:'complete'});
      var sums={};Object.keys(AREAS).forEach(function(a){sums[a]=0;});
      state.answers.forEach(function(x){sums[x.area]+=x.v;});
      var total=state.answers.reduce(function(t,x){return t+x.v;},0);
      var top=Object.keys(sums).sort(function(a,b){return sums[b]-sums[a];})[0],A=AREAS[top];
      var band=total>=25?'The business is running on you.':total>=18?'Stretched in a few key places.':'A solid base to build on.';
      var n=el('div','check-card check-result');
      n.innerHTML='<p class="check-kicker">Your results</p><h2></h2><p class="lede"></p>';
      n.querySelector('h2').textContent=band;
      n.querySelector('.lede').textContent='Your biggest constraint right now: '+A.name.toLowerCase()+'. '+A.text;
      var bars=el('div','check-bars');
      Object.keys(AREAS).forEach(function(a){
        var row=el('div','check-bar'+(a===top?' is-top':''));
        row.innerHTML='<span></span><i><b data-w="'+((sums[a]-2)/6*100)+'"></b></i><em></em>';
        row.querySelector('span').textContent=AREAS[a].short;row.querySelector('em').textContent=sums[a]+'/8';
        bars.appendChild(row);
      });
      n.appendChild(bars);
      var mv=el('div','check-moves');mv.innerHTML='<h3>Three first moves</h3>';
      var ol=el('ol');A.moves.forEach(function(m){ol.appendChild(el('li',null,m));});mv.appendChild(ol);
      var rec=el('p','check-rec');rec.innerHTML='Where Matt usually starts with this: <a class="inline-link"></a>';var ra=rec.querySelector('a');ra.href=root+A.service;ra.textContent=A.serviceName;
      mv.appendChild(rec);n.appendChild(mv);
      var cap=el('div','check-capture');
      cap.innerHTML='<h3>Want Matt’s take on your results?</h3><p>He’ll look at your answers and reply personally with what he’d tackle first. No pitch, just a straight read.</p>'+
        '<form class="form" novalidate><div class="field"><label for="ckName">Name</label><input id="ckName" name="name" autocomplete="name" required></div>'+
        '<div class="field"><label for="ckEmail">Email</label><input id="ckEmail" name="email" type="email" autocomplete="email" required></div>'+
        '<div class="field full"><label for="ckCo">Company <span class="opt">(optional)</span></label><input id="ckCo" name="company" autocomplete="organization"></div>'+
        '<div class="field full"><label for="ckNote">Anything you’d add? <span class="opt">(optional)</span></label><textarea id="ckNote" name="message" rows="3"></textarea></div>'+
        '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'+
        '<div class="actions"><button class="btn" type="submit">Send me Matt’s take</button><button class="link" type="button" data-chat data-chat-pain="'+A.pain+'">Or talk it through</button></div><p class="form-err" hidden></p></form>';
      n.appendChild(cap);
      var again=el('button','check-back','Retake the check');again.type='button';again.addEventListener('click',function(){state.answers=[];state.i=-1;intro();});n.appendChild(again);
      swap(n);
      [].forEach.call(n.querySelectorAll('.check-bar b'),function(b,k){
        var w=b.getAttribute('data-w')+'%';
        if(G())gsap.fromTo(b,{width:'0%'},{width:w,duration:1.2,ease:'expo.out',delay:.3+k*.08});else b.style.width=w;
      });
      var f=cap.querySelector('form');
      f.addEventListener('submit',function(e){
        e.preventDefault();var err=f.querySelector('.form-err');err.hidden=true;
        if(!f.reportValidity())return;
        var btn=f.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Sending…';
        send({source:'bottleneck-check',name:f.name.value.trim(),email:f.email.value.trim(),company:f.company.value.trim(),message:f.message.value.trim(),
          painCategory:A.pain,painLabel:A.name,painDetail:f.message.value.trim(),score:total,scores:sums,constraint:A.name,answers:state.answers,
          website:f.website.value,elapsed:Date.now()-state.started})
          .then(function(){
            T('check',{a:'capture'});T('lead',{src:'bottleneck-check'});
            var done=el('div','form-done');done.innerHTML='<span class="done-mark" aria-hidden="true"></span><h3></h3><p>Matt will look over your answers and reply within one business day.</p>';
            done.querySelector('h3').textContent='Sent. Thanks, '+first(f.name.value)+'.';
            f.replaceWith(done);
            if(G())gsap.fromTo(done,{autoAlpha:0,y:12},{autoAlpha:1,y:0,duration:.6,ease:'expo.out'});
          })
          .catch(function(x){err.textContent=x.message;err.hidden=false;btn.disabled=false;btn.textContent='Send me Matt’s take';});
      });
    }
    intro();
  }

  /* ---------- start */
  buildChat();buildGuideGate();wireForms();wirePlans();buildCheck();
  var quiet=/\/(contact|bottleneck-check|portal|apply)\//.test(location.pathname);
  if(!quiet){
    setTimeout(showNudge,32000);
    var fired=false;
    window.addEventListener('scroll',function(){
      if(fired)return;var h=document.documentElement;
      if((h.scrollTop+innerHeight)/h.scrollHeight>0.6){fired=true;setTimeout(showNudge,1200);}
    },{passive:true});
  }
  window.MWChat={open:openChat,close:closeChat};
})();
