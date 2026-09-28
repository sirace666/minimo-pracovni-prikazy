# minimo · YFAI — projekt pro Claude Code

Firemní portál interních webových aplikací YFAI. Tohle je ŽIVÁ aplikace, kterou
vyvíjíme — starý repozitář `Nakupni-pozadavky` je jen archiv, nesahej na něj.
Tento soubor čteš automaticky u každého úkolu — drž se ho.

Majitel projektu (David) není programátor. Vysvětluj změny česky a lidsky.

## Co portál dělá
Jedno přihlášení platí pro všechny moduly. Na rozcestníku jsou dlaždice a každý
modul je vlastní stránka.

## Struktura — JEDNA STRÁNKA = JEDEN MODUL
- `index.html` — rozcestník: přihlášení a dlaždice modulů (pole `MODULES`)
- `nakup.html` — Nákupní požadavky
- `dovolenky.html` — Plánování směn a přítomnosti
- `opravy.html` — Externí opravy (zatím vidí jen správce podle e-mailu)
- `engineering.html` — Engineering: prostoje, KPI, import ze Symesticu
  (zatím vidí jen správce podle e-mailu)
- `nastaveni.html` — uživatelé, úrovně a přístupy k modulům
- `header.js` + `header.css` — SPOLEČNÁ hlavička všech modulů.
  Nová stránka ji vykreslí přes `window.uheaderHTML({module, cur, user, level,
  logoutAttr, modules})`. Když přidáváš modul, přidej odkaz i sem.

Nový modul = nová stránka + dlaždice v `MODULES` v `index.html` + odkaz
v `header.js`. Nerozděluj jeden modul do více souborů.

## Technický stack — NEMĚNIT
- **Žádný build:** čistý HTML + CSS + vanilla JavaScript (ES modules). Žádné npm,
  bundler, TypeScript ani framework (React/Vue…). Musí běžet na GitHub Pages
  bez jakékoli kompilace.
- **Hosting:** GitHub Pages, větev `main`, kořen repozitáře. Po sloučení do `main`
  se web sám vystaví do 1–2 minut.
- **Databáze:** Firebase Firestore, projekt `nakupni-pozadavky` (sdílený všemi moduly).
- **Přihlašování:** Firebase Authentication, e-mail + heslo.
- Firebase SDK se importuje z CDN v `<script type="module">` na začátku souboru.

## Firebase config — NECHAT V KÓDU
`firebaseConfig` je přímo v každé stránce. To je správně a bezpečné — jde o
veřejné frontendové klíče. NEODSTRAŇUJ je, NEPŘESOUVEJ do .env, NEZAVÁDĚJ kvůli
nim build proces. Bezpečnost řeší pravidla Firestore, ne skrývání klíčů.

## Datový model (Firestore)
- kolekce `requests` — jeden dokument = jeden nákupní požadavek
- kolekce `opravy` — externí opravy
- kolekce `people`, `absences`, `shifts`, `rotations` — plánování směn
- kolekce `users` — id dokumentu = uid uživatele; pole `name`, `level`, `role`,
  `positions`, `perms`, `modules` (přístup k modulům: none / read / write)
- dokument `meta/config` — účty, úseky, stroje, povinná pole, kurzy, čítače
  `seq` (nákup) a `seqOpr` (opravy)
- kolekce `downtimes` — jeden dokument = jeden prostoj ze Symesticu.
  Id dokumentu je `datum_linka_časZačátku`, takže opakovaný import nikdy nezaloží
  duplicitu. NEPŘEVÁDĚJ na `addDoc` s náhodným id.
- kolekce `dt_days` — denní souhrn prostojů (id = `RRRR-MM-DD`). Přehled a KPI čtou
  jen tyhle malé dokumenty, ne jednotlivé prostoje — jinak by aplikace prožrala
  bezplatný limit čtení ve Firestore. Souhrn se po importu vždy přepočítá z databáze.
- kolekce `dt_imports` — historie importů (kdo, kdy, jaký soubor, kolik řádků)
- kolekce `scrap` a `sc_months` — zmetky v eurech proti tržbám (projekt × linka)
  a jejich měsíční souhrny
- kolekce `problems` a `actions` — problem solving (5× Proč, kořenová příčina,
  ověření účinnosti) a opatření k nim (corrective / preventive, owner, termín)
- kolekce `tasks` — akční plán managementu (tasky s posuny termínů a přílohami)
- dokument `meta/engcfg` — nastavení standardu řízení výkonu a čítače čísel
- Úrovně uživatelů: `basic`, `warehouse`, `approver`, `wadmin`, `superadmin`,
  s můstkem na staré role (`zadavatel`, `skladnik`, `schvalovatel`, `admin`).
  Práva jsou v kódu a SOUČASNĚ vynucená bezpečnostními pravidly Firestore
  na serveru (soubor `firestore.rules`).

## Modul Engineering (`engineering.html`)
Prostoje na linkách, KPI a import týdenního reportu z interního systému Symestic.
- Report (Downtimes) má sloupce `Segment`, `Reason`, `Start time`, `End time`,
  `Duration`, `Net duration`, `Comment`. Poznají se podle názvu, na pořadí nezáleží.
  Umí se načíst `.xlsx` i `.csv`.
- Knihovna na čtení Excelu (SheetJS) se stahuje z CDN, až když někdo opravdu
  importuje. Když se nestáhne, aplikace nabídne CSV, které umí přečíst sama.
- Časy z Excelu se počítají v UTC (`fromSerial`), aby se prostoj neposunul
  o hodinu podle nastavení počítače. Nepřepisuj na `new Date(...)` s místním časem.
- Modul zatím vidí jen správce podle e-mailu (pole `OWNERS`), stejně jako Externí
  opravy. Importovat smí jen role `admin` — vynuceno i pravidly Firestore.
- KPI: prostoje po linkách, changeover time, podíl nezařazených prostojů.
  Scrap a cycle time čekají na odpovídající report ze Symesticu — dlaždice pro ně
  v přehledu už jsou a hlásí, že data zatím nejsou.
- **Záložka Scrap je jen odkaz ven** na samostatnou aplikaci Quality loss report,
  kterou dělá vedení kvality (`SCRAP_URL` v `engineering.html`). Vnitřní přehled
  scrapu (`scrapView`, kolekce `scrap` a `sc_months`) v kódu zůstává, ale z lišty
  se na něj nejde dostat. Nepřepisuj záložku zpátky na `data-a="tab"`.

## Řízení výkonu linek (záložka Řízení v modulu Engineering)
Standard vyžádaný vedením: týdenní výkon linky pod prahem (výchozí 90 %) povinně
spouští problem solving na úrovni Process Engineera.
- Výkon = (plánovaný čas − prostoje) ÷ plánovaný čas. Plánovaný čas je
  `plannedHoursPerDay` × počet dní, ze kterých máme data — proto neúplný týden
  povinnou analýzu automaticky nespouští (`w.dayCount >= 5`).
- Nastavení standardu je v dokumentu `meta/engcfg` (práh, opakování, eskalace,
  ověření účinnosti, ownery, stroje, vyloučené skupiny důvodů). Tam jsou i čítače
  `seqPs`, `seqAct` a `seqTask` — generují se TRANSAKCÍ.
  **Edituje se v `nastaveni.html`** (dlaždice Nastavení na hlavní stránce),
  ne v Engineeringu. V Řízení je jen přehled hodnot a odkaz. Když přidáš další
  položku nastavení, přidej ji do `nastaveni.html`.
- **Process Engineers a Coordinatoři se NEVYPISUJÍ ručně.** Odvozují se z pozic
  uživatelů (`users.positions`), které David nastavuje v `nastaveni.html`:
  pozice obsahující „PE" (IMM PE, ASSY PE, PE coordinator…) → nabídne se jako
  owner technické analýzy, pozice přesně „PE coordinator" → owner follow-upu
  (MAINTENANCE coordinator ani Change coordinator se do follow-upu NEPOČÍTAJÍ).
  Dělají to `engEngineers()` a `engCoordinators()` v `engineering.html`.
  Nezaváděj zpátky textová políčka na jména do nastavení.
- Problém nelze uzavřít, dokud nemá kořenovou příčinu, aspoň jedno preventivní
  opatření, všechna opatření hotová a vyplněné ověření účinnosti. Tohle je jádro
  zadání, NERUŠ to.
- Corrective a preventive opatření se rozlišují polem `type` — nemíchej je.
- Rozepsané hodnoty v okně problému se před každým překreslením přenesou do
  paměti funkcí `collectPs()`. Bez toho by se text ztratil při odmítnutém uložení.

## Akční plán managementu (záložka Akční plán)
Tabulka tasků přesně podle sloupců, které chce vedení: číslo, oblast, typ, zadáno,
zadal, task, očekávaný výstup–důkaz, owner, termín původní, posuny, platný termín,
počet posunů, stav, po termínu, uzavřeno.
- Oblast je linka nebo proces (IMM, Assembly MFA2, Assembly SK336/PO455/W206,
  Assembly OV51/64, Assembly MBEAM, Slush, Foaming, GB/DP, Gclass).
- Owner může být víc lidí — pole `owners`. Jména se berou z kolekce `users`,
  tedy z Nastavení celého minima. Starší tasky s jedním jménem v poli `owner`
  se pořád zobrazí správně (`taskOwners()`).
