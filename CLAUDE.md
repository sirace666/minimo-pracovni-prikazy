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
  (vidí správci a lidé s pozicí PE nebo PE coordinator)
- `shopfloor.html` — Shopfloor walk: nálezy z obchůzky s plant manažerem
  (vidí správci a PE koordinátoři; komukoli dalšímu přístup přidá David v Nastavení)
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
- kolekce `sfw` — nálezy ze shopfloor walku (jeden dokument = jeden nález)
- dokument `meta/sfwcfg` — jediné pole `seq`, čítač čísel nálezů
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

## Modul Shopfloor walk (`shopfloor.html`)
Akční plán na to, co se najde při obchůzce výroby s plant manažerem.
Zapisuje se na telefonu přímo v provozu, čte se na počítači.

### Kdo tam smí
- **Výchozí stav:** správci podle e-mailu (`OWNERS`) a lidé s pozicí
  **PE coordinator** smí zapisovat. Ostatní modul vůbec nevidí — ani dlaždici,
  ani odkaz v menu.
- **Ruční nastavení má VŽDY přednost.** David přidá kohokoli dalšího
  v `nastaveni.html` → uživatel → Přístup k modulům → **Shopfloor walk**
  (Skryté / Jen číst / Zapisovat). Stejnou cestou jde přístup i koordinátorovi
  odebrat (Skryté).
- **„Jen číst"** znamená: nálezy vidí, ale nemá tlačítko na založení, políčka
  v okně jsou zamčená a v patičce zůstane jen Zavřít.
- **Mazat** smí jen správce (role `admin` nebo e-mail v `OWNERS`).
- **Tahle logika je na pěti místech a musí zůstat shodná:** `shopfloor.html`
  (`sfwAccess`), `index.html` (dlaždice), `header.js` (`shopfloorLink`),
  `nastaveni.html` (`sfwDefault` + `MODULES_LIST`) a `firestore.rules`
  (`sfwAccess()`). Když ji měníš, uprav ji všude.
- Na rozdíl od prostojů **nálezy NEvidí každý přihlášený** — je to zápisník
  z obchůzky vedení. Pravidla to hlídají i na serveru (`canSfwRead()`).

### Dvě záložky
- **🚶 Obchůzka** — pro telefon: velké oranžové tlačítko „Nový nález", pod ním
  karty nálezů s náhledem fotky. Filtr Dnes / 7 dní / 30 dní / Vše.
- **📋 Akční plán** — pro počítač: tabulka ve stejném formátu jako akční plán
  v Engineeringu (bílé vyplňuje uživatel, žluté jsou posuny, šedé se dopočítá),
  filtry, export CSV.
- Modul se sám otevře na té správné: pod 760 px na Obchůzce, jinak na Akčním plánu.
  Nepřepisuj na pevnou záložku.

### Formát nálezu
Číslo, datum obchůzky, oblast (`AREAS`), konkrétní místo, **co jsme našli**,
**co se s tím udělá**, owner (víc lidí, jména z kolekce `users`), termín, stav
(OPEN / IN PROGRESS / DONE / CANCELLED), fotky, poznámka.
- Číslo je PROSTÉ pořadové číslo z čítače `meta/sfwcfg.seq`, generuje se
  TRANSAKCÍ — jinak by dva lidi na obchůzce naráz dostali stejné.
- **Platný termín, počet posunů a „po termínu" se NIKDY neukládají**, počítají se
  z `dueOrig` a pole `moves`. Stejně jako v Engineeringu.
- Posun termínu jde uložit jen s důvodem; každý posun má datum, důvod, kdo a kdy.
- Řazení v plánu: po termínu nahoru, hotové dospod.

### Fotky
Pole `files`, v úložišti pod `sfw/{idNálezu}/…`, limit 5 MB na soubor.
- Tlačítko **„📷 Vyfotit"** je `<input capture="environment" multiple>` —
  na telefonu otevře rovnou fotoaparát. Vedle je „🖼️ Vybrat z galerie".
- Fotka se PŘED nahráním zmenší v prohlížeči (`shrink`, delší hrana 1600 px,
  JPEG 0.72). Nepřeváděj na nahrávání originálu.
- U nového nálezu se fotky drží ve frontě (`pending`) a nahrají se až po uložení,
  když je známé id dokumentu.

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
Přehled všech 5× proč / A3 z kolekce `problems`.
- **Zakládat A3 smí kdokoli, kdo do modulu smí, na cokoli.** Tlačítko
  „+ Nový A3 problem solving" je v hlavičce seznamu (a v prázdném stavu).
  Otevře `psNewModal()` — linka/stroj (našeptávač `psLineOpts()`: linky z importu
  + stroje z `meta/engcfg.machines` + linky už založených problémů, dá se napsat
  i linka, která v datech ještě není), týden (`psWeekOpts()`), spouštěč
  (`PS_TRIGGERS`) a krátký popis. Po založení se problém rovnou otevře.
  Rozepsané hodnoty drží `collectPsNew()`, aby je chybová hláška nesmazala.
- Když o vybrané lince máme data za ten týden, převezme se z nich výkon a prostoj;
  jinak zůstanou prázdné (`perf:null`). `createProblem(wk, line, trigger, opts)`
  bere vlastní titulek v `opts.title`.
- Druhá cesta zůstává: na **Hlavní stránce** se A3 nabídne sám u linky, která
  spadla pod práh výkonu. Nerušit ani jedno.
- Řadí se podle naléhavosti: eskalace → opatření po termínu → nejstarší. Sloupec
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

---

# DODATEK — tohle NENÍ Davidův text, čti dál (vývoj na forku)

> Vše výše je Davidův původní `CLAUDE.md` pro appku samotnou — **neměň ho,
> nepřepisuj, jen čti**. Tahle část je náš dodatek pro tenhle konkrétní
> **fork** (`sirace666/minimo-pracovni-prikazy`), kde s Martinem stavíme
> nové věci pro Davida. Kdykoliv sem přijde jiná/nová Claude Code session,
> ať čte i tohle, ne jen tu Davidovu část nahoře.

## ⚠️ POVINNÝ POSTUP PO KAŽDÉ ZMĚNĚ — VŽDY, BEZ VÝJIMKY ⚠️

Martin to výslovně řekl a už mě za to dvakrát napomenul: **tohle se dělá
VŽDY, po KAŽDÉ změně, kterou mu ukážeš (i drobnost, i oprava jednoho
řádku), i na zkušební/testovací větvi, i když o to znovu neřekne.** Nečekej,
až se zeptá. Zkušební větev NENÍ důvod nic z toho vynechat.

1. **`VERSION` +1** (PATCH oprava/doladění, MINOR nová věc). Nikdy
   přípona `-test`, `-wip` apod. — verze musí být čisté číslo.
2. **Commit** (a push větve: `git push origin <větev>`).
3. **`git tag -a vX.Y.Z`** a `git push origin --tags`.
4. **GitHub Release** `gh release create vX.Y.Z --title … --notes-file …`
   (české poznámky, co se změnilo). Mimo `main` přidej `--latest=false`,
   ať „Latest" zůstane na verzi z `main`. `gh` viz sekce Verzování níž.
5. **`docs/pro-davida.md` doplnit** (lidsky, bez techniky, krátce) a po
   zápisu si ho znovu přečíst — viz sekce „Dokumentace pro Davida" níž.
6. **Tenhle `CLAUDE.md` aktualizovat** — nejen přidat, ale OPRAVIT
   zastaralé body, které se změnou přestaly platit.
7. **Napsat Martinovi nové číslo verze** a že je vydaná (Ctrl+F5).

Než napíšeš „hotovo", projdi tyhle body. Když chybí byť jeden, hotovo není.

## ZAČÁTEK KAŽDÉHO CHATU — udělej sám, Martin ti nic vkládat nemusí

