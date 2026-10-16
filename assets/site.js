/* Matt Wilhelmsen site redesign by RADCAT: shared behavior */
(function(){
  var root=document.body.getAttribute('data-root')||'';
  var U='https://www.mattwil.com/wp-content/uploads/';

  /* header shadow once the page moves */
  var header=document.getElementById('header');
  function onScroll(){header.classList.toggle('scrolled',window.scrollY>8);}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* desktop dropdowns: Escape closes the open one */
  [].forEach.call(document.querySelectorAll('.has-menu'),function(li){
    li.addEventListener('keydown',function(e){
      if(e.key==='Escape'){li.classList.add('dismissed');var t=li.querySelector('.top');if(t)t.focus();}
    });
    li.addEventListener('mouseleave',function(){li.classList.remove('dismissed');});
    li.addEventListener('focusout',function(e){if(!li.contains(e.relatedTarget))li.classList.remove('dismissed');});
  });

  /* mobile menu */
  var toggle=document.querySelector('.menu-toggle'),mnav=document.getElementById('mobileNav');
  if(toggle&&mnav){
    toggle.addEventListener('click',function(){
      var open=toggle.getAttribute('aria-expanded')==='true';
      toggle.setAttribute('aria-expanded',String(!open));toggle.textContent=open?'Menu':'Close';
      var M=window.MWMotion;
      if(open){ if(M)M.closeMenu(function(){mnav.hidden=true;}); else mnav.hidden=true; }
      else { mnav.hidden=false; if(M)M.openMenu(); }
    });
  }

  /* concept note: hide for the rest of the visit */
  var hide=document.getElementById('hideConcept');
  if(hide){hide.addEventListener('click',function(){
    document.documentElement.classList.add('concept-hidden');
    try{sessionStorage.setItem('mw-concept','hidden');}catch(e){}
  });}

  /* services picker on the homepage */
  var opts=document.getElementById('fitOptions');
  if(opts){
    var S=root+'services/';
    var services=[
      {q:'Every decision still runs through me.',name:'One-on-one coaching',title:'Get out of the bottleneck.',
       desc:'Private, ongoing coaching for owners and CEOs. Work through the real decisions on your desk while building the systems and habits that let your team carry more of them.',
       list:['A clear picture of what only you should own','The systems that let you hand off the rest','A thinking partner who tells you the truth'],
       img:'one-on-one-1.jpg',alt:'Matt in a one-on-one session with a client',url:S+'one-on-one-coaching/'},
      {q:'My managers need to lead, not just manage.',name:'Leadership development',title:'Build a bench you can trust.',
       desc:'Grow leaders who make good decisions, build strong teams, work through conflict and lead change with confidence.',
       list:['Sharper strategic decisions','Teams that are built, not just staffed','Confidence leading through change'],
       img:'Interior-Banner.png',alt:'Matt working with a leadership team around a conference table',url:S+'leadership-development/'},
      {q:'My team is busy, but we’re not aligned.',name:'Group coaching',title:'Get the whole team pulling one way.',
       desc:'Coaching for teams that need to communicate better, trust each other and solve problems together, whether they’re working through friction or chasing a shared goal.',
       list:['Clearer communication, fewer blockers','Trust and accountability that holds','Alignment on roles, goals and expectations'],
       img:'group-coaching.jpg',alt:'A team in a group coaching session',url:S+'group-coaching/'},
      {q:'I need to bring a whole room with me.',name:'Public speaking',title:'Bring Matt to your stage.',
       desc:'Keynotes, panels and workshops on leadership, scalable systems and balancing business with life, shaped around your audience.',
       list:['Keynotes for conferences and associations','Hands-on workshops for leadership teams','Length, format and Q&A built to fit'],
       img:'image-11.png',alt:'Matt presenting at a whiteboard to a seated group',url:S+'public-speaking/'}
    ];
    var media=document.getElementById('fitMedia'),body=document.getElementById('fitBody'),current=-1;
    services.forEach(function(s,i){
      var b=document.createElement('button');
      b.className='fit-opt';b.type='button';b.setAttribute('role','tab');b.id='fit-tab-'+i;b.setAttribute('aria-controls','fitPanel');
      b.innerHTML='<span class="q"></span><span class="s"></span>';
      b.querySelector('.q').textContent=s.q;b.querySelector('.s').textContent=s.name;
      b.addEventListener('click',function(){
        select(i);
        var panel=document.getElementById('fitPanel'),r=panel.getBoundingClientRect();
        if(window.matchMedia('(max-width:900px)').matches&&r.top>window.innerHeight*0.6){
          var reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
          panel.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
        }
      });
      b.addEventListener('keydown',function(e){
        var k=e.key,n=null;
        if(k==='ArrowDown'||k==='ArrowRight')n=(i+1)%services.length;
        if(k==='ArrowUp'||k==='ArrowLeft')n=(i-1+services.length)%services.length;
        if(n!==null){e.preventDefault();select(n);opts.children[n].focus();}
      });
      opts.appendChild(b);
      var im=document.createElement('img');im.src=U+s.img;im.alt=s.alt;im.loading=i?'lazy':'eager';media.appendChild(im);
    });
    function select(i){
      if(i===current)return;
      var s=services[i],first=current<0;current=i;
      [].forEach.call(opts.children,function(b,j){b.setAttribute('aria-selected',j===i?'true':'false');b.tabIndex=j===i?0:-1;});
      [].forEach.call(media.children,function(im,j){im.classList.toggle('on',j===i);});
      document.getElementById('fitPanel').setAttribute('aria-labelledby','fit-tab-'+i);
      document.getElementById('fitSvc').textContent=s.name;
      document.getElementById('fitTitle2').textContent=s.title;
      document.getElementById('fitDesc').textContent=s.desc;
      var ul=document.getElementById('fitList');ul.innerHTML='';
      s.list.forEach(function(t){var li=document.createElement('li');li.textContent=t;ul.appendChild(li);});
      var a=document.getElementById('fitLink');a.href=s.url;a.textContent='Explore '+s.name.toLowerCase();
      if(!first){body.classList.remove('swap');void body.offsetWidth;body.classList.add('swap');}
    }
    select(0);
  }

  /* forms: no backend in the concept, so they open a pre-filled email to Matt */
  [].forEach.call(document.querySelectorAll('form[data-mailto]'),function(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(!form.reportValidity())return;
      var lines=[],subject=form.getAttribute('data-subject')||'Website enquiry';
      [].forEach.call(form.elements,function(el){
        if(!el.name||el.type==='submit')return;
        if((el.type==='radio'||el.type==='checkbox')&&!el.checked)return;
        if(!el.value)return;
        var label=el.getAttribute('data-label')||el.name;
        lines.push(label+': '+el.value);
      });
      var nameEl=form.elements.namedItem('name');
      if(nameEl&&nameEl.value)subject+=' from '+nameEl.value;
      window.location.href='mailto:'+form.getAttribute('data-mailto')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.join('\n\n'));
      var done=form.querySelector('.done');if(done)done.hidden=false;
    });
  });
})();