- Číslo tasku je PROSTÉ pořadové číslo (1, 2, 3…) z čítače `seqTask`
  v `meta/engcfg`, generuje se TRANSAKCÍ. Žádné předpony podle oblasti.
- Owner se vybírá našeptávačem (řádek + návrhy pod ním), ne checkboxy.
- Stroj se vybírá k oblasti. Seznam je v `meta/engcfg.machines` (edituje se
  v modulu Nastavení); když je pro oblast prázdný, nabídnou se linky
  z importovaných prostojů.
- Platný termín, počet posunů a „po termínu" se NIKDY neukládají, počítají se
  z `dueOrig` a pole `moves`. Nepřidávej je do dokumentu.
- Posun termínu jde uložit jen s důvodem — každý posun má datum, důvod, kdo a kdy.
- Barvy drží legendu z Excelu: bílé vyplňuje uživatel, žluté jsou posuny,
  šedé se dopočítají.
- Přílohy jdou do Firebase Storage pod `tasky/<idTasku>/…`, stejně jako nákup
  ukládá do `nabidky/<idPožadavku>/…`. Limit 5 MB na soubor.
- Rozepsané hodnoty v okně se před překreslením ukládají do paměti
  (`collectTask()`, `moveDraft`) — bez toho by se text ztratil při odmítnutém uložení.

## Záložka Problem solving
Přehled všech 5× proč / A3 z kolekce `problems`. Zakládají se v Řízení tlačítkem
u linky pod prahem, tady se jen zobrazují a otevírají (stejné okno jako v Řízení).
Řadí se podle naléhavosti: eskalace → opatření po termínu → nejstarší. Sloupec
Opatření ukazuje `hotovo/celkem` a značku `P!`, když chybí preventivní opatření.

## Chování, které se NESMÍ rozbít
- KAŽDÝ nově založený požadavek má VŽDY stav „nový", pro všechny role bez výjimky
  (i skladník a admin). Při zakládání NEBĚŽÍ žádný automatický přeskok na
  „ve schvalování", ani když má požadavek vyplněnou cenu. Vynuceno na třech místech:
  akce `save` (`if(isNew)editing.status='nový'`), funkce `createRequest`
  (`status:'nový'`) a pravidla Firestore (`allow create` povoluje jen `nový`).
- Automatika „cena vyplněná → ve schvalování" (`applyAutoStatus`) platí POUZE při
  POZDĚJŠÍ úpravě existujícího požadavku, ne při jeho založení. Bez ceny zůstává
  „nový" a sklad ho má „poptat" (tlačítko Poptat).
- Ke schválení stačí JEDEN schvalovatel. Schválit lze i požadavek bez ceny.
- Pořadové číslo `NP-<rok>-<XXX>` se generuje TRANSAKCÍ nad `meta/config.seq`.
  Nepřeváděj na obyčejný zápis — jinak dva lidé naráz dostanou stejné číslo.
- Logo „YFAI minimo“ v hlavičce je inline SVG ve funkci `logoSvg()`. Neodstraňuj.
- Podbarvení řádků tabulky podle stavu (nový = bílý). Neruš bez vyžádání.

## Pracovní postup
- **Změny commituj rovnou do `main` a pushni.** Nezakládej pull request a nenech
  mě nic mergovat — web se z `main` sám vystaví za 1–2 minuty. PR dělej jen tehdy,
  když si o něj výslovně řeknu, nebo když jde o riskantní zásah, který chci
  vidět předem.
- Po pushnutí napiš česky, co se změnilo a na co si dát pozor (a ať dám Ctrl+F5).
- **Než pushneš, změnu vyzkoušej.** Na to je v repozitáři testovací postroj
  s falešným Firebase (Playwright) — proklikej celý průchod, ne jen syntaxi.
- Když měníš datový model nebo role, uprav i `firestore.rules` (a `storage.rules`,
  když jde o přílohy) a **pošli mi text pravidel do chatu** s tím, že je musím
  RUČNĚ publikovat ve Firebase konzoli. Do konzole nevidíš, publikaci dělá člověk.
  Firestore → Rules a Storage → Rules jsou dvě různá místa.
- Nikdy neměň víc věcí najednou, než o kolik jsem požádal. Drobné, přehledné změny.

## Když si nejsi jistý
Radši se zeptej v PR nebo navrhni variantu, než abys přepsal něco z výše
uvedeného seznamu „nesmí se rozbít“.

---

# DODATEK — tohle NENÍ Davidův text, čti dál (vývoj na forku)

> Vše výše je Davidův původní `CLAUDE.md` pro appku samotnou — **neměň ho,
> nepřepisuj, jen čti**. Tahle část je náš dodatek pro tenhle konkrétní
> **fork** (`sirace666/minimo-pracovni-prikazy`), kde s Martinem stavíme
> nové věci pro Davida. Kdykoliv sem přijde jiná/nová Claude Code session,
> ať čte i tohle, ne jen tu Davidovu část nahoře.

## Co je tohle za repo a proč existuje