Martin není programátor a nechce do každého nového chatu psát zadání. Všechno potřebné je
v tomhle souboru a v paměti složky (`MEMORY.md` se načítá sám). **Při první odpovědi udělej:**
1. `git branch --show-current`, `git status`, `git log -3` — zjisti větev, verzi (`VERSION`) a
   jestli něco není rozdělané. Pracuješ na `vzhled-zkouska-1` (nebo jiné zkouškové větvi),
   NIKDY na `zakladni-vzhled` (viz „Větve a zálohy vzhledu" níž).
2. Zkontroluj Davida (`git fetch upstream` + kolik změn má navíc, viz „Git remotes").
3. Zkontroluj localhost: `curl http://localhost:8091/udrzba`. Když nejede, **nastartuj ho automaticky bez ptaní** — spusť ho jako
   samostatný skrytý proces (PowerShell: `Start-Process cmd.exe -ArgumentList '/c','npx -y serve
   -l 8091 .' -WorkingDirectory '<složka repa>' -WindowStyle Hidden`). **Nikdy `preview_start`** —
   aplikace Claude servery spuštěné tím nástrojem sama ukončuje. Port je VŽDY 8091. Pomocný
   `Spustit-localhost.bat` v kořeni repa (mimo git) spustí totéž dvojklikem.
4. Přečti **otevřené body** v paměti (`project_zakladni_vzhled_a_zkousky.md`, sekce „Otevřené
   body") a stručně Martinovi česky řekni: na jaké jsem větvi a verzi, kolik změn má David,
   jestli běží localhost, co je otevřené. Pak se zeptej, co chce dělat.
5. **Na konci každé větší práce otevřené body v paměti aktualizuj** (přidej nové, smaž vyřešené),
   ať je další chat dostane bez Martina.

### Klikací okénka ANO / NE (domluveno 2026-10-09, Martin to chtěl natrvalo)
Martin (tyká se mu) chce, aby se na rozhodnutí ptalo **klikacím okénkem** (nástroj `AskUserQuestion`,
nad políčkem pro psaní vyskočí otázka s tlačítky ANO / NE), ne obyčejným textem v chatu. Tohle
prostředí okénka umí (vyzkoušeno). Platí dvě pravidla:
1. **Kontrola Davida → návrh sloučení.** Když kontrola Davida (první odpověď v chatu / první zpráva
   nového dne) najde **nové změny** (`upstream/main` má před naší větví 1 a víc commitů): nejdřív napiš
   kontrolu jako **samostatný, jasně označený blok** („Kontrola Davida: má N nových změn — co jsou zač")
   a odpověz na to, na co se Martin ptal; **až úplně NA KONEC zprávy** otevři klikací okénko „Sloučit
   Davida do naší verze (`vzhled-zkouska-1`)? ANO / NE". Díky tomu Martin nemíchá odpověď na svůj dotaz
   s odpovědí na kontrolu. **ANO** = sloučit bezpečně (oddělená větev + `git worktree`, konflikty tak,
   aby zůstaly OBĚ strany, otestovat), pak nová verze podle povinného postupu, nasadit případně změněná
   pravidla na TESTOVACÍ Firebase, napsat Martinovi co je nového. **NE** = nic nedělat, příště se zeptat
   znovu. Návrh se týká VŽDY jen `vzhled-zkouska-1`, do `main` (ostrý web) nenavrhuj, dokud Martin sám
   nerozhodne. Nic nesluč bez jeho „ano". Když okénko nejde zobrazit, zeptej se normální větou.
   Týdenní úloha v Routines (`kontrola-davida-tydne`) jen oznamuje, okénko tam není — návrh přijde až
   při první zprávě v chatu.
2. **Pomocníci (subagenti, nástroj `Agent`).** Navrhuj je jen u **větších věcí, kde to opravdu dává
   smysl** (prohledat velký kód, nezávislá kontrola po sloučení nebo před Pull Requestem, víc nezávislých
   věcí najednou) — **ne pořád**. Vždy nejdřív **lidsky vysvětli, proč by se pomocník hodil** (co udělá
   a čím pomůže, a že je dražší než práce přímo v chatu) a pak otevři klikací okénko ANO / NE. Bez
   Martinova „ano" žádného nespouštěj. Drobnosti dělej sám.

Jak s Martinem mluvit a pracovat: **česky, lidsky a polopatě, tykej mu** (větve/tagy vysvětluj tak, že
větev se posouvá s novými commity, tag je záložka, která se nehýbe). **„Zatím nic nedělej" =
jen diskutovat a navrhovat, nepsat kód.** Při nejasnosti nabídni varianty (u vzhledu rád vidí
náhled/mockup před zásahem do aplikace). Heslo k testovacímu účtu `admin.test@minimo.local`
se Martina zeptej, když ho potřebuješ. **Kód v jednu chvíli smí v téhle složce měnit jen jeden
chat** — dva chaty ve stejné složce a větvi si mohou přepsat práci nebo přepnout větev pod
rukama.

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
    **HISTORICKÉ — tyhle dva `.typ-btn` tlačítka UVNITŘ formuláře jsou
    od 2026-10-01/v0.14.0 pryč** (viz bod „Formulář přeuspořádaný" níž):
    stejná volba CM/EM se dělá přes `.modal-tabs` úplně nahoře v
    modalu, `case 'set-typ'` zůstal (jen ho teď volají jiná tlačítka),
    `.typ-toggle`/`.typ-btn` CSS smazané jako mrtvý kód.
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
     jednoho matoucího pruhu. `.hero.notop{border-top:none}` — tehdy
     přidáno jen na `.hero` ve VIEW módu, protože edit mód tabs nad
     sebou NEMĚL. **Od 2026-10-01/v0.14.0 už MÁ** (viz „Formulář
     přeuspořádaný" níž — nahoře jsou teď EM/CM záložky i v edit/new
     módu) — stejný problém se objevil znovu a `.notop` přibylo i na
     `.hero` v `showEdit` větvi `modalView()`.
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
- **Pole WO + přiřazení víc lidem najednou (2026-10-01, v0.13.0)**:
  - **`udrzba/{id}.wo`** — nové volitelné pole, jen číslice (`oninput`
    v `bind()` ořeže vše, co není `\d`, `wo:'e-wo'` v `collect()`-ově
    `map`). Formulář (HISTORICKÉ, od v0.14.1 jinak — viz bod
    „Čtyři drobná doladění formuláře" níž): `<div><label>Pracovní
    příkaz</label><div class="wo-row"><span>WO</span><input
    id="e-wo">...`. Zobrazí se i ve view módu (`<dt>Pracovní
    příkaz</dt><dd>WO ${o.wo}</dd>`, jen když `o.wo` existuje) a je
    součástí `matchesSearch()`.
  - **`assignedTo`/`assignedToName` (string) → pole** — `Array.isArray`
    check všude přes nové pomocné `assignedUids(o)`/`assignedNames(o)`
    (zpětně kompatibilní: starší záznam se string hodnotou se zabalí
    do pole o jednom prvku). Nahrazeno na všech původních místech:
    `VIEWS` (`unassigned`/`mine`), `matchesSearch`, `unassignedHasEm`/
    `unassignedHasEmCrit`, `canEditDoc`, karta v seznamu, `<dd>` ve
    view módu, historie v `updatePrikaz()` (porovnání `assignedUids(old)`
    vs `assignedUids(editing)`, setříděné a spojené stringem, ne
    `!==` na celém poli). `collect()` už `e-assigned` nečte — zápis
    teď dělá přímo `case 'assign-confirm'`.
  - **Nové okno „Přiřadit pracovníky"** (`assignPicker` stav, `null`
    když zavřené; `assignPickerView()`) nahrazuje starý `<select
    id="e-assigned">` — otevírá se tlačítkem `.assign-trigger`
    (`data-a="assign-open"`, seedne `assignPicker.selected` z
    `assignedUids(editing)`). Tabulka: zaškrtávátko + jméno/pozice
    (`u.positions` spojené čárkou) + barevné odznaky „Rozpracováno"
    (`userWorkload(uid)` — počítá VŽDY přes CELÉ `rows`, ne jen
    aktuálně vyfiltrované, stejný princip jako čísla na dlaždici
    Náhradní díl: skutečné vytížení, ne jen to, co zrovna vidíš).
    Klik na odznak (`assign-drill`) rozbalí/schová seznam konkrétních
    rozpracovaných příkazů té osoby pod řádkem (`assignPicker.drillUid`,
    jen jeden najednou). Checkbox a jméno jsou DVA SAMOSTATNÉ prvky
    s vlastním `data-a="assign-toggle"` (NE `<label>` kolem celého
    řádku) — řádek má totiž uvnitř i klikací odznaky, a label by na
    ně klikem omylem přepnul i checkbox (nativní browser chování,
    který `stopPropagation()` neřeší). Potvrzení (`assign-confirm`)
    zapíše `assignPicker.selected` do `editing.assignedTo`/
    `assignedToNames` a teprve PAK se to uloží při `case 'save'` jako
    obvykle — nic se nezapisuje do Firestore přímo z okna.
  - **Okno jde otevřít NAD oknem příkazu** (dva `.overlay` v DOM
    najednou) — `renderShell()` teď přidává `assignPickerView()` za
    `modalView()` do `#main-host`, a scroll-preserving logika bere
    POSLEDNÍ `.modal-body` (`querySelectorAll(...)[length-1]`), ne
    první, ať sleduje to okno, co je navrchu/se zrovna scrolluje.
    `downOnOverlay` (sdílený mezi `close-bg`/`fav-close-bg`/novým
    `assign-close-bg`) funguje beze změny — overlaye nejsou vnořené
    do sebe (sourozenci v `#main-host`), takže si nepřekážejí. Na
    rozdíl od okna příkazu a oblíbeného filtru tohle okno NENÍ
    blokované proti zavření kliknutím mimo — dokud nedáš „Přiřadit",
    nic se nezapisuje do `editing`, takže na tom není co ztratit.
  - **Mimochodem odhalená a opravená chyba v `header.js`** —
    `splitEmailName()` dělila vstup jen na `.`/`_`/`-`, ne na mezeru.
    Kdykoliv `pn()`/`minimoDisplayName()` dostal už hotové "Jméno
    Příjmení" (ne e-mail/local-part), vzal se celý řetězec jako JEDNO
    slovo a `cap()` mu zmrzačil druhé slovo na malá písmena ("Martin
    Valik" → "Martin valik") — přesně tenhle případ nastává teď běžně
    u `assignedToNames`, co se plní přímo z `u.name` (ten už prošel
    `minimoDisplayName` při načtení `users`, je tedy hotový). Stejná
    chyba ale hrozila všude, kde appka `pn()`/`minimoDisplayName()`
    volá na podobně už hotové jméno — netýká se jen Údržby. Oprava:
    `local.split(/[._-]+/)` → `local.split(/[._\-\s]+/)` (přidána
    `\s` do třídy znaků) — e-mailové local-party (tečka/podtržítko/
    pomlčka) fungují beze změny, jen teď navíc správně rozdělí i
    mezerou oddělené už-hotové jméno.
- **Formulář příkazu přeuspořádaný + EM/CM nahoru jako záložky +
  Prostoj od + povinná pole (2026-10-01, v0.14.0)**:
  - **EM/CM se vybírá nahoře v `.modal-tabs`** (sdílené s Info/Historie
    — `const tabs = showEdit ? [EM/CM tabs] : [Info/Historie tabs]`
    v `modalView()`), ne uprostřed formuláře. Tlačítka pořád volají
    existující `case 'set-typ'` (`data-a="set-typ" data-v="EM|CM"`) —
    beze změny v `act()`, jen jiné místo v markupu. `.typ-toggle`/
    `.typ-btn` CSS smazané (mrtvý kód, viz historická poznámka u bodu
    „Typ (CM/EM) jako dvě tlačítka" výš). EM aktivní tab má vlastní
    barvu — `.modal-tab.on.typ-em{color:var(--danger);border-bottom-
    color:var(--danger)}` (CM nechává výchozí `--accent`).
  - **`.hero` v `showEdit` větvi dostal `notop`** — teď má nad sebou
    taky tabs (dřív neměl), takže by jinak nastal STEJNÝ „splývající
    pruh" bug, co se řešil dřív jen pro view mód (viz `.hero.notop`
    výš u bodu „Historie je teď druhá záložka").
  - **Pořadí a popisky polí v `editForm()`**: WO → Porucha (dřív
    „Název", stejné interní pole `nazev`, jen jiný `<label>` text,
    `collect()`/`validate()` beze změny klíče) → Popis → [cols2]
    Priorita | Prostoj od → [cols2] Linka | Stroj → [cols2] Obor |
    Přiřazeno.
  - **Nové pole `udrzba/{id}.prostojOd`** (string `YYYY-MM-DDTHH:mm`,
    nebo `null`) — checkbox `data-a="prostoj-toggle"` vedle Priority;
    `case 'prostoj-toggle'` v `act()`: když `editing.prostojOd` už
    existuje → `null` (zaškrtnutí pryč = hodnota se SMAŽE, needrží se
    skrytá); jinak se nastaví na aktuální datum/čas (ručně složené z
    `new Date()`, ne `toISOString()` — ten by byl v UTC, chceme
    místní čas rovnou ve tvaru, co čte `<input type="datetime-local">`).
    `<input type="datetime-local" id="e-prostoj-od">` se vykresluje JEN
    když `o.prostojOd` existuje; `collect()`'s `map` má `prostojOd:
    'e-prostoj-od'`, takže ruční úpravu času sebere normálně.
  - **DŮLEŽITÉ — `collect()` musí proběhnout PŘED akcí, co vyvolá
    `render()`, pokud tlačítko sedí UVNITŘ otevřeného formuláře** —
    `case 'set-typ'`, `case 'prostoj-toggle'` a `case 'assign-open'`
    teď všechny volají `collect()` jako první věc (přesně jako už
    dřív `#e-linka`'s `onchange`). Bez toho by přepnutí EM/CM záložky
    (nebo zaškrtnutí Prostoj od, nebo otevření okna Přiřadit) SMAZALO
    cokoliv rozepsané v `#e-nazev`/`#e-popis`/`#e-wo` — odhaleno až
    při testování (`render()` dělá celý `innerHTML` přepis, needitovaný
    DOM input text se nikam needitovaný neuloží sám). Kdyby přibylo
    další tlačítko přímo ve `editForm()`/jejím okolí, co spouští
    `render()`, potřebuje `collect()` na začátku stejně.
  - **Povinná pole** — `validate()` rozšířen o `linka` (vždy povinné),
    `stroj` (povinné JEN když má vybraná linka nějaké stroje —
    `sectionByName(editing.linka)?.machines?.length`, jinak by šlo o
    nesplnitelný požadavek u linky bez strojů) a `obor` (aspoň jedna
    položka v poli). Priorita se NEŘEŠÍ (má vždycky nějakou hodnotu
    díky posuvníku, Martinovo přání). Asterisk/červené orámování u
    každého pole kopíruje přesně vzor, co už existoval jen pro Porucha
    (`errs.klíč` → `<span>*</span>` + `.msg` div) — STEJNÁ nekonzistence
    jako předtím: hvězdička/červeně se ukáže až PO neúspěšném pokusu
    o uložení, ne preventivně předem (nikdo nežádal o změnu tohohle
    chování, jen o rozšíření na víc polí). **HISTORICKÉ — Martin si
    toho hned všiml a vyžádal opravu, viz v0.14.1 níž: hvězdičky jsou
    teď vidět VŽDY, červené orámování/`.msg` zůstává reaktivní (jen
    po neúspěšném uložení).**
- **Čtyři drobná doladění formuláře příkazu (2026-10-01, v0.14.1)** —
  reakce na Martinovy postřehy hned po vyzkoušení v0.14.0:
  - **WO přesunuto z `<span>` prefixu do placeholderu** — `.wo-row`
    (flex řádek se span `WO` + input) zrušen, je to teď JEDEN
    `<input id="e-wo" placeholder="WO" class="wo-input">` (`wo-input`
    jen drží šířku 140px, dřív to dělalo `.wo-row input`). Stejné
    `id`, takže `collect()`/`bind()`'s číslicový filtr (`wo.oninput`)
    fungují beze změny.
  - **Placeholder pole Porucha** — „co je potřeba udělat" (zbytek
    z doby, kdy se pole jmenovalo „Název") → „co se porouchalo".
    Martin navrhoval „co se stalo", ale výslovně chtěl jinou
    formulaci — zvoleno slovo ze stejného kořene jako název pole.
  - **(HISTORICKÉ — od v0.16.0 jsou Linka i Stroj tlačítka, co otevřou
    okno výběru, viz „Okno Vybrat linku / stroj" níž; `#e-linka`/`#e-stroj`
    ani datalist už neexistují, `collect()` je nesbírá.)** **Hledání u pole
    Stroj** — `<select id="e-stroj">` nahrazeno
    `<input type="text" id="e-stroj" list="e-stroj-list">` +
    `<datalist id="e-stroj-list">` (nativní HTML5 filtrování při
    psaní, žádný vlastní JS/panel jako u Linky — stačí to, protože
    na rozdíl od Linky tohle pole je JEDNOVÝBĚROVÉ, ne sada
    kombinovatelných filtrů, takže `linkaPickerCore()` vzor sem
    nepasuje 1:1). `id="e-stroj"` zůstalo stejné, `collect()` čte
    `.value` stejně jako u `<select>`, žádná změna tam potřeba.
    Placeholder se mění podle stavu (`hledat stroj…` / `linka nemá
    stroje` / `nejdřív vyber linku`), `disabled` dokud není vybraná
    linka — stejná logika jako dřív, jen jiný element.
  - **Hvězdičky povinných polí vidět hned** — Porucha/Linka/Obor mají
    `<span>*</span>` natvrdo (ne přes `errs.klíč` podmínku). Stroj má
    hvězdičku JEN když `sec && machs.length` (stejná podmínka, za
    které je pole opravdu povinné podle `validate()`) — proměnná
    `strojRequired` v `editForm()`. Červené orámování pole a `.msg`
    chybová hláška POD polem zůstávají beze změny — pořád se objeví
    až po neúspěšném „Založit"/„Uložit změny" (`errs.klíč`), teď jen
    dělají jinou věc než hvězdička: hvězdička = „tohle je povinné",
    červená = „tohle konkrétně teď chybí".
- **ZKUŠEBNÍ rozložení: tabulka s filtry ve sloupcích (2026-10-05/06, větev
  `test-tabulka-filtry`, verze `v0.15.0`–`v0.17.6`, další přibývají)** — Martin to chtěl
  „vzít jako test, možná se budeme vracet k dnešnímu rozložení". **Není
  v `main`**: návrat = `git checkout main` (stav v0.14.1, tag `v0.14.1`).
  **Verzování i tady platí jako všude** (Martin mě za vynechání napomenul):
  každá potvrzená změna = nový `VERSION` BEZ přípony „-test", tag a GitHub
  Release. Releasy z větve se dělají s `--latest=false`, ať „Latest" zůstane
  na `v0.14.1` z `main`. Verze `v0.15.0`–`v0.15.5` jsou doplněné zpětně na
  původní commity (soubor `VERSION` v nich ještě ukazuje `0.15.0-test`),
  `v0.15.6` je první s opraveným `VERSION`. Až to Martin potvrdí: sloučit do
  `main`, doplnit `docs/pro-davida.md`. Náhled, který se schvaloval, byl
  artefakt „Filtry ve sloupcích".
  - **Platí od 861 px šířky.** Pod tím je dnešní rozložení beze změny
    (karty + levý panel filtrů). `listView()` vykresluje OBĚ větve naráz:
    `.board2` (nová, na mobilu `display:none`) a `.board.old-only`
    (původní, na počítači schovaná přes `!important`); stejně `.sortbox`
    má `old-only`. Společná zůstává hlavička stránky, dlaždice, hledání
    a všechna okna. Žádný JS test šířky, čistě CSS media query.
  - **Sloupce** (`COLS`): Stav, Typ, Priorita, WO (pod ním malé číslo
    příkazu PP-…), Porucha, **Stroj / linka**, Obor, Přiřazeno, Prostoj od,
    Vytvořeno. Ve sloupci Stroj / linka je nahoře STROJ tučně a pod ním linka
    netučně drobně (Martin to chtěl obráceně než na kartách); bez stroje je
    jen linka tučně. (Šířky sloupců viz „Vzhled buněk" níž.) Menu toho sloupce má DVĚ ZÁLOŽKY **Stroj | Linka**
    (`COLS[].tabs`, stav `colTab`, akce `col-tab`): každá filtruje svou
    dimenzi (`filters.stroj` / `filters.linka`), mají vlastní hledání a počty,
    kombinují se (AND) a číslo na záložce ukazuje, kolik je v ní vybráno.
    Výchozí záložka je Stroj, kromě případu, kdy je zapnutý jen filtr linky.
    Možnosti strojů (`strojOptions()`) = stroje z `cfg.sections` + stroje, co
    jsou na příkazech. Řazení je podle stroje (pak linky). **Dlouhé seznamy
    v menu:** posouvá se jen `.cm-list`, řazení/záložky/hledání/patička
    zůstávají vidět. Výšku seznamu nastavuje `placeColMenu()` (inline
    `max-height` = místo do spodku okna minus ostatní části menu, min 110 px,
    max 420 px), takže „Hotovo" nikdy nevyjede pod okraj ani na nízkém okně;
    CSS `max-height:240px` je jen výchozí hodnota před prvním výpočtem.
    VE VŠECH filtrech se zaškrtávátky (Stav, Typ, Priorita, Stroj/linka, Obor,
    Přiřazeno, Prostoj, Vytvořeno), i u 2 položek, je stejně pod hledáním
    přepínač **Jen vybrané · N** (Martin chtěl jednotná menu; původně byl jen u
    seznamů delších než 7 položek)
    (`colOnly`, akce `col-only`; vypnutý, dokud nic není vybráno; resetuje se
    při otevření menu i přepnutí záložky; kombinuje se s hledáním; odškrtnutá
    položka při zapnutém přepínači hned zmizí). **Sloupec Porucha / díl** má
    stejně dvě záložky **Porucha | Díl** (`COLS[].tabs` s `nazev` a `nd`):
    Porucha = textové hledání v názvu, Díl = zaškrtávátka stavu dílu (potřeba
    objednat / čeká objednáno / přišel; sdílí `filters.nd` s dlaždicí
    Náhradní díl nahoře, ale počty v menu se počítají i podle dlaždic, ne jako
    na dlaždici). Text a seznam se v záložkách přepínají přes `TEXT_FILTERS[dim]`.
    **Filtr Stav v tabulce už NEMÁ volbu „Čeká na díl"** (`colOptions('stav')`
    ji vynechává — patří do záložky Díl); v `STAV_FILTER_OPTS` zůstává kvůli
    levému panelu na mobilu a oknu oblíbených filtrů. **Past, na kterou jsem narazil
    (v0.15.10):** pravidlo `:not(:disabled):hover` mělo vyšší specificitu než
    `.cm-onlybtn.on`, takže zapnuté tlačítko při najetí myší dostalo světlé
    pozadí a zůstalo bílé písmo (nečitelné). U každého prvku s `.on` stavem a
    `:hover` hlídej specificitu (`.on:hover` zvlášť, nebo `:not(.on)` v hoveru).
    Sloupec **Vytvořeno** ukazuje datum a pod ním
    drobně jméno autora (`authorName` přes `pn()`). Řádek je `button.trow` s `data-a="open"` (klik
    otevře okno příkazu jako dřív). Pozor: třída `.row` v appce je flex
    pomocník, proto tabulka používá `.trow`/`.thd`/`.tc`.
  - **Zarovnání tabulky (Martin: „špatné odsazení, překrývá se"):** sloupce
    jsou BEZ mezer (`column-gap:0`), odsazení textu dělá `padding-left:8px`
    na `.tc` i na tlačítku záhlaví `.hc` (+ `padding:0 1px` na obalu záhlaví,
    díky tomu mezi tlačítky zůstává 2 px a dva sousední aktivní filtry se
    nelepí). Dřív měla tlačítka záporný margin a přesah a překrývala se.
    Šířky v `--cols` počítají s tím odsazením — když přidáš sloupec nebo
    změníš text záhlaví, zkontroluj, že se `.hc-l` nezkracuje (`scrollWidth >
    clientWidth`). Buňky jsou zarovnané SHORA (`align-items:start`) a první
    řádek každé buňky má 20 px (`line-height`), druhý drobný 16 px,
    takže první řádky všech sloupců leží na jedné čáře; vertikální centrování
    buněk s různým počtem řádků tohle rozhazovalo. (Dřívější tmavší růžové
    odznaky `p-kritická`/`nd-potreba` a odsazení názvu o 9 px kvůli paddingu
    odznaku jsou od v0.17.0 pryč — v tabulce už žádné odznaky nejsou, viz
    „Vzhled buněk" níž; `.trow .badge` pravidla neexistují.)
  - **Vzhled buněk: text a barva, ne tabletky (v0.17.0, Martin: „dnes všechno
    jsou tabletky = odstraň, splývá to")**. Jediná „tabletka" v tabulce je
    štítek **EM** (`.emtag`, červený). Zbytek řeší barva a typografie:
    `Stav` = barevná tečka + text odstupňovaný podle toho, kolik pozornosti
    příkaz potřebuje (v0.17.1, „varianta A": Nový 700, Rozpracováno 600, oboje
    tmavé písmo; Hotovo 400 světle šedé `#6b7290` a tečka s `opacity:.5`;
    barvu nese jen tečka, ne písmo — třídy `.sd.s-novy/.s-roz/.s-hot`
    podle `stavTrida()`, volá je `stavHtml`, `STAV_BARVA`), `Typ` = CM šedý
    obyčejný text / EM červený štítek (`typHtml`), `Priorita` = ikona 1–4
    sloupečků + text barvy podle závažnosti, kritická tučně (`prioHtml`,
    `PRIORITA_TEXT`, třídy `.k-vysoká`/`.k-kritická`), stav dílu = barevný
    text s ikonou krabice pod názvem poruchy (`ndLineHtml`, `ND_BARVA`;
    `ndInlineHtml` je stejné pro menu a štítky), `Přiřazeno` = jména v modré
    `--accent` oddělená čárkou, **první TŘI jména, teprve pak „+N"**
    (`trHTML`), nepřiřazeno = šedá kurzíva `.none`, `Prostoj od` = ikona
    hodin + datum a čas (`prostojHtml`).
    **Prostoj NENÍ oranžový** (Martin: „oranžové už tam je dost, ztrácí to
    důležitost") — má vlastní barvu `--pj` (švestková `#a21caf`) a u hotového
    příkazu je ztlumený do šedé (`.pj.off`). Oranžová zůstala jen pro stav
    Rozpracováno. Prostoj se barví, dokud příkaz není hotový (ukládá se jen
    začátek, žádný konec). Typografie: tučný je jen název poruchy
    (`.tt`, 800), ostatní text 600/400, takže se řádek nemíchá do jedné
    tučné hmoty. Název je odsazený o 16 px (`padding-left`) a záhlaví Porucha
    o 23 px (`.hc[data-v="nazev"]`), aby text seděl pod nadpisem; změníš-li
    jedno, změň i druhé. Šířky v `--cols`: Stav 112, Typ 56, Priorita 96,
    WO 92, Porucha `minmax(190px,2fr)`, Stroj/linka `minmax(128px,1fr)`,
    Obor 88, Přiřazeno `minmax(130px,1fr)`, Prostoj 110, Vytvořeno 108;
    `.tbl{min-width:1130px}`.
    **Stejné barvy a ikony jsou i ve filtrech**: `colOptions(dim)` vrací pro
    typ/stav/nd/priorita/prostoj a `whoOptions()` pro Přiřazeno hotové `html`
    (stejné pomocníky jako řádek), `colMenuHTML` ho vykreslí v `.fc-label` a
    `chipHtml(dim,k)` totéž ve štítcích nad tabulkou (`sbarHTML`). Vybraná
    položka v menu má JEMNÉ podbarvení (`#eceefb`, tmavě modrý text), ne plnou
    navy jako dřív — na tmavém pozadí by barevné ikony a písmo zmizely.
    Kdykoli přidáš nový sloupec s barevnou hodnotou, přidej pomocníka a použij
    ho na obou místech (řádek + menu), ať se barvy nerozejdou.
  - **Hotové příkazy, záhlaví a pruh nad ním (v0.17.2, Martin vybral „záhlaví A"
    a „variantu 3")** — tři věci, které spolu souvisejí:
    1. **Hotové řádky ustoupí do pozadí** (`.trow.st-hotovo:not(:hover) …`): světle
       šedé pozadí `#f5f6fa`, bledě zelený pruh vlevo jen 3 px, žádná růžová ani
       u EM + kritická (`.trow.em.crit:not(.st-hotovo)`), název 600 a šedší, priorita
       a prostoj šedě, štítek EM světle červený, jména ztlumeně modrá. Po najetí
       myší se vrátí plné barvy (proto `:not(:hover)`). Ztlumený text má kontrast
       aspoň 4,65:1 na šedém pozadí — proto `#676e8c`, ne `#6b7290` (na `#f5f6fa`
       má jen 4,38). Změníš-li pozadí hotových řádků, změř kontrast znovu.
    2. **Záhlaví sloupců je ovládací pás** (`.thd`): modrošedé `#e9ecf8`, tmavě
       modré písmo a silnější spodní linka (2 px); sloupec se zapnutým filtrem
       je plně tmavě modrý (`.hc.on`), otevřený sloupec `#cdd4f0`. Musí se lišit od
       hotových řádků, jejich šedá by jinak splynula s původním `#f7f8fc`.
       Tmavě modré záhlaví (varianta B) Martin nechtěl — pod tmavou hlavičkou
       portálu by byly dva těžké pruhy nad sebou.
    3. **Pruh nad záhlavím `.sbar`**: vlevo „Zobrazeno N z M" a štítky filtrů,
       vpravo přepínač **Skrýt hotové**. Bez filtru má velmi světlou modrošedou
       `#f4f5fa` (v0.17.6; dřív byl bílý a splýval s bílou kartou, Martin: „je divný,
       jen bílý a splývá"), vlevo ikonu filtru (`.sb-ico`) a za počtem šedé „· bez filtru"
       (`.sb-nof`); dřívější trvalý návod „Klikni na záhlaví…" je pryč. Se zapnutým
       filtrem ikona zmodrá, „bez filtru" zmizí a pruh dostane třídu
       `filtered` (tlumená krémová `#fcfaf3` s okrajem `#ebe2c6`, ať nepůsobí jako
       varování) a „Zrušit filtry" je tlačítko `.sb-clear`. **Past při ladění barvy:**
       zjemňovat se má ubráním žlutosti, NE zesvětlením. `#fffbee` (v0.17.3) se od
       bílé liší o ~3,6 % jasu a na běžném monitoru splývala (Martin: „řádek je stále
       bílý"); `#fffaeb` (v0.17.4) a `#fcfaf3` (v0.17.5) mají stejný rozdíl ~4,4 %,
       druhá je ale méně žlutá. Původní sytá byla `#fff8e6` (~5,8 %). Při další změně
       hlídej, aby rozdíl od bílé neklesl pod ~4 %.
       `sbarHTML(n)` teď vrací `{filtered, html}`, ne řetězec.
       **Skrýt hotové** (`hideDone`, klíč `localStorage` `udrzbaHideDone`, výchozí
       ZAPNUTO, akce `hide-done`) skrývá hotové jen v TABULCE na počítači
       (`tableRows(rr)` v `listView()`); mobilní karty používají celé `rr` a přepínač
       nemají. Není to filtr: `clear-filters` ho NEMĚNÍ, do `activeFilterCount()` se
       nepočítá a není v oblíbených sadách (Martin: „Zrušit filtry zruší jen filtry,
       na Skrýt hotové to nemá vliv"). Když je ve filtru Stav zaškrtnuté Hotovo,
       přepínač hotové neskrývá (`doneShown()`), jinak by je nešlo najít — přepínač
       zůstane zapnutý a dostane popisek proč. „Zobrazeno N" počítá viditelné řádky,
       M je celkem. Počet skrytých hotových se záměrně NEPÍŠE (Martin to nechtěl).
       Zbudou-li po skrytí jen hotové (třeba hledání trefí jen hotový), místo
       prázdné tabulky se ukáže hláška „Zbývají jen hotové příkazy" s tlačítkem
       Zobrazit hotové (`.empty2` větev v `listView()`).
       Čísla na dlaždicích nahoře a počty v menu filtrů se přepínačem NEMĚNÍ.
  - **Pevný horní blok, rolují jen řádky (Martin):** od 861 px šířky a 560 px
    výšky se stránka sama nescrolluje. `#app` je flex sloupec o výšce okna
    (`100dvh`, `overflow:hidden`), `#main-host` → `main` → `.board2` → `.listcard2`
    se táhnou přes `flex:1; min-height:0`, hlavička portálu, `.pagehead`,
    `.sbar` (štítky filtrů) i `.thd` (záhlaví sloupců) zůstávají vždy vidět a
    posouvá se jen `.tscroller` (`overflow:auto`). `.thd` je `position:sticky;
    top:0` UVNITŘ toho posuvníku — proto se při vodorovném posunu hýbe spolu
    s řádky. Zkoušel jsem nejdřív sticky na stránce, ale `.tscroller` s
    `overflow-x:auto` i `.listcard2{overflow:hidden}` jsou posuvné kontejnery,
    ke kterým by se sticky přilepilo místo k oknu; proto celý tenhle „app shell".
    `.listcard2` má `max-height:100%` (ne stretch), takže při pár řádcích není
    karta zbytečně vysoká. Na nízkém okně (<560 px) se vrací běžné
    scrollování stránky. `renderShell()` zachovává `scrollTop` i `scrollLeft`
    `.tscroller` při překreslení (otevření okna příkazu, filtr…); když filtr
    seznam zkrátí, posun se logicky zkrátí taky. Menu sloupce je `fixed` a
    drží se u záhlaví, které se při svislém posunu nehýbe.
  - **Havarijka (EM) v tabulce NEMÁ červený obrys** (Martin: žádné EM nebude
    mít obrys) — zůstává červený štítek EM ve sloupci Typ, lehce červené
    pozadí u EM + kritická, která NENÍ hotová (`.trow.em.crit:not(.st-hotovo)`;
    u hotové poplach skončil, viz níž) a barevný pruh vlevo podle stavu. Karty na mobilu
    (`.order-item.em`) obrys mají dál, beze změny.
  - **Menu sloupce** (`colOpen`, `colMenuHTML()`): řazení + zaškrtávátka
    s počty (stejné `.filter-check` a `data-flt` jako starý levý panel, takže
    to samé `filters` a `passes()`); každé takové menu má hledání (`cm-q`;
    příznak `search` v `COLS` už neexistuje, hledání je vždy),
    sloupce WO a Porucha mají místo zaškrtávátek TEXTOVÉ hledání
    (`TEXT_FILTERS`, jedno pole `#cm-text` s `data-d`; WO jen číslice,
    Porucha volný text, hledá se v názvu poruchy bez ohledu na velikost
    písmen); sloupec Vytvořeno má hledání a zaškrtávátka autorů
    (`autorOptions()`, hodnota = `o.author`, jméno z `users`, jinak z
    `authorName`). Menu je
    `position:fixed`, polohu mu dává `placeColMenu()` na konci `bind()`
    (a při scrollu/resize), ne CSS — kdyby bylo `absolute`, ořízl by ho
    `.tscroller{overflow-x:auto}`. **Zavírání:** `[data-a]` tlačítka mají
    `stopPropagation()`, takže na ně dokumentový listener nedosáhne —
    proto `act()` na začátku zavře menu u jakékoli akce kromě
    `col-open/col-sort/col-clear/col-close`. Klik do prázdna a Esc řeší
    dokumentové listenery dole.
  - **Nové filtrovací dimenze** `filters.who` (uid, `_none` = nepřiřazeno),
    `filters.prostoj` (`ano`/`ne`), `filters.autor` (uid autora),
    `filters.stroj` (názvy strojů), `filters.wo` a `filters.nazev` (řetězce).
    Jsou v `passes()` s `skip`, mají `countWho`/`countProstoj`/`countAutor`/
    `countStroj` a počítají se do
    `activeFilterCount()` (štítek u „FILTRY", tlačítko Zrušit). **Do uložené
    oblíbené sady NEPATŘÍ** (schéma `udrzbaFilters` se nezměnilo, žádná změna
    pravidel): `favApply()` je při použití sady vynuluje a „Uložit aktuální
    výběr" při jejich zapnutí upozorní toastem. Při přidání další dimenze ji
    dej i do `clear-filters`, `favApply`, `favIsOn`, `activeFilterCount` a
    toastu u `fav-save-current`.
  - **Okno „Vybrat linku" / „Vybrat stroj" ve formuláři příkazu (v0.16.0):**
    Linka a Stroj už nejsou `<select>`/`<input>`, ale tlačítka `.assign-trigger`
    (`data-a="pick-open"`), která otevřou okno stejného vzhledu jako Přiřadit
    pracovníky (`pickPickerView()`, stav `pickPicker`; tabulka, hledání `#pk-q`,
    sloupec Rozpracováno s EM/CM a rozkliknutím příkazů, tlačítko Jen vybrané).
    Příkaz má JEDNU linku a JEDEN stroj, proto je výběr jednopoložkový
    (zaškrtnutí další položky nahradí předchozí) a „Jen vybrané" ukazuje tu
    jednu — Martin to chtěl jako u Přiřazeno; kdyby chtěl víc strojů na příkaz,
    je to změna datového modelu (`stroj` by byl pole) a filtrů. Stroje se berou
    jen z vybrané linky; změna linky vynuluje stroj (dřív to dělal `onchange`
    u `<select>`); linka bez strojů má tlačítko Stroj zakázané. Okno se
    otevírá NAD oknem příkazu jako `assignPicker` (`renderShell`, overlay
    `pick-close-bg`, `downOnOverlay`), `pick-open` volá `collect()` jako
    `assign-open`, výsledek zapisuje `case 'pick-confirm'` přímo do `editing`.
    Přiřazení pracovníků „Jen vybrané" zatím nemá (nebylo žádáno).
  - **Z-index:** `.favpanel` má `z-index:40` (nad `.thd` = 5), jinak by
    záhlaví sloupců překrývalo vysunutý panel oblíbených; pod menu sloupce
    (55), hlavičkou portálu (60) a okny (70).
  - **Řazení:** `SORT_VAL` + `sortRows()` — prázdná hodnota (bez WO/prostoje/
    přiřazení) jde vždy na konec, ať je směr jakýkoli; při shodě se řadí podle
    data vytvoření. Stejné `sortKey`/`sortDir` používá výběr „Řadit" na mobilu,
    proto má `SORT_OPTS` všech 10 klíčů.
  - **Levý panel oblíbených** (`favPanelHTML()`) je VŽDY úzký pruh 44 px
    (sloupec gridu je pevný, tabulka má celou šířku). Hvězdička v pruhu
    NENÍ (Martin ji nechtěl, jen v rozbaleném panelu je v nadpisu). V pruhu je
    nahoře **oko**, pod ním barevné tečky oblíbených (klik = použít filtr,
    `title` = název) a dole „+" (`fav-save-current`: nový filtr z aktuálního
    výběru, bez výběru prázdný). **Oko zapnuté** (`panelEye`, výchozí): po
    najetí myší vyjede plný panel (`.fp-full`, názvy, ✎, + Nový filtr, Uložit
    aktuální výběr) PŘES tabulku a po odjetí se schová. **Oko vypnuté:**
    zůstává jen pruh a filtry se berou tečkami; úpravu/přejmenování oblíbené
    sady pak jde udělat jen po zapnutí oka (✎ je v plném panelu). Oko je i
    v hlavičce plného panelu. Stav v `localStorage` (`udrzbaPanelEye`, '0' =
    vypnuto). `setPanelEye()` jen přepíná třídy `fp-eye`/`fp-noeye` na
    `#board2` a `act('panel-eye')` se vrací PŘED `render()` (dvě SVG ikony
    oka se přepínají CSS). Vysouvání je čistě CSS (`:hover` + zpoždění 250 ms;
    pro klávesnici `:has(:focus-visible)`, ne `:focus-within` — to by po
    kliknutí myší nechalo panel otevřený, dokud se nekliknne jinam), takže
    ho překreslení nerozhodí. Dřívější ruční zasouvání (šipka, režimy
    open/rail/auto, připínáček) je pryč.
  - **Barva oblíbeného filtru:** v okně Nový/Upravit filtr je za 8 hotovými
    kolečky duhové kolečko = vlastní barva (`<input type="color" id="fv-color">`
    přes celé kolečko, systémová paleta se spektrem a posuvníkem odstínu).
    `oninput` zapisuje `filterModal.color` a mění vzhled kolečka BEZ `render()`
    — překreslení by paletu uprostřed výběru zavřelo. Uložená barva se používá
    všude jako obyčejný hex (`style="background:…"`), schéma `udrzbaFilters`
    se nezměnilo. Okno je sdílené, takže vlastní barva jde i ze starého
    levého panelu (mobil).
  - **Past, na kterou jsem narazil:** třída na kontejneru (dřív režim `fp-rail`
    na `.board2`) se shodovala s třídou prvku uvnitř, takže styl pruhu (flex,
    šířka 44 px) přepsal celý grid. Proto se pruh jmenuje `fp-strip` a režimy
    jsou `fp-eye`/`fp-noeye`. Při testu v panelu prohlížeče: skrytý panel
    zastavuje CSS animace, takže případné šířky měř s `transition:none`.
  - Vodorovný posun tabulky (`.tscroller`) se při překreslení zachovává
    v `renderShell()`, stejně jako scroll okna příkazu.
- **VZHLED 1d „Karty · kompaktní" (2026-10-07, v0.18.0, větev `vzhled-zkouska-1`)** — Martin dodal
  zip z Claude Design (`Udrzba Redesign.dc.html` + `support.js`, tři varianty 1a/1b/1d) a vybral **1d**, jen vzhled
  stránky Údržba na počítači (od 861 px); portál/hlavička, okna příkazu, filtry i data BEZE ZMĚNY. Základ
  (v0.17.6) je záloha ve větvi `zakladni-vzhled` a tagu `zakladni-vzhled-v0.17.6`. **Tento bod NAHRAZUJE vzhledové popisy
  v bodě „ZKUŠEBNÍ rozložení: tabulka…" výš** („Vzhled buněk: text a barva, ne tabletky", „Hotové příkazy, záhlaví
  a pruh nad ním", barvy záhlaví a pruhu `.sbar`, krémová, navy barvy) — tamní *funkce* (filtry, řazení, menu sloupců,
  Skrýt hotové, oblíbené, pevný horní blok) platí dál. Co je teď jinak:
  - **Řádky tabulky** (`trHTML`) používají třídy `r2-*` (`r2Stav/r2Typ/r2Prio/r2Part/r2Who`): stav = kolečko (nový dutý) +
    tučný text, typ = mono štítek (EM červený), priorita = tónovaný štítek s 4 proužky, WO mono + číslo PP pod ním
    („bez WO"), stroj mono štítek + „Linka X" pod ním, obor jako obrysové štítky, přiřazení = avatary s iniciálami
    (max 3, barva podle `hueOf(jméno)`) + jména / „+ Přiřadit", prostoj fialový štítek s hodinami (`--pj`; u hotového šedý),
    vytvořeno = datum „5. 10. 2026" + autor (od 0.18.3; dřív „před N dny", funkce `relDays` je pryč). **Menu filtrů a štítky dál používají staré pomocníky**
    (`stavHtml/typHtml/prioHtml/ndInlineHtml/prostojHtml`) — nemíchat. Řádek je samostatná karta (border, radius 10,
    mezera 5 px); hotové jsou zešedlé BARVOU (od 0.18.13, dřív `opacity:.6`): pozadí `#f6f5f1`, text `#5f5b50`/`#66625a`, štítky šedé `#ebe8e0`,
    kontrast aspoň 4,5:1 (změřeno 4,7–7,2), po najetí myší plné barvy (pravidla `.trow.st-hotovo:not(:hover) …`); EM má růžové pozadí a červený okraj
    VŽDY (ne jen s kritickou; hotové EM jemnější `#faf0ee`). **Přidáš-li do řádku nový prvek, přidej mu i hotovou (šedou) variantu.**
  - **Záhlaví** `.thd` = šedý `#e9e7e1` pruh radius 9 (sticky; `box-shadow` v barvě pozadí zakrývá mezeru, ať v ní řádky při
    posunu neprosvítají), zapnutý filtr = text `#b8480f`. Akcentová barva v `.board2` a `.colmenu` je přepsaná na
    `#b8480f` (oranžovohnědá z návrhu); pozadí stránky `#f3f2ee`; písmo Figtree + JetBrains Mono (Google Fonts) jen v
    `.pagehead/.board2/.colmenu/.favpanel`, okna příkazu zůstala Nunito. Karta `.listcard2` je průhledná.
  - **Dlaždice nahoře** (od 0.18.3 bez červeného vykřičníku u Nepřiřazených — zůstává jen červené číslo) mají markup `.vt-icon` (SVG) + `.vt-body`; Náhradní díl ukazuje „N požadováno / N objednáno / N přišlo"
    (`.vt-nds`, popisky `.vt-sub` jen na počítači). Logika pohledů, `filters.view` i rozbalovací panel beze změny.
  - **Hledání je na počítači vždy vidět** (`.search-wrap.d-only`, lupa `.m-only` na mobilu); klik mimo ho na počítači
    NEzavírá ani nemaže (listener kontroluje `matchMedia('(min-width:861px)')`).
  - **Zkoušení bez přihlášení:** kopie stránky s falešným `stub.js` místo Firebase leží v `%TEMP%\minimo-test2` (server na
    8092, skript Playwright přes Chrome). Pole přiřazených jmen se jmenuje `assignedToNames` (množné číslo!).
  - Návrh obsahuje i stav „Pozastaveno" a typ PM — v datech Údržby NEJSOU, nepřidáno.
- **Okna ve vzhledu 1d + šest úprav (2026-10-09, v0.18.3)** — Martin chtěl sjednotit i okna s hlavní stránkou a po
  prohlédnutí dal šest požadavků. **Okna** (`.overlay`: příkaz, Přiřadit pracovníky, Vybrat linku/stroj, Nový/Upravit oblíbený
  filtr), toast a prázdný stav jsou ODVOZENÉ z palety hlavní stránky (návrh 1d je neřešil): bílá hlavička s tučným názvem a
  kulatým ✕, radius 18, `--accent` přepsaný v `.overlay` na `#b8480f`, hlavní tlačítka oranžové pilulky `#e8590c`, vedlejší
  bílé pilulky, pole radius 10, Figtree. Barevný pruh `.hero` podle stavu zůstal. Jen na počítači (`@media(min-width:861px)`).
  Šest úprav:
  1. **Oblíbený filtr (okno) nemá ve Stavu „Čeká na díl"** (`STAV_FILTER_OPTS.filter(s=>s.k!=='ceka-dil')` v `filterModalView`) —
     stav dílu patří do filtru Díl. Levý panel na mobilu ji má dál.
  2. **Vykřičník u Nepřiřazených pryč** (`unassignedHasEmCrit()` se v dlaždici už nepoužívá).
  3. **Vytvořeno = datum** (`dateCz(o.created)` bez koncové tečky), ne „před N dny".
  4. **„+ Přiřadit" v řádku tabulky** (`.r2-unas`, `data-a="assign-quick"`) otevře rovnou okno Přiřadit pracovníky a po „Přiřadit"
     **uloží přímo do databáze** (`assignPicker.direct` = id příkazu; `updateDoc` s `assignedTo/assignedToNames` + řádek historie).
     Smí jen `canEditDoc(o)` (správce / zadavatel / přiřazený); jinak toast. Okno otevřené z formuláře příkazu se chová jako dřív
     (zapíše do `editing`, ukládá se až „Uložit změny"). Je to `<span>` uvnitř `<button class="trow">` — `[data-a]` handler má
     `stopPropagation`, takže řádek se neotevře.
  5. **Posun v seznamech se po zaškrtnutí nevrací nahoru** — `renderShell()` si pamatuje `scrollTop` i u `.ap-rows`,
     `.cm-list` a `.linka-list` (dřív jen okna a tabulky).
  6. **„Jen vybrané" a „Zrušit vše" všude, kde se zaškrtává víc věcí:** okno Přiřadit pracovníky (`assignPicker.only`, akce
     `assign-only`/`assign-clear`), menu sloupce (Zrušit vše je tlačítko vedle Jen vybrané, dolní odkaz „Vymazat výběr" je pryč;
     u textových filtrů zůstalo „Vymazat"), panel Náhradní díl (`nd-clear`), panel Linka v levém panelu i v okně oblíbeného
     (`linka-clear`/`fav-linka-clear`), okno oblíbeného filtru (`fav-clear-all`). Tlačítka mají třídu `.cm-onlybtn`.
  - **Zkoušení:** stub Firebase (`%TEMP%\minimo-test3\stub.js`) zapisuje volání `updateDoc` do `window.__upd`, takže jde
    ověřit i uložení bez databáze.
- **Hledání ve všem + označení nalezeného textu (2026-10-09, v0.18.4)** — Martin: hlavní hledání má najít naprosto vše
  v příkazech a nalezený text se má označit jako Ctrl+F v dokumentu. `matchesSearch()` hledá v čísle, WO, poruše, **popisu**,
  jménech přiřazených, autorovi,
  prostoji, datu vytvoření i v **historii** (`o.hist`) — ale jen v jejích DATECH: datum, jméno a jména přiřazených. Šablonová
  slova řádků („upravil příkaz", „založil příkaz", „přiřazeno:", „stav … →", „díl objednán"…) se nehledají ani neoznačují (`histParts()`,
  `HIST_BOILER`, v0.18.8; datové části jsou v `<span class="hv">`). Přibude-li nový typ řádku historie (`hist.push(...)`), přidej jeho šablonu do `HIST_BOILER`/`histParts()`. Shoda je **PŘESNÁ včetně diakritiky** — nerozlišují se jen velká a malá písmena
  (v0.18.9, Martin: „přesně co napíšu"; „či" nenajde „cí", „dveri" nenajde „dveří"; `findWord()`/`textHas()`/`lcChar()`, dřívější „volné"
  hledání bez diakritiky je pryč); víc slov oddělených mezerou = příkaz musí obsahovat VŠECHNA (`searchWords()`). Nalezený text se po každém
  `render()` označí žlutě (`applyHighlight()`, `<mark class="hl">`) v řádcích tabulky, v kartách na mobilu a v detailu příkazu
  (jen v pohledu, ne ve formuláři). Shoda jen v tom, co v řádku není vidět (popis, historie), ukáže pod názvem poruchy
  nápovědu „🔎 shoda v popisu/historii" (`searchHiddenHint()`, třída `.r2-hit`). Popisek pole: „Hledat v příkazech…".
  **Stav, Typ, Priorita, Obor, Stroj, Linka a stav dílu se NEHLEDAJÍ ani neoznačují** (v0.18.10–0.18.12, Martin: na to jsou filtry) — není to ve `visibleSearchText()`
  ani v `HL_OK` (řádek „Linka / stroj" v detailu má třídu `nohl`); změny stavu v historii („stav nový → rozpracováno") jsou taky jen šablona. Hledá se jen název, popis, čísla (PP, WO), jména, prostoj, datum a data v historii.
  **Označují se jen DATA** (v0.18.5–0.18.6, Martin: „ne Přiřazeno, Přiřadit… ani další nepotřebné věci"): `applyHighlight()`
  označí text jen uvnitř bílého seznamu `HL_OK` (stav, typ, priorita, WO, číslo PP, název, stav dílu, stroj, obor, jména, prostoj,
  datum, popis, historie, odznaky, třída `.hv`) a mimo seznam `UI_SKIP` (tlačítka, popisky `dt`/`label`, „+ Přiřadit", „bez WO",
  „—"). Smíšený text se označí jen v datové části: u „Linka <b>Slush</b>", „Vytvořil <b>Karel</b>" je jen jméno ve `<span class="hv">`.
  Přibude-li nové datové políčko, přidej jeho selektor do `HL_OK` (nebo dej datové části třídu `hv`).
  **Křížek v poli hledání** (v0.18.6): s textem se v poli ukáže kulatý ✕ (`search-close`, `data-a="search-close"`), vymaže hledání a vrátí
  kurzor do pole; bez textu není vidět. Kříž je **SVG**, ne znak ✕ (v0.18.7 — znak se ve Figtree kreslil nakřivo/mimo střed). Na mobilu zůstává původní chování (lupa → pole s křížkem na zavření).
  Když přidáš do příkazu nové pole, přidej ho do `visibleSearchText()` (je-li vidět v řádku) nebo `hiddenSearchText()`.
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

## Větve a zálohy vzhledu (stav 2026-10-07) — PŘEČTI, než něco upravíš

Martin chce mít „Základní vzhled" jako zálohu a zkoušet jiné vzhledy. Proto:
- **`main`** (0.14.1) — stabilní, odtud se vystavuje web (GitHub Pages), je „Latest" release.
  Davidovy změny z 5. 10. 2026 v ní ZATÍM NEJSOU (Martin nerozhodl, zda je tam dát).
- **`zakladni-vzhled`** + tag `zakladni-vzhled-v0.17.6` + Release „Základní vzhled" — **ZAMRZLÁ
  záloha** tabulkového vzhledu v0.17.6. **DO NÍ SE NEZAPISUJE** (ani verze, ani opravy bez
  výslovné žádosti). Návrat k ní: `git switch zakladni-vzhled` a spustit localhost na 8091.
- **`test-tabulka-filtry`** — jen historie (v0.15.0–v0.17.6), nepokračovat.
- **`vzhled-zkouska-1`** (0.18.x) — vzhled „1d Karty · kompaktní" + sloučený David; **tady se teď pracuje**.
- `claude/eng-akcni-plan`, `claude/engineering-admin-emails` — starší Davidovy větve, které přišly
  s forkem. Nesahat.
- **Nová zkouška vzhledu = nová větev ze `zakladni-vzhled`**, ne úprava této. **Tagy jsou globální**,
  proto má každá zkouška vlastní řadu verzí (zkouška 1 = 0.18.x, zkouška 2 = 0.19.x…), jinak by
  se tagy srazily. Před každou úpravou ověř `git branch --show-current` (nikdy ne `zakladni-vzhled`).
- Vysvětlení pro Martina (nevývojáře): **větev se posouvá s každým novým commitem, tag je
  záložka na jednom commitu a nehýbe se**; release je popisek k tagu.

## Git remotes — DŮLEŽITÉ než začneš cokoliv upravovat

```
origin   = https://github.com/sirace666/minimo-pracovni-prikazy.git  (náš fork, sem pushovat)
upstream = https://github.com/varhandavid19-lgtm/minimo-yfai.git      (Davidův originál)
```

David appku dál vyvíjí (má i svoje Claude Code sezení napojené přes GitHub).
**Před jakoukoli novou prací nejdřív `git fetch upstream` a srovnej `main`**
s jeho aktuálním stavem, ať se nepracuje na zastaralém kódu a pozdější PR
je malý a čistý.

**Kontrola Davida se dělá pravidelně a sama se NEDĚJE (fork se neaktualizuje):**
při PRVNÍ odpovědi v každém novém chatu a při první zprávě po upozornění, že se změnilo datum
(i v dlouhém chatu, který Martin vede týdny), spusť `git fetch upstream` a
`git rev-list --left-right --count upstream/main...<aktuální větev>` (první číslo = kolik
změn má David navíc) a Martinovi česky jednou větou řekni „David má N nových změn" (a co jsou
zač) nebo „nic nového". **Nic nesluč bez jeho souhlasu.** Navíc běží týdenní naplánovaná úloha
`kontrola-davida-tydne` (pondělí ~8:30, jen oznámí; běží, jen když je aplikace Claude otevřená).

**Kontrola localhostu se dělá STEJNĚ jako kontrola Davida (Martin, 2026-10-09):** při PRVNÍ odpovědi v každém novém chatu a při první
zprávě po upozornění, že se změnilo datum, spusť `curl -s -o /dev/null -w "%{http_code}" http://localhost:8091/udrzba`. **Když
neodpoví 200, nastartuj ho SÁM, bez ptaní** (skrytý samostatný proces, ne `preview_start`):
PowerShell `Start-Process cmd.exe -ArgumentList '/c','npx -y serve -l 8091 .' -WorkingDirectory '<složka repa>' -WindowStyle Hidden`,
počkej asi 8 s a ověř 200 (`/udrzba`, `/shopfloor`). Port VŽDY 8091. Martinovi to řekni jednou větou („localhost běžel" /
„localhost nejel, nastartoval jsem ho"). Stejně ho zkontroluj kdykoli Martin napíše, že „nejde localhost" nebo než ho pošleš
něco prohlížet. Server může spadnout třeba po úklidu dočasných souborů nebo po restartu počítače.

**Stav srovnání s Davidem (aktualizováno 2026-10-09, verze 0.18.2):** do verze 0.18.2 je sloučený i jeho modul **Shopfloor walk** (`shopfloor.html`, 9. 10. 2026; 1 změna navíc, pravidla Firestore i Storage — cesta `sfw/`). Předchozí sloučení (2026-10-07): jeho `upstream/main` (26 nových změn:
Engineering — import prostojů z G463, import akčního plánu, pareto, problem
solving, mazání tasků; Nákup — „+ Import požadavků" z PDF; nová pravidla Firestore
a Storage) je sloučený do větve **`vzhled-zkouska-1`** (verze 0.18.1, přes pomocnou
větev `sync-david`). **`main` (0.14.1) a `zakladni-vzhled` (0.17.6) ho NEMAJÍ** —
`main` je pořád 77 změn před a 26 za Davidem. **NIKDY nepoužívej na GitHubu „Sync
fork" → „Discard commits"** (smazalo by naši práci); sloučení se dělá lokálně:
`git fetch upstream`, pak `git merge upstream/main` na samostatné větvi (pro testování
v odděleném `git worktree`, ať nespadne localhost na 8091), konflikty řešit tak, že
zůstanou OBĚ strany. Opakující se konfliktní místa jsou řádky s `uheaderHTML({…})`
a objektem `me`: naše `photoURL/firstName/lastName` + Davidovo `positions`
(a `modules` s `'engineering'`), a `index.html` (`MODULES`: Engineering má Davidovo
`engOnly:true`, Údržba naše `ownerOnly:true`). `storage.rules` = Davidovy `nabidky`,
`tasky`, `ps` + naše `avatars/{uid}` **PŘED** posledním pravidlem „nic jiného"
(jinak by avatary zakázalo). `firestore.rules` = naše `isAdmin()` s `level` + Davidovy
`myPositions()/isEngineer()/canEng()`. Po sloučení je nutné pravidla nasadit na
TESTOVACÍ projekt (`firebase deploy --only firestore:rules`, zvlášť `--only storage`) —
ověřit jde bez nasazení `--dry-run`. **Pravidla verze 0.18.1 jsou na testovacím projektu nasazená
(2026-10-07, firestore i storage zvlášť).** Po každé další změně `firestore.rules`/`storage.rules`
je nutné je nasadit znovu. Do Davidova ostrého projektu se nesahá.
Naše stránky `udrzba/profil/instalace` mají omezené menu (`modules:[…]`), takže
`positions` hlavičce nepředávají a nic se tím nerozbíjí.

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
   — VE VŠECH 9 SOUBORECH**, ne jen v našich dvou novejch. Od
   2026-09-12 (na Martinovo přání) míří na testovací projekt
   `minimo-pracovni-prikazy` i Davidovy PŮVODNÍ moduly, aby šlo celé
   Minimo lokálně proklikat s testovacími účty:
   `index.html`, `udrzba.html`, `profil.html`, `nakup.html`,
   `dovolenky.html`, `opravy.html`, `engineering.html`, `nastaveni.html`,
   `shopfloor.html` (Davidův modul, od 0.18.2 taky přepnutý na testovací projekt).
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
Release, a Martin si toho všiml; **znovu připomenuto 2026-10-06, protože
jsem to na zkušební větvi `test-tabulka-filtry` vynechal** — platí to i na
větvích, viz povinný postup na začátku dodatku), udělej tag + GitHub Release:
1. Zvyš `VERSION` (semver — PATCH oprava, MINOR nová věc, MAJOR zásadní
   změna; zatím 0.x). Bez přípony `-test`.
2. `git tag -a vX.Y.Z -m "…"` a `git push origin <větev> --tags` (na `main`
   `git push origin main --tags`). Mimo `main` při releasu `--latest=false`.
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
