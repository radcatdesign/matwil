/* Matt Wilhelmsen lead CRM by RADCAT: Analyze mode
   Web and conversation engagement with benchmarks. Every metric has a "?" that explains it. */
(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var MIN_SAMPLE=30;

  /* ---------- metric library: what it is, how it's calculated, what good looks like */
  var M={
    visitors:{title:'Visitors',kind:'count',what:'Unique people who visited, counted by an anonymous ID stored in their browser.',
      calc:'Distinct visitor IDs with at least one pageview in the period. Someone on two devices counts twice, and anyone using private browsing or Do Not Track isn’t counted.',
      bench:null,tip:'Grows with search visibility, referrals, LinkedIn activity and talks. Watch the trend, not a benchmark.'},
    sessions:{title:'Sessions',kind:'count',what:'Separate visits. A session ends after 30 minutes without activity.',
      calc:'Count of distinct session IDs that recorded a pageview.',bench:null,tip:'More sessions than visitors means people are coming back, which is a good sign for a considered purchase like coaching.'},
    pageviews:{title:'Pageviews',kind:'count',what:'Every page load across all visits.',calc:'Count of pageview events.',bench:null,tip:'Useful alongside pages per session to see whether people explore past the first page.'},
    engagement:{title:'Engagement rate',kind:'pct',what:'The share of visits where someone actually paid attention.',
      calc:'Engaged sessions ÷ all sessions. A session is engaged if it has 10+ seconds of active time, 2+ pages, or produces a lead. This matches how Google Analytics 4 defines it.',
      bench:{low:.45,high:.6,better:'high',text:'Databox’s GA4 benchmarks (August 2023) put the cross-industry median around 56%, and consulting and professional services around 52%.'},
      tip:'A strong first screen, fast load and a clear next step lift this. Traffic from the right sources matters more than volume.'},
    bounce:{title:'Bounce rate',kind:'pct',what:'Visits that left without engaging. Lower is better.',
      calc:'1 − engagement rate. In GA4 terms, a bounce is any session that isn’t engaged.',
      bench:{low:.4,high:.55,better:'low',text:'Databox (August 2023) reports a median near 45%, and about 49% for consulting and professional services.'},
      tip:'High bounce on a specific landing page usually means the page doesn’t match what the visitor expected from the link they clicked.'},
    time:{title:'Avg engaged time',kind:'time',what:'How long people actively spend per visit.',
      calc:'Total active time ÷ sessions. Time only counts while the tab is visible and the visitor has scrolled, clicked, typed or moved in the last 15 seconds.',
      bench:{low:90000,high:180000,better:'high',text:'Databox (August 2023) puts average engagement time per session around 2m 38s overall and 2m 35s for consulting and professional services.'},
      tip:'Specific, story-driven pages (results, Matt’s background) and the Bottleneck Check tend to hold attention longest.'},
    pps:{title:'Pages per session',kind:'ratio',what:'How many pages a typical visit includes.',calc:'Pageviews ÷ sessions.',
      bench:null,benchNote:'No dependable public benchmark. Track it against your own past periods.',tip:'Clear links between services, stories and the next step help people go deeper.'},
    newv:{title:'New visitors',kind:'pct',what:'Share of visitors seen for the first time in this browser.',calc:'New visitor IDs ÷ all visitor IDs in the period.',
      bench:null,benchNote:'No standard benchmark. A healthy mix shows both reach and people returning to think it over.',tip:'Returning visitors are often the warmest leads. Content and follow-ups bring them back.'},
    conv:{title:'Visitor-to-lead rate',kind:'pct',what:'How many visitors turn into a lead Matt can talk to.',
      calc:'New leads from any source ÷ unique visitors in the same period. Leads come from the CRM, so hand-added leads are included.',
      bench:{low:.02,high:.05,better:'high',text:'Huemor’s 2026 B2B benchmark guide says most B2B websites convert 2% to 4%, cites WebFX’s average of about 2.2%, and treats 5% to 10% as high-performing and 10%+ as top tier.'},
      tip:'Low-pressure ways in (the chat and the Bottleneck Check) usually convert better than a single “book a call” button.'},
    leads:{title:'Leads',kind:'count',what:'New leads created in the period, from every source.',calc:'Leads in the CRM whose created date falls in the period (Pacific time).',bench:null,tip:'See which tools produce them in Leads by source below.'},
    intents:{title:'Contact clicks',kind:'count',what:'Clicks on Matt’s email address or phone number.',calc:'Count of clicks on mailto: and tel: links. These people may reach Matt outside the site, so they won’t always show up as leads.',
      bench:null,tip:'If this is high while form leads are low, people may prefer to reach out directly. Make sure Matt logs those in the CRM.'},
    won:{title:'Clients won',kind:'count',what:'Leads from this period now marked as Client.',calc:'Leads created in the period whose stage is Client.',bench:null,tip:'Recent periods will look low until those conversations close.'},
    chatOpen:{title:'Chat open rate',kind:'pct',what:'How often a visit includes opening the conversation with Matt.',
      calc:'Sessions where the chat was opened ÷ all sessions.',
      bench:{low:.015,high:.05,better:'high',text:'Published figures vary widely. Yonder’s customer data puts it near 1.5% of visitors; Which-50 (2026) cites 5% to 15% across industries. Within range here means 1.5% to 5%.'},
      tip:'The nudge, the “Talk it through” buttons on service pages and the article prompts all feed this.'},
    nudge:{title:'Nudge click rate',kind:'pct',what:'How often the small “What’s the hardest part…” prompt gets clicked.',
      calc:'Nudge clicks ÷ times the nudge was shown. It shows at most once per visit, after 30 seconds or 60% scroll.',
      bench:null,benchNote:'No reliable public benchmark exists for proactive prompts. SnapEngage recommends setting your own baseline, so compare against past periods.',
      tip:'Test the wording and timing. A question that names a specific pain usually beats a generic “Can I help?”'},
    chatDone:{title:'Chat completion',kind:'pct',what:'Of the people who start answering, how many finish and send it to Matt.',
      calc:'Conversations sent ÷ conversations started (answered the first question).',
      bench:{low:.45,high:.66,better:'high',text:'There’s no published benchmark for scripted chat flows. The closest reference is form completion: Zuko’s 2025 data shows about 52% of form sessions submit, and about 66% of people who start a form finish it.'},
      tip:'The funnel below shows exactly which question loses people. Fewer or optional questions usually help.'},
    chatLeads:{title:'Leads from chat',kind:'count',what:'Conversations completed and sent to Matt.',calc:'Count of completed conversations.',bench:null,tip:'Every one includes the full conversation in the lead record.'},
    checkStart:{title:'Check start rate',kind:'pct',what:'Of the visits that reach the Bottleneck Check page, how many start it.',
      calc:'Check starts ÷ sessions that viewed the Bottleneck Check page.',
      bench:{low:.25,high:.45,better:'high',text:'Riddle’s quiz marketing benchmarks (2021 data, 3.3 billion data points) found about 34% of page visitors start a quiz.'},
      tip:'The first screen’s promise matters most: short, specific, results right away.'},
    checkDone:{title:'Check completion',kind:'pct',what:'Of the people who start the check, how many see their results.',calc:'Completed checks ÷ started checks.',
      bench:{low:.7,high:.9,better:'high',text:'Riddle (2021 data) reports roughly 81% of people who start a quiz finish it.'},tip:'Eight short statements is a sweet spot. Watch the funnel for any question that stalls people.'},
    checkCapture:{title:'Check opt-in rate',kind:'pct',what:'Of the people who see their results, how many ask for Matt’s take.',calc:'Results requests sent ÷ completed checks.',
      bench:{low:.3,high:.5,better:'high',text:'Riddle (2021 data) reports quiz lead capture near 41%, against about 1.9% for pop-ups.'},tip:'Showing results without an email gate builds trust; the offer of a personal read is what earns the opt-in.'},
    formContact:{title:'Contact form completion',kind:'pct',what:'Of the people who start the contact form, how many send it.',calc:'Successful submissions ÷ sessions where someone clicked into a field.',
      bench:{low:.45,high:.68,better:'high',text:'Zuko (2025) puts average form completion near 52% (55.5% desktop, 47.5% mobile); FormAssembly’s 2025 data shows about 68% of starters finish.'},tip:'Fewer required fields and clear error messages lift this most.'},
    planVisits:{title:'Plans page visits',kind:'count',what:'Visits that included the Plans and pricing page.',calc:'Sessions with at least one view of /get-started/.',
      bench:null,tip:'The header’s Get started button and the service pages feed this. Compare it with leads from the three plans below.'},
    formPartner:{title:'Partner conversation requests',kind:'pct',what:'Of the people who start the Operating Partner request, how many send it.',calc:'Requests sent ÷ sessions where someone clicked into a field on the private conversation request.',
      bench:null,benchNote:'No public benchmark exists for a request this size. Volume will be low by design, so read it alongside the CRM: one good conversation a quarter can be a strong result.',
      tip:'People who reach this form are usually serious. If they start and stop, the revenue question or the price may be the moment to look at.'},
    formApply:{title:'Application completion',kind:'pct',what:'Of the people who start the Private Advisory application, how many send it.',
      calc:'Applications sent ÷ sessions where someone clicked into a field on the application.',
      bench:{low:.35,high:.6,better:'high',text:'No published benchmark exists for long applications. Zuko’s 2025 data puts average form completion near 52%, and longer forms finish less often, so 35% to 60% is a fair range here.'},
      tip:'A long application is meant to filter. If completion drops, check which step people stall on before shortening it.'},
    formCohort:{title:'Seat request completion',kind:'pct',what:'Of the people who start the Founder Cohort seat request, how many send it.',calc:'Seat requests sent ÷ sessions where someone clicked into a field on the request.',
      bench:{low:.45,high:.68,better:'high',text:'Same reference as the other short forms: about 52% average completion (Zuko, 2025) and about 68% of starters finishing (FormAssembly, 2025).'},tip:'Seat count and the start date do most of the work here. Keep them current.'},
    formMember:{title:'Membership sign-up completion',kind:'pct',what:'Of the people who start the membership sign-up, how many send it.',calc:'Sign-ups sent ÷ sessions where someone clicked into a field on the sign-up.',
      bench:{low:.45,high:.68,better:'high',text:'About 52% average form completion (Zuko, 2025) and about 68% of starters finishing (FormAssembly, 2025). Once a payment link is connected, checkout benchmarks apply instead.'},tip:'Fewer fields win. Name and email is enough to start.'},
    formBooking:{title:'Booking form completion',kind:'pct',what:'Of the people who start the booking request, how many send it.',calc:'Successful submissions ÷ sessions where someone clicked into a field.',
      bench:{low:.45,high:.68,better:'high',text:'Same reference as the contact form: about 52% average completion (Zuko, 2025) and about 68% of starters finishing (FormAssembly, 2025).'},tip:'A live calendar embed often outperforms a request form for booking.'},
    guide:{title:'Guide email capture',kind:'pct',what:'Of the people who click a guide download, how many leave an email.',calc:'Guide emails sent ÷ guide download clicks. People can always skip and download directly.',
      bench:null,benchNote:'No dependable public benchmark for optional gates. Compare against past periods.',tip:'The softer the ask, the more downloads; the clearer the value of Matt’s note, the more emails.'},
    scroll:{title:'Avg scroll depth',kind:'pct',what:'How far down the page people get, on average.',calc:'Average of the deepest point reached on each pageview, as a share of the page’s scrollable height.',
      bench:{low:.5,high:.75,better:'high',text:'Wingify (VWO) treats 50%+ average scroll depth as good and 75%+ as excellent for long pages.'},tip:'Strong section headings and visuals early on keep people moving down.'},
    reach75:{title:'Reached 75%',kind:'pct',what:'Share of pageviews that made it three quarters of the way down.',calc:'Pageviews with a deepest point of 75% or more ÷ pageviews with scroll data.',
      bench:null,benchNote:'No standard benchmark. Use it to compare pages against each other.',tip:'Pages with low reach but high time on page may have the key content too low.'}
  };

  /* ---------- formatting */
  function pct(x){if(x==null||isNaN(x))return '–';var v=x*100;return (v>0&&v<10?v.toFixed(1):Math.round(v))+'%';}
  function time(ms){if(ms==null||isNaN(ms))return '–';var s=Math.round(ms/1000),m=Math.floor(s/60);return m?m+'m '+String(s%60).padStart(2,'0')+'s':s+'s';}
  function num(n){return n==null||isNaN(n)?'–':Math.round(n).toLocaleString();}
  function ratio(x){return x==null||isNaN(x)?'–':x.toFixed(2);}
  function fmt(kind,v){return kind==='pct'?pct(v):kind==='time'?time(v):kind==='ratio'?ratio(v):num(v);}
  function div(a,b){return b?a/b:null;}
  function fmtDay(d){return new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});}
  function pageName(p){if(!p||p==='/')return 'Home';var seg=p.replace(/\/$/,'').split('/').pop().replace(/-/g,' ');return seg.charAt(0).toUpperCase()+seg.slice(1);}

  function status(def,v,n){
    if(!def.bench||v==null)return null;
    if(n<MIN_SAMPLE)return {cls:'early',icon:'◌',label:'Early data'};
    var b=def.bench,good=b.better==='high'?v>b.high:v<b.low,bad=b.better==='high'?v<b.low:v>b.high;
    return good?{cls:'above',icon:'▲',label:'Better than benchmark'}:bad?{cls:'below',icon:'▼',label:'Below benchmark'}:{cls:'within',icon:'●',label:'Within benchmark'};
  }
  function benchRange(def){
    var b=def.bench;if(!b)return '';var f=function(x){return fmt(def.kind,x);};
    return 'Benchmark '+f(b.low)+' to '+f(b.high);
  }
  function delta(def,cur,prev,isRate){
    if(cur==null||prev==null)return '';
    if(isRate){var pts=(cur-prev)*100;if(Math.abs(pts)<0.05)return '<span class="delta">No change</span>';
      var better=def.bench&&def.bench.better==='low'?pts<0:pts>0;
      return '<span class="delta '+(better?'up':'down')+'">'+(pts>0?'+':'')+pts.toFixed(1)+' pts vs prior</span>';}
    if(def.kind==='ratio'){var r=cur-prev;if(Math.abs(r)<0.005)return '<span class="delta">No change</span>';return '<span class="delta '+(r>0?'up':'down')+'">'+(r>0?'+':'−')+Math.abs(r).toFixed(2)+' vs prior</span>';}
    if(def.kind==='time'){var d=cur-prev;if(Math.abs(d)<1000)return '<span class="delta">No change</span>';return '<span class="delta '+(d>0?'up':'down')+'">'+(d>0?'+':'−')+time(Math.abs(d))+' vs prior</span>';}
    if(!prev)return cur?'<span class="delta up">New this period</span>':'';
    var ch=(cur-prev)/prev*100;if(Math.abs(ch)<0.5)return '<span class="delta">No change</span>';
    return '<span class="delta '+(ch>0?'up':'down')+'">'+(ch>0?'+':'−')+Math.abs(Math.round(ch))+'% vs prior</span>';
  }
  function info(key){
    var d=M[key];
    return '<button type="button" class="info" data-info="'+key+'" aria-label="About '+esc(d.title)+'" aria-expanded="false">?</button>';
  }
  function tile(key,cur,prev,n){
    var d=M[key],isRate=d.kind==='pct',st=status(d,cur,n);
    return '<div class="a-tile"><div class="a-tile-top"><span class="tile-label">'+esc(d.title)+'</span>'+info(key)+'</div>'+
      '<span class="tile-num">'+fmt(d.kind,cur)+'</span>'+
      '<div class="a-tile-foot">'+delta(d,cur,prev,isRate)+(st?'<span class="bstat '+st.cls+'"><i aria-hidden="true">'+st.icon+'</i>'+st.label+'</span>':'')+
      (d.bench?'<span class="brange">'+esc(benchRange(d))+'</span>':'')+'</div></div>';
  }
  function bars(rows,opts){
    opts=opts||{};
    if(!rows.length)return '<p class="empty-note">No data yet for this period.</p>';
    var max=Math.max.apply(null,rows.map(function(r){return r[1];}))||1;
    return '<ul class="barlist">'+rows.map(function(r){
      var tip=r[0]+': '+num(r[1])+(opts.unit?' '+opts.unit:'')+(opts.total?' ('+pct(r[1]/opts.total)+')':'');
      return '<li tabindex="0" data-tip="'+esc(tip)+'"><span class="bl-name">'+esc(r[0])+'</span><span class="bl-track"><span class="bl-bar" style="width:'+(r[1]/max*100)+'%"></span></span><span class="bl-val">'+num(r[1])+'</span></li>';
    }).join('')+'</ul>';
  }
  function top(o,k){return Object.keys(o||{}).map(function(x){return [x,o[x]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,k||8);}
  function funnel(steps,base){
    if(!base)return '<p class="empty-note">No one has started this yet in the selected period.</p>';
    var prev=base;
    return '<ol class="funnel">'+steps.map(function(s,i){
      var share=s[1]/base,drop=i?(prev-s[1])/(prev||1):0;var html='<li tabindex="0" data-tip="'+esc(s[0]+': '+num(s[1])+' ('+pct(share)+' of starts)')+'"><span class="f-name">'+esc(s[0])+'</span>'+
        '<span class="f-track"><span class="f-bar" style="width:'+Math.max(1.5,share*100)+'%"></span></span><span class="f-val">'+num(s[1])+'</span><span class="f-pct">'+pct(share)+'</span>'+
        '<span class="f-drop">'+(i&&prev>s[1]?'−'+pct(drop)+' from previous':'')+'</span></li>';prev=s[1];return html;}).join('')+'</ol>';
  }

  /* ---------- render */
  var state={days:30,data:null,loading:false},host,api,toast;
  function sectionHead(title,sub){return '<div class="a-sec-head"><h2>'+esc(title)+'</h2>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>';}

  function render(){
    var D=state.data;
    var excl=false;try{excl=localStorage.getItem('mw-no-track')==='1';}catch(e){}
    if(D&&D.setup){host.innerHTML=setupCard();return;}
    var head='<div class="a-head"><div><h1>Engagement</h1><p>'+(D?'Last '+D.range.days+' days ('+fmtDay(D.range.start)+' to '+fmtDay(D.range.end)+'), compared with the '+D.range.days+' days before. Pacific time.':'Loading…')+'</p></div>'+
      '<div class="a-controls"><div class="seg-tabs" role="group" aria-label="Date range">'+[7,30,90].map(function(n){return '<button type="button" data-days="'+n+'" aria-pressed="'+(state.days===n)+'">'+n+' days</button>';}).join('')+'</div>'+
      '<label class="p-check a-excl"><input type="checkbox" id="exclSelf"'+(excl?' checked':'')+'> Don’t count this browser</label></div></div>';
    if(!D){host.innerHTML=head+'<p class="p-count">Loading engagement data…</p>';wire();return;}
    var C=D.current,P=D.previous,S=C.sessions,PS=P.sessions;
    if(!S&&!PS){
      host.innerHTML=head+'<div class="p-empty"><h2>No visits recorded yet</h2><p>Tracking starts as soon as this version of the site is live and public. Visits from browsers signed into this CRM aren’t counted, so your own clicking around won’t skew the numbers. Check back after a few days of traffic.</p></div>';
      wire();return;
    }
    var eng=function(r){return div(r.engagedSessions,r.sessions);};
    var cur={visitors:C.visitors,sessions:S,pageviews:C.pageviews,engagement:eng(C),bounce:eng(C)==null?null:1-eng(C),time:div(C.activeMs,S),pps:div(C.pageviews,S),newv:div(C.newVisitors,C.visitors),
      conv:div(D.leads.current,C.visitors),leads:D.leads.current,intents:(C.intents.email||0)+(C.intents.phone||0),won:D.leads.won,
      chatOpen:div(C.chat.openSessions,S),nudge:div(C.chat.nudgeClick,C.chat.nudgeShown),chatDone:div(C.chat.completes,C.chat.steps.pain||0),chatLeads:C.chat.completes,
      checkStart:div(C.check.starts,C.check.pageSessions),checkDone:div(C.check.completes,C.check.starts),checkCapture:div(C.check.captures,C.check.completes),
      formContact:div(C.forms.contact.submits,C.forms.contact.starts),formBooking:div(C.forms.booking.submits,C.forms.booking.starts),guide:div(C.guide.sends,C.guide.clicks),
      planVisits:C.plans.pageSessions,formPartner:div(C.forms.partner.submits,C.forms.partner.starts),formApply:div(C.forms.application.submits,C.forms.application.starts),formCohort:div(C.forms.cohort.submits,C.forms.cohort.starts),formMember:div(C.forms.membership.submits,C.forms.membership.starts),
      scroll:div(C.scroll.sum/100,C.scroll.n),reach75:div(C.scroll.r75,C.scroll.n)};
    var prv={visitors:P.visitors,sessions:PS,pageviews:P.pageviews,engagement:eng(P),bounce:eng(P)==null?null:1-eng(P),time:div(P.activeMs,PS),pps:div(P.pageviews,PS),newv:div(P.newVisitors,P.visitors),
      conv:div(D.leads.previous,P.visitors),leads:D.leads.previous,intents:(P.intents.email||0)+(P.intents.phone||0),won:null,
      chatOpen:div(P.chat.openSessions,PS),nudge:div(P.chat.nudgeClick,P.chat.nudgeShown),chatDone:div(P.chat.completes,P.chat.steps.pain||0),chatLeads:P.chat.completes,
      checkStart:div(P.check.starts,P.check.pageSessions),checkDone:div(P.check.completes,P.check.starts),checkCapture:div(P.check.captures,P.check.completes),
      formContact:div(P.forms.contact.submits,P.forms.contact.starts),formBooking:div(P.forms.booking.submits,P.forms.booking.starts),guide:div(P.guide.sends,P.guide.clicks),
      planVisits:P.plans.pageSessions,formPartner:div(P.forms.partner.submits,P.forms.partner.starts),formApply:div(P.forms.application.submits,P.forms.application.starts),formCohort:div(P.forms.cohort.submits,P.forms.cohort.starts),formMember:div(P.forms.membership.submits,P.forms.membership.starts),
      scroll:div(P.scroll.sum/100,P.scroll.n),reach75:div(P.scroll.r75,P.scroll.n)};
    var n={visitors:S,sessions:S,pageviews:S,engagement:S,bounce:S,time:S,pps:S,newv:C.visitors,conv:C.visitors,leads:S,intents:S,won:S,chatOpen:S,nudge:C.chat.nudgeShown,chatDone:C.chat.steps.pain||0,chatLeads:S,
      checkStart:C.check.pageSessions,checkDone:C.check.starts,checkCapture:C.check.completes,formContact:C.forms.contact.starts,formBooking:C.forms.booking.starts,guide:C.guide.clicks,planVisits:S,formPartner:C.forms.partner.starts,formApply:C.forms.application.starts,formCohort:C.forms.cohort.starts,formMember:C.forms.membership.starts,scroll:C.scroll.n,reach75:C.scroll.n};
    var T=function(keys){return '<div class="a-tiles'+(keys.length===5?' five':'')+'">'+keys.map(function(k){return tile(k,cur[k],prv[k],n[k]);}).join('')+'</div>';};

    // daily bars
    var dmax=Math.max(1,Math.max.apply(null,D.daily.map(function(d){return d.visitors;})));
    var daily='<div class="a-daily" style="--n:'+D.daily.length+'">'+D.daily.map(function(d){
      return '<div class="dbar'+(d.visitors?'':' zero')+'" tabindex="0" data-tip="'+esc(fmtDay(d.day)+': '+d.visitors+' visitors, '+d.sessions+' sessions, '+d.leads+(d.leads===1?' lead':' leads'))+'"><b style="height:'+Math.max(2,d.visitors/dmax*100)+'%"></b>'+(d.leads?'<i aria-hidden="true"></i>':'')+'</div>';}).join('')+'</div>'+
      '<div class="a-daily-axis"><span>'+fmtDay(D.daily[0].day)+'</span><span>'+fmtDay(D.daily[D.daily.length-1].day)+'</span></div>'+
      '<p class="a-legend"><span class="lg-bar"></span>Visitors per day <span class="lg-dot"></span>Day with at least one lead</p>';

    var STEP_NAMES={pain:'Picked what’s weighing on them',painDetail:'Described it',companySize:'Team size',role:'Role',duration:'How long',name:'Name',company:'Company (optional)',email:'Email',phone:'Phone (optional)',nextStep:'Chose a next step'};
    var chatSteps=[['Opened the chat',C.chat.openSessions]].concat(Object.keys(STEP_NAMES).map(function(k){return [STEP_NAMES[k],C.chat.steps[k]||0];})).concat([['Sent to Matt',C.chat.completes]]);
    var checkSteps=[['Started',C.check.starts]].concat([1,2,3,4,5,6,7,8].map(function(i){return ['Answered statement '+i,C.check.answers[i]||0];})).concat([['Saw results',C.check.completes],['Asked for Matt’s take',C.check.captures]]);
    var srcNames={conversation:'Conversation','bottleneck-check':'Bottleneck check',guide:'Guide download',contact:'Contact form',booking:'Booking request',partner:'Partner conversation',application:'Advisory application',cohort:'Cohort seat request',membership:'Membership',manual:'Added by hand'};
    var leadSrc=top(D.leads.bySource).map(function(r){return [srcNames[r[0]]||r[0],r[1]];});
    var byLabel={};Object.keys(C.ctas||{}).forEach(function(k){var p=k.split('|'),lab=p[1]||({chat:'Chat button',guide:'Guide download',email:'Email link',phone:'Phone link'})[p[0]]||p[0];byLabel[lab]=(byLabel[lab]||0)+C.ctas[k];});
    var ctaRows=top(byLabel,10);
    var devNames={mobile:'Mobile',tablet:'Tablet',desktop:'Desktop'};

    // pages table
    var pages=Object.keys(C.pages).map(function(p){var g=C.pages[p];return {p:p,views:g.views,visitors:g.visitors,time:div(g.activeMs,g.n),sd:div(g.sdSum/100,g.n),r75:div(g.r75,g.n),exit:div(g.exits,g.views)};}).sort(function(a,b){return b.views-a.views;}).slice(0,15);
    var table='<div class="tablewrap"><table class="leads a-pages"><thead><tr><th>Page</th><th class="num">Views</th><th class="num">Visitors</th><th class="num">Avg time</th><th class="num">Avg scroll</th><th class="num">Reached 75%</th><th class="num">Exit rate</th></tr></thead><tbody>'+
      pages.map(function(g){return '<tr class="static"><td><div class="nm">'+esc(pageName(g.p))+'</div><div class="co">'+esc(g.p)+'</div></td><td class="num">'+num(g.views)+'</td><td class="num">'+num(g.visitors)+'</td><td class="num">'+time(g.time)+'</td><td class="num">'+pct(g.sd)+'</td><td class="num">'+pct(g.r75)+'</td><td class="num">'+pct(g.exit)+'</td></tr>';}).join('')+'</tbody></table></div>';

    // heatmap
    var hmax=Math.max(1,Math.max.apply(null,Object.keys(C.heat).map(function(k){return C.heat[k];}).concat([0])));
    var days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var heat='<div class="heat" role="table" aria-label="Pageviews by day and hour, Pacific time"><div class="heat-row heat-hours" role="row"><span role="columnheader"></span>'+Array.from({length:24},function(_,h){return '<span role="columnheader">'+(h%3===0?(h===0?'12a':h<12?h+'a':h===12?'12p':(h-12)+'p'):'')+'</span>';}).join('')+'</div>'+
      days.map(function(dn,d){return '<div class="heat-row" role="row"><span class="heat-day" role="rowheader">'+dn+'</span>'+Array.from({length:24},function(_,h){var c=C.heat[d+'-'+h]||0,lvl=c?Math.min(4,Math.ceil(c/hmax*4)):0;
        return '<span role="cell" class="hc l'+lvl+'" tabindex="'+(c?0:-1)+'" data-tip="'+esc(dn+' '+(h===0?'12am':h<12?h+'am':h===12?'12pm':(h-12)+'pm')+': '+c+(c===1?' pageview':' pageviews'))+'"></span>';}).join('')+'</div>';}).join('')+
      '<div class="heat-key"><span>Fewer</span><i class="hc l1"></i><i class="hc l2"></i><i class="hc l3"></i><i class="hc l4"></i><span>More</span></div></div>';

    host.innerHTML=head+
      sectionHead('Traffic and attention','Who’s coming, how many, and whether they stick around.')+
      T(['visitors','sessions','pageviews','engagement','bounce','time','pps','newv'])+
      '<div class="panel a-wide"><h2>Visitors per day</h2>'+daily+'</div>'+
      sectionHead('Turning visits into conversations','How many visitors become leads, and through which door.')+
      T(['leads','conv','intents','won'])+
      '<div class="a-grid2"><div class="panel"><h2>Leads by source</h2>'+bars(leadSrc,{unit:'leads',total:D.leads.current})+'</div><div class="panel"><h2>Most-clicked buttons and links</h2>'+bars(ctaRows,{unit:'clicks'})+'</div></div>'+
      sectionHead('The conversation with Matt','How the chat performs, step by step.')+
      T(['chatOpen','nudge','chatDone','chatLeads'])+
      '<div class="panel a-wide"><h2>Chat funnel '+info('chatDone')+'</h2>'+funnel(chatSteps,C.chat.openSessions)+
        '<p class="a-note">Opened by: '+['launcher','nudge','cta'].map(function(o){return ({launcher:'the chat button',nudge:'the nudge',cta:'page buttons'})[o]+' '+num(C.chat.origins[o]||0);}).join(', ')+'.</p></div>'+
      sectionHead('Bottleneck Check','From first click to asking for Matt’s read.')+
      T(['checkStart','checkDone','checkCapture'])+
      '<div class="panel a-wide"><h2>Check funnel</h2>'+funnel(checkSteps,C.check.starts)+'</div>'+
      sectionHead('Plans and pricing','From the plans page to an application, a seat request or a membership.')+
      T(['planVisits','formPartner','formApply','formCohort','formMember'])+
      sectionHead('Forms and guides','Direct requests and guide downloads.')+
      T(['formContact','formBooking','guide'])+
      sectionHead('Content','Which pages hold attention and where people leave.')+
      T(['scroll','reach75'])+table+
      sectionHead('Audience','Where visits come from and what they use.')+
      '<div class="a-grid3"><div class="panel"><h2>Traffic sources</h2>'+bars(top(C.sources),{unit:'sessions',total:S})+'</div>'+
        '<div class="panel"><h2>Referring sites</h2>'+bars(top(C.referrers),{unit:'sessions',total:S})+'</div>'+
        '<div class="panel"><h2>Landing pages</h2>'+bars(top(C.landing).map(function(r){return [pageName(r[0]),r[1]];}),{unit:'sessions',total:S})+'</div>'+
        '<div class="panel"><h2>Devices</h2>'+bars(top(C.devices).map(function(r){return [devNames[r[0]]||r[0],r[1]];}),{unit:'sessions',total:S})+'</div>'+
        '<div class="panel"><h2>Countries</h2>'+bars(top(C.countries),{unit:'sessions',total:S})+'</div>'+
        '<div class="panel"><h2>Campaigns</h2>'+bars(top(C.campaigns),{unit:'sessions',total:S})+'</div></div>'+
      sectionHead('When people visit','Pageviews by day and hour, Pacific time.')+
      '<div class="panel a-wide">'+heat+'</div>'+
      '<p class="a-foot">Benchmarks come from published industry studies and are a reference point, not a target. Results based on fewer than '+MIN_SAMPLE+' visits or events are marked as early data. No cookies are used; visitors with Global Privacy Control or Do Not Track enabled aren’t counted.</p>';
    wire();
  }

  function setupCard(){
    return '<div class="a-head"><div><h1>Engagement</h1><p>Visits, attention and conversion across the site, the chat and the Bottleneck Check.</p></div></div>'+
      '<div class="p-empty a-setup"><h2>One step to turn this on</h2>'+
      '<p>Engagement data needs a small database. Connect a free Upstash Redis database to the Vercel project and tracking starts on the next visit. Leads move into it too, which keeps the CRM well inside free limits.</p>'+
      '<ol><li>In Vercel, open the <b>matwil</b> project and go to <b>Storage</b>.</li><li>Choose <b>Create Database</b>, pick <b>Upstash</b> (Serverless Redis), and use the free plan.</li><li>Connect it to the <b>matwil</b> project for all environments.</li><li>Redeploy (Deployments, then Redeploy on the latest), and come back here.</li></ol>'+
      '<p class="a-note">Existing leads are copied over automatically the first time the CRM loads after connecting.</p></div>';
  }

  var pop;
  function closeInfo(){if(pop){pop.remove();pop=null;}[].forEach.call(document.querySelectorAll('.info[aria-expanded="true"]'),function(b){b.setAttribute('aria-expanded','false');});}
  function openInfo(btn){
    var key=btn.getAttribute('data-info'),d=M[key];closeInfo();
    pop=document.createElement('div');pop.className='info-pop';pop.setAttribute('role','dialog');pop.setAttribute('aria-label',d.title);
    pop.innerHTML='<h3>'+esc(d.title)+'</h3><p>'+esc(d.what)+'</p><h4>How it’s calculated</h4><p>'+esc(d.calc)+'</p>'+
      '<h4>Benchmark</h4><p>'+esc(d.bench?benchRange(d)+'. '+d.bench.text:(d.benchNote||'No dependable public benchmark. Compare against your own past periods.'))+'</p>'+
      '<h4>What moves it</h4><p>'+esc(d.tip)+'</p>';
    document.body.appendChild(pop);btn.setAttribute('aria-expanded','true');
    var r=btn.getBoundingClientRect(),w=Math.min(340,innerWidth-24);pop.style.width=w+'px';
    var left=Math.min(Math.max(12,r.left+r.width/2-w/2),innerWidth-w-12),topPos=r.bottom+10;
    if(topPos+pop.offsetHeight>innerHeight-12)topPos=Math.max(12,r.top-pop.offsetHeight-10);
    pop.style.left=left+'px';pop.style.top=topPos+'px';
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.info');
    if(b){e.preventDefault();e.stopPropagation();if(b.getAttribute('aria-expanded')==='true')closeInfo();else openInfo(b);return;}
    if(pop&&!pop.contains(e.target))closeInfo();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&pop){var b=document.querySelector('.info[aria-expanded="true"]');closeInfo();if(b)b.focus();}});
  addEventListener('scroll',function(){if(pop)closeInfo();},{passive:true});

  function wire(){
    [].forEach.call(host.querySelectorAll('[data-days]'),function(b){b.addEventListener('click',function(){var n=Number(b.getAttribute('data-days'));if(n!==state.days){state.days=n;load();}});});
    var ex=host.querySelector('#exclSelf');
    if(ex)ex.addEventListener('change',function(){try{localStorage.setItem('mw-no-track',ex.checked?'1':'0');}catch(e){}
      toast(ex.checked?'This browser won’t be counted':'This browser will be counted');});
  }
  function load(){
    state.loading=true;state.data=null;render();
    api('GET','analytics?days='+state.days).then(function(j){state.data=j;render();})
      .catch(function(e){if(e.message!=='signed out'){host.innerHTML='<div class="p-empty"><h2>Couldn’t load engagement data</h2><p>'+esc(e.message)+'</p></div>';}});
  }
  window.MWAnalyze={mount:function(el,apiFn,toastFn){host=el;api=apiFn;toast=toastFn;load();},refresh:load,close:closeInfo};
})();
