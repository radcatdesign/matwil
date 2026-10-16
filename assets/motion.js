/* Matt Wilhelmsen site redesign by RADCAT: GSAP motion layer
   Type, image, hairline and menu reveals, plus Lenis smooth scrolling on desktop.
   Runs only when the visitor allows motion; everything stays readable without it. */
(function(){
  var html=document.documentElement;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!html.classList.contains('motion')||!window.gsap||!window.ScrollTrigger||!window.SplitText){html.classList.remove('motion');return;}
  window.__mwMotion=true;
  gsap.registerPlugin(ScrollTrigger,SplitText);

  var EASE='expo.out', SOFT='power3.out';
  var $=function(s,ctx){return [].slice.call((ctx||document).querySelectorAll(s));};
  var wide=window.matchMedia('(min-width: 901px)').matches;

  /* ---------- smooth scroll (pointer devices only) */
  var lenis=null;
  if(window.Lenis&&window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    lenis=new Lenis({duration:1.15,easing:function(t){return Math.min(1,1.001-Math.pow(2,-10*t));},anchors:true});
    lenis.on('scroll',ScrollTrigger.update);
    gsap.ticker.add(function(t){lenis.raf(t*1000);});
    gsap.ticker.lagSmoothing(0);
    window.MWLenis=lenis;
  }

  /* ---------- helpers */
  function splitLines(el,opts){
    return SplitText.create(el,Object.assign({type:'lines',mask:'lines',linesClass:'split-line',autoSplit:true},opts||{}));
  }
  function imageReveal(wrap,delay){
    var im=wrap.tagName==='IMG'?wrap:wrap.querySelector('img');
    if(im)gsap.set(im,{transition:'none'});
    var tl=gsap.timeline({delay:delay||0,paused:true,onComplete:function(){
      gsap.set(wrap,{clearProps:'clipPath'}); if(im)gsap.set(im,{clearProps:'transform,transition'});
    }});
    tl.fromTo(wrap,{clipPath:'inset(100% 0% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:1.35,ease:'expo.inOut'},0);
    if(im)tl.fromTo(im,{scale:1.22},{scale:1,duration:1.8,ease:EASE},0.05);
    return tl;
  }

  /* ---------- first screen: one orchestrated entrance */
  function entrance(){
    var copy=document.querySelector('.hero-copy,.ph-copy');
    var fig=document.querySelector('.hero .slant,.page-head .slant');
    var tl=gsap.timeline({defaults:{ease:EASE}});
    if(copy){
      var kids=[].slice.call(copy.children);
      gsap.set(kids,{visibility:'visible'});
      kids.forEach(function(k){
        if(k.tagName==='H1'){
          SplitText.create(k,{type:'words,lines',mask:'lines',linesClass:'split-line',wordsClass:'split-word',autoSplit:true,
            onSplit:function(self){return tl.fromTo(self.words,{yPercent:115,rotate:3},{yPercent:0,rotate:0,duration:1.3,stagger:0.045},0.15);}});
        }else if(k.classList.contains('lede')){
          splitLines(k,{onSplit:function(self){return tl.fromTo(self.lines,{yPercent:110},{yPercent:0,duration:1.2,stagger:0.08},0.45);}});
        }else if(k.tagName==='NAV'){
          tl.fromTo(k,{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:1},0.05);
        }else{
          tl.fromTo(k.children.length?k.children:k,{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:1.1,stagger:0.08,ease:SOFT,clearProps:'transform'},0.7);
        }
      });
    }
    if(fig){
      var im=fig.querySelector('img');
      var mobile=!wide;
      var from=mobile?'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)':'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)';
      var to=mobile?'polygon(0% 13%, 100% 0%, 100% 100%, 0% 100%)':'polygon(13% 0%, 100% 0%, 100% 100%, 0% 100%)';
      gsap.set(fig,{visibility:'visible'});
      tl.fromTo(fig,{clipPath:from},{clipPath:to,duration:1.6,ease:'expo.inOut',onComplete:function(){gsap.set(fig,{clearProps:'clipPath'});}},0);
      if(im){
        tl.fromTo(im,{scale:1.3},{scale:1.08,duration:2.2,ease:EASE},0.1);
        gsap.to(im,{yPercent:7,ease:'none',scrollTrigger:{trigger:fig,start:'top top',end:'bottom top',scrub:true}});
      }
    }
  }

  /* ---------- headings and ledes below the fold: masked line rise */
  function typeReveals(){
    $('main h2, .close h2, main .lede').forEach(function(el){
      if(el.closest('.hero-copy,.ph-copy,.fit-panel,.form-card'))return;
      var isLede=el.classList.contains('lede');
      splitLines(el,{onSplit:function(self){
        return gsap.fromTo(self.lines,{yPercent:isLede?105:118,rotate:isLede?0:2},{yPercent:0,rotate:0,duration:isLede?1.15:1.35,stagger:isLede?0.07:0.1,ease:EASE,
          scrollTrigger:{trigger:el,start:'top 88%',once:true}});
      }});
    });
  }

  /* ---------- images: wipe up from the bottom with a slow settle */
  function imageReveals(){
    $('main .photo, main .matt-photo, main .ph, main .fit-media').forEach(function(w){
      if(w.closest('.hero,.page-head'))return;
      var tl=imageReveal(w);
      ScrollTrigger.create({trigger:w,start:'top 90%',once:true,onEnter:function(){tl.play();}});
    });
    var close=document.querySelector('.close:not(.plain)');
    if(close){
      gsap.fromTo(close,{backgroundPosition:'50% 30%'},{backgroundPosition:'50% 85%',ease:'none',
        scrollTrigger:{trigger:close,start:'top bottom',end:'bottom top',scrub:true}});
    }
  }

  /* ---------- hairlines: every rule draws in from the left */
  function lineReveals(){
    var sel='main .rows>div, main .item, main .checks li, main .steps li, main .post a, main .posts, main .book, main .book-group h2, main .guide, main .guides, main .dl div, main .values, main .arc li, main .proof, main .pager, .foot-base';
    var rules=[];
    $(sel).forEach(function(el){
      var cs=getComputedStyle(el);
      ['Top','Bottom'].forEach(function(side){
        var w=parseFloat(cs['border'+side+'Width']),c=cs['border'+side+'Color'];
        if(!w||cs['border'+side+'Style']==='none'||/rgba\(.*,\s*0\)$/.test(c))return;
        if(cs.position==='static')el.style.position='relative';
        var r=document.createElement('span');
        r.className='rule-x';r.setAttribute('aria-hidden','true');
        r.style[side.toLowerCase()]=(-w)+'px';r.style.height=w+'px';r.style.background=c;
        el.style['border'+side+'Color']='transparent';
        el.appendChild(r);rules.push(r);
      });
    });
    gsap.set(rules,{scaleX:0});
    ScrollTrigger.batch(rules,{start:'top 94%',once:true,onEnter:function(batch){
      gsap.to(batch,{scaleX:1,duration:1.4,ease:'expo.inOut',stagger:0.07});
    }});
  }

  /* ---------- blocks: soft rise, staggered per row */
  function blockReveals(){
    var sel=['main .item>*','main .steps li','main .checks li','main .card','main .story','main .post','main .quote','main .book>*',
             'main .guide>*','main .feature','main .result-band','main .fit-opt','main .arc li','main .values li','main .proof li',
             'main .dl div','main .form-card','main .rows>div>*','main .split>div>p:not(.lede)','main .prose>*:not(h2)',
             'main .sec-foot','main .sec .ctas','.close .ctas','.close .reach','main .chips','main figcaption'].join(',');
    var els=$(sel).filter(function(el){return !el.classList.contains('rule-x')&&!el.closest('.hero-copy,.ph-copy');});
    gsap.set(els,{autoAlpha:0,y:28,transition:'none'});
    ScrollTrigger.batch(els,{start:'top 92%',once:true,onEnter:function(batch){
      gsap.to(batch,{autoAlpha:1,y:0,duration:1.1,ease:SOFT,stagger:0.08,clearProps:'transform,visibility,transition'});
    }});
  }

  /* ---------- menus */
  function menuReveals(){
    $('.has-menu').forEach(function(li){
      var menu=li.querySelector('.menu'),links=$('a',menu);
      function open(){
        gsap.fromTo(menu,{clipPath:'inset(0% -60px 100% -60px)'},{clipPath:'inset(-20px -60px -80px -60px)',duration:0.6,ease:EASE,overwrite:true});
        gsap.fromTo(links,{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:0.55,ease:SOFT,stagger:0.045,delay:0.05,overwrite:true});
      }
      li.addEventListener('mouseenter',open);
      li.addEventListener('focusin',function(e){if(!li.contains(e.relatedTarget))open();});
    });

    var mnav=document.getElementById('mobileNav');
    if(!mnav)return;
    window.MWMotion={
      openMenu:function(){
        if(lenis)lenis.stop();
        var items=$(':scope > details, :scope > .btn',mnav);
        gsap.fromTo(mnav,{clipPath:'inset(0% 0% 100% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:0.8,ease:EASE,overwrite:true});
        gsap.fromTo(items,{autoAlpha:0,y:18},{autoAlpha:1,y:0,duration:0.7,ease:SOFT,stagger:0.06,delay:0.1,overwrite:true});
      },
      closeMenu:function(done){
        if(lenis)lenis.start();
        gsap.to(mnav,{clipPath:'inset(0% 0% 100% 0%)',duration:0.45,ease:'expo.in',overwrite:true,onComplete:function(){gsap.set(mnav,{clearProps:'clipPath'});done();}});
      }
    };
    $('details',mnav).forEach(function(d){
      d.addEventListener('toggle',function(){
        if(d.open)gsap.fromTo($('div > a',d),{autoAlpha:0,x:-10},{autoAlpha:1,x:0,duration:0.5,ease:SOFT,stagger:0.05});
      });
    });
  }

  /* ---------- start once fonts are in, so line breaks are final */
  var started=false;
  function start(){
    if(started)return;started=true;
    entrance();typeReveals();imageReveals();lineReveals();blockReveals();menuReveals();
    ScrollTrigger.refresh();
  }
  var fontsReady=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
  Promise.race([fontsReady,new Promise(function(r){setTimeout(r,900);})]).then(start);
})();
