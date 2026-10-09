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
  // Ikona odhlášení (dveře + šipka ven) — obrys, barva přes currentColor,
  // takže se sama přizpůsobí (bílá na mobilu, tmavá na PC dlaždici).
  var LOGOUT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
    + 'stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>'
    + '<polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
  // Ikona menu (tři čárky) — přesně podle Claude Design návrhu (tři plné
  // pruhy, ne obrysová SVG ikona).
  var MENU_ICON = '<span></span><span></span><span></span>';
  // displayName() skládá jméno z firstName/lastName, které volající stránky
  // nemusí (na rozdíl od ostatních polí) předem escapovat — udělá se to tady.
  function esc(s){ return String(s??'').replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  // Iniciály z e-mailu/jména (jan.novak@… → "JN") — použije se, když u
  // uživatele není nahraná profilová fotka.
  function initialsOf(s){
    s = String(s||'').split('@')[0].replace(/[._-]+/g,' ').trim();
    var p = s.split(/\s+/);
    return ((p[0]?p[0][0]:'')+(p[1]?p[1][0]:'')).toUpperCase() || '?';
  }
  function cap(w){ return w ? w[0].toUpperCase()+w.slice(1).toLowerCase() : ''; }
  // Přihlašuje se jen firemním e-mailem tvaru jmeno.prijmeni@… — z něj se
  // dá jméno/příjmení odvodit, dokud si ho člověk sám neupraví v Profilu.
  function splitEmailName(email){
    var local = String(email||'').split('@')[0];
    // i mezera jako oddělovač — o.name poslední záchrana (viz displayName
    // níž) občas dostane už hotové "Jméno Příjmení", ne e-mailový local-part;
    // bez tohohle by se to vzalo jako jedno slovo a cap() by zmrzačil
    // druhé/další slovo na malá písmena ("Martin Valik" → "Martin valik").
    var parts = local.split(/[._\-\s]+/).filter(Boolean);
    if(parts.length>=2) return {first:cap(parts[0]), last:cap(parts[parts.length-1])};
    return {first:'', last:cap(parts[0]||local)};
  }
  // "Martin Smrz" — z uloženého jména/příjmení (jakmile si ho v Profilu
  // upraví), jinak automaticky odvozené z e-mailu. cap() se použije i na
  // uložené hodnoty — první písmeno velké, zbytek malá, ať uživatel napíše
  // do Profilu cokoliv. o.name je poslední záchrana pro místa, co mají jen
  // starou denormalizovanou hodnotu (bez e-mailu po ruce) — splitEmailName
  // funguje stejně dobře na "karel.pistek" jako na "karel.pistek@…".
  function displayName(o){
    o = o || {};
    var f = String(o.firstName||'').trim(), l = String(o.lastName||'').trim();
    if(!f && !l){ var d = splitEmailName(o.email||o.user||o.name); f=d.first; l=d.last; }
    return [cap(f), cap(l)].filter(Boolean).join(' ');
  }
  // Sdílené napříč celým Minimem (volá se z ostatních modulů, ne jen
  // z hlavičky) — "karel.pistek"/"karel.pistek@yanfeng.com" → "Karel Pistek",
  // "Martin Smrž" (už hezké, zadané v Profilu) beze změny.
  window.minimoDisplayName = function(o){
    if(typeof o === 'string') o = {name:o};
    return displayName(o) || String((o&&(o.name||o.email||o.user))||'').trim();
  };
  window.uheaderHTML = function(o){
    o = o || {};
    function link(href, ico, label, key){
      // o.modules (pole klíčů) omezí, které moduly se v menu ukážou; „portal"
      // a „instalace" jsou vždy vidět (nejsou vázané na oprávnění k modulu)
      if(o.modules && key!=='portal' && key!=='instalace' && o.modules.indexOf(key)<0) return '';
      return '<a class="'+(o.cur===key?'cur':'')+'" href="'+href+'">'+ico+' '+label+'</a>';
    }
    // Externí opravy zatím vidí v menu jen správce (podle e-mailu)
    // TODO před PR Davidovi: odebrat testovací e-mail admin.test.
    var OPRAVY_OWNERS = ['david.varhan@yanfeng.com','varhan@minimo.yfai','varhandavid19@gmail.com',
      'admin.test@minimo.local'];
    function opravyLink(){
      var who = String(o.email||o.user||'').trim().toLowerCase();
      if(OPRAVY_OWNERS.indexOf(who)<0) return '';
      return '<a class="'+(o.cur==='opravy'?'cur':'')+'" href="opravy.html">🛠️ Externí opravy</a>';
    }
    // Engineering vidí správci (podle e-mailu) a lidé s pozicí PE nebo PE coordinator.
    // Pozice se předávají v o.positions — stejný seznam je i v pravidlech Firestore.
    var ENG_POSITIONS = ['IMM PE','SLUSH PE','FOAM PE','ASSY PE','GB/DP PE','PE coordinator'];
    function engineeringLink(){
      var who = String(o.email||o.user||'').trim().toLowerCase();
      var pos = o.positions || [];
      var ok = OPRAVY_OWNERS.indexOf(who)>=0;
      for(var i=0;i<pos.length && !ok;i++) if(ENG_POSITIONS.indexOf(String(pos[i]).trim())>=0) ok=true;
      if(!ok) return '';
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
    // Shopfloor walk: výchozí přístup mají správci a PE koordinátoři. Ruční nastavení
    // u uživatele (o.mods.shopfloor = none/read/write) má vždy přednost.
    // Stejná logika je v index.html, shopfloor.html, nastaveni.html a v pravidlech Firestore.
    var SFW_POSITIONS = ['PE coordinator'];
    function shopfloorLink(){
      var set = (o.mods || {}).shopfloor;
      var ok;
      if(set==='none') return '';
      else if(set==='read' || set==='write') ok = true;
      else {
        var who = String(o.email||o.user||'').trim().toLowerCase();
        var pos = o.positions || [];
        ok = OPRAVY_OWNERS.indexOf(who)>=0;
        for(var i=0;i<pos.length && !ok;i++) if(SFW_POSITIONS.indexOf(String(pos[i]).trim())>=0) ok=true;
      }
      if(!ok) return '';
      return '<a class="'+(o.cur==='shopfloor'?'cur':'')+'" href="shopfloor.html">🚶 Shopfloor walk</a>';
    }
    return '<header class="uhdr">'
      + '<div class="uh-brandgroup">'
        + '<div class="uh-menuwrap">'
          + '<button class="uh-menu" id="mm-btn" aria-label="Menu modulů" title="Moduly">'+MENU_ICON+'</button>'
          + '<nav class="mm-panel" id="mm-panel" hidden>'
            + '<div class="mm-h">Přepnout modul</div>'
            + link('index.html','🏠','Hlavní stránka','portal')
            + link('nakup.html','🛒','Nákupní požadavky','nakup')
            + link('dovolenky.html','🗓️','Plánování směn','dovolenky')
            + opravyLink()
            + engineeringLink()
            + shopfloorLink()
            + udrzbaLink()
            + link('nastaveni.html','⚙️','Nastavení','nastaveni')
            + link('instalace.html','📲','Instalace','instalace')
            + '<div class="mm-sep"></div>'
            + '<button class="mm-view">🖥️ Zobrazit jako na počítači</button>'
          + '</nav>'
        + '</div>'
        + '<a class="uh-brand" href="index.html" title="Hlavní stránka">'+LOGO+'</a>'
      + '</div>'
      + '<div class="uh-title"><b>minimo · YFAI</b><span>'+(o.module||'')+'</span></div>'
      + '<div class="uh-lang"><button data-lang="cs" title="Čeština">CZ</button>'
        + '<button data-lang="en" title="English">EN</button></div>'
      + '<span class="uh-divider"></span>'
      + '<div class="uh-topright">'
        + '<div class="uh-idbox">'
          + '<a class="uh-avatar" href="profil.html" title="Můj profil">'
            + (o.photoURL ? '<img src="'+o.photoURL+'" alt="">' : initialsOf(o.user)) + '</a>'
          + '<a class="uh-user" href="profil.html" title="Můj profil"><div class="n">'+esc(displayName(o))+'</div><div class="l">'+(o.level||'')+'</div></a>'
        + '</div>'
        + '<button class="uh-logout" '+(o.logoutAttr||'id="btn-logout"')+' title="Odhlásit" aria-label="Odhlásit">'+LOGOUT_ICON+'</button>'
      + '</div>'
      + '<div class="uh-clock" id="uh-clock"><div class="t">--:--:--</div><div class="d">—</div></div>'
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
