# Kalkulaatori mobiilisõbralikkus — muudatused

Eesmärk: kalkulaator ja lähteandmed on kasutatavad telefonis ja tahvlis, aga tavalisel arvutiekraanil (≥ 992 px) näeb leht välja täpselt nagu enne. Kogu kitsa vaate loogika on mallis `cassiopeia_kalkulaator` ja selle meedias; `ubiTaxCalcCompare.js` jääb muutmata.

## Failid

| Fail (Joomla paigas) | Staatus | Mis seal on |
|---|---|---|
| `templates/cassiopeia_kalkulaator/index.php` | muudetud | uus konteiner `.calc-layout`, vahelehtede nupud, veergude klassid, skripti registreerimine |
| `media/templates/site/cassiopeia_kalkulaator/css/user.css` | muudetud (originaal + lisatud mobiiliplokk lõpus) | vahelehed, peitmisnuppude stiil, tulemustabeli kitsas paigutus, ülevoolu parandused |
| `media/templates/site/cassiopeia_kalkulaator/js/calc-mobile.js` | **uus** | vahelehtede loogika, peitmise/näitamise nuppude genereerimine, diagrammide kohandamine |
| Kalkulaatori moodul (`kalkulaator-uus.phtml`) | muudetud | ainult tulemustabeli klassid + väikesed päisesildid |
| `mobiil.diff` | — | esimene versioon: kõik muudatused esialgse projektifaili vastu (aegunud, vt `mobiil-2.diff`) |
| `mobiil-2.diff` | — | kehtiv: muudatused GitHubi repo seisu vastu (`patch -p1` repo juurest): `calc-fit-cols`, `index.php` skriptitee |

## Mis tehtud

### Etapp 1 — veergudest vahelehed (alla 992 px)
- `index.php`: `.row` sees on kaks veergu, `col-12 col-lg-5` (lähteandmed, `#calc-pane-data`) ja `col-12 col-lg-7` (kalkulaator, `#calc-pane-calc`). Alates `lg`-st on need kõrvuti nagu varem.
- Enne veergusid lisatakse ARIA-vahelehed (`role="tablist"`, nupud **Kalkulaator** ja **Lähteandmed**; nooleklahvid, Home/End, ainult aktiivsel `tabindex=0`).
- Kui moodulipositsioon `calc` on tühi (nt nimekirjavaade), vahelehti ei ole ja lähteandmete veerg jääb nähtavale. Detailvaates avaneb vaikimisi **Kalkulaator**.
- Kitsa vaate piir on ühes kohas: CSS-i muutuja `--calc-narrow` (0/1). JS loeb seda `getComputedStyle`-iga, nii et CSS-i ja JS-i piirid ei lähe lahku.
- Ilma JS-ita (klass `.calc-js` puudub) vahelehti ei näidata ja veerud on lihtsalt üksteise all.
- Kleepuv päisekaart (`position-sticky`) on kitsas vaates tavaline (`static`), et ta ei kataks pool telefoniekraani.

### Etapp 2 — peitmise/näitamise nupud (kitsas vaates)
- JS genereerib kaks nuppu: **Näita alusandmeid / Peida alusandmed** (`#group161, #group210, #group164, #group205, #group207`) ja **Näita kärpevõimalusi / Peida kärpevõimalused** (`#group162`).
- Peitmine on klassiga `visually-hidden`; lisaks `inert`, et Tab ei satuks nähtamatutele märkeruutudele. Elemente ei eemaldata ega tõsteta, ID-d jäävad samaks ja kalkulaatori JS loeb väärtusi (`.value`, `.checked`, `.innerHTML`) nagu enne.
- Kitsast vaatest väljudes eemaldatakse nupud ja kõik peidetud grupid taastatakse; laienduses ja taas kitsendades säilib kasutaja valik.
- Seaded on `calc-mobile.js` alguses (`CONFIG`): millised grupid, kas alguses peidus, sildid, diagrammi kõrgus.

### Etapp 3 — moodul (phtml)
Muudetud on ainult klasse ja lisatud on 27 väikest `<span class="calc-cap">` silti; ühtegi ID-d, atribuuti (v.a. `class`) ega teksti ei ole muudetud (kontrollitud: 172 ID-d samad).
- Tulemustabeli 14 rida: nimetus `col-6` → `col-12 col-sm-6` (telefonis terve rida). Kodanikupalga veerg oli telefonis peidus (`d-none d-sm-block`) — **nüüd on see telefonis nähtav** (`col-6 col-sm-3`) ja mõlema väärtuse kohal on väike silt "Senise korra järgi" / "Kodanikupalgaga".
- Päiserida "Näitaja / Senise korra järgi / Kodanikupalgaga" on alla 576 px peidus (`calc-head-row`), sest iga lahtril on nüüd oma silt.
- Maksuvaba tulu / aastatulu rida (`F1`, `F2`): `col-6` → `col-12 col-sm-6`.
- Arvutivaates on `.calc-cap` peidus (`display:none`), seega vaade ei muutu.

