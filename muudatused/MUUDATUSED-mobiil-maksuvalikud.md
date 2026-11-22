# Kodanikupalga kalkulaator: maksude arvestamise valikud nupu taga telefonis (kasutajamugavus, 3. etapp, 2. lahendus)

**Taust.** Esimene lahendus (mahaarvamised tõsteti CSS-iga palgavälja ette, vt `MUUDATUSED-mobiil-jarjekord.md`, PR #8) **ei aidanud** päris telefonis (Chrome). See on asendatud: mahaarvamiste plokk peidetakse kitsas vaates nupu taha ("Näita maksude arvestamise valikuid") ja mooduli veergudele on antud ainulaadsed id-d. CSS-i reegel `.calc-fit-cols > .col-R { order: -1; }` on eemaldatud.

Failid:

- `moodulid/osad/02-sisend.phtml` (tervik `moodulid/kalkulaator-uus.phtml` on sellest genereeritud): mooduli (2) kahele veerule on lisatud **ainult id-d**: `id="calc-income"` (palk, täiskasvanud, lapsed) ja `id="calc-deductions"` ("Mahaarvamised"). Klasse ja sisu ei muudetud.
- `media/templates/site/cassiopeia_kalkulaator/js/calc-mobile.js`: kolmas peitmisnupp (+62 / −11 rida koos väikese refaktoriga, vt allpool).
- `media/templates/site/cassiopeia_kalkulaator/css/user.css`: uus lipp `--calc-phone`, `order` reegel eemaldatud (+12 / −8 rida).

`ubiTaxCalcCompare.js`-i, `index.php`-d ega teisi mooduleid ei muudetud. Muudatus on diffina failis `mobiil-maksuvalikud.diff` (rakendub main'i seisule, kus PR #8 on sees).

**Paigaldus:**

1. Lae üles `user.css` ja `calc-mobile.js`.
2. Uuenda Joomlas moodul `KalkulaatorV3M (2)` (või kleebi kogu tervik).
3. Puhasta Joomla vahemälu ja tee telefonis Chrome'is värskendus (vajadusel andmete kustutamine või uus privaatne vaheleht, sest `user.css` ja JS võivad olla vahemälus).

Nupp ilmub alles siis, kui **kõik kolm** on paigas (`user.css` annab telefoni lipu, `calc-mobile.js` teeb nupu, moodul annab id). Muud kombinatsioonid on ohutud (testitud): uus JS + vana moodul (id-deta), uus moodul + vana JS ja uus JS + vana `user.css` (lippu `--calc-phone` pole) ei tee midagi ega anna uusi vigu, plokk jääb nähtavaks.
**Tagasivõtmine:** taasta eelmised `user.css`, `calc-mobile.js` ja moodul; id-d võivad jääda.

## Mida kasutaja näeb

| Vaate laius | Mida näeb |
|---|---|
| alla 768 px (telefon, ka külili) | "Maksustatav tulu" ploki all nupp **"Näita maksude arvestamise valikuid ▾"**; vaikimisi suletud. Puudutus avab: nupp muutub "Peida maksude arvestamise valikud ▴" ja selle all on plokk "Mahaarvamised" ("Arvesta sotsiaalmaksu …" jt). Kohe pärast seda tuleb diagrammimoodul. |
| 768–991 px (tahvel) ja arvutivaade | **nagu enne**: plokk on nähtav, nuppu pole |

Mõõdetud 360 × 740 px ekraanil (tulemus-lause olemas), kaugus palgaväljast:

| | Algne (enne etappi 3) | Eelmine lahendus (`order`) | **Nupp (see)** |
|---|---|---|---|
| tulemus-lause lõpuni | 827 px | 397 px | **480 px** (mahub 740 px ekraanile) |
| diagrammi lõpuni | 1364 px | 934 px | **1017 px** (ei mahu) |

Palgaväli ja lause mahuvad ühele telefoniekraanile; diagramm ise veel mitte. Nupp lisab eelmise lahendusega võrreldes ca 83 px (nupuriba: nupp 62 px, sest tekst murdub 360 px peal kahele reale, pluss vahed 4 + 16 px). Selle eest on palgaväli lehe ülaosa lähedal ja ekraanil on järjekord sama mis HTML-is (Tab ja ekraanilugeja järgivad nähtavat järjekorda; eelmise lahenduse ligipääsetavuse märkus ei kehti).

## Kuidas see töötab

- **Sama mehhanism nagu alusandmete ja kärbete nuppudel:** peidetakse klassiga `visually-hidden` + atribuut `inert`; elemendid ja nende väärtused jäävad DOM-i alles, kalkulaatori JS loeb märkeruutude `.checked` jm nagu enne. Midagi ei eemaldata ega tõsteta ümber.
- **Eraldi nupuriba.** Olemasolev nupuriba (`toggleBar`) on lähteandmete paanis; mahaarvamised on kalkulaatori paanis. Seetõttu loob JS eraldi riba `.calc-toggles.calc-toggles-tax`, mis lisatakse mooduli (2) rea `.calc-fit-cols` lapsena veergude `#calc-income` ja `#calc-deductions` **vahele**. Bootstrapi `.row > *` annab sellele täislaiuse ja veergude äärise.
- **Telefoni piir on CSS-is.** `user.css`: `--calc-phone` on 1 alla 768 px (Bootstrapi `md`), nagu `--calc-narrow` alla 992 px. JS loeb piiri `getComputedStyle`-iga (`isPhone()`), nii et piiri muutmiseks piisab ühest kohast.
- **Seaded `calc-mobile.js` alguses (`CONFIG`):** `taxSelectors` (`["#calc-deductions"]`), `startCollapsed.tax` (`true`), `labels.tax` (nupu tekstid).
- **Olek.** Ekraani pööramisel (telefon ↔ tahvel ↔ arvuti) nupp tekib ja kaob; kasutaja viimane valik (avatud / suletud) säilib. Nupu eemaldamisel võetakse peidetud ploki klass, `inert` ja märge ära (nagu olemasolevate nuppude puhul).
- **Väike refaktor olemasolevas koodis:** `removeToggles()` kasutab nüüd ühist abifunktsiooni `restoreGroups(list)`, ja `setCollapsed()` otsib nuppu kogu paigutusest, mitte ainult lähteandmete ribalt. Lähteandmete ja kärbete nuppude käitumine on sama.

## Piirangud ja teada märkused

1. **Vaikimisi märgitud valikud on nüüd peidus.** "Arvesta sotsiaalmaksu min. kuumäära alusel" ja "Arvesta maksuvaba tulu (700 € kuus)" on vaikimisi märgitud ja mõjutavad tulemust, ka siis kui kasutaja neid ei näe. Kui tahad, et need oleksid alguses nähtavad, pane `CONFIG.startCollapsed.tax` väärtuseks `false`. Võimalik edasiarendus: nupule kokkuvõte (nt "2 valikut kehtib"); seda ma ei teinud.
2. **Nupu sõnastus.** Kasutasin sama kuju nagu teistel nuppudel ("Näita … / Peida …"). Sinu ettepanek oli "Maksude arvestamise valikud / Peida"; tekstid on `CONFIG.labels.tax` all, muuda sealt.
3. **Piir 768 px.** 576–767 px (telefon külili, kokkuvolditav seade) on nupp samuti. Testlehel on veerud selles vahemikus niikuinii üksteise all, nii et seal muutub ainult nupu lisandumine. Päris saidil, kus veerud võivad mahtuda kõrvuti, jääks suletud olekus vasak veerg oodatavalt rea ainsaks lapseks ja kasvaks täislaiuseks; seda ma ei mõõtnud. Tahvlil (768–991 px) ei muutu midagi (piksliti kontrollitud).
4. **`calc-income` id-d ei kasuta praegu miski.** Lisasin selle sümmeetria ja tulevase kasutuse jaoks (nt kui palga ploki saab samamoodi käsitleda); eemaldamine on ohutu.
5. **Päismoodul (`01-top.phtml`)** kasutab endiselt klasse `col-L` / `col-R`; uus lahendus ei toetu klassidele, vaid id-dele, seega nad ei sega.
6. **Päris seadmel teadmata.** Ma ei tea, miks eelmine lahendus sinu telefonis ei aidanud (ma ei näinud seda, ja testkeskkonnas töötas see). Võimalikud põhjused: vana `user.css` vahemälus, moodul Joomlas uuendamata või ekraani CSS-laius (≥ 576 px). Kui nupp telefonis **ei ilmu**, anna teada: siis on järgmine samm vaateakna tegeliku laiuse (`window.innerWidth`) ja `.calc-layout` muutuja `--calc-phone` väärtuse kontroll.

## Kuidas kontrollisin

Chromium (Playwright). Testleht: moodulid 1–5 PHP-ga renderdatult, päris `ubiTaxCalcCompare.js` ja `calc-mobile.js`, `index.php`-i `.calc-layout` / vahelehtede struktuur, Bootstrap 5.3.3. **Enne** = main (moodulid, `user.css`, `calc-mobile.js`); **pärast** = see haru. Fabriku lähteandmed stubitud.

| Kontroll | Tulemus |
|---|---|
| Telefoniemulatsioon 360 × 740, **päris puudutused** (`hasTouch`): algseisus nupuriba on mooduli (2) reas veergude vahel; nupu tekst, `aria-expanded=false`, `aria-controls="calc-deductions"`; plokk `visually-hidden` + `inert`, kõrgus ≤ 2 px; peidetud märkeruutude `.checked` loetav; peidetud märkeruudule ei saa fookust; algseisu tulemus sama mis enne; palgaväli ja lause mahuvad 740 px ekraanile | jah (7 kontrolli) |
| Nupu puudutus avab: klass ja `inert` ära, tekst "Peida …", `aria-expanded=true`, plokk nähtav (> 300 px), ekraanil järjekord palgaveerg → nupp → mahaarvamised | jah (3) |
| Samad toimingud enne ja pärast (märkeruudu puudutus, maksuvaba tulu eemaldamine, summa 1500 → 2000 trükkimine **suletud** plokiga): neto, "senise korra" neto, lause, ühtlane tulumaks, märkeruutude seis | **identne** neljal sammul; sammud erinevad omavahel (neto 4298,40 → 4437,28) |
| Vahelehe vahetus; ekraani pööramine 360 → 800 → 1280 → 360 px: 800 ja 1280 px peal nuppu pole, plokk nähtav, klassi / inerti / märget ei jää, veerud 800 px peal kõrvuti; tagasi 360 px peal nupp ja valik säilivad (nii suletud kui avatud) | jah (7) |
| JS-vead: uusi pole; moodulit (2) / id-d pole; vana moodul + uus JS; uus moodul + vana JS (neljas kombinatsioon, uus JS + vana `user.css`, kontrollitud eraldi käsitsi) | jah (4 + 1); nuppu ei teki, plokk nähtav, uusi vigu pole |
| Piksliti identne enne ja pärast laiustel 768, 800, 991, 992, 1280, 1440 px; ülevool enne = pärast (576: 9 px, 992: 27 px, **juba enne olemas**, kõik muu 0 px) | jah |
| Diagrammi- ja tulemusmoodul (247–266 elementi) alla 768 px: iga elemendi mõõdud ja asukoht diagrammikaardi ülaserva suhtes enne ja pärast; 11 laiust (320, 360, 390, 430, 575, 576, 640, 700, 767 ning kontrolliks 768 ja 1280 px) | **identne**, 0 erinevust |
| `sync.py check --lint`: markerid, tervik = osad (baitideni), `php -l` | OK |
| Etapi 1 (lause) ja etapi 2 (maksumudel, 38 kontrolli) jsdom-komplektid uue terviku vastu | läbi |

Kokku 27 automaatkontrolli uue nupu kohta.

**Mida ma ei teinud:** ei testinud päris Cassiopeia- ega Fabriku-CSS-iga (testleht kasutab Bootstrapi ja mallis olevat `user.css`-i), ei päris telefonil (iOS Safari, Android Chrome) ega päris Google Chartsiga. Alla 768 px lehe kõrgus väheneb (320–767 px peal 230–400 px, sõltub laiusest); piksliti võrdlus on seal mõttetu, seetõttu kontrollisin paigutust elementide mõõtude võrdlusega.
