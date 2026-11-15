# Kalkulaatori mobiilisõbralikkus — muudatused

Eesmärk: kalkulaator ja lähteandmed on kasutatavad telefonis ja tahvlis, aga tavalisel arvutiekraanil (≥ 992 px) näeb leht välja täpselt nagu enne. Kogu kitsa vaate loogika on mallis `cassiopeia_kalkulaator` ja selle meedias; `ubiTaxCalcCompare.js` jääb muutmata.

## Failid

| Fail (Joomla paigas) | Staatus | Mis seal on |
|---|---|---|
| `templates/cassiopeia_kalkulaator/index.php` | muudetud | uus konteiner `.calc-layout`, vahelehtede nupud, veergude klassid, skripti registreerimine |
| `media/templates/site/cassiopeia_kalkulaator/css/user.css` | muudetud (originaal + lisatud mobiiliplokk lõpus) | vahelehed, peitmisnuppude stiil, tulemustabeli kitsas paigutus, ülevoolu parandused |
| `media/templates/site/cassiopeia_kalkulaator/js/calc-mobile.js` | **uus** | vahelehtede loogika, peitmise/näitamise nuppude genereerimine, diagrammide kohandamine |
| Kalkulaatori moodul (`kalkulaator-uus.phtml`) | muudetud | ainult tulemustabeli klassid + väikesed päisesildid |
| `mobiil.diff` | — | kõik muudatused ühes unifitseeritud diffis (`patch -p1`) |

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
4. Moodul: **ära asenda live-mooduli sisu täielikult** projekti phtml-iga. Live-versioonis on `ubi_child_x` `onchange` täiendatud (`document.getElementById('ei')…`), mida projekti `kalkulaator-uus.phtml`-is ei ole. Kasuta diffi (`patch -p1 < mobiil.diff` hoidla/koopia peal) või tee tulemustabeli muudatused käsitsi (14 rida + `F1`/`F2` + päiserida).
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
- Live-mooduli `ubi_child_x` erineb projekti phtml-ist (vt paigaldus, punkt 4) — väärib kontrolli, kumb on õige.
