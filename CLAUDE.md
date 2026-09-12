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
- **`profil.html`** — nová **sdílená** stránka „Můj profil" (jméno, heslo,
  fotka), dostupná úplně odkudkoliv v Minimu přes ☰ menu.
- **`header.js` / `header.css`** — přidán odkaz na Profil (vždy viditelný,
  ne podle práv k modulu) a **profilová fotka/iniciály v hlavičce**
  (`uheaderHTML` teď bere navíc `photoURL`).
- **`index.html`** — dlaždice Údržba zapnutá (`ownerOnly:true`, pilotní
  režim), `photoURL` doplněn do `me`.
- **`nakup.html`, `dovolenky.html`, `opravy.html`, `engineering.html`,
  `nastaveni.html`** — JINAK BEZE ZMĚNY (je to čistě Davidův kód, řídí se
  Davidovou částí výše), jen přidán `photoURL` do `me`/`myDoc` a do volání
  `uheaderHTML(...)`, ať se fotka v hlavičce zobrazí i tady. Nic dalšího
  v nich neupravovat bez výslovného důvodu.
- **`firestore.rules`** — přidán blok pro `udrzba`, čítač `seqUdrzba`
  v `meta/config`, a `users/{uid}` update rozšířen, ať si každý smí sám
  upravit `name`/`photoURL` (dřív jen admin).
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
2. Přepnout `firebaseConfig` v `index.html`, `udrzba.html`, `profil.html`
   zpátky na ostrý projekt `nakupni-pozadavky` (config je vidět v
   Davidových nezměněných souborech, např. `nakup.html`).
3. Připravit textový dodatek pro `storage.rules` (blok `avatars/{uid}`) —
   David to musí ručně publikovat v konzoli, stejně jako to sám dělá
   (viz jeho `firestore-pravidla-pridat.txt`), protože Storage rules v repu
   nedrží.
4. PR obsahuje jen: `udrzba.html`, `profil.html`, diff v `header.js` +
   `header.css` + `index.html` + `firestore.rules` — NIC z
   nakup/dovolenky/opravy/engineering/nastaveni krom té jedné řádky
   s `photoURL`.

## Kde je víc kontextu

- `..\..\Firabase Davida\` — přečtená struktura Davidova Firestore/Auth/
  Storage (read-only průzkum).
- `..\..\Github Davida\` — needitované kopie jeho repozitářů (`minimo-yfai`
  = živý, `Nakupni-pozadavky`/`Dovolenky` = archiv, nepoužívat).