### Muud kitsa vaate parandused (CSS)
- Horisontaalne kerimine kadus (320–991 px; enne 1041–1343 px laiune leht): nupurühmad murduvad, diagrammid ja laiad tabelid kerivad omas kastis, Fabriku lähteandmete rida on 2 veergu.
- Pealkirjad väiksemaks alla 576 px; aasta nupud kompaktseks; kärpetabeli summad ei murdu keset numbrit (`white-space:nowrap`).
- Sektordiagrammid: kitsas vaates joonistatakse need konteineri laiuse järgi (kõrgus 320, legend all) — `window.drawPieChart` ümbrisfunktsioon mallis. Arvutivaates kutsutakse originaal.

## Paigaldus

1. Tee varukoopia: `index.php`, `user.css` ja kalkulaatori mooduli sisu.
2. Laadi üles `calc-mobile.js` (uus) ja `user.css` — **enne** moodulit. Kui moodul jõuab lehele enne CSS-i, näeb arvutivaates korraks ka väikesi silte "Senise korra järgi / Kodanikupalgaga".
3. Pane `index.php` oma kohale. Skripti versioon tuleb faili muutmisajast (`filemtime`), käsitsi versiooni tõsta ei ole vaja.
4. Moodul: kasuta repo (GitHub) faili `moodulid/kalkulaator-uus.phtml` — see on live-mooduliga sünkroonitud (sh `ubi_child_x` `onchange` rida `document.getElementById('ei')…` ja kommentaarid mooduli piiridel). Esimese versiooni `mobiil.diff` põhines vanemal projektifailil ega sobi enam kasutamiseks; kehtiv on `mobiil-2.diff`.
5. Puhasta Joomla vahemälu ja tee brauseris Ctrl+F5.
6. Tagasivõtmine: taasta `index.php`, `user.css` ja moodul; `calc-mobile.js` võib jääda (ilma `.calc-layout`-ita ei tee ta midagi).

## Kontrollid (Chromium, Playwright; testlehe aluseks päris `index.php` renderdatuna + Bootstrap 5.3.3)

| Kontroll | Tulemus |
|---|---|
| Arvutivaade 1280, 1100, 1440, 992 px: täislehe ekraanipilt enne/pärast | piksliti identne |
| Lehe laius 320, 360, 390, 430, 576, 768, 991 px | ei kerigi horisontaalselt |
| Vahelehed: klõps, nooleklahvid, Home/End, `aria-selected`, `tabindex` | korras |
| Peitmisnupud: `visually-hidden` + `inert`, väärtused loetavad, kalkulaatori tulemus sama | korras |
| Laiendamine/kitsendamine (resize): olek taastub, nupud kaovad/tekivad | korras |
| Ilma JS-ita kitsas vaade | veerud üksteise all, vahelehti pole |
| Nimekirjavaade (calc-moodulit pole) | ainult lähteandmed, vahelehti pole |
| Kokku automaatkontrolle | 61, ebaõnnestunud 0 |

## Piirangud — mida siin ei saanud testida

- **Päris Google Charts** — testis oli see asendatud. Kontrolli telefonis, et sektordiagrammid mahuvad ja legend all on loetav.
- **Päris saidi CSS** (Cassiopeia põhi, Fabrik, `.W120`, `.R`, `.table-calc`, `.form-group` jms) — testis oli Bootstrap + mallis olev `user.css`. Väikesed nihked on võimalikud.
- **Päris seadmed** (iOS Safari, Android Chrome). Eriti: kõrvuti nupud, kerimine tabelites, klaviatuur.
- Teadaolev väike ebatäiuslikkus alla 576 px: Fabriku 2-veerulises lähteandmete ruudustikus on mõni lahter pooltühi; `.form-group` äärejooned ulatuvad ekraani servani.

## Otsused, mis on sinu teha

1. **Alguses peidus?** `startCollapsed: { base: true, cuts: true }` — telefonis avaneb leht kompaktselt. Kui tahad, et kärpeid saaks kohe muuta ja peidaks kasutaja ise (sinu sõnastus "peida kohe või muuda enne valikut"), pane `cuts: false`.
2. **`inert` peidetud gruppidel.** Vaikimisi sees (Tab ei kuku nähtamatutesse väljadesse). `inertWhenCollapsed: false` laseb ekraanilugejal peidetud sisu ka kokku volditult lugeda.
3. **Piir 992 px (Bootstrap `lg`).** Muutmiseks tuleb vahetada `@media (max-width:991.98px)` plokk `user.css`-is ja `col-lg-*` klassid `index.php`-s.
4. **Diagrammi kohandus.** Praegu on see mallis `drawPieChart` ümbrisena, et `ubiTaxCalcCompare.js` jääks puutumata. Puhtam oleks lasta `drawPieChart`-il endal konteineri laiust lugeda — see aga puudutaks kalkulaatori faili.

