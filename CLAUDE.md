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

## Modul Nákupní požadavky (`nakup.html`) — import z nabídky
Tlačítko „+ Import požadavků" vedle „+ Nový požadavek" otevře okno, kde se nahraje
nabídka (Excel / CSV / PDF), z ní se rozepíšou položky do řádků a z každého řádku
vznikne jeden požadavek. Knihovny na čtení souborů (SheetJS, pdf.js) se stahují
z CDN až ve chvíli, kdy někdo nabídku opravdu nahraje.
- Nabídka se do úložiště nahraje JEDNOU do `nabidky/import_<čas>_<náhoda>/` a stejná
  metadata se připnou ke všem požadavkům z importu. Taková příloha má `shared:true`
  a při mazání se ze **úložiště neodstraňuje** — odkazují na ni i ostatní požadavky
  z téhož importu. Nepřeváděj na mazání přes `deleteObject`.
- Políčka řádků importu mají `data-ir="klíč|pole"` (ne `data-a`), aby se okno
  nepřekreslovalo při každém stisku klávesy a nevyskakoval kurzor z políčka.
- Každý požadavek z importu vzniká ve stavu `nový`, stejně jako přes „+ Nový požadavek".

## Modul Engineering (`engineering.html`)
Prostoje na linkách, KPI a import týdenního reportu z interního systému Symestic.
- Report (Downtimes) má sloupce `Segment`, `Reason`, `Start time`, `End time`,
  `Duration`, `Net duration`, `Comment`. Poznají se podle názvu, na pořadí nezáleží.
  Umí se načíst `.xlsx` i `.csv`.
