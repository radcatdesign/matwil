/* Matt Wilhelmsen lead CRM by RADCAT
   Pipeline, list, lead detail, notes, follow-ups and reporting on top of /api/leads. */
(function(){
  var app=document.getElementById('app');
  var LOGO='https://www.mattwil.com/wp-content/uploads/logo.svg';
  var SITE=document.body.getAttribute('data-root')||'../';

  if(/github\.io$/.test(location.hostname)){
    app.innerHTML='<div class="p-login"><div class="p-login-card"><img src="'+LOGO+'" alt="Matt Wilhelmsen"><h1>The CRM lives on Vercel</h1><p>Leads are stored on the Vercel deployment, so the portal runs there.</p><a class="btn" href="https://matwil.vercel.app/portal/">Open the CRM</a></div></div>';
    return;
  }

  var STAGES=[{v:'new',label:'New'},{v:'contacted',label:'Contacted'},{v:'discovery',label:'Discovery call'},{v:'proposal',label:'Proposal'},{v:'won',label:'Client'},{v:'lost',label:'Not a fit'}];
  var STAGE_NAME={};STAGES.forEach(function(s){STAGE_NAME[s.v]=s.label;});
  var SOURCES={conversation:'Conversation','bottleneck-check':'Bottleneck check',guide:'Guide download',contact:'Contact form',booking:'Booking request',manual:'Added by hand'};
  var PAINS={decisions:'In every decision',alignment:'Team isn’t aligned',growth:'Growth is breaking things',unpredictable:'Unpredictable results',leaders:'Leaders aren’t leading yet',stretched:'Stretched too thin',other:'Something else'};

  var state={pass:null,mode:'leads',leads:[],view:'pipeline',q:'',stage:'all',source:'all',due:false,sort:{key:'createdAt',dir:-1},openId:null,loading:false};

  /* ---------- helpers */
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function load(k){try{return localStorage.getItem(k)||sessionStorage.getItem(k);}catch(e){return null;}}
  function store(k,v,remember){try{(remember?localStorage:sessionStorage).setItem(k,v);}catch(e){}}
  function forget(k){try{localStorage.removeItem(k);sessionStorage.removeItem(k);}catch(e){}}
  function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function addDays(n){var d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function fmtDate(iso){if(!iso)return '';var d=new Date(iso.length===10?iso+'T12:00:00':iso);return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:d.getFullYear()!==new Date().getFullYear()?'numeric':undefined});}
  function fmtTime(iso){var d=new Date(iso);return d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+', '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});}
  function ago(iso){var s=(Date.now()-new Date(iso))/1000;if(s<3600)return Math.max(1,Math.round(s/60))+'m ago';if(s<86400)return Math.round(s/3600)+'h ago';var d=Math.round(s/86400);return d<45?d+'d ago':fmtDate(iso);}
  function money(n){n=Number(n)||0;return n?'$'+n.toLocaleString(undefined,{maximumFractionDigits:0}):'';}
  function open(l){return l.stage!=='won'&&l.stage!=='lost';}
  function isDue(l){return open(l)&&l.followUp&&l.followUp<=today();}
  function dueLabel(l){if(!l.followUp||!open(l))return '';var t=today();if(l.followUp<t){var days=Math.round((new Date(t)-new Date(l.followUp))/864e5);return 'Overdue '+days+'d';}if(l.followUp===t)return 'Follow up today';return 'Follow up '+fmtDate(l.followUp);}
  function excerpt(t){t=(t||'').trim();return t.length>90?t.slice(0,88).replace(/\s+\S*$/,'')+'…':t;}
  function painOf(l){var d=(l.pain&&l.pain.detail)||l.message;return (l.pain&&(l.pain.label||PAINS[l.pain.category]))||(l.interest?'Interested in '+l.interest.toLowerCase():'')||(d?'“'+excerpt(d)+'”':'')||(l.guide?'Downloaded a guide':'')||'Hasn’t shared details yet';}
  function initials(n){return (n||'?').split(/\s+/).map(function(w){return w[0];}).slice(0,2).join('').toUpperCase();}
  function byId(id){for(var i=0;i<state.leads.length;i++)if(state.leads[i].id===id)return state.leads[i];return null;}

  var toastEl,toastT;
  function toast(msg){if(!toastEl){toastEl=document.createElement('div');toastEl.className='toast';toastEl.setAttribute('role','status');document.body.appendChild(toastEl);}
    toastEl.textContent=msg;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('on');},2600);}

  function api(method,path,body){
    return fetch('/api/'+path,{method:method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+state.pass},body:body?JSON.stringify(body):undefined})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(j){
        if(r.status===401){signOut('Your session ended. Sign in again.');throw new Error('signed out');}
        if(!r.ok)throw new Error(j.error||'Something went wrong.');return j;});});
  }

  /* ---------- sign in */
  function renderLogin(msg){
    app.innerHTML='<div class="p-login"><form class="p-login-card" novalidate><img src="'+LOGO+'" alt="Matt Wilhelmsen"><h1>Leads</h1><p>Sign in to see who’s reached out and where every conversation stands.</p>'+
      '<div class="field"><label for="pass">Passcode</label><input id="pass" type="password" autocomplete="current-password" required></div>'+
      '<label class="p-check"><input type="checkbox" id="remember" checked> Keep me signed in on this device</label>'+
      '<button class="btn" type="submit">Sign in</button><p class="p-err" '+(msg?'':'hidden')+'>'+esc(msg||'')+'</p></form></div>';
    var f=app.querySelector('form'),inp=f.querySelector('#pass');inp.focus();
    f.addEventListener('submit',function(e){
      e.preventDefault();var p=inp.value.trim();if(!p)return;
      var btn=f.querySelector('.btn');btn.disabled=true;btn.textContent='Checking…';
      fetch('/api/auth',{method:'POST',headers:{Authorization:'Bearer '+p}}).then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
        .then(function(res){
          if(!res.ok){var er=f.querySelector('.p-err');er.textContent=res.j.error||'That passcode didn’t work.';er.hidden=false;btn.disabled=false;btn.textContent='Sign in';inp.select();return;}
          state.pass=p;store('mw-crm',p,f.querySelector('#remember').checked);boot();
        }).catch(function(){var er=f.querySelector('.p-err');er.textContent='Couldn’t reach the server. Check your connection.';er.hidden=false;btn.disabled=false;btn.textContent='Sign in';});
    });
  }
  function signOut(msg){forget('mw-crm');state.pass=null;state.leads=[];closeDrawer(true);renderLogin(msg);}

  /* ---------- app shell */
  function renderShell(){
    app.innerHTML=
      '<header class="p-top"><div class="p-wrap">'+
        '<a class="p-brand" href="'+SITE+'"><img src="'+LOGO+'" alt="Matt Wilhelmsen"><span>CRM</span></a>'+
        '<div class="seg-tabs p-mode" role="group" aria-label="Mode"><button type="button" data-mode="leads">Leads</button><button type="button" data-mode="analyze">Analyze</button></div>'+
        '<label class="p-search"><span class="sr">Search leads</span><input id="q" type="search" placeholder="Search names, companies, notes" autocomplete="off"><kbd>/</kbd></label>'+
        '<button class="p-icon" id="refresh" type="button" aria-label="Refresh"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
        '<button class="p-menu-btn" id="signout" type="button">Sign out</button>'+
      '</div></header>'+
      '<main class="p-wrap">'+
        '<div id="leadsMode">'+
        '<div class="p-head"><div><h1 id="greet">Your pipeline</h1><p id="sub"></p></div>'+
          '<div class="ctas"><button class="btn" id="addLead" type="button">Add a lead</button><button class="btn btn-line" id="export" type="button">Export CSV</button></div></div>'+
        '<section class="tiles" id="tiles" aria-label="Pipeline at a glance"></section>'+
        '<section class="insights" id="insights" aria-label="Patterns"></section>'+
        '<div class="toolbar"><div class="seg-tabs" role="group" aria-label="View"><button type="button" data-view="pipeline">Pipeline</button><button type="button" data-view="list">List</button></div>'+
          '<div class="filters" id="stageFilters" role="group" aria-label="Filter by stage"></div>'+
          '<select class="p-select" id="sourceFilter" aria-label="Filter by source"><option value="all">All sources</option></select>'+
          '<span class="spacer"></span><span class="p-count" id="count"></span></div>'+
        '<section id="view" aria-label="Leads"></section>'+
        '</div>'+
        '<div id="analyzeMode" class="analyze" hidden></div>'+
      '</main>'+
      '<div class="drawer-veil" id="veil"></div><aside class="drawer" id="drawer" aria-label="Lead details" aria-hidden="true"></aside>';
    Object.keys(SOURCES).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=SOURCES[k];app.querySelector('#sourceFilter').appendChild(o);});
    var q=app.querySelector('#q');
    q.addEventListener('input',function(){state.q=q.value.trim().toLowerCase();renderView();});
    app.querySelector('#sourceFilter').addEventListener('change',function(e){state.source=e.target.value;renderView();});
    [].forEach.call(app.querySelectorAll('[data-view]'),function(b){b.addEventListener('click',function(){state.view=b.getAttribute('data-view');store('mw-crm-view',state.view,true);renderView();});});
    app.querySelector('#refresh').addEventListener('click',function(){if(state.mode==='analyze'&&window.MWAnalyze)window.MWAnalyze.refresh();else refresh(true);});
    [].forEach.call(app.querySelectorAll('[data-mode]'),function(b){b.addEventListener('click',function(){setMode(b.getAttribute('data-mode'));});});
    app.querySelector('#signout').addEventListener('click',function(){signOut();});
    app.querySelector('#addLead').addEventListener('click',openAdd);
    app.querySelector('#export').addEventListener('click',exportCsv);
    app.querySelector('#veil').addEventListener('click',function(){closeDrawer();});
    document.addEventListener('keydown',function(e){
      var typing=/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'');
      if(e.key==='/'&&!typing&&state.mode!=='analyze'){e.preventDefault();q.focus();}
      if(e.key==='Escape'&&state.openId&&!document.querySelector('dialog[open]'))closeDrawer();
    });
  }

  /* ---------- Leads / Analyze */
  var analyzeMounted=false;
  function setMode(m){
    state.mode=m==='analyze'?'analyze':'leads';store('mw-crm-mode',state.mode,true);
    var a=state.mode==='analyze';
    app.querySelector('#leadsMode').hidden=a;app.querySelector('#analyzeMode').hidden=!a;
    app.querySelector('.p-search').classList.toggle('off',a);
    [].forEach.call(app.querySelectorAll('[data-mode]'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-mode')===state.mode));});
    document.title=(a?'Analyze':'Leads')+' | Matt Wilhelmsen';
    if(a){closeDrawer(true);if(!window.MWAnalyze){app.querySelector('#analyzeMode').innerHTML='<div class="p-empty"><h2>Analyze didn’t load</h2><p>Refresh the page to try again.</p></div>';return;}
      if(!analyzeMounted){analyzeMounted=true;window.MWAnalyze.mount(app.querySelector('#analyzeMode'),api,toast);}}
    else if(window.MWAnalyze)window.MWAnalyze.close();
  }

  /* ---------- data */
  function refresh(manual){
    var btn=app.querySelector('#refresh');if(btn)btn.classList.add('spin');
    var before={};state.leads.forEach(function(l){before[l.id]=1;});
    state.lastRefresh=Date.now();
    return api('GET','leads'+(state.version&&!manual?'?since='+encodeURIComponent(state.version):'')).then(function(j){
      if(j.unchanged){state.version=j.version;if(manual)toast('Up to date');return;}
      state.version=j.version||null;
      var fresh=(j.leads||[]).filter(function(l){return !before[l.id];});
      var hadAny=Object.keys(before).length>0;
      state.leads=j.leads||[];renderAll();
      if(hadAny&&fresh.length)toast(fresh.length===1?'New lead from '+(fresh[0].name||fresh[0].email):fresh.length+' new leads');
      else if(manual)toast('Up to date');
    }).catch(function(e){if(e.message!=='signed out')toast(e.message);})
      .finally(function(){if(btn)btn.classList.remove('spin');});
  }
  // our own edit moves the version forward: adopt it only if nothing else changed in between, otherwise reload on the next check
  function keepVersion(j){state.version=j&&j.prev&&j.prev===state.version?j.version:null;}
  function patch(id,body,msg){
    return api('PATCH','leads?id='+encodeURIComponent(id),body).then(function(j){
      var i=state.leads.findIndex(function(l){return l.id===id;});if(i>-1)state.leads[i]=j.lead;keepVersion(j);
      renderAll(true);if(msg)toast(msg);return j.lead;
    }).catch(function(e){if(e.message!=='signed out'){toast(e.message);refresh();}});
  }

  function filtered(){
    return state.leads.filter(function(l){
      if(state.stage!=='all'&&l.stage!==state.stage)return false;
      if(state.source!=='all'&&l.source!==state.source)return false;
      if(state.due&&!isDue(l))return false;
      if(state.q){
        var hay=[l.name,l.email,l.company,l.role,l.phone,painOf(l),l.pain&&l.pain.detail,l.message,(l.tags||[]).join(' '),(l.notes||[]).map(function(n){return n.text;}).join(' ')].join(' ').toLowerCase();
        if(hay.indexOf(state.q)<0)return false;
      }
      return true;
    });
  }

  /* ---------- render */
  function renderAll(keepDrawer){renderHead();renderTiles();renderInsights();renderView();if(state.openId&&keepDrawer)renderDrawer();}
  function renderHead(){
    var h=new Date().getHours();var g=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
    app.querySelector('#greet').textContent=g+', Matt';
    var unread=state.leads.filter(function(l){return !l.lastViewedAt&&l.source!=='manual';}).length;
    var due=state.leads.filter(isDue).length;
    var parts=[];
    if(unread)parts.push(unread+(unread===1?' new lead to read':' new leads to read'));
    if(due)parts.push(due+(due===1?' follow-up due':' follow-ups due'));
    app.querySelector('#sub').textContent=parts.length?parts.join(' and ')+'.':'You’re all caught up.';
  }
  function renderTiles(){
    var L=state.leads,week=Date.now()-7*864e5,yr=new Date().getFullYear();
    var nw=L.filter(function(l){return new Date(l.createdAt)>week;}).length;
    var op=L.filter(open),opv=op.reduce(function(t,l){return t+(Number(l.value)||0);},0);
    var due=L.filter(isDue).length;
    var won=L.filter(function(l){return l.stage==='won'&&new Date(l.closedAt||l.updatedAt).getFullYear()===yr;});
    var wonv=won.reduce(function(t,l){return t+(Number(l.value)||0);},0);
    var closedW=L.filter(function(l){return l.stage==='won';}).length,closedL=L.filter(function(l){return l.stage==='lost';}).length;
    var rate=closedW+closedL?Math.round(closedW/(closedW+closedL)*100)+'%':'None yet';
    app.querySelector('#tiles').innerHTML=
      '<div class="tile"><span class="tile-label">New this week</span><span class="tile-num">'+nw+'</span><span class="tile-sub">'+L.length+' leads all time</span></div>'+
      '<div class="tile"><span class="tile-label">Open pipeline</span><span class="tile-num">'+op.length+'</span><span class="tile-sub">'+(opv?money(opv)+' estimated':'Add values to see dollars')+'</span></div>'+
      '<button type="button" class="tile'+(due?' alert':'')+'" id="dueTile" aria-pressed="'+state.due+'"><span class="tile-label">Follow-ups due</span><span class="tile-num">'+due+'</span><span class="tile-sub">'+(state.due?'Showing only these':'Tap to focus on them')+'</span></button>'+
      '<div class="tile"><span class="tile-label">Clients this year</span><span class="tile-num">'+won.length+'</span><span class="tile-sub">'+(wonv?money(wonv)+' won':'Mark leads as Client when they sign')+'</span></div>'+
      '<div class="tile"><span class="tile-label">Close rate</span><span class="tile-num">'+(closedW+closedL?rate:'0')+'</span><span class="tile-sub">'+(closedW+closedL?closedW+' of '+(closedW+closedL)+' decided':'No decided leads yet')+'</span></div>';
    app.querySelector('#dueTile').addEventListener('click',function(){state.due=!state.due;renderTiles();renderView();});
  }
  function barlist(rows){
    if(!rows.length)return '<p class="empty-note">Nothing yet. This fills in as leads arrive.</p>';
    var max=Math.max.apply(null,rows.map(function(r){return r[1];}));
    return '<ul class="barlist">'+rows.map(function(r){
      return '<li tabindex="0" data-tip="'+esc(r[0]+': '+r[1]+(r[1]===1?' lead':' leads'))+'"><span class="bl-name">'+esc(r[0])+'</span><span class="bl-track"><span class="bl-bar" style="width:'+(r[1]/max*100)+'%"></span></span><span class="bl-val">'+r[1]+'</span></li>';
    }).join('')+'</ul>';
  }
  function renderInsights(){
    var pains={},srcs={};
    state.leads.forEach(function(l){
      var p=l.pain&&(PAINS[l.pain.category]||l.pain.label);if(p)pains[p]=(pains[p]||0)+1;
      var s=SOURCES[l.source]||l.source;srcs[s]=(srcs[s]||0)+1;
    });
    var sortE=function(o){return Object.keys(o).map(function(k){return [k,o[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,6);};
    // last 8 weeks, Monday starts
    var weeks=[],now=new Date();var monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-((now.getDay()+6)%7));
    for(var w=7;w>=0;w--){var start=new Date(monday);start.setDate(start.getDate()-7*w);var end=new Date(start);end.setDate(end.getDate()+7);
      var c=state.leads.filter(function(l){var d=new Date(l.createdAt);return d>=start&&d<end;}).length;weeks.push({start:start,c:c});}
    var wmax=Math.max(1,Math.max.apply(null,weeks.map(function(x){return x.c;})));
    var wk=weeks.map(function(x,k){var lab=x.start.toLocaleDateString(undefined,{month:'short',day:'numeric'});
      return '<div class="wk'+(x.c?'':' zero')+'" tabindex="0" data-tip="'+esc('Week of '+lab+': '+x.c+(x.c===1?' lead':' leads'))+'"><b style="height:'+Math.max(2,x.c/wmax*92)+'px"></b><span>'+(k===7?'This wk':esc(lab))+'</span></div>';}).join('');
    app.querySelector('#insights').innerHTML=
      '<div class="panel"><h2>What’s weighing on them</h2>'+barlist(sortE(pains))+'</div>'+
      '<div class="panel"><h2>Where leads come from</h2>'+barlist(sortE(srcs))+'</div>'+
      '<div class="panel"><h2>New leads, last 8 weeks</h2><div class="weeks">'+wk+'</div></div>';
  }
  var tipEl;
  document.addEventListener('mouseover',function(e){var t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t);});
  document.addEventListener('focusin',function(e){var t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t);});
  document.addEventListener('mouseout',function(e){if(e.target.closest&&e.target.closest('[data-tip]'))hideTip();});
  document.addEventListener('focusout',hideTip);
  function showTip(t){if(!tipEl){tipEl=document.createElement('div');tipEl.className='p-tip';tipEl.setAttribute('role','tooltip');document.body.appendChild(tipEl);}
    var r=t.getBoundingClientRect();tipEl.textContent=t.getAttribute('data-tip');tipEl.style.left=(r.left+r.width/2)+'px';tipEl.style.top=r.top+'px';tipEl.hidden=false;}
  function hideTip(){if(tipEl)tipEl.hidden=true;}

  function renderFilters(){
    var counts={all:state.leads.length};STAGES.forEach(function(s){counts[s.v]=0;});state.leads.forEach(function(l){counts[l.stage]=(counts[l.stage]||0)+1;});
    var opts=[{v:'all',label:'All'}].concat(STAGES);
    app.querySelector('#stageFilters').innerHTML=opts.map(function(o){return '<button type="button" class="fchip" data-stage="'+o.v+'" aria-pressed="'+(state.stage===o.v)+'">'+esc(o.label)+'<span class="n">'+(counts[o.v]||0)+'</span></button>';}).join('');
    [].forEach.call(app.querySelectorAll('[data-stage]'),function(b){b.addEventListener('click',function(){state.stage=b.getAttribute('data-stage');renderView();});});
    [].forEach.call(app.querySelectorAll('[data-view]'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-view')===state.view));});
  }
  function cardHtml(l){
    var due=dueLabel(l);
    return '<button type="button" class="lcard" draggable="true" data-id="'+l.id+'"'+(state.openId===l.id?' aria-current="true"':'')+'>'+
      (!l.lastViewedAt&&l.source!=='manual'?'<span class="unread" title="Not opened yet"></span>':'')+
      '<span class="lcard-name">'+esc(l.name||l.email||'Unnamed lead')+'</span>'+
      (l.company||l.role?'<span class="lcard-co">'+esc([l.role,l.company].filter(Boolean).join(', '))+'</span>':'')+
      '<span class="lcard-pain">'+esc(painOf(l))+'</span>'+
      '<span class="lcard-meta"><span>'+esc(SOURCES[l.source]||l.source)+'</span><span>'+ago(l.createdAt)+'</span>'+(l.value?'<span>'+money(l.value)+'</span>':'')+(due?'<span class="badge'+(isDue(l)?' due':'')+'">'+esc(due)+'</span>':'')+'</span>'+
      '</button>';
  }
  function renderView(){
    renderFilters();
    var list=filtered(),host=app.querySelector('#view');
    app.querySelector('#count').textContent=list.length+(list.length===1?' lead':' leads')+(list.length!==state.leads.length?' shown':'');
    if(!state.leads.length){
      host.innerHTML='<div class="p-empty"><h2>No leads yet</h2><p>When someone talks it through with you, takes the bottleneck check, downloads a guide or sends a message, they’ll show up here with everything they shared. You can also add a lead by hand.</p></div>';return;
    }
    if(state.view==='list')renderList(host,list);else renderBoard(host,list);
  }
  function renderBoard(host,list){
    host.innerHTML='<div class="board">'+STAGES.map(function(s){
      var items=list.filter(function(l){return l.stage===s.v;});
      var val=items.reduce(function(t,l){return t+(Number(l.value)||0);},0);
      return '<div class="col" data-col="'+s.v+'"><div class="col-head"><h3>'+s.label+'</h3><span class="n">'+items.length+'</span><span class="v">'+money(val)+'</span></div>'+
        '<div class="col-body">'+(items.length?items.map(cardHtml).join(''):'<p class="col-empty">Drag a lead here</p>')+'</div></div>';
    }).join('')+'</div>';
    wireCards(host);
    var dragId=null;
    [].forEach.call(host.querySelectorAll('.lcard'),function(c){
      c.addEventListener('dragstart',function(e){dragId=c.getAttribute('data-id');c.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);});
      c.addEventListener('dragend',function(){c.classList.remove('dragging');});
    });
    [].forEach.call(host.querySelectorAll('.col'),function(col){
      col.addEventListener('dragover',function(e){e.preventDefault();col.classList.add('drop');});
      col.addEventListener('dragleave',function(e){if(!col.contains(e.relatedTarget))col.classList.remove('drop');});
      col.addEventListener('drop',function(e){
        e.preventDefault();col.classList.remove('drop');
        var id=e.dataTransfer.getData('text/plain')||dragId,stage=col.getAttribute('data-col'),l=byId(id);
        if(!l||l.stage===stage)return;
        l.stage=stage;renderView();
        patch(id,{stage:stage},'Moved to '+STAGE_NAME[stage]);
      });
    });
  }
  function renderList(host,list){
    var k=state.sort.key,d=state.sort.dir;
    list=list.slice().sort(function(a,b){
      var av=k==='name'?(a.name||'').toLowerCase():k==='value'?Number(a.value)||0:k==='followUp'?(a.followUp||'9999'):k==='stage'?STAGES.findIndex(function(s){return s.v===a.stage;}):a[k]||'';
      var bv=k==='name'?(b.name||'').toLowerCase():k==='value'?Number(b.value)||0:k==='followUp'?(b.followUp||'9999'):k==='stage'?STAGES.findIndex(function(s){return s.v===b.stage;}):b[k]||'';
      return av<bv?-d:av>bv?d:0;
    });
    var th=function(key,label,cls){return '<th'+(cls?' class="'+cls+'"':'')+' aria-sort="'+(k===key?(d>0?'ascending':'descending'):'none')+'"><button type="button" data-sort="'+key+'">'+label+(k===key?(d>0?' ↑':' ↓'):'')+'</button></th>';};
    host.innerHTML='<div class="tablewrap"><table class="leads"><thead><tr>'+th('name','Name')+'<th>What’s going on</th>'+th('stage','Stage')+'<th>Source</th>'+th('createdAt','Came in')+th('followUp','Follow-up')+th('value','Value','num')+'</tr></thead><tbody>'+
      list.map(function(l){return '<tr data-id="'+l.id+'" tabindex="0"'+(state.openId===l.id?' aria-current="true"':'')+'><td><div class="nm">'+esc(l.name||l.email||'Unnamed lead')+'</div><div class="co">'+esc([l.role,l.company].filter(Boolean).join(', ')||l.email)+'</div></td>'+
        '<td>'+esc(painOf(l))+'</td><td><span class="stage-pill '+l.stage+'">'+esc(STAGE_NAME[l.stage])+'</span></td><td>'+esc(SOURCES[l.source]||l.source)+'</td><td>'+esc(fmtDate(l.createdAt))+'</td>'+
        '<td>'+(dueLabel(l)?'<span class="badge'+(isDue(l)?' due':'')+'">'+esc(dueLabel(l))+'</span>':'')+'</td><td class="num">'+esc(money(l.value))+'</td></tr>';}).join('')+
      '</tbody></table></div>';
    [].forEach.call(host.querySelectorAll('[data-sort]'),function(b){b.addEventListener('click',function(){var key=b.getAttribute('data-sort');state.sort=state.sort.key===key?{key:key,dir:-state.sort.dir}:{key:key,dir:key==='name'||key==='followUp'?1:-1};renderView();});});
    [].forEach.call(host.querySelectorAll('tr[data-id]'),function(r){
      r.addEventListener('click',function(){openDrawer(r.getAttribute('data-id'));});
      r.addEventListener('keydown',function(e){if(e.key==='Enter')openDrawer(r.getAttribute('data-id'));});
    });
  }
  function wireCards(host){[].forEach.call(host.querySelectorAll('.lcard'),function(c){c.addEventListener('click',function(){openDrawer(c.getAttribute('data-id'));});});}

  /* ---------- lead detail */
  var drawer,lastFocus;
  function openDrawer(id){
    lastFocus=document.activeElement;state.openId=id;drawer=app.querySelector('#drawer');
    renderDrawer();drawer.classList.add('on');drawer.setAttribute('aria-hidden','false');app.querySelector('#veil').classList.add('on');
    var c=drawer.querySelector('.p-icon');if(c)c.focus();
    var l=byId(id);if(l&&!l.lastViewedAt)patch(id,{lastViewedAt:true});
    renderView();
  }
  function closeDrawer(silent){
    if(!drawer)return;state.openId=null;drawer.classList.remove('on');drawer.setAttribute('aria-hidden','true');
    var v=app.querySelector('#veil');if(v)v.classList.remove('on');
    if(!silent){renderView();if(lastFocus&&lastFocus.focus)try{lastFocus.focus();}catch(e){}}
  }
  function kv(rows){rows=rows.filter(function(r){return r[1];});return rows.length?'<dl class="kv">'+rows.map(function(r){return '<dt>'+esc(r[0])+'</dt><dd>'+r[1]+'</dd>';}).join('')+'</dl>':'';}
  function renderDrawer(){
    var l=byId(state.openId);if(!l){closeDrawer();return;}
    var first=(l.name||'').split(/\s+/)[0];
    var subj=encodeURIComponent('Following up'+(l.company?' about '+l.company:''));
    var bodyTxt=encodeURIComponent('Hi '+(first||'there')+',\n\nThanks for reaching out. ');
    var pain=l.pain||{};
    var scores=l.scores?Object.keys(l.scores).map(function(k){return [k.charAt(0).toUpperCase()+k.slice(1),l.scores[k]];}):[];
    var utm=l.utm?Object.keys(l.utm).map(function(k){return k+': '+l.utm[k];}).join(', '):'';
    drawer.innerHTML=
      '<div class="d-head"><div><h2>'+esc(l.name||l.email||'Unnamed lead')+'</h2><p>'+esc([l.role,l.company,l.companySize?l.companySize+' people':''].filter(Boolean).join(', ')||'No company details yet')+'</p></div>'+
        '<button class="p-icon" type="button" aria-label="Close lead details"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button></div>'+
      '<div class="d-body">'+
        '<div class="d-actions">'+(l.email?'<a class="btn" href="mailto:'+esc(l.email)+'?subject='+subj+'&body='+bodyTxt+'">Email '+esc(first||'them')+'</a>':'')+
          (l.phone?'<a class="btn btn-line" href="tel:'+esc(l.phone.replace(/[^\d+]/g,''))+'">Call</a>':'')+
          (l.email?'<button class="btn btn-line" type="button" id="copyEmail">Copy email</button>':'')+'</div>'+
        '<div class="d-sec"><h3>Stage</h3><div class="stage-row" role="group" aria-label="Stage">'+STAGES.map(function(s){return '<button type="button" data-set-stage="'+s.v+'" aria-pressed="'+(l.stage===s.v)+'">'+s.label+'</button>';}).join('')+'</div></div>'+
        '<div class="d-sec"><h3>Next step</h3><div class="d-grid">'+
          '<div class="field"><label for="fu">Follow up on</label><input id="fu" type="date" value="'+esc(l.followUp||'')+'"><div class="d-quick"><button type="button" data-fu="1">Tomorrow</button><button type="button" data-fu="3">In 3 days</button><button type="button" data-fu="7">Next week</button><button type="button" data-fu="">Clear</button></div></div>'+
          '<div class="field"><label for="val">Estimated value ($)</label><input id="val" type="number" min="0" step="100" inputmode="numeric" value="'+(l.value||'')+'" placeholder="0"></div>'+
          '<div class="field" style="grid-column:1/-1"><label for="tags">Tags</label><input id="tags" value="'+esc((l.tags||[]).join(', '))+'" placeholder="referral, manufacturing, hot"></div>'+
        '</div><div class="d-quick" style="margin-top:.9rem"><span style="font-size:.75rem;color:var(--muted);align-self:center;margin-right:.2rem">Log a touch:</span><button type="button" data-log="Sent an email">Emailed</button><button type="button" data-log="Called">Called</button><button type="button" data-log="Left a voicemail">Left voicemail</button><button type="button" data-log="Had a meeting">Met</button></div></div>'+
        '<div class="d-sec"><h3>What they shared</h3><div class="shared">'+
          '<div class="pain">'+esc(painOf(l))+'</div>'+
          (pain.detail||l.message?'<blockquote>'+esc(pain.detail||l.message)+'</blockquote>':'')+
          kv([['How long',esc(l.duration)],['Team size',esc(l.companySize)],['Wants',esc(l.nextStep)],['Prefers',esc(l.preferredContact)],['Availability',esc(l.availability)],['Interested in',esc(l.interest)],['Guide',esc(l.guide)],['Email',l.email?'<a class="inline-link" href="mailto:'+esc(l.email)+'">'+esc(l.email)+'</a>':''],['Phone',esc(l.phone)]])+
        '</div></div>'+
        (scores.length?'<div class="d-sec scores"><h3>Bottleneck check'+(l.score?', scored '+l.score+' of 32':'')+'</h3>'+barlistScores(scores)+(l.answers&&l.answers.length?'<ul class="answers">'+l.answers.map(function(a){return '<li><span>'+esc(a.q)+'</span><b>'+esc(a.a)+'</b></li>';}).join('')+'</ul>':'')+'</div>':'')+
        (l.transcript&&l.transcript.length?'<div class="d-sec"><h3>The conversation</h3><div class="transcript">'+l.transcript.map(function(m){return '<div class="b '+(m.from==='matt'?'m':'t')+'">'+esc(m.text)+'</div>';}).join('')+'</div></div>':'')+
        '<div class="d-sec"><h3>Notes</h3><form class="note-form" id="noteForm"><label class="sr" for="note">Add a note</label><textarea id="note" placeholder="What did you learn? What’s the next move?"></textarea><div class="row"><button class="btn" type="submit">Add note</button></div></form>'+
          '<ul class="notes">'+(l.notes||[]).slice().reverse().map(function(n){return '<li><p>'+esc(n.text)+'</p><div class="meta"><time>'+esc(fmtTime(n.at))+'</time><button type="button" data-del-note="'+esc(n.at)+'">Delete</button></div></li>';}).join('')+'</ul></div>'+
        '<div class="d-sec"><h3>Activity</h3><ul class="timeline">'+(l.activity||[]).slice().reverse().map(function(a){return '<li>'+esc(a.text)+'<time>'+esc(fmtTime(a.at))+'</time></li>';}).join('')+'</ul></div>'+
        '<div class="d-sec"><h3>Details</h3>'+kv([['Source',esc(SOURCES[l.source]||l.source)],['Came in',esc(fmtTime(l.createdAt))],['From page',esc(l.page)],['First landed on',esc(l.landing)],['Referred by',esc(l.referrer)],['Campaign',esc(utm)],['Location',esc([l.city,l.region,l.country].filter(Boolean).join(', '))]])+'</div>'+
        '<div class="d-danger"><button type="button" id="delLead">Delete this lead</button></div>'+
      '</div>';
    drawer.querySelector('.p-icon').addEventListener('click',function(){closeDrawer();});
    var ce=drawer.querySelector('#copyEmail');if(ce)ce.addEventListener('click',function(){navigator.clipboard&&navigator.clipboard.writeText(l.email).then(function(){toast('Email copied');});});
    [].forEach.call(drawer.querySelectorAll('[data-set-stage]'),function(b){b.addEventListener('click',function(){var s=b.getAttribute('data-set-stage');if(s!==l.stage)patch(l.id,{stage:s},'Moved to '+STAGE_NAME[s]);});});
    var fu=drawer.querySelector('#fu');fu.addEventListener('change',function(){patch(l.id,{followUp:fu.value},fu.value?'Follow-up set':'Follow-up cleared');});
    [].forEach.call(drawer.querySelectorAll('[data-fu]'),function(b){b.addEventListener('click',function(){var n=b.getAttribute('data-fu');patch(l.id,{followUp:n===''?'':addDays(Number(n))},n===''?'Follow-up cleared':'Follow-up set');});});
    var val=drawer.querySelector('#val');val.addEventListener('change',function(){patch(l.id,{value:val.value},'Value saved');});
    var tags=drawer.querySelector('#tags');tags.addEventListener('change',function(){patch(l.id,{tags:tags.value.split(',').map(function(t){return t.trim();}).filter(Boolean)},'Tags saved');});
    [].forEach.call(drawer.querySelectorAll('[data-log]'),function(b){b.addEventListener('click',function(){patch(l.id,{logContact:b.getAttribute('data-log'),stage:l.stage==='new'?'contacted':undefined},'Logged');});});
    drawer.querySelector('#noteForm').addEventListener('submit',function(e){e.preventDefault();var t=drawer.querySelector('#note').value.trim();if(!t)return;patch(l.id,{note:t},'Note added');});
    [].forEach.call(drawer.querySelectorAll('[data-del-note]'),function(b){b.addEventListener('click',function(){if(confirm('Delete this note?'))patch(l.id,{deleteNote:b.getAttribute('data-del-note')},'Note deleted');});});
    drawer.querySelector('#delLead').addEventListener('click',function(){
      if(!confirm('Delete '+(l.name||'this lead')+' for good? This can’t be undone.'))return;
      api('DELETE','leads?id='+encodeURIComponent(l.id)).then(function(j){keepVersion(j);state.leads=state.leads.filter(function(x){return x.id!==l.id;});closeDrawer();renderAll();toast('Lead deleted');}).catch(function(e){if(e.message!=='signed out')toast(e.message);});
    });
  }
  function barlistScores(rows){
    return '<ul class="barlist">'+rows.map(function(r){return '<li tabindex="0" data-tip="'+esc(r[0]+': '+r[1]+' of 8')+'"><span class="bl-name">'+esc(r[0])+'</span><span class="bl-track"><span class="bl-bar" style="width:'+Math.max(4,(r[1]-2)/6*100)+'%"></span></span><span class="bl-val">'+r[1]+'/8</span></li>';}).join('')+'</ul>';
  }

  /* ---------- add a lead by hand */
  function openAdd(){
    var d=document.createElement('dialog');d.className='p-dialog';d.setAttribute('aria-labelledby','addTitle');
    d.innerHTML='<h2 id="addTitle">Add a lead</h2><form class="form" novalidate>'+
      '<div class="field"><label for="a-name">Name</label><input id="a-name" name="name" required></div>'+
      '<div class="field"><label for="a-email">Email <span class="opt">(optional)</span></label><input id="a-email" name="email" type="email"></div>'+
      '<div class="field"><label for="a-phone">Phone <span class="opt">(optional)</span></label><input id="a-phone" name="phone" type="tel"></div>'+
      '<div class="field"><label for="a-co">Company <span class="opt">(optional)</span></label><input id="a-co" name="company"></div>'+
      '<div class="field"><label for="a-role">Role <span class="opt">(optional)</span></label><input id="a-role" name="role"></div>'+
      '<div class="field"><label for="a-ref">Referred by <span class="opt">(optional)</span></label><input id="a-ref" name="referredBy"></div>'+
      '<div class="field full"><label for="a-pain">What’s going on <span class="opt">(optional)</span></label><select id="a-pain" name="painCategory"><option value="">Not sure yet</option>'+Object.keys(PAINS).map(function(k){return '<option value="'+k+'">'+esc(PAINS[k])+'</option>';}).join('')+'</select></div>'+
      '<div class="field full"><label for="a-note">Note <span class="opt">(optional)</span></label><textarea id="a-note" name="note" rows="3"></textarea></div>'+
      '<div class="actions"><button class="btn" type="submit">Add lead</button><button class="btn btn-line" type="button" data-cancel>Cancel</button></div><p class="form-err" hidden></p></form>';
    document.body.appendChild(d);d.showModal();d.querySelector('#a-name').focus();
    d.addEventListener('close',function(){d.remove();});
    d.querySelector('[data-cancel]').addEventListener('click',function(){d.close();});
    d.querySelector('form').addEventListener('submit',function(e){
      e.preventDefault();var f=e.target,err=f.querySelector('.form-err');if(!f.reportValidity())return;
      var b={name:f.name.value,email:f.email.value,phone:f.phone.value,company:f.company.value,role:f.role.value,referredBy:f.referredBy.value,painCategory:f.painCategory.value,painLabel:PAINS[f.painCategory.value]||'',note:f.note.value};
      api('POST','leads',b).then(function(j){keepVersion(j);state.leads.unshift(j.lead);d.close();renderAll();openDrawer(j.lead.id);toast('Lead added');})
        .catch(function(x){if(x.message!=='signed out'){err.textContent=x.message;err.hidden=false;}});
    });
  }

  /* ---------- export */
  function exportCsv(){
    var cols=['Name','Email','Phone','Company','Role','Team size','Stage','Value','Follow-up','Source','What’s going on','In their words','Came in','Tags','Notes'];
    var rows=filtered().map(function(l){return [l.name,l.email,l.phone,l.company,l.role,l.companySize,STAGE_NAME[l.stage],l.value||'',l.followUp,SOURCES[l.source]||l.source,painOf(l),(l.pain&&l.pain.detail)||l.message||'',l.createdAt,(l.tags||[]).join('; '),(l.notes||[]).map(function(n){return n.text;}).join(' | ')];});
    var csv=[cols].concat(rows).map(function(r){return r.map(function(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',');}).join('\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv'}));a.download='leads-'+today()+'.csv';document.body.appendChild(a);a.click();a.remove();
    toast('Exported '+rows.length+(rows.length===1?' lead':' leads'));
  }

  /* ---------- start */
  function boot(){
    state.view=load('mw-crm-view')||'pipeline';
    // the person running the CRM shouldn't show up in the site's engagement numbers (they can switch this in Analyze)
    try{if(localStorage.getItem('mw-no-track')===null)localStorage.setItem('mw-no-track','1');}catch(e){}
    renderShell();renderAll();
    app.querySelector('#view').innerHTML='<p class="p-count">Loading leads…</p>';
    refresh();
    setMode(/analyze/.test(location.hash)?'analyze':(load('mw-crm-mode')||'leads'));
    // check for new leads every 3 minutes while the tab is visible, and right away when Matt comes back to it
    setInterval(function(){if(document.visibilityState==='visible'&&state.pass&&state.mode!=='analyze'&&!document.querySelector('dialog[open]'))refresh();},180000);
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&state.pass&&state.mode!=='analyze'&&Date.now()-(state.lastRefresh||0)>60000)refresh();});
  }
  state.pass=load('mw-crm');
  if(state.pass){
    fetch('/api/auth',{method:'POST',headers:{Authorization:'Bearer '+state.pass}}).then(function(r){if(r.ok)boot();else signOut();}).catch(function(){boot();});
  }else renderLogin();
})();