## Leitud, aga mitte muudetud

- `drawChart()` ei kutsuta pärast kodanikupalga summa, inimeste arvu ega kärpe muutmist, seetõttu võivad diagrammid näidata vana seisu (see on nii ka arvutivaates).
- Arvutivaates (≥ 992 px) on tabel `#pereneto` ("Kahelapselise pere netosissetulek") ja aastanuppude rida `#display-years` testlehel veerust laiemad (vasaku veeru piirini; lehe horisontaalkeritus ca 992–1440 px). See on originaalis samamoodi ja sellest ei ole muudetud, sest arvutivaade peab jääma samaks. Vajadusel saab neile lisada `overflow-x:auto` ümbrise.

## Täiendus 2026-11-15

1. **Moodul sünkroonis.** Live-mooduli `ei` rida ja mooduli piiride kommentaarid on nüüd phtml-is. Aluseks on repo (GitHub) `moodulid/kalkulaator-uus.phtml`, mitte esialgne projektifail.
2. **Kahe veeru kokkujooks (phtml read 263–461, moodul 2).** Põhjus: `.col-sm-6` annab veerule alati 50% laiuse, aga vasaku veeru tabel (summaväli `#eur` ja nupurida) vajab rohkem, nii et see ulatus parema veeru alla. Parandus:
   - reale `.row` lisatud klass `calc-fit-cols` (phtml);
   - `user.css` lõpus: alates 576 px on veerud `flex: 1 1 50%` (nagu enne 50% + 50%), aga kui sisu poole laiusesse ei mahu, läheb "Mahaarvamised" "Maksustatava tulu" **alla**. Piir tuleb sisu enda laiusest, mitte kindlast ekraanilaiusest, nii et see ei sõltu päris saidi CSS-ist;
   - nupurida `.btn-group.radio` murdub nende veergude sees vajadusel mitmele reale (ka arvutivaates);
   - alla 576 px on `#eur` 100% laiune, et see tabelit ekraanist laiemaks ei venitaks.
3. **`index.php` skriptiviide.** Tee on nüüd `media/templates/site/cassiopeia_kalkulaator/js/calc-mobile.js` ilma alguse kaldkriipsuta ja ilma `Uri::root(true)`-ta. Joomla `WebAssetItem` kontrollib `is_file(JPATH_ROOT . '/' . $path)` ja lisab ise saidi juure; kaldkriipsuga tee andis `//media/...`. Versiooni `filemtime` kasutab `JPATH_ROOT . '/' . $tee`. (Joomla 5.4 lähtekoodist kontrollitud; päris Joomlas ei testinud.)
4. **GitHub.** Failid on repos https://github.com/jaanusnurmoja/kodanikupalk-ee-kalkulaator. `mobiil-2.diff` on tehtud selle repo seisu vastu: `patch -p1 < mobiil-2.diff` repo juurest.

### Kontrollid

| Kontroll | Tulemus |
|---|---|
| Moodul 2 col-L/col-R ülekate, 26 laiust (320–1920 px), enne parandust | kuni 127 px (kalibreeritud testlehel 192 px) |
| Sama pärast parandust | 0 px, ülevoolu veerust 0 px |
| Vahelehtedega vaade 576, 640, 700, 768, 900, 991 px, kus ülekatet polnud | piksliti identne (täislehe ekraanipilt enne/pärast) |
| Telefon 320–575 px: `#eur` ei venita tabelit | korras (lehe laius = ekraani laius) |
| Eelmised 61 automaatkontrolli (vahelehed, peitmisnupud, resize, ilma JS-ita, diagrammid) uue aluse peal | 61 läbitud, 0 ebaõnnestunud |

### Mida pärast parandust näed

- **Veerud mahuvad kõrvuti:** vaade on nagu enne.
- **Ei mahu:** "Mahaarvamised" tuleb "Maksustatava tulu" alla (täislaiuses). Päris saidil sõltub see, millise laiuse juures see juhtub, vasaku tabeli tegelikust minimaalsest laiusest. Kui see juhtub sinu arvates liiga laial ekraanil (nt 1280 px), anna märku; siis tuleks `#eur` tegelik laius saidi CSS-ist üle vaadata.

### Otsus sinu teha

- **Alla 576 px `#eur` 100% laiune?** Praegu jah (vastasel juhul ületab ~310 px lai väli 320 px telefoni). Kui tahad, et väli jääks kitsaks, eemalda `@media (max-width: 575.98px)` plokk `user.css` lõpust ja anna väljale mõni kindel laius.