- **Druhý formát: report z G463** (soubor yftool). Pozná se sám podle záložek
  `Line - <linka>` (`g463Sheets`), čte ho `g463Parse`. Struktura záložky: název
  linky v `[1][7]`, sloupce dnů za buňkou `MTD` v jedenáctém sloupci, tabulka
  prostojů začíná řádkem s `Kód`. Bere se jen `[min]`, řádky `[Ks]` jsou rework,
  ne prostoj. Kategorie se mapují přes `G463_CATS`, `TPO PREPRODUCTION DP` patří
  pod proces G463.
  Report nedává jednotlivé prostoje, jen součet minut za den a důvod — vzniká
  proto jeden záznam na den, linku a důvod, s příznakem `daily:true` (v tabulkách
  se místo času ukáže „celý den"). Id je `datum_linka_kód`, takže opakovaný import
  nic nezdvojí. Počet přestaveb se bere z řádku „CO – Počet změn" do pole `coN`,
  jinak by changeover KPI počítalo jednu přestavbu za den.
- Knihovna na čtení Excelu (SheetJS) se stahuje z CDN, až když někdo opravdu
  importuje. Když se nestáhne, aplikace nabídne CSV, které umí přečíst sama.
- Časy z Excelu se počítají v UTC (`fromSerial`), aby se prostoj neposunul
  o hodinu podle nastavení počítače. Nepřepisuj na `new Date(...)` s místním časem.
- **Kdo do modulu smí:** správci podle e-mailu (`OWNERS`) a lidé s pozicí
  procesního inženýra nebo PE koordinátora (`ENG_POSITIONS` = IMM PE, SLUSH PE,
  FOAM PE, ASSY PE, GB/DP PE, PE coordinator). Pozice nastavuje David v Nastavení.
  **Tentýž seznam je na čtyřech místech a musí zůstat shodný:** `engineering.html`
  (`ENG_POSITIONS`), `header.js` (odkaz v menu), `index.html` (dlaždice na portálu)
  a `firestore.rules` (`isEngineer()`). Když ho měníš, uprav ho všude.
- Inženýři a koordinátoři smí zakládat a upravovat problem solving, opatření
  a tasky, zvýšit čítače v `meta/engcfg` a tenhle dokument i poprvé založit
  (bez toho by nezaložili nic, dokud správce neuloží nastavení standardu).
  Smí taky **nahrát report prostojů ze Symesticu** (`canImportDt()` = kdokoli,
  kdo do modulu smí). Import je idempotentní, opakované nahrání nic nezdvojí. **Nesmí importovat, měnit nastavení
  standardu ani mazat** — to zůstává správci (`canImport()` = role `admin`).
  Import **scrapu** zůstává správci (`canImport()` = role `admin`) a volba Scrap
  se ostatním v okně importu vůbec nenabídne.
  Stejně to vynucují pravidla Firestore (`canEng()`).
- KPI: prostoje po linkách, changeover time, podíl nezařazených prostojů.
  Scrap a cycle time čekají na odpovídající report ze Symesticu — dlaždice pro ně
  v přehledu už jsou a hlásí, že data zatím nejsou.
- **Záložka Scrap je jen odkaz ven** na samostatnou aplikaci Quality loss report,
  kterou dělá vedení kvality (`SCRAP_URL` v `engineering.html`). Vnitřní přehled
  scrapu (`scrapView`, kolekce `scrap` a `sc_months`) v kódu zůstává, ale z lišty
  se na něj nejde dostat. Nepřepisuj záložku zpátky na `data-a="tab"`.

### Procesy (hlavní stránka a KPI)
Závod je rozdělený na šest procesů (`PROCESSES`): **IMM, Slush, Foaming/Scoring,
Assembly IP, Glovebox/Decopart, G463**.
- Linka ze Symesticu se k procesu přiřadí podle názvu (`PROC_MATCH`, testuje se
  v pořadí od nejkonkrétnějšího — Assembly je nejširší, proto poslední;
  linka `PREFIX` patří pod G463). Ruční
  přiřazení jde uložit do `meta/engcfg.procLines = {IMM:['IMM-007',…]}` a má přednost.
  Co se nikam netrefí, spadne do `OTHER` a je vidět na hlavní stránce v žlutém
  proužku „Nezařazené linky".
- Nad dlaždicemi je přepínač období (`tileWk`): **Celý měsíc** nebo jeden
  z posledních 8 týdnů. Všechna čísla v dlaždici (prostoje, počet událostí,
  přestavby, výkon, nejhorší linka, největší důvod) se počítají za vybrané
  období, srovnání je proti předchozímu měsíci/týdnu a v malém grafu se vybraný
  týden zvýrazní. Výběr týdne posune i tabulku výkonu linek pod dlaždicemi.
- Hlavní stránka začíná **velkými dlaždicemi procesů** (`procTiles`): prostoje za
  vybrané období, minulý týden s porovnáním, počet přestaveb s průměrným
  časem, malý sloupcový graf prostojů za posledních 8 týdnů (`sparkWeeks`), výkon,
  otevřené problem solvingy a úkoly, nejhorší linka, největší důvod a linka
  s nejvíc přestavbami. Klik na dlaždici přepne na KPI toho procesu (`proc-kpi`).
- KPI má **podzáložky procesů** (`dashSubtabs`, stav `dashProc`). `totals(proc)`
  a `trend(proc)` filtrují na linky procesu.
- Aby to šlo filtrovat, ukládá import do `dt_days` rozpad **i po lince**:
  u každé linky pole `g` (skupiny důvodů), `r` (konkrétní důvody), `sh` (směny)
  a `co` (přestavby — počet a čas, z toho se počítá changeover na dlaždici). Starší importy to nemají — KPI na to upozorní proužkem
  a stačí report nahrát znovu. Nezmenšuj to zpátky na souhrn přes celý závod.

### Proklik z KPI do prostojů
Řádek v grafu, který má v položce pole `drill` (`'seg:IMM-007'`, `'group:…'`,
`'reason:…'`, `'shift:R'`), se vykreslí jako tlačítko. Kliknutí (`kpi-drill`)
přepne na záložku **Prostoje**, nastaví odpovídající filtr a zachová vybrané
období i proces. Nad tabulkou je pak lišta se štítky a tlačítkem **Zpět na KPI**.
Tabulka prostojů má kvůli tomu filtry i na proces (`f.proc`) a konkrétní důvod
(`f.reason`) — export CSV je respektuje taky.

### Řazení tabulky prostojů
Sloupce v záložce Prostoje jsou klikací (`EV_COLS`, stav `evSort`). První klik
na nový sloupec řadí u čísel a datumů od největšího, u textu od A; další klik
pořadí otočí. Filtrování i řazení dělá jediná funkce `visibleEvents()`, kterou
používá tabulka i export CSV — nerozděluj to zpátky.

### Generovat pareto (záložka `par`)
Samostatná stránka, která počítá **z jednotlivých prostojů** (kolekce `downtimes`),
ne z denních souhrnů — jen tam jsou poznámky. Nastavuje se linkami (vyskakovací
okno se zaškrtávátky po procesech), obdobím (`PAR_PERIODS` + vlastní od–do),
typy prostojů (`PAR_GROUPS`) a rozpadem (`PAR_DIMS`).
- Čte se max. 6 000 prostojů na jeden dotaz, při přetečení stránka upozorní.
- **Shluky podle poznámek** (`clusterComments`) jsou to hlavní: poznámka se zbaví
  diakritiky a interpunkce, slova se zkrátí na 6znakový kmen (metalbolty /
  metalboltu / metalbolt → `metalb`) a hledají se slova i dvojice slov, které se
  opakují. Dvojice mají váhu ×1,35, protože popisují problém líp. Každý prostoj
  padne k nejsilnějšímu výrazu, který obsahuje; shluk musí mít aspoň dva výskyty,
  zbytek jde do „Ostatní" a „Bez poznámky". Nepřepisuj to na přesnou shodu textu,
  lidi píšou poznámky volně.
- Graf `paretoChart()` je sloupce + kumulativní křivka s hranicí 80 %. Klik na
  sloupec i na řádek tabulky otevře **okno** (`parDetailModal`) s jednotlivými
  prostoji od nejdelšího po nejkratší, i s poznámkami a s exportem jen té jedné
  položky. Nevracej se k vypisování detailu do panelu pod grafem.

### Období v KPI a Prostojích
Volby jsou v `RANGES`: 7 / 14 / 30 dní, **Tento měsíc** a **Minulý měsíc**.
Stav `range` je řetězec (`'7'`, `'14'`, `'30'`, `'m0'`, `'m1'`), ne číslo.
Meze počítá `rangeBounds()` — u měsíců vrací i horní mez `to`, takže se dotaz
skládá se dvěma `where` (`>=` i `<=`). Když přidáváš další období, uprav
`RANGES` i `rangeBounds()`, nic jiného na to nesahá.

### Menu záložek
Záložky modulu jsou velká výrazná tlačítka (`.tab`), aktivní je tyrkysová.
Pořadí a názvy: **Hlavní stránka** (`mgmt`), **Problem solving** (`ps`),
**Akční plán** (`tasks`), **KPI** (`dash`), **Prostoje** (`list`),
Modul se otevírá na hlavní stránce (`engTab='mgmt'`), ne na KPI.
**Scrap ↗** (odkaz ven) a úplně vpravo, mimo menu, tmavomodrý **Import**
(`.tab-imp`, vidí ho jen správce). Klíče záložek v kódu (`engTab`) zůstaly
původní — přejmenoval se jen popisek.

### Pravidla úložiště (Storage)
Soubor `storage.rules` v repozitáři je jen kopie pro přehled — publikuje se RUČNĚ
v konzoli Firebase → **Storage → Rules**, což je jiné místo než pravidla Firestore.
Cesty: `nabidky/{requestId}/…` (nákup), `tasky/{taskId}/…` (akční plán),
`ps/{psId}/…` (problem solving). Když přidáš novou cestu, uprav soubor a napiš
Davidovi, ať ji publikuje.

## Řízení výkonu linek (záložka Hlavní stránka v modulu Engineering)
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
- **Zjednodušený formulář** (David, 09/2026). Okno problem solvingu má přesně tyhle
  části a nic víc: prostoj v minutách, vlastník, supervizor, stav, 1. popis problému,
  2. okamžité opatření, 3. kořenová příčina, 4. nápravné opatření + navázané úkoly,
  5. upravené dokumenty (zaškrtávátka), 6. ověření účinnosti. Původní osmiboxové A3
  (současný stav, cíl, analýza, plán implementace, standard práce) je pryč — stará
  data v dokumentech zůstávají, jen se nezobrazují ani nepřepisují. Nepřidávej boxy
  zpátky bez vyžádání.
- Zaškrtávátka dokumentů jsou v `PS_DOCS` (Karta parametrů, ODS, TPM, Work instruction,
  JobSetup), ukládají se do pole `docs`.
- **Přílohy a fotky** jsou v poli `files`, v úložišti pod `ps/{psId}/…`. Tlačítko
  „📷 Vyfotit" je `<input capture="environment">` — na telefonu otevře fotoaparát.
  Fotka se PŘED nahráním zmenší v prohlížeči (`shrinkImage`, delší hrana 1600 px,
  JPEG 0.72, typicky na pětinu). Nepřeváděj na nahrávání originálu.
- **Termín uzavření** je pole `dueDate`. Když se prošvihne (`psLate`), svítí problem
  solving červeně všude: řádek a odznak v seznamu, řádek na hlavní stránce, hlavička
  i políčko v okně, dlaždice „Po termínu" a řadí se nahoru. Neruš to.
- **Datum uzavření poslední akce** se nikam neukládá, počítá se z navázaných tasků
  (`lastActionClosed` = nejnovější `closedOn` hotového tasku).
- **Nápravná opatření jsou tasky akčního plánu**, ne vlastní kolekce. Tlačítko
  „+ Přidat úkol do akčního plánu" otevře stejné okno jako v Akčním plánu a task
  dostane vazbu `psId` + `psNo`. Kolekce `actions` v kódu zůstává kvůli starým
  záznamům, nová se do ní nezakládají.
- Problém nelze uzavřít, dokud nemá **kořenovou příčinu** a vyplněné **ověření
  účinnosti** (`canCloseWith`). Obojí je povinné — NERUŠ to.
- **Uzavření je na dva kroky a nejde obejít ručně.** Stavy `ke schválení` a `uzavřeno`
  nejsou v rozbalovátku (`PS_LOCKED`), nastaví je jen tlačítka:
  1. koordinátor (`isPsCoordinator` — supervizor problému, kdokoli s pozicí
     „PE coordinator", nebo správce) klikne **Uzavřít a poslat ke schválení**
     → stav `ke schválení`, zapíše se `closeRequestedBy` a `closeRequestedAt`
  2. Engineering Manager (`isEngManager` — jméno z `meta/engcfg.manager`, nebo
     správce) klikne **Schválit a uzavřít** → stav `uzavřeno`, `approvedBy`,
     `approvedAt`, `closedAt`. Může místo toho **Vrátit k dopracování** (s důvodem,
     stav zpět na `opatření`).
  Uzavřený problém už nejde editovat — v patičce zůstane jen Smazat a Zavřít.
- V seznamu: uzavřený je **zeleně** s odznakem „uzavřeno" a řadí se dospod,
  čekající na schválení je **žlutě** s odznakem „ke schválení" (filtr „skrýt
  uzavřené" ho neschová).
- Problem solving smí smazat jen správce (`canImport()`), a to z řádku v záložce
  Problem solving nebo z patičky detailu. Maže se i se svými opatřeními a vždy
  po potvrzení. Na serveru to hlídá `allow write: if isAdmin()`.
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
- Task smí smazat jen správce (`canImport()`), a to tlačítkem vpravo v řádku
  tabulky nebo z patičky okna tasku — vždy po potvrzení. Mažou se s ním i jeho
  přílohy v úložišti; navázaný problem solving zůstane. Na serveru to hlídá
  `allow delete: if isAdmin()` u kolekce `tasks`.
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

### Import akčního plánu z Excelu (ME TASK TRACKER)
V okně Import je třetí volba **📋 Akční plán** (`imp.kind==='tasks'`). Nahraje
Davidův původní excelový tracker (`ME_TASK_TRACKER_Excel.xlsx`) do kolekce `tasks`.
- Čte se jen `.xlsx` (ne CSV), záložka se jmenuje „Task Tracker". Hlavičku i řádek,
  kde začíná, hledá `mtParse` podle názvů sloupců v `MT_HEAD` — na pořadí sloupců
  ani na přesném řádku hlavičky nezáleží.
- Mapování sloupců (NEMĚŇ bez vyžádání): POPIS PROBLÉMU → `task`,
  NÁPRAVNÁ OPATŘENÍ → `output` (očekávaný výstup), ZODPOVĚDNÁ OSOBA → `owners`,
  PLÁN SPLNĚNÍ → `dueOrig`, DATUM VZNIKU → `createdOn`, STATUS → `status`
  (`MT_STATUS`: Complete → DONE, In Progress → IN PROGRESS, On Hold → OPEN,
  Cancelled → CANCELLED). Původní číslo, Projekt, Priorita, Typ úkolu, Okamžitá
  opatření, Dlouhodobé úkoly a Poznámky se slijí do `note`, aby se z Excelu nic
  neztratilo.
- Jméno ownera se normalizuje („Tadeáš Rešl" → `tadeas.resl`, bez diakritiky)
  a páruje se na kolekci `users`. Kdo v Nastavení není, vypíše se v náhledu jako
  varování — task se stejně založí.
- Oblast a stroj se HÁDAJÍ z textu popisu (`MT_AREA_TEXT`, `mtMachine`), potom
  z projektu (`MT_AREA_PROJECT`); když to nejde, dostane task IMM a v poznámce
  příznak „odhad". David si je pak v plánu opraví.
- Id dokumentu je `mt_<původní číslo>_<začátek popisu>`, takže **opakovaný import
  nic nezdvojí** — už existující tasky `runImportTasks()` přeskočí a Davidovy
  úpravy v aplikaci nepřepíše. Nepřeváděj na `addDoc` s náhodným id.
- Čísla tasků se rezervují JEDNOU transakcí nad `meta/engcfg.seqTask` (blok čísel
  dopředu) a zapisují po dávkách 400. Nedělej transakci na každý task.
- Import se zapíše do `dt_imports` jako ostatní importy.

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

### Když server zamítne zápis
Chyby zápisu prohání `writeHint(e)`. Místo anglického „Missing or insufficient
permissions" napíše česky, jaké pozice u přihlášeného aplikace vidí, a podle toho
poradí: pozici má → nejsou publikovaná pravidla Firestore; pozici nemá → ať mu ji
přidají v Nastavení. Nevracej se k vypisování `e.message`.

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