Martin má editora do Davidova Firebase (`nakupni-pozadavky`) a přístup na
jeho GitHub. Domluvili jsme se, že appku **Pracovní příkazy** (samostatný
React/Vite projekt v `..\pracovni-prikazy\`, vedle tohohle) přetavíme do
nového modulu **„Údržba"** přímo uvnitř Davidova portálu minimo · YFAI,
protože:
- Údržba je dlaždice, kterou tam David už měl připravenou (`index.html`,
  původně `active:false` → teď `active:true`).
- Jedno přihlášení pro celý portál — appka nemusí řešit vlastní auth.
- Musí to zapadnout do jeho tech stacku (viz Davidova část výše — žádný
  build, vanilla HTML/JS/CSS).

## Co jsme tady postavili

- **`udrzba.html`** — nový modul, pracovní příkazy na opravy/údržbu strojů
  (nový → rozpracováno → hotovo, přiřazení, linka/stroj ze sdíleného
  `meta/config.sections`, historie, číslo `PP-rok-XXX` přes transakci na
  `meta/config.seqUdrzba`).
- **`udrzba.html` — nové rozvržení pro PC (2026-09-17, HISTORICKÉ —
  nahrazeno rozvržením z 2026-09-26 níž)**, podle needitovaného
  mockupu `mockup-udrzba-layout.html` (smazaný, jakmile bylo rozvržení
  přeneseno sem — sloužil jen jako needitovaný náhled). Řádek 1 = název
  stránky + „+ Nový pracovní příkaz" (patří k sobě, obojí „o celé stránce").
  Řádek 2 = záložky **Vše/Standardní·CM/Havarijní·EM** vlevo (aktivní EM
  červeně) + hledání vpravo — dva různé způsoby zúžení seznamu, schválně
  oddělené. Pod tím `.board` = 200px levý panel (`.sidebar`, jen klikací
  filtry: „Moje příkazy" + Stav) + široký seznam vpravo, žádný detailní
  panel (klik na kartu otevře stejné modální okno jako dřív). Na mobilu
  (`@media max-width:700px`) se `.board` zjednoduší na 1 sloupec (sidebar
  nad seznamem, bez skrývání) — jednodušší než animovaný „☰ Filtry" toggle
  z mockupu, ale funkční; případně dodělat později, až/pokud bude vadit.
  **Nové pole `udrzba/{id}.typ`** (`'CM'`|`'EM'`, výchozí `'CM'` přes
  `typOf()` helper — starší příkazy bez pole `typ` se tak počítají jako CM,
  nezmizí z filtrů) — vybírá se ve formuláři (`e-typ` select „Druh poruchy"),
  zobrazuje se jako badge všude vedle stavu/priority. Počty na záložkách typu
  a v sidebar seznamu Stavů se navzájem respektují (přepínač typu přepočítá
  čísla u stavů a naopak), ale hledání/„Moje" platí na obě strany stejně —
  viz `baseRows()`/`visibleRows()` v `udrzba.html`.
- **`udrzba.html` — rozvržení předěláno znovu, přesně 1:1 podle Claude
  Design mockupu (2026-09-26)** — Martin navrhl nové rozvržení v nástroji
  Claude Design (`Udrzba.dc.html`, export přes "Project HTML" zip, viz
  [[minimo-udrzba-fork]] v paměti pro to, jak se k souboru dostat příště) a
  chtěl ho napřesno okopírovat, ne jen opticky napodobit. Nahrazuje celý
  bod výš:
  - **4 dlaždice "pohled"** nahoře, jednovýběrové: Vše / Nepřiřazené /
    Potřeba objednat díl / Moje (`VIEWS` pole + `filters.view`).
  - **4 kombinovatelné (multi-select, AND) skupiny filtrů** v levém panelu
    (`.sidebar`, teď bílá karta s okrajem, ne jen plovoucí seznam): Typ
    (CM/EM), Stav (Nový/Rozpracováno/**Čeká na díl (objednáno)**/Hotovo),
    Priorita, **Obor** (Mechanika/Elektro-PLC/Nástrojárna — nové pole
    `udrzba/{id}.obor`, pole hodnot). Každá skupina počítá svůj počet
    přes `passes(o, skip)` — bere v potaz VŠECHNY ostatní aktivní filtry
    kromě vlastní dimenze, takže čísla u nezaškrtnutých voleb ukazují,
    kolik by jich přibylo (stejný vzorec jako dřívější CM/EM počty).
  - **Řazení** (Datum/Priorita/Stav, vzestupně/sestupně) nezávisle na
    aktivní dlaždici.
  - **Nový "chybí díl" workflow** — `udrzba/{id}.nd`: `null` →
    (technik) `'potreba'` → (mistr) `'objednano'` → `'Pokračovat'` zpátky
    na `null`. Lehký štítek nezávislý na hlavním stavu, řeší se v
    modálním okně („Náhradní díl" sekce, jen když `canEditDoc(o) &&
    o.status==='rozpracováno'`), historie příkazu se zapisuje při každé
    změně.
  - **Hledání se rozbaluje/zabaluje** (ikona lupy → textové pole s
    křížkem na zavření), ne trvale vidět.
  - Barvy/fonty/rozestupy **přesně podle zdroje** — `--accent:#2b3a86`,
    font Nunito (Google Fonts `<link>`), `:has(input:checked)` na celém
    řádku filtru (navy pozadí + bílá fajfka), `.viewtiles`/`.sidebar`/
    `.empty2` mají stejné stíny/okraje/rozměry jako `Udrzba.dc.html`.
    Později (na Martinovo přání "trošku zmenšit") zmenšeno cca o 10-12 %
    (výšky/fonty/odsazení v `.pagehead`/`.sidebar`/`.list-card`), aby se
    vešlo bez svislého posuvníku na běžnou výšku okna — poměry/zarovnání
    zůstaly stejné, jen menší měřítko.
  - **Hlavička (nadpis "Údržba" + dlaždice/hledání/řazení/tlačítko) je
    grid se STEJNÝMI dvěma sloupci jako `.board`** (`.pagehead{display:
    grid;grid-template-columns:230px 1fr}`) — nadpis leží nad levým
    sloupcem (filtry), dlaždice+akce nad pravým (seznam), takže to celé
    lícuje se sloupci pod tím. Dřívější verze měla hlavičku jako jeden
    souvislý flex řádek, což vypadalo, že dlaždice "lepí" hned za nadpis,
    místo aby začínaly nad obsahem — Martin na to sám upozornil
    screenshoty ("špatně zarovnané").
  - **Oprava mazání příkazu** — `confirm()` (nativní JS dialog) nespolehlivě
    fungoval i v běžném používání (Martin: "problikne, ale nesmaže se").
    Nahrazeno in-app dvoukrokovým potvrzením (`editing.confirmDel`
    boolean + inline varování s tlačítky Ano/Zrušit v modálu), ověřeno
    na dvou testovacích záznamech, že se smaže přesně jeden.
  - `assets/wrench.png` — ikona klíče vedle nadpisu, z Martinova exportu.
    **Odstraněna z nadpisu 2026-09-28 (v0.11.4)** — Martin ji nakonec
    nechtěl, `.page-icon`/`.page-icon img` CSS i `<span class="page-icon">`
    v `<h1>` pryč. Soubor `assets/wrench.png` zůstal na disku (nikde jinde
    referencovaný, ale mazání assetu nebylo požadováno).
- **`udrzba.html` — priorita "Nízká" + barevný posuvník + filtr Linka
  (2026-09-26)**:
  - **4. stupeň priority `'nízká'`** (pod `'běžná'`) — `PRIORITA`/
    `PRIORITA_LABEL`/`PRIORITA_RANK` doplněny, nová barva odznaku
    `.badge.p-nízká`. Škála teď: nízká → běžná → vysoká → kritická.
  - **`PRIORITA_COLOR`** (sytá barva na stupeň, ne pastelová jako u
    odznaků) — použitá na dvou místech: malá barevná tečka (`.fc-dot`)
    před popiskem v checkboxu filtru Priorita (`filterGroup()` teď umí
    volitelné `opts[].color`), a barevný posuvník ve formuláři.
  - **Posuvník priority** (`editForm()`, nahrazuje dřívější `<select
    id="e-priorita">`) — `<input type="range" id="e-priorita-range"
    min=0 max=3>` s barevným gradientem na dráze (zeleno→modro→oranžo
    →červená) a 4 popisky pod ním; táhnutí přebarví kuličku i zvýrazní
    aktivní popisek živě (`bind()`, přes CSS proměnnou `--c` na
    `.priority-slider`, ne přes `render()` — plynulejší než celý
    překreslovací cyklus). `collect()` čte `e-priorita-range` a mapuje
    index zpátky na `PRIORITA[i]`.
  - **Filtr "Linka"** — na rozdíl od Typ/Stav/Priorita/Obor (pevný malý
    seznam) může časem mít desítky položek (`cfg.sections`, sdílené s
    výběrem linky ve formuláři), takže NENÍ pořád rozbalený seznam
    checkboxů jako ostatní, ale zavřené tlačítko (`linkaFilterGroup()`),
    které se kliknutím rozbalí do panelu s políčkem na hledání (jen
    když je položek >6) + kombinovatelnými checkboxy uvnitř (stejná
    `.filter-check` třída/vzhled jako ostatní filtry, stejné navázání
    na `filters.linka`/`passes()`/`countLinka()`). Panel se zavře
    kliknutím mimo něj — `document.addEventListener('click',...)`
    registrovaný JEDNOU mimo `bind()` (v `bind()` by se při každém
    `render()` násobil), stejný princip jako `#mm-panel` v `header.js`.
- **Typ (CM/EM) jako dvě tlačítka vedle sebe, ne pod sebou (2026-09-26)**
  — na Martinovo přání, na dvou místech:
  - **Filtr** — `filterGroup()` má nový volitelný 5. parametr `horiz`
    (`filterGroup('typ',...,countTyp,true)`), přidá `.checklist` třídu
    `row` (`flex-direction:row`). Pod kapotou úplně stejný checkbox/
    `data-flt` mechanismus jako předtím — kombinovatelné (CM i EM
    zaškrtnuté zároveň = vidíš obojí, stejně jako nic nezaškrtnuté),
    mění se jen vzhled na dvě "dlaždice" vedle sebe.
  - **Formulář** (`editForm()`) — `<select id="e-typ">` nahrazen dvěma
    `<button data-a="set-typ" data-v="CM|EM">` (přesně jedno vždy
    aktivní, jako přepínač). Nový `case 'set-typ'` v `act()` rovnou
    mění `editing.typ` (stejný vzorec jako `nd-set`), `collect()` už
    `#e-typ` nečte (odstraněno, bylo by to mrtvé).
  - **CSS oprava (Martin nahlásil "vypadá to hrozně")** — první verze
    neměla na `.checklist.row .filter-check` žádný rámeček/pozadí,
    vypadalo to jako plovoucí text s malým odznakem. Přidán viditelný
    rámeček + bílé pozadí + barva per položka (`--tc` inline styl z
    `opts[].color`, CM neutrální `#41506b`, EM červená `#c0392b` —
    stejná jako odznak "Havarijní" v kartách), po zaškrtnutí se tlačítko
    vyplní touhle barvou.
- **Modal příkazu: oprava z-index, širší, historie jako záložka
  (2026-09-26)** — Martin nahlásil screenshotem tři věci:
  1. `.overlay` (modal) mělo `z-index:50`, sdílená hlavička (`.uhdr` v
     `header.css`) má `z-index:60` — horní okraj modalu proto zajížděl
     POD hlavičku. Opraveno na `z-index:70` (nad hlavičkou, pod
     `.toast` na 80).
  2. `.modal{max-width:620px}` na teď už neomezené šířce stránky (viz
     bod výš o `main{max-width:1800px}` odstraněném) působilo staženě/
     uprostřed obrazovky. Zvětšeno na `820px`, `editForm()`
     Priorita+Přiřazeno vráceny vedle sebe (`cols2`) — na širší modal se
     tam posuvník priority i tak vejde pohodlně.
  3. **Historie je teď druhá záložka** (`Info`/`Historie`,
     `.modal-tabs`/`.modal-tab`, nový stav `modalTab` + `case
     'modal-tab'` v `act()`, reset na `'info'` při `open`/`new`) —
     dřív byla historie jen další sekce pod tlačítky na změnu
     stavu/náhradní díl/smazání, teď je to samostatný pohled.
     **Doladěno (2026-09-26, Martin: "záložky chci úplně nahoru")** —
     `.modal-tabs` přesunuty ZA `.modal-head`, PŘED `.modal-body`
     (dřív byly první věc UVNITŘ scrollovatelného `.modal-body`, pod
     `.hero`m) — teď jsou to skutečné podtržené tabs přes celou šířku
     (`border-bottom` + aktivní podtržení barvou `--accent`, ne pilulky
     s rámečkem), vždy vidět nahoře i kdyby byla historie delší než
     okno. `.hero` (barevný pruh se stavem/názvem/popisem) zůstává pod
     záložkami na obou (kontext, který příkaz řešíš).
     **Ještě doladěno (Martin: "vypadají nějak divně")** — podtržení
     aktivní záložky a `.hero`ho vlastní `border-top:3px solid
     var(--accent)` (barva stavu, jen 1px pod tabs) opticky splývaly do
     jednoho matoucího pruhu. `.hero.notop{border-top:none}` — přidáno
     jen na `.hero` ve VIEW módu (za tabs vždy následuje), edit mód
     (bez tabs nad sebou) si svůj barevný pruh nechal.
     **Zároveň přesunuto (Martin: "smazat příkaz vlož pouze do upravit,
     ne v náhledu")** — tlačítko/potvrzení "Smazat příkaz" bylo v INFO
     záložce (view mód), teď je jen v edit módu (`!isNew && isAdmin()`,
     hned pod `editForm()`, před `modal-foot`).
  - **Mimochodem odhaleno a opraveno**: `.oi-top` (řádek odznaků na
    kartě příkazu v seznamu) neměl `flex-wrap`, takže hodně odznaků
    najednou (stav+priorita+typ+"potřeba objednat díl") vynutilo
    vodorovný posuvník na mobilu (`scrollWidth` > `clientWidth` kvůli
    CSS Grid `1fr` sloupci, co se roztáhl podle nejširšího obsahu v
    `<section>`). Přidán `flex-wrap:wrap`.
- **Verze v Údržbě (2026-09-26)** — Martin chtěl, ať se v Údržbě vždy
  ukazuje aktuální verze appky, ale bez buildu (na rozdíl od appky
  Pracovní příkazy, kde to řeší Vite `__APP_VERSION__` z
  `package.json`) tohle repo nemá jak "vpéct" hodnotu při buildu.
  Řešení: `fetch('VERSION')` při startu appky (stejný soubor, co se
  bumpuje při každém releasu — `let appVersion=''` + `.then(t=>{
  appVersion=t.trim(); render(); })`), zobrazeno jako `.page-version`
  (malý bledý text, zarovnaný dole) přímo **vedle nadpisu "Údržba"**
  v `<h1>` (první pokus dát to na konec levého panelu filtrů Martin
  hned opravil — chtěl to u názvu, ne u filtrů). Díky čtení přímo ze
  souboru se **nemusí ručně přepisovat v HTML** při každém bumpu —
  stačí, že se `VERSION` soubor mění při každém releasu (což se dělá
  i teď).
  **Doladěno** — `.page-version` měla `align-self:flex-end` (chtělo to
  vypadat jako drobný "index" u paty nadpisu), ale protože "Údržba" je
  vysoko a verze má mnohem menší font, vizuálně to vypadalo, že verze
  je na SAMOSTATNÉM řádku pod názvem, ne vedle něj (Martin: "vypadá to
  hrozně"). Odstraněno — verze teď sedí na stejné (`align-items:
  center` zděděné z `.pagehead h1`) úrovni jako text "Údržba".
  **Ještě doladěno (Martin si všiml sám: "nemá být spodek nadpisu a
  loga zarovnaný se spodkem tlačítek vpravo?")** — měl pravdu, `.pagehead`
  (grid) i `.pagehead h1` i `.pagehead-row2` (flex) používaly
  `align-items:start`/`center`, takže ikona (38px), text "Údržba"
  (23px), verze (12px), dlaždice (41px kontejner) a tlačítka vpravo
  (35px) — samé jiné výšky — měly spodky roztroušené na 4 různých
  úrovních (změřeno: 117–130px). Přepnuto na `align-items:end`/
  `flex-end` na všech třech úrovních — teď mají úplně všechny prvky
  hlavičky (ikona, nadpis, verze, dlaždice, tlačítka) spodek na stejné
  souřadnici.
  **Ještě jednou doladěno (Martin: "nadpis Údržba je stále výš než
  ostatní věci v řádku")** — zarovnání ke spodku samo o sobě nestačilo,
  protože `.pagehead h1` mělo `height:42px`, zatímco `.viewtiles`
  (kontejner) vycházel na 41px a tlačítka vpravo na 35px — různé výšky
  boxů, takže i se stejným spodkem měl každý jiný VRCHNÍ okraj (nadpis
  logicky "trčel" nejvýš, protože byl nejvyšší box). Opraveno sjednocením
  všech na **stejnou výšku 38px**: `.pagehead h1` 42→38 (= přesně
  `.page-icon`), `.icon-btn`/`.search-wrap`/`.sortbox`/`.head-actions
  .btn-primary` 35→38, `.viewtile` 33→30 (s paddingem 3px v
  `.viewtiles` a 1px okrajem vychází kontejner přesně na 38px taky).
  Teď mají všechny prvky hlavičky identickou výšku i souřadnice
  vrchu/spodku, ne jen shodný spodek.
- **Oblíbené (uložené) sady filtrů — Údržba (2026-09-27)**:
  - **Nová Firestore kolekce `udrzbaFilters/{uid}`** (jeden dokument na
    uživatele, pole `list` s poli `{id,name,color,typ,stav,priorita,
    obor,linka}`) — samostatná, netýká se sdílené kolekce `users` ani
    ničeho jiného. Pravidlo: čte/píše jen vlastník
    (`request.auth.uid==uid`). Nasazeno na testovací projekt.
  - **Hvězdička (⭐) vedle "FILTRY"** v levém panelu (`favWrap()`) —
    klik otevře/zavře panel se seznamem uložených filtrů, stejný vzor
    jako filtr Linka (zavřené tlačítko → panel, zavírání kliknutím
    mimo `.fav-wrap`, sdílí stejný globální `click` listener).
  - **Panel**: barevná tečka + název u každé položky, klik = rovnou
    aplikuje (`favApply()` přepíše `filters.typ/stav/priorita/obor/
    linka`), malá tužtička = otevře **stejné** modální okno jako "+
    Nový filtr", jen předvyplněné (`case 'fav-edit'` klonuje záznam do
    `filterModal`).
  - **Okno Nový/Upravit filtr** (`filterModalView()`) — Název, barva
    (paleta 8 předvolených barev `FAV_COLORS`, ne libovolný picker),
    a **samostatná** sada checkboxů Typ/Stav/Priorita/Obor
    (`favCheckGroup()`, vázaná na `data-favflt` — generický handler
    v `bind()`, analogický k `data-flt`, ale píše do `filterModal[dim]`
    místo globálního `filters[dim]`) — nezávislá na tom, co je zrovna
    zaškrtnuté v levém panelu, přesně jak chtěl Martin. Linka v tomhle
    okně NENÍ přes `favCheckGroup()` (viz oprava níž z 2026-09-28) —
    má vlastní `favLinkaGroup()`. Smazání má stejné dvoukrokové
    potvrzení jako mazání pracovního příkazu (`filterModal.confirmDel`).
  - **Oprava při testování**: `#fv-name` ztrácelo napsaný text při
    jiné akci v okně (barva/checkbox), protože každá akce spouští
    `render()` (celý `innerHTML` přepis) a input neměl `oninput`
    handler, který by `filterModal.name` držel v aktuálním stavu —
    stejný druh chyby, co řeší `f-q`/`f-linka-q`, jen tady stačí jen
    zapsat hodnotu do proměnné (bez `render()`/kurzoru), protože pole
    samo o sobě nic dalšího nepřekresluje.
- **Čtveřice drobných oprav v Údržbě (2026-09-27/28, v0.10.1–v0.10.4)**:
  - **Hlavička se přestala překreslovat při každé akci.** Dřív `render()`
    dělal `app.innerHTML = shell(listView())+...` a `shell()` volal
    `window.uheaderHTML(...)` pokaždé — na vteřinu to shodilo hodiny
    (placeholder `--:--:--`, než je opravil `setInterval` v `header.js`)
    a zvýraznění CZ/EN na výchozí stav. `shell()` je pryč; `render()`
    teď volá `renderShell(inner)`, která rozdělí `#app` na trvalé
    `#uh-host` (hlavička, přepíše se jen když se změní `headerSig` —
    e-mail/level/photoURL/firstName/lastName) a `#main-host` (obsah,
    přepisuje se dál celý jako dřív). Kdokoli hledá `shell(` v kódu, ať
    ví, že už neexistuje.
  - **`renderShell()` navíc drží scroll otevřeného okna** — zapamatuje
    `scrollTop` prvního `.overlay .modal-body` před přepisem
    `#main-host` a hned po přepisu ho vrátí (jinak nový DOM element =
    scroll na nule, vadilo to hlavně v okně Nový/Upravit filtr při
    zaškrtávání).
  - **Linka v okně Nový/Upravit filtr přestala být plochý seznam
    všech linek** (`favCheckGroup('linka',...)` pryč) — sdílí stejné
    jádro jako panel Linka v levém sloupci: `linkaPickerCore(mode)`
    (`mode:'filter'` čte/píše `filters.linka`+`linkaOpen`+`linkaQuery`,
    `mode:'fav'` čte/píše `filterModal.linka`+`favLinkaOpen`+
    `favLinkaQuery` — nezávislý stav, ať otevření jednoho panelu
    nezavře druhý). `linkaFilterGroup()` a `favLinkaGroup()` jsou už
    jen tenké obaly nad `linkaPickerCore()` s jiným vnějším wrapperem
    (`.filtergroup` vs. `<label>Linka</label>`). Obal fav verze má
    třídu `.fav-linka-wrap` (ne `.linka-wrap`), aby je šlo v
    document-click-outside listeneru zavírat nezávisle.
  - **Panel Linka (obě místa) se po otevření sám `scrollIntoView`uje**
    — tlačítko Linka bývá poslední v seznamu/okně, takže rozbalený
    seznam čar jinak vyjížděl pod okraj stránky/modalu a muselo se
    ručně rolovat.
  - **Tlačítko „+ Nový pracovní příkaz" má barvu `.btn-newprikaz`**
    (oranžový gradient `#f6821f→#e8590c`, stejný jako „+ Nový požadavek
    na opravu" v `opravy.html`) — úmyslně JINOU než zbytek `.btn-primary`
    tlačítek v Údržbě (ta zůstávají v indigo `--accent`). Martinovo
    přání: jen tohle jedno tlačítko má sedět barvou k ostatním modulům,
    ne celá appka.
- **Náhradní díl: třetí stav „přišel" + zvýraznění naléhavosti
  (2026-09-28, v0.11.0)** — dlouhá diskuze v konverzaci s Martinem
  (návrhy, mockupy, postupné upřesňování), než se to kódovalo, viz
  transcript téhle session, kdyby bylo potřeba dohledat proč.
  - **`nd` má teď tři stavy** místo dvou: `null → 'potreba'` (technik,
    tlačítko „Chybí díl") `→ 'objednano'` (jen `isAdmin()`, „Objednáno")
    `→ 'prisel'` (nové, KDOKOLIV — stejná práva jako ostatní kroky,
    žádné nové omezení, na Martinovo přání) `→ null` („Pokračovat").
    `NDLABEL`/`ndLabelHist`/`.badge.nd-prisel` (zelená `#e6f4ea`/
    `#1e7d4b`, stejná jako `.badge.p-nízká`) doplněny o `prisel`.
  - **Dlaždice „Náhradní díl" NENÍ položka pole `VIEWS`** (`unassigned`+
    `mine` tam zůstaly, `nd-needed` je pryč, viewtiles se renderují
    ručně, ne přes `VIEWS.map()`, aby šlo `ndTileWrap()` vložit přesně
    mezi Nepřiřazené a Moje) — ale **CHOVÁ SE jako by tam byla**
    (2026-09-28/v0.12.0, na Martinovo přání — „funguje jako tlačítko,
    ale zároveň i seznam"): sdílí STEJNÝ `filters.view` přepínač jako
    Vše/Nepřiřazené/Moje, jen s vlastní hodnotou `'nd'` — `matchesView()`
    má pro ni zvláštní větev (`filters.view==='nd' → !!o.nd`, mimo
    `VIEWS.find()`).
    **Klik na dlaždici NENÍ toggle celého pohledu** (opraveno
    2026-09-28/v0.12.1 — Martin chtěl: klik→otevře seznam, klik mimo→
    zavře, klik na dlaždici ZNOVU→zase otevře, ne deaktivuje) — `case
    'nd-tile-toggle'` teď jen přepíná `ndOpen` (`ndOpen=!ndOpen`) a při
    OTEVŘENÍ nastaví `filters.view='nd'` (idempotentní, když už tam je).
    `filters.view` se na `''` vrátí JEN přechodem na jinou dlaždici
    (`case 'flt-view'` na začátku kontroluje `filters.view==='nd'` a
    při odchodu z něj zavře panel a vyprázdní `filters.nd`) — NE kliky
    na Náhradní díl samotné. Kliknutí MIMO panel (stávající listener,
    beze změny) zavírá jen `ndOpen`, `filters.view`/`filters.nd` nechává
    beze změny — takže „klik mimo" a „klik na dlaždici, když je panel
    otevřený" dělají teď to samé (obojí jen `ndOpen=false`), jen různou
    cestou.
    Samotný **rozbalovací panel** se třemi checkboxy je pořád vázaný na
    `filters.nd` (pole) přes **existující generický `data-flt`
    handler** — `nd` jako filtrovací dimenze (`matchesNd()`, `passes()`,
    `countNd()`) je beze změny, mění se jen to, jak se dlaždice
    (de)aktivuje.
  - **Na dlaždici jsou VŠECHNA TŘI čísla vedle sebe, ne jedno souhrnné**
    (2026-09-28/v0.11.7, Martin chtěl vidět rozpad bez rozklikávání) —
    `ndTileWrap()` vykresluje tři `<span class="vt-count">` (potřeba/
    objednáno/přišel) místo dřívějšího jednoho součtu; barva pořád
    ne celá dlaždice, jen čísla (`.vt-count.count-danger`/`.count-ok`,
    neutrální pro „objednáno"), s `title=` atributem jako tooltip, co
    které číslo znamená (dlaždice sama nemá textové popisky u čísel).
    **Stejné barvy i u čísel uvnitř rozbaleného panelu** (Martin si
    všiml, že tam zůstávala neutrální) — `count-danger`/`count-ok`
    třídy na `.count` u řádků „Potřeba objednat"/„Díl přišel"
    (`.filter-check .count.count-danger/.count-ok`, nové CSS vedle
    už existujícího `.count-warn` z bodu o Kritické výš — schválně
    samostatné třídy, ne recyklace `.count-warn`, ať se nic nerozbije
    na místě, kde `.count-warn` už funguje). „Čeká (objednáno)" zůstává
    neutrální i tady, stejná logika jako u dlaždice.
  - **Čísla na dlaždici jsou nezávislá na tom, která dlaždice nahoře je
    zrovna aktivní** (2026-09-28/v0.12.1, Martin: „kliknutí na jakoukoli
    dlaždici nebude ovlivňovat čísla v Náhradní díl") — `passes(o,skip)`
    dostal nepovinný 2. parametr `skip2` (zpětně kompatibilní, nic
    jiného ho nepoužívá), `countNd` teď volá `passes(o,'nd','view')` —
    kromě vlastní `nd` dimenze ignoruje i `view`, takže se drží jen
    podle sidebar filtrů (Typ/Stav/Priorita/Obor/Linka/hledání), ne
    podle toho, jestli je aktivní Vše/Nepřiřazené/Moje/Náhradní díl
    samo. Ostatní `count*` funkce (`countView`, `countTyp`, `countStav`…)
    beze změny — pořád skipují jen svou vlastní dimenzi.
  - **`totalActive` (sidebar „FILTRY" počet + tlačítko „Zrušit filtry"
    v prázdném stavu) musí počítat i `filters.nd.length`** — bez toho
    šlo mít aktivní nd-filtr a nikde nebylo vidět/kudy ho zrušit kromě
    znovurozkliknutí té samé dlaždice (odhaleno až při testování).
  - **EM = červený obrys karty** (`box-shadow:0 0 0 1.5px var(--danger)`,
    ne `border`/`border-color` — ty by přepsaly `border-left-color`
    podle stavu, co tam už je). **EM + kritická navíc = lehce červená
    výplň** (`background:#fdecea`). Třídy `em`/`crit` na `.order-item`.
  - **Dlaždice „Nepřiřazené" MÁ JINOU vizuální řeč než karty** — ne
    obrys+výplň (Martin to 2026-09-28/v0.11.6 schválně změnil zpátky):
    **jen červené číslo** u nepřiřazené havarijky (`.vt-count.count-
    danger`, stejná třída jako u dlaždice Náhradní díl), **+ červený
    vykřičník** (`<span class="vt-warn">!</span>`) navíc, když je
    nepřiřazená havarijka zároveň kritická. `unassignedHasEm()`/
    `unassignedHasEmCrit()` (agregace přes `rows`, respektují ostatní
    aktivní filtry přes `passes(o,'view')`, stejný vzorec jako
    `countView`) beze změny — jen se jinak vykreslují. Staré
    `.viewtile.vt-em`/`.vt-crit` (box-shadow+background) smazané.
  - **„Kritická" v sidebar filtru Priorita**: zvýrazní se jen ČÍSLO
    (`.count-warn`), ne celá položka — na rozdíl od dlaždic výš, tady
    by celobarevná položka v nabité skupině filtrů dělala nepořádek
    (Martinovo rozhodnutí po diskuzi). Počítá se zvlášť
    (`countKritickaOpen()` — jen `status!=='hotovo'`), NE stejnou
    funkcí jako běžné počítadlo `countPriorita()` (to pořád ukazuje
    úplně všechny kritické, i hotové — jinak by zaškrtnutí filtru
    ukázalo jiný počet, než kolik ve skutečnosti vyfiltruje).
    `filterGroup()` dostal nový nepovinný 6. parametr `warnTest(key)`.
- **Ovládání oken a hledání doladěno (2026-09-28, v0.11.3)**:
  - **`.search-close` (křížek na zavření hledání) neměl `display:flex`
    na centrování** — text „✕" tak nebyl na střed 22×22px tlačítka.
    Doplněno.
  - **Klik mimo pole hledání ho teď sám zavře/vyčistí** (`searchOpen=
    false;filters.q='';render();`) — stejný `data-flt`-styl
    document-click-outside listener jako Linka/Náhradní díl/Oblíbené.
    Nutné vyčistit i `filters.q`, jinak by `searchIsOpen` (`filters.q||
    searchOpen`) box držel rozbalený i po `searchOpen=false`.
  - **Klik na tmavé pozadí mimo okno pracovního příkazu/oblíbeného
    filtru NIKDY doopravdy nefungoval** — `case 'close-bg'`/
    `'fav-close-bg'` v `act()` existoval, `mousedown` listener na
    `.overlay` existoval (hlídá `downOnOverlay`, ať tažení myší z okna
    ven nezavře okno omylem), ale chyběl `click` listener, co by
    `act('close-bg',...)` vůbec zavolal — obecný `[data-a]` cyklus v
    `bind()` tyhle dvě akce schválně přeskakuje (řádek s `if(a==='login'
    ||a==='logout'||a==='close-bg'||a==='fav-close-bg') return;`).
    Doplněny `ov.addEventListener('click',...)`/`fov.addEventListener(
    'click',...)` vedle stávajících `mousedown` listenerů.
  - **Teď to zavírá JEN když se nic nerozepisuje** — okno pracovního
    příkazu: klik mimo zavře jen v READ-only pohledu (`!editing._id||
    editMode` blokuje — pokrývá nový i rozepsaný příkaz, přesně
    `showEdit` z `modalView()`, jen spočítané znovu v `act()`). Okno
    Nový/Upravit oblíbený filtr: klik mimo je zablokovaný VŽDY (nemá
    žádný „jen prohlížím" stav — je to pořád formulář s Uložit/Zrušit).
    Explicitní „✕"/Zrušit tlačítka fungují v obou stavech beze změny
    (mají vlastní `data-a="close"`/`"cancel-edit"`/`"fav-close"`, ne
    přes tenhle mechanismus).
- **Ikona klíče před „Údržba" odstraněna + oprava zarovnání s verzí
  (2026-09-28, v0.11.4–v0.11.5)** — `<span class="page-icon">` s
  `assets/wrench.png` pryč z `<h1>`, CSS `.page-icon`/`.page-icon img`
  smazáno (viz i poznámka u `assets/wrench.png` výš). Dvoukolové
  doladění zarovnání `.pagehead h1` (nadpis „Údržba" + verze
  `v${appVersion}` vedle něj):
  1. `align-items:flex-end` → `align-items:baseline` — vyřešilo
     nesesazenost MEZI nadpisem (23px) a verzí (12px) vedle něj
     (různé font-metriky = jiný „spodek písma" u každé velikosti,
     baseline zarovná podle účaří místo podle spodku boxu).
  2. Ale `baseline` na jediném řádku ve fixní výšce (`height:38px`)
     zarovná celou dvojici k VRCHU boxu (prázdný prostor zůstal dole),
     takže "Údržba" pak sedělo výš než dlaždice vpravo (ty mají
     `align-items:center`, ne baseline) — Martin si všiml. Opraveno
     na `align-items:center` — sjednocuje to s tím, jak se centruje
     obsah `.viewtile`, takže nadpis, verze i dlaždice mají teď
     stejný vizuální střed (ověřeno `getBoundingClientRect()`, rozdíl
     pod 0.1px). `center` mezitím pořád drží nadpis a verzi vedle
     sebe rozumně zarovnané (na rozdíl od `flex-end` z bodu 1) —
     nejde o čistý baseline-fix, ale vizuálně dostatečné.
- **Oddělovače mezi dlaždicemi nahoře (2026-09-28, v0.11.8)** — od
  chvíle, co má dlaždice Náhradní díl tři vlastní čísla (v0.11.7),
  vypadaly všechny čtyři dlaždice (Vše/Nepřiřazené/Náhradní díl/Moje)
  jako jedna splývající řada textu — chybělo mezi nimi vizuální
  ohraničení (dřív to řešily jen barvy `.on`/hover, což u NEaktivních
  dlaždic vedle sebe nestačí). Řešeno samostatnými `<span class=
  "vt-sep"></span>` elementy vloženými PŘÍMO do markupu mezi jednotlivá
  tlačítka (ne CSS `border-left`/`::before` na tlačítkách samých —
  vyhne se to kolizi s `border-radius`/`.on` barevným pozadím aktivní
  dlaždice). `.viewtiles .vt-sep{width:1px;height:16px;background:
  var(--border);align-self:center}` — kratší než celá výška řádku
  (16px v 38px kontejneru), zkrácený/vycentrovaný oddělovač, ne čára
  přes celou výšku.
- **`profil.html`** — nová **sdílená** stránka „Můj profil" (jméno+příjmení
  ve dvou samostatných polích, heslo, fotka). Otevírá se **jen kliknutím na
  fotku/jméno v hlavičce** — v ☰ menu záměrně NENÍ (bylo by to duplicitní).
- **`instalace.html`** — nová **sdílená** stránka s návodem na přidání
  portálu na plochu (Android/iPhone/PC), portovaná z `InstallPage.tsx` +
  `pwaInstall.ts` appky Pracovní příkazy. Na rozdíl od Profilu **v ☰ menu JE**
  (Martinovo přání), viditelná vždy (`link()` v `header.js` má bypass pro
  klíč `'instalace'`, stejně jako pro `'portal'`, ať ji vidí i stránky
  s omezeným `modules` seznamem). Zachytává `beforeinstallprompt`/
  `appinstalled`, ale tlačítko „Nainstalovat" nenaskočí, dokud minimo nemá
  PWA manifest/service worker (nemá ho zatím žádná stránka portálu) — proto
  je hlavní obsah ruční návod přes menu prohlížeče (funguje vždy už teď).
  Až manifest přibude, tlačítko naskočí samo bez zásahu do týhle stránky.
  Text/kroky/karta „Oznámení" na konci jsou schválně **1:1 podle originálu**
  (`InstallPage.tsx` appky Pracovní příkazy, Martin poslal screenshot) — jen
  s „minimo" místo „Pracovní příkazy" a bez slibu fungujících push oznámení
  (viz `profil.html` níž).
- **`profil.html`** — karta **„Upozornění"** na konci (stejný text/vzhled
  jako `PushSettings.tsx` v appce Pracovní příkazy: popis + badge + tlačítko
  + checkbox zvuku), ale **schválně needitovatelná** — badge „Připravujeme"
  místo stavu zapnuto/vypnuto, tlačítko i checkbox `disabled`. Push
  notifikace (FCM/Cloud Functions) pro minimo zatím nejsou naportované,
  tohle je jen vizuální příprava na to, až budou (Martinovo přání).
- **`header.js` / `header.css`** — **profilová fotka/iniciály v hlavičce**
  (`uheaderHTML` bere navíc `photoURL`), `.uh-user` je teď odkaz na profil.
  **Celé jméno v hlavičce** ("Martin Smrž") — `displayName()`/`splitEmailName()`
  v `header.js` (`displayName` byla dřív `shortName()` a vracela zkratku typu
  "P. Vill" — na Martinovo přání přepsáno na celé jméno+příjmení, commit
  `774f27a`). Dokud si člověk jméno/příjmení sám neupraví v Profilu, odvodí
  se automaticky z přihlašovacího e-mailu (`jmeno.prijmeni@…` — tímhle vzorem
  se budou přihlašovat všichni, firemní e-mail to už v sobě má). `cap()`
  velké první písmeno, zbytek malá, na obou slovech, ať uživatel do
  e-mailu/Profilu napíše cokoliv.
  Jazyk (CZ/EN) je přímo v hlavičce, mezi logem/nadpisem a foto+jménem
  (od 2026-09-26 jako textové "pilulky" CZ/EN, ne vlaječky — viz níž).
- **`window.minimoDisplayName()` — jména hezky napříč celým Minimem
  (2026-09-26)** — Martin si všiml, že se v Nastavení (a jinde) zobrazují
  jména 40 lidí syrová podle e-mailu ("karel.pistek" místo "Karel Pistek").
  Příčina: `displayName()`/`splitEmailName()`/`cap()` v `header.js` tohle
  uměly už dřív, ale používaly se jen pro badge v samotné hlavičce — každá
  appka (nastaveni/nakup/dovolenky/opravy/engineering/udrzba/index) si
  navíc SAMA zapisovala výchozí `users/{uid}.name` při prvním přihlášení
  (`user.email.split('@')[0]`), takže ta syrová hodnota skončila natrvalo
  v databázi. Řešení: `displayName()` rozšířena o třetí fallback
  (`o.email||o.user||o.name` — funguje i na holé jméno bez e-mailu) a
  exportovaná jako `window.minimoDisplayName(u)` (přijme objekt
  `{firstName,lastName,email,name}` i obyčejný string). Zavoláno na dvou
  místech v každém modulu: (1) kde se skládá `me`/vlastní profil (nahrazuje
  starý `d.name||user.email` fallback i výchozí `name` při zakládání
  nového účtu), (2) kde se načítá seznam všech uživatelů z `users`
  (nastaveni/nakup/dovolenky/engineering/udrzba) — jméno se opraví hned při
  načtení z Firestore, ne až při vykreslení, takže to funguje všude
  včetně dropdownů/historie/vyhledávání beze změny na desítkách
  jednotlivých míst. Navíc lokální `pn()` helper (`udrzba.html`,
  `nakup.html`, `opravy.html`) na pár míst, co ukazují starší
  denormalizované `authorName`/`approvedBy`/`assignedToName` řetězce
  uložené ještě před touhle opravou. Neopravuje se historie/hist řádky
  (text v minulosti, nedá se bezpečně znovu naparsovat) a `firstName`/
  `lastName`, pokud si je člověk sám nastavil v Profilu, mají vždycky
  přednost — tohle jen doplňuje hezký odhad, dokud si člověk jméno sám
  neupraví.
- **Hlavička (`header.js`/`header.css`) předělaná znovu, kompletně 1:1
  podle Claude Design (2026-09-26)** — Martin v Claude Design připravil
  mockup nového rozvržení Údržby (`Udrzba.dc.html`, viz bod výš), a chtěl
  stejným stylem/barvami/rozměry předělat i celou sdílenou hlavičku
  portálu (dopad na VŠECHNY moduly, ne jen Údržbu — odsouhlaseno
  explicitně, viz [[minimo-udrzba-fork]] v paměti). **Jediné, co zůstalo
  beze změny, je font v logu** (`LOGO` SVG v `header.js`, pruhované
  "YFAI" + "minimo" — nedotčeno). Všechno ostatní přepsáno na přesné
  hodnoty z mockupu:
  - gradient `linear-gradient(90deg,#1f2d6e,#2b3a86)` (bylo tmavší
    `#0f2f5f→#1b4b8f`), hlavička `height:76px;padding:0 24px;gap:20px`
    (bylo `min-height:66px;padding:9px 16px;gap:14px`)
  - **menu (`.uh-menu`)** — tři plné pruhy (`MENU_ICON` teď jen
    `<span>×3`, ne obrysová SVG), box 28×28px, žádná trvalá kružnice
  - **logo (`.uh-brand`)** — bílý box **pevně 118×56px**, bez stínu,
    beze změny paddingu na obsah (jen `width`/`height` + `flex:center`)
  - **hodiny (`.uh-clock`)** — pozadí `#1b2660` (bylo `rgba(0,0,0,.24)`),
    `border-radius:8px` (bylo 12), fixní `height:54px;min-width:200px`,
    pořád vycentrované přes `position:absolute` (design použil
    `margin:0 auto`, ale to by centrovalo jen matematicky "napůl" mezi
    nesouměrnou levou/pravou stranou — necháno funkčně chytřejší řešení,
    vizuálně identický box)
  - **jazyk (`.uh-lang`)** — **textové pilulky "CZ"/"EN"** místo SVG
    vlaječek (aktivní = bílé pozadí + `#1f2d6e` text, neaktivní = jen
    obrys `rgba(255,255,255,.4)` + opacity .7) — `CZ`/`GB` SVG konstanty
    v `header.js` smazané, nepoužívají se. Samostatný `<span class=
    "uh-divider">` (1×28px, `rgba(255,255,255,.2)`) mezi jazykem a
    foto+jménem, místo dřívějšího `border-right` na `.uh-lang`.
  - **avatar (`.uh-avatar`)** — 36×36px, plné pozadí `#4a5aa8` (bylo
    průhledné `rgba(255,255,255,.22)`); jméno/pozice o chlup větší
    (`.uh-user .n` 14px/800, `.l` 12px)
  - **odhlásit (`.uh-logout`)** — stejná SVG ikona dveří+šipky jako dřív
    (design měl jen placeholder znak "⇥", ponecháno srozumitelnější
    skutečné ikony — jediná vědomá odchylka od 1:1), zmenšeno na 32×32px
  - `.mm-panel{top:84px}` doladěno na skutečnou novou výšku hlavičky.
  Popis "PC hlavička sjednocená (2026-09-12)" níž je teď **historický**
  (Varianta C, váha písma 700, SVG vlaječky) — nahrazeno tímhle bodem,
  ponecháno jen jako kontext proč byla hlavička předtím taková, jaká byla.
- **PC hlavička sjednocená (2026-09-12, HISTORICKÉ — nahrazeno výš)** — Martinovi přišla nesourodá
  („nic k sobě nesedí, každé písmo jiné"). Prošli jsme spolu 6 variant
  v samostatném mockupu (`_mockup-header.html`, needitovaný náhled, smazaný
  po dohodě). Zkoušeli jsme napřed Variantu F (menu jako skleněná dlaždice),
  pak přepnuto na **Variantu C — Minimalistická** (aktuální stav):
  - **Menu i Odhlásit mají stejnou rodinu ikon** — `MENU_ICON`/`LOGOUT_ICON`
    v `header.js`, obě inline SVG s `stroke="currentColor"` (ne textový znak
    ☰, který vypadal jinak než kreslené ikony).
  - **Menu i Odhlásit nemají žádný box ani trvalý kroužek — NIKDE, mobil
    i PC** (base pravidlo `.uh-menu`/`.uh-logout` v `header.css`, ne
    media-query specifické): `background:transparent`, kruh
    (`rgba(255,255,255,.12)`/`.14`) se objeví jen při hoveru. Jen VELIKOST
    tlačítka menu se liší (42×42 mobil / 40×40 PC, řeší media queries).
    Avatar+jméno taky bez boxu — celá pravá strana je „lehká", jen hodiny
    a vlajky mají viditelný rámeček.
  - **Hodiny a vlajky** mají box, co měly už předtím (beze změny na PC) —
    jen text hodin zúžený na váhu 700 (bylo 800) a menší, ať sedí ke zbytku.
  - **Typografie sjednocená na max. váhu 700** — `.uh-title b` (bylo 800),
    `.uh-clock .t` (bylo 800) — necháváme jen jednu úroveň „tučně", ne tři
    různé.
  - **Hodiny na mobilu úplně pryč** (`.uh-clock{display:none}` v mobilní
    media query — element zůstává v DOM, `tick()` dál běží, jen se
    neukazuje) — Martinovo rozhodnutí, na mobilu zabíraly zbytečně místo.
    Mobilní grid teď má jen 2 řádky: **řádek 1** = menu+logo vlevo,
    foto+jméno+Odhlásit vpravo; **řádek 2** = jen vlajky vpravo (sloupec 1
    v řádku 2 zůstává prázdný, grid to zvládne bez placeholderu).
- **`index.html`** — dlaždice Údržba zapnutá (`ownerOnly:true`, pilotní
  režim), `photoURL`/`firstName`/`lastName` doplněny do `me`.
- **`nakup.html`, `dovolenky.html`, `opravy.html`, `engineering.html`,
  `nastaveni.html`** — JINAK BEZE ZMĚNY (je to čistě Davidův kód, řídí se
  Davidovou částí výše), jen přidán `photoURL`/`firstName`/`lastName` do
  `me`/`myDoc` a do volání
  `uheaderHTML(...)`, ať se fotka v hlavičce zobrazí i tady. Nic dalšího
  v nich neupravovat bez výslovného důvodu.
- **Admin (`admin.test@minimo.local`) má přístup naprosto všude (2026-09-17)**
  — Martinovo přání. `admin.test` doplněn do `OPRAVY_OWNERS` v `header.js`
  (menu) i do vlastních `OWNERS` v `opravy.html`/`engineering.html` (dřív
  tam byl jen v `index.html`, takže dlaždici viděl, ale po kliknutí narazil
  na „nemáte přístup").
  **Oprava (2026-09-26) — tvrzení výš o `firestore.rules` bylo nepřesné:**
  žádná změna tehdy nebyla potřeba jen proto, že `users/{uid}.role` shodou
  okolností sedělo. Ve skutečnosti `isAdmin()` v pravidlech kontrolovala
  jen starou `role=='admin'`, zatímco `nastaveni.html` mezitím přešlo na
  nové `level` (Basic…Super Admin, `LEVEL2ROLE` je jen most na starou roli
  pro appku Nákupů) — kdykoliv měl někdo `level` nastavený jinudy než přes
  formulář v Nastavení (bootstrap, ruční zápis v konzoli), `role` mu
  nesedělo a `nastaveni.html` mu při ukládání práv (i sám sobě) vracelo
  „Nepodařilo se uložit: Missing or insufficient permissions." Opraveno:
  `isAdmin()` teď uznává i `myLevel() in ['wadmin','superadmin']`, plus
  `admin.test@minimo.local` přidán natvrdo do `isEmailAdmin()` (stejná
  logika jako `OPRAVY_OWNERS` výš, jen na úrovni dat) — TODO před PR
  Davidovi: tenhle e-mail z `isEmailAdmin()` zase odebrat.
- **Úklid testovacích profilů ve Firestore (2026-09-17)** — po dřívějším
  smazání+znovuzaložení účtů `admin.test`/`technik.test` (kvůli resetu
  hesla) zůstaly ve `users` kolekci **osiřelé staré dokumenty** (pod starým
  UID) se správně nastavenými daty (`level:superadmin`, `positions`,
  fotka…), zatímco nové dokumenty (pod aktuálním UID) měly jen prázdné
  výchozí hodnoty — vypadalo to jako „2× admin, 2× technik". Staré a nové
  sloučeny (hodnoty přenesené na aktuální UID), osiřelé dokumenty smazány.
  **Ponaučení pro příště:** při resetu hesla přes smazání+založení účtu se
  **musí totéž udělat i v Firestore** (jinak zůstane duplicitní/osiřelý
  profil) — příště radši zkusit heslo změnit jinak, ať se UID nemění.
- **`firestore.rules`** — přidán blok pro `udrzba`, čítač `seqUdrzba`
  v `meta/config`, a `users/{uid}` update rozšířen, ať si každý smí sám
  upravit `name`/`firstName`/`lastName`/`photoURL` (dřív jen admin).
  **Nové pole `users/{uid}.firstName`/`.lastName`** (vedle stávajícího
  `.name`, který se dál drží v sync jako `firstName+' '+lastName` — všude
  jinde v appce (Zadal, Přiřazeno, task owneři…) se pořád čte jen `.name`,
  takže nic jiného nebylo potřeba měnit).
- **`storage.rules`** — **NOVÝ soubor, David ho v repu nemá** (spravuje si
  Storage pravidla jen v konzoli). Obsahuje jeho současná pravidla
  (`nabidky/`, `tasky/`) + nová cesta `avatars/{uid}` pro profilovky.

## Návrhová rozhodnutí (ať se neřeší znovu)

- **Appka nemá vlastní registraci/přihlášení/hierarchii/profil-jako-appku**
  — to všechno řeší portál (`index.html` = login, `nastaveni.html` = správa
  lidí a práv). Údržba se do toho jen zapojuje, nestaví si to znovu.
- **Sdílená hlavička zůstává stylově Davidova** (navy pruh, logo, ☰ menu) —
  neměnit vzhled/chování `header.js` mimo to, co si vyžádal Martin.
- **Obsah stránek (seznam, okno příkazu) je navržený ve stylu appky
  Pracovní příkazy** (karty s barevným okrajem podle stavu, barevná
  hlavička okna podle stavu, sekce Změnit stav/Historie) — NE v Davidově
  hutném tabulkovém stylu (`opravy.html`). Tohle byla výslovná žádost
  Martina, drž se toho i u dalších obrazovek.
- **Přístup do Údržby (i zatím do Profilu?) = pilotní whitelist e-mailů**
  (`OWNERS`/`ADMIN_EMAILS` v `udrzba.html`, `UDRZBA_OWNERS` v `header.js`,
  `OPRAVY_OWNERS` v `index.html`) — stejný vzor, jaký David použil pro
  rozjezd Opravy/Engineering. Až appku schválí, přechod na obecný systém
  `users.modules.udrzba` (read/write/none) je otevřená otázka, ne hotová věc.

## Git remotes — DŮLEŽITÉ než začneš cokoliv upravovat

```
origin   = https://github.com/sirace666/minimo-pracovni-prikazy.git  (náš fork, sem pushovat)
upstream = https://github.com/varhandavid19-lgtm/minimo-yfai.git      (Davidův originál)
```

David appku dál vyvíjí (má i svoje Claude Code sezení napojené přes GitHub).
**Před jakoukoli novou prací nejdřív `git fetch upstream` a srovnej `main`**
s jeho aktuálním stavem, ať se nepracuje na zastaralém kódu a pozdější PR
je malý a čistý.

## Testovací Firebase projekt — NENÍ Davidův

- Projekt **`minimo-pracovni-prikazy`**, účet `sirace666@gmail.com`, plán
  **Blaze** (kvůli Storage/fotkám; stejný billing „My Billing Account" jako
  appka Pracovní příkazy).
- `firebase.json` + `.firebaserc` v tomhle repu cílí na tenhle testovací
  projekt — `firebase deploy --only firestore:rules` /
  `firebase deploy --only storage:rules` (pozor, `--only firestore:rules,storage:rules`
  dohromady občas hlásilo chybu, radši zvlášť).
- Testovací účty (Firebase Auth, jen v tomhle projektu):
  `admin.test@minimo.local` (role `admin`), `technik.test@minimo.local`
  (běžný pilotní uživatel, `assignedTo` test dat). Hesla viz historie
  konverzace s Martinem / dají se kdykoliv resetovat v konzoli
  (Authentication → Users).
- **Nikdy nemíchat s Davidovým `nakupni-pozadavky`** — ten má opravdová
  data 39 lidí z Yanfengu. Do něj se sahá jen na čtení (přes
  `martin.smrz.osobni@gmail.com`, který tam má Editor roli), nikdy na zápis
  bez výslovného schválení Martina.

## Než appku pošleme Davidovi (Pull Request) — checklist

Do jeho repa **nemáme** práva zápisu, takže vždy jde o Pull Request
z tohoto forku, ne přímý push (na rozdíl od toho, co má David napsané výše
pro sebe — „commituj rovnou do main" platí pro NĚJ v JEHO repu, ne pro nás
tady). Před otevřením PR:

1. Odebrat testovací e-maily — hledej `TODO před PR` v `udrzba.html`,
   `header.js`, `index.html` (`OWNERS`/`ADMIN_EMAILS`/`UDRZBA_OWNERS`/
   `OPRAVY_OWNERS`) a nechat jen Davidovy skutečné e-maily.
2. **Přepnout `firebaseConfig` zpátky na ostrý projekt `nakupni-pozadavky`
   — VE VŠECH 8 SOUBORECH**, ne jen v našich dvou novejch. Od
   2026-09-12 (na Martinovo přání) míří na testovací projekt
   `minimo-pracovni-prikazy` i Davidovy PŮVODNÍ moduly, aby šlo celé
   Minimo lokálně proklikat s testovacími účty:
   `index.html`, `udrzba.html`, `profil.html`, `nakup.html`,
   `dovolenky.html`, `opravy.html`, `engineering.html`, `nastaveni.html`.
   Hledej komentář `DOČASNĚ přepnuto` — je u configu v každém z nich.
   Ostrý config (`nakupni-pozadavky`, apiKey `AIzaSyDi3OVq2Al0WXFPgqhMAN9lPGuExOU80Cc`)
   je zapsaný výš v `03-firestore-data-nakupni-pozadavky.md` a
   `10-hosting-infra.md` v `..\..\Firabase Davida\`, nebo prostě
   `git show upstream/main:nakup.html` pro kterýkoli soubor.
3. Připravit textový dodatek pro `storage.rules` (blok `avatars/{uid}`) —
   David to musí ručně publikovat v konzoli, stejně jako to sám dělá
   (viz jeho `firestore-pravidla-pridat.txt`), protože Storage rules v repu
   nedrží.
4. PR obsahuje jen: `udrzba.html`, `profil.html`, `instalace.html`, diff v
   `header.js` + `header.css` + `index.html` + `firestore.rules` — NIC z
   nakup/dovolenky/opravy/engineering/nastaveni krom té jedné řádky
   s `photoURL`.

## Verzování (na Martinovo přání, stejně jako appka Pracovní příkazy)

I když je tohle „jen" pracovní fork, **po KAŽDÉ změně nebo opravě, kterou
Martin potvrdí jako v pořádku** (ne jen po velkých dávkách — upřesněno
2026-09-28, protože verze v0.10.1–v0.10.4 dřív dostaly tag, ale ne
Release, a Martin si toho všiml), udělej tag + GitHub Release:
1. Zvyš `VERSION` (semver — PATCH oprava, MINOR nová věc, MAJOR zásadní
   změna; zatím 0.x).
2. `git tag -a vX.Y.Z -m "…"` a `git push origin main --tags`.
3. `gh release create vX.Y.Z --title "…" --notes "…"` (repo
   `sirace666/minimo-pracovni-prikazy`) — **`gh` bývá nainstalovaný, ale
   ne na PATH**, co vidí Bash/PowerShell nástroje; pokud `gh` samo o
   sobě selže na "command not found", zkus přímo
   `"/c/Program Files/GitHub CLI/gh.exe"` (Bash) nebo
   `"C:\Program Files\GitHub CLI\gh.exe"` (PowerShell), než appku
   pokládej za nedostupnou.
4. Pro `--notes` s uvozovkami/závorkami v textu raději napiš poznámky
   do dočasného souboru a použij `--notes-file cesta` — inline text s
   `()`/„""` v Bash tool vede na syntax chybu.

## Dokumentace pro Davida (`docs/pro-davida.md`) — JEN NA DISKU, není v gitu

Martinova příprava na popis Pull Requestu pro Davida — lidsky čitelný výtah
**bez technických detailů** (na rozdíl od tohohle `CLAUDE.md`, který je
technický kontext pro Claude). Dvě sekce: co se změnilo v rozcestníku
(index.html) a co je nového v Údržbě (celý modul, o kterém David zatím
neví). Skončí jako `gh pr create --body-file docs/pro-davida.md`, takže
patří jednou natrvalo do popisu PR na GitHubu, ne zdvojeně i sem —
proto je v `.gitignore` a **NEcommituje se**.

**Pokud soubor v repu chybí** (např. po čerstvém `git clone` na jiném
počítači), založ ho znovu podle stejné šablony (dvě sekce výš). **Po
každé smysluplné dávce práce ho doplň** (krátce, pár vět, ne seznam
commitů), i když se necommituje — Martin ho použije, až appku bude
Davidovi ukazovat/posílat. Po zápisu si ho vždy znovu přečti, ať víš,
že se to uložilo.

**Důležité — týká se i sekce "Co jsme tady postavili" výš v tomhle
dodatku:** když upravíš kód, na který se `docs/pro-davida.md` nebo
"Co jsme tady postavili" odkazují, **zkontroluj a oprav i ten text**, ne
jen přidej nový řádek na konec. 2026-09-17 si Martin sám všiml, že oba
soubory pořád popisovaly starou zkrácenou podobu jména v hlavičce
("M. Smrž"), ačkoliv kód dávno (commit `774f27a`) přešel na celé jméno
("Martin Smrž") — dokumentace tím zůstala zavádějící, i když nikdo nic
nezapomněl zapsat.

## Kde je víc kontextu

- `..\..\Firabase Davida\` — přečtená struktura Davidova Firestore/Auth/
  Storage (read-only průzkum).
- `..\..\Github Davida\` — needitované kopie jeho repozitářů (`minimo-yfai`
  = živý, `Nakupni-pozadavky`/`Dovolenky` = archiv, nepoužívat).
