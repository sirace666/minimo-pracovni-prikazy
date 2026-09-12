/* ============================================================
   Jednotná hlavička minimo · YFAI — jedno místo pro vzhled i logiku.
   window.uheaderHTML(opts) vrací HTML hlavičky (totožné ve všech modulech).
   Chování (hodiny, menu, jazyk, mobil/PC) je nezávislé na modulech
   a funguje i po překreslení stránky.
   ============================================================ */
(function(){
  var LOGO = '<svg viewBox="0 0 300 138" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="YFAI minimo">'
    + '<defs><pattern id="yfaihdr" patternUnits="userSpaceOnUse" x="0" y="8" width="10" height="9.8">'
    + '<rect x="0" y="0" width="10" height="5.9" fill="#1f66b5"/></pattern></defs>'
    + '<text x="150" y="86" text-anchor="middle" fill="url(#yfaihdr)" font-family="\'Arial Black\',Arial,sans-serif" '
    + 'font-weight="900" font-size="108" textLength="244" lengthAdjust="spacingAndGlyphs">YFAI</text>'
    + '<text x="150" y="128" text-anchor="middle" fill="#111418" font-family="Arial,Helvetica,sans-serif" '
    + 'font-weight="700" font-size="42" letter-spacing="1" textLength="246" lengthAdjust="spacingAndGlyphs">minimo</text></svg>';
  var CZ = '<svg viewBox="0 0 60 40" width="24" height="16"><rect width="60" height="20" fill="#fff"/>'
    + '<rect y="20" width="60" height="20" fill="#d7141a"/><path d="M0 0 30 20 0 40Z" fill="#11457e"/></svg>';
  // Iniciály z e-mailu/jména (jan.novak@… → "JN") — použije se, když u
  // uživatele není nahraná profilová fotka.
  function initialsOf(s){
    s = String(s||'').split('@')[0].replace(/[._-]+/g,' ').trim();
    var p = s.split(/\s+/);
    return ((p[0]?p[0][0]:'')+(p[1]?p[1][0]:'')).toUpperCase() || '?';
  }
  var GB = '<svg viewBox="0 0 60 40" width="24" height="16"><rect width="60" height="40" fill="#012169"/>'
    + '<path d="M0 0 60 40M60 0 0 40" stroke="#fff" stroke-width="8"/>'
    + '<path d="M0 0 60 40M60 0 0 40" stroke="#c8102e" stroke-width="4"/>'
    + '<path d="M30 0V40M0 20H60" stroke="#fff" stroke-width="12"/>'
    + '<path d="M30 0V40M0 20H60" stroke="#c8102e" stroke-width="6"/></svg>';

  window.uheaderHTML = function(o){
    o = o || {};
    function link(href, ico, label, key){
      // o.modules (pole klíčů) omezí, které moduly se v menu ukážou; „portal" a
      // „profil" (Můj profil — týká se každého, bez ohledu na práva k modulům) jsou vždy vidět
      if(o.modules && key!=='portal' && key!=='profil' && o.modules.indexOf(key)<0) return '';
      return '<a class="'+(o.cur===key?'cur':'')+'" href="'+href+'">'+ico+' '+label+'</a>';
    }
    // Externí opravy zatím vidí v menu jen správce (podle e-mailu)
    var OPRAVY_OWNERS = ['david.varhan@yanfeng.com','varhan@minimo.yfai','varhandavid19@gmail.com'];
    function opravyLink(){
      var who = String(o.email||o.user||'').trim().toLowerCase();
      if(OPRAVY_OWNERS.indexOf(who)<0) return '';
      return '<a class="'+(o.cur==='opravy'?'cur':'')+'" href="opravy.html">🛠️ Externí opravy</a>';
    }
    // Engineering zatím také jen pro správce (stejný seznam e-mailů)
    function engineeringLink(){
      var who = String(o.email||o.user||'').trim().toLowerCase();
      if(OPRAVY_OWNERS.indexOf(who)<0) return '';
      return '<a class="'+(o.cur==='engineering'?'cur':'')+'" href="engineering.html">🏭 Engineering</a>';
    }
    // Údržba — pilotní modul, zatím jen pro vybrané e-maily (TODO: rozšířit
    // seznam / přejít na obecný systém modules, až bude appka hotová).
    var UDRZBA_OWNERS = ['david.varhan@yanfeng.com','varhan@minimo.yfai','varhandavid19@gmail.com',
      'admin.test@minimo.local','technik.test@minimo.local'];
    function udrzbaLink(){
      var who = String(o.email||o.user||'').trim().toLowerCase();
      if(UDRZBA_OWNERS.indexOf(who)<0) return '';
      return '<a class="'+(o.cur==='udrzba'?'cur':'')+'" href="udrzba.html">🔧 Údržba</a>';
    }
    return '<header class="uhdr">'
      + '<div class="uh-menuwrap">'
        + '<button class="uh-menu" id="mm-btn" aria-label="Menu modulů" title="Moduly">☰</button>'
        + '<nav class="mm-panel" id="mm-panel" hidden>'
          + '<div class="mm-h">Přepnout modul</div>'
          + link('index.html','🏠','Hlavní stránka','portal')
          + link('nakup.html','🛒','Nákupní požadavky','nakup')
          + link('dovolenky.html','🗓️','Plánování směn','dovolenky')
          + opravyLink()
          + engineeringLink()
          + udrzbaLink()
          + link('nastaveni.html','⚙️','Nastavení','nastaveni')
          + '<div class="mm-sep"></div>'
          + link('profil.html','👤','Můj profil','profil')
          + '<div class="mm-sep"></div>'
          + '<div class="mm-h">Jazyk</div>'
          + '<div class="uh-lang mm-lang">'
            + '<button data-lang="cs"><span class="f">'+CZ+'</span> Čeština</button>'
            + '<button data-lang="en"><span class="f">'+GB+'</span> English</button>'
          + '</div>'
          + '<button class="mm-view">🖥️ Zobrazit jako na počítači</button>'
        + '</nav>'
      + '</div>'
      + '<div class="uh-brand">'+LOGO+'</div>'
      + '<div class="uh-title"><b>minimo · YFAI</b><span>'+(o.module||'')+'</span></div>'
      + '<div class="uh-clock" id="uh-clock"><div class="t">--:--:--</div><div class="d">—</div></div>'
      + '<div class="uh-right">'
        + '<div class="uh-idbox">'
          + '<a class="uh-avatar" href="profil.html" title="Můj profil">'
            + (o.photoURL ? '<img src="'+o.photoURL+'" alt="">' : initialsOf(o.user)) + '</a>'
          + '<div class="uh-user"><div class="n">'+(o.user||'')+'</div><div class="l">'+(o.level||'')+'</div></div>'
        + '</div>'
        + '<button class="uh-logout" '+(o.logoutAttr||'id="btn-logout"')+'>Odhlásit</button>'
      + '</div>'
    + '</header>';
  };

  /* ---------- chování ---------- */
  var vp = document.querySelector('meta[name="viewport"]');
  function applyView(){
    var v = localStorage.getItem('minimo-view') || 'auto';
    if(vp) vp.setAttribute('content', v==='desktop' ? 'width=1200' : 'width=device-width, initial-scale=1');
    document.querySelectorAll('.mm-view').forEach(function(b){
      b.textContent = (v==='desktop') ? '📱 Přepnout na mobilní zobrazení' : '🖥️ Zobrazit jako na počítači';
    });
  }
  function applyLang(){
    var l = localStorage.getItem('minimo-lang') || 'cs';
    document.querySelectorAll('.uh-lang button').forEach(function(b){
      b.classList.toggle('on', b.getAttribute('data-lang')===l);
    });
  }
  function isoWeek(d){
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;                 // Po=1 … Ne=7
    t.setUTCDate(t.getUTCDate() + 4 - day);        // čtvrtek téhož ISO týdne
    var ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil((((t - ys) / 86400000) + 1) / 7);
  }
  function tick(){
    var el = document.getElementById('uh-clock'); if(!el) return;
    var d = new Date(), p = function(n){ return (n<10?'0':'')+n; };
    var t = el.querySelector('.t'), dd = el.querySelector('.d');
    if(t) t.textContent = p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
    if(dd) dd.textContent = d.toLocaleDateString('cs-CZ',{weekday:'short',day:'numeric',month:'numeric',year:'numeric'})
      + ' · týden ' + isoWeek(d);
  }
  function refresh(){ tick(); applyLang(); }
  setInterval(refresh, 1000);
  // brzké obnovení, aby hodiny naskočily hned po vykreslení hlavičky (ne až po vteřině)
  [150,350,650,1000,1600].forEach(function(ms){ setTimeout(refresh, ms); });

  document.addEventListener('click', function(e){
    var panel = document.getElementById('mm-panel');
    if(e.target.closest('#mm-btn')){ e.stopPropagation(); if(panel){ applyView(); panel.hidden = !panel.hidden; } return; }
    var lb = e.target.closest('.uh-lang button');
    if(lb){ localStorage.setItem('minimo-lang', lb.getAttribute('data-lang')); applyLang(); return; }
    if(e.target.closest('.mm-view')){
      var cur = localStorage.getItem('minimo-view') || 'auto';
      localStorage.setItem('minimo-view', cur==='desktop' ? 'auto' : 'desktop'); applyView(); return;
    }
    if(panel && !e.target.closest('#mm-panel')) panel.hidden = true;
  });
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape'){ var p=document.getElementById('mm-panel'); if(p) p.hidden=true; }
  });

  applyView(); refresh();
  document.addEventListener('DOMContentLoaded', function(){ applyView(); refresh(); });
})();
