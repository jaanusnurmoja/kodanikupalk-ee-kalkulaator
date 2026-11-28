# Netotulu režiim: sisestatud neto on kodanikupalgaga võrdne või sellest väiksem

Haru: `netotulu-kodanikupalk-katab` (main `dbc2774` pealt). Diff: `muudatused/netotulu-kodanikupalk-katab.diff`
(kogu haru main'i vastu): `media/calculator/ubiTaxCalcCompare.js` (84 rida lisandub, 17 muutub/kaob),
`moodulid/osad/02-sisend.phtml` (üks `<p>`), `moodulid/osad/01-top.phtml` (JS-i `?v=20261127` → `?v=20261128`) ja
genereeritud `moodulid/kalkulaator-uus.phtml` (`sync.py join`; `sync.py check --lint` korras). Main'i JS ja
`02-sisend.phtml` olid enne muutmist täpselt samad, mis sa mulle saatsid.

---

## 1. Soovitus

**Tee kõik kolm asja, aga hoiatus olgu neutraalne märkus, mitte punane veateade.**

| # | Mida | Miks |
|---|------|------|
| 1 | **Arvutus**: kui sisestatud neto ≤ täiskasvanu kodanikupalk, on tööandjalt vajalik neto 0 (mitte negatiivne), tööandja kulu kodanikupalgaga 0 € ja netotulu kokku = kodanikupalk | Ilma selleta on tabelis **negatiivne brutopalk**, sotsiaalmaksu kuumäär makstakse nullpalgalt ja protsendid on negatiivsed või **Infinity**. Hoiatus ei tee neid numbreid õigeks. |
| 2 | **Diagrammi lause** (sinu variant 2) | See on tulemus, mida kasutaja tahab teada, ja ta näeb seda seal, kus tulemust vaatab. |
| 3 | **Märkus sissetulekulahtri juures** (sinu variant 1) | Lause on lehel allpool, märkus seletab kohe sisestuse juures, miks tulemus on "teistsugune" (tööandja kulu 0, protsendid senise korra alusel). |

**Miks mitte ainult hoiatus:** tulemustabel jääks absurdseks. **Miks mitte lahtri blokeerimine / sisendi muutmine:** väike
netosoov on seaduslik stsenaarium ("soovin 400 €, kodanikupalk on 517 €, tööandjat pole vaja"); sisendi vaikne
muutmine oleks üllatav. **Miks märkus neutraalne (hall):** see ei ole kasutaja viga.

Sama summa (neto = kodanikupalk) = sama käitumine, erineb ainult sõnastus ("tagab kodanikupalk **üksi**", ilma
"võrra suurema" lauseosata).

Lastega leibkonnas jääb **netotulu täiskasvanute oma** (nagu praegu); laste raha tuleb eraldi olemasoleva lisalausega
(`kidsMore` / `kidsLess`).

### Mida kasutaja näeb (päris JS, 2026, kodanikupalk 517 €, variant 1, 1 täiskasvanu, ilma lasteta, protsendi alus brutopalk)

| Neto | Näitaja (KdP veerg) | Enne | Pärast |
|---|---|---|---|
| **400** | Brutopalk | **−166,17** | 0,00 |
| 400 | Sotsiaalmaks | 292,38 | 0,00 |
| 400 | Tööandja kulu kokku | 126,21 | **0,00** |
| 400 | Neto tööandjalt | **−117** | 0 |
| 400 | Netotulu kokku | 400,00 (< kodanikupalk) | **517,00** |
| 400 | Tööandja kulu % / netotulu kokku % | −75,95 / −240,72 | 0,00 / 129,25 |
| **517** | Sotsiaalmaks / tööandja kulu | 292,38 / 292,38 | 0,00 / **0,00** |
| 517 | Tööandja kulu % / netotulu kokku % | **Infinity / Infinity** | 0,00 / 100,00 |
| 517,01 ja 700 | kõik | | **muutumatu** |

Lause neto 400, 1 täiskasvanu (enne: "…peab tööandja kulutama **566,17 €** võrra vähem…"):

> Selle leibkonna (1 täiskasvanu, netotulu 400 €) soovitava täiskasvanu(te) netotulu tagamiseks ei pea tööandja
> kodanikupalgaga ühes kuus midagi kulutama (senise korra järgi peab tööandja kulutama **692,38 €**). Kodanikupalk
> tagab täiskasvanu(te)le soovitust **117 €** võrra suurema netotulu.

Neto = 517:

> Selle leibkonna (1 täiskasvanu, netotulu 517 €) soovitava täiskasvanu(te) netotulu tagab kodanikupalk üksi: tööandja ei
> pea kodanikupalgaga ühes kuus midagi kulutama (senise korra järgi peab tööandja kulutama **809,38 €**).

2 täiskasvanut + 3 last, neto 400, variant 2: lisandub "Kodanikupalk tagab … **234 €**" (2 × (517 − 400)) ja olemasolev
laste lause. Märkus lahtri juures:

> Sisestatud netotulu on kodanikupalgast (517 €) väiksem: kodanikupalk katab selle üksi ja tööandja kulu on
> kodanikupalgaga 0 €. Kodanikupalga veeru protsendid on seetõttu senise korra alusel.

(Viimane lause kaob, kui protsendi alus on netotulu / pct3.) Sõnastus järgib sinu ümbersõnastust ("soovitava
täiskasvanu(te) netotulu", "ühes kuus"); kõik uued tekstid on `TEXT`-is eraldi võtmete all (`coveredMore`,
`coveredSame`, `noteLess`, `noteSame`, `noteBase`), olemasolevaid ma ei puutunud.

---

## 2. Mis diffis muutub

`ubiTaxCalcCompare.js`:

- **`wageCalc`**: kaks uut konteksti välja, `c.netFromEmployer = max(0, sum − ubiAdult)` ja
  `c.ubiCoversNet = in3 && ubiAdult > 0 && sum <= ubiAdult`; ning `renderNetUbiNote(c)` kutse `renderResultSentence(c)` järel.
- **`grossUbiFromNetVariant1`**, **`calcGrossWageUbiFromNet` (variant 2)** ja **`applyTaxScenario`**: kasutavad
  `c.netFromEmployer`'it (varem `c.sum - c.ubiAdult`, mis läks negatiivseks).
- **`calcSocialTax`**: kui `ubiCoversNet`, on KdP sotsiaalmaks 0 (muidu annaks `socialTaxFor(0)` kuumäära 292,38).
- **`calcWageFund`**: kui `ubiCoversNet`, on `totalnet` = kodanikupalk (mitte väiksem sisestatud summa).
- **`calcPercentages`**: pct1 ja pct2 kasutavad `ubiCoversNet` korral KdP veeru alusena **senise korra** palgafondi /
  brutopalka (0-ga jagamise asemel). pct3 jääb samaks.
- **11. osa (lause)**: `fill` saab `{cost}`; uus `kidsText` (laste lisalause; `costSentence` kasutab seda nüüd ka,
  tulemus identne), `coveredSentence`, `buildSentence` valib selle (`ubiCoversNet && sum > 0`), uus `renderNetUbiNote`
  (`window.renderNetUbiNote`), uued `TEXT` võtmed, päisekommentaar.

`02-sisend.phtml`: `<p id="netubi-note" class="d-none" …>` `#eur` rea all, enne täiskasvanute märkeruutu. Elementi pole
vaja olemas olla; kui mobiilivaade kasutab eraldi HTML-i, lisa sama `<p>` sinna (muidu märkust seal ei näe, arvutus ja
lause töötavad).

"Tegelik (neto) maksukoormus" (bruto − neto) on kaetud juhul **negatiivne** (0 − 517 = −517: riik maksab 517 €,
maksu laekub 0). Valemit ma ei muutnud.

## 3. Paigaldus

1. Lae üles `ubiTaxCalcCompare.js`.
2. Uuenda Joomlas sisendmoodul (`02-sisend`) ja top-moodul (`?v=` tõsta) või kleebi kogu tervik.
3. Puhasta Joomla vahemälu, Ctrl+F5.

Järjekord: **JS enne**. Vana HTML + uus JS: märkus puudub, ülejäänu töötab. Uus HTML + vana JS: `<p>` jääb peidetuks.
**Tagasivõtmine:** taasta eelmine JS.

## 4. Kontroll (päris `ubiTaxCalcCompare.js` jsdom-lehel)

Kaks lehte, mõlemal PHP-ga renderdatud moodulid ja minimaalne Fabriku andmete stub (2026, kodanikupalk 517,
ühtekuuluvusmaks 29,59 %, uus ühtlane tulumaks 35 %):

1. sinu `02-sisend.phtml` + käsitsi tehtud tulemustabeli ja diagrammimooduli elemendid (alloleva A ja B arvud:
   3000 + 4608 stsenaariumi);
2. **repo päris tervik** `moodulid/kalkulaator-uus.phtml` (kõik viis moodulit, sh `03-diagramm` ja `04-tulemus`):
   1500 regressiooni- ja 2304 kaetud juhu stsenaariumi, tulemus **sama** (0 erinevust; uues koodis 0 negatiivset, 0 õige
   tulemuse rikkumist, 0 JS-viga; jääk-NaN sama `incometax_pct_ubi` nagu allpool).

Skriptid: `test/harness.js`, `test/stub.php`, `test/grid.js`, `test/table.js` (Projecti dokumendid, repos neid pole).

- **A. Regressioon, 3000 juhuslikku stsenaariumi** (režiimid tööandja kulu / brutopalk / netotulu; summad 518–5000;
  variant 1/2 × pct1/2/3 × kõik märkeruudud × 1 või 2 täiskasvanut × 0 või 3 last): vana ja uue JS-i **kõigi id-ga
  elementide väärtused** (tulemustabel, lause, märkus, diagramm) on **identsed** (0 erinevust), 0 JS-viga.
- **B. Kaetud juhud, 4608 stsenaariumi** (netotulu režiim, neto 0 / 100 / 400 / 516 / 516,99 / 517 × kõik ülaltoodud
  kombinatsioonid):
  - **vana:** 3840 stsenaariumis negatiivne väärtus (brutopalk, palgafond, neto tööandjalt või netotulu kokku), 704-s
    NaN/Infinity protsent;
  - **uus:** 0 negatiivset väärtust; KdP tööandja kulu, maksud ja neto tööandjalt on kõik 0; netotulu kokku =
    täiskasvanute kodanikupalk (+ laste raha) igal juhul; märkus ja lause õiged igal juhul (märkus peidetud, kui neto = 0).
  - Uues koodis jäi 128 stsenaariumis NaN: see on `incometax_pct_ubi`, mida arvutatakse **ainult pct2 režiimis** ja mis
    pct1/pct3 režiimis säilitab eelmise väärtuse (siin neto 0 stsenaariumist). Ilma neto 0 stsenaariumideta on NaN/Infinity
    0 (3840 stsenaariumi). See on olemasolev omadus, selle muudatusega seos puudub.
- **Sektordiagrammi väärtused** (Google Charts'i ennast ei jooksutatud): neto 400 juures `workernet` 146,08 → 0 ja
  `localtaxes_ubi` −19,87 → 0; `ubiamount` 253,92 → 517.
- **Tulpdiagramm (leibkonna sissetulek):** ilma veata ega NaN-ita; "Tööandja kulud: KdP" ja "Brutopalk: KdP" tulbad jäävad tühjaks (kogusumma 0).

**Ei kontrollitud:** päris Fabriku andmed ja päris leht (ühtekuuluvusmaksu määr on stub; kärpekohad puuduvad, seega
suurperetoetuse säilimise haru ei jooksnud), päris brauser, `calc-mobile.js`, `01-top.phtml`, aastad peale 2026.

## 5. Märkused ja valikulised järgmised sammud

- **Neto vahetult kodanikupalgast kõrgemal** (nt 517,01 €): bruto on 0,01 €, protsendid on matemaatiliselt õiged, aga
  absurdsed (nt tööandja kulu 2 923 900 %). Muutmata (sama käitumine kui enne). Soovi korral võib protsendi asemel näidata
  "–", kui alus on alla 1 €.
- **Tühjad KdP tulbad diagrammil:** võiks sel juhul ära jätta või asendada tulbaga "Tööandjat pole vaja"
  (`buildFamilyChartModel`).
- **Negatiivne sisestatud neto** (nt −5) käitub nagu 0; märkust ei näidata. Vajadusel `min="0"` sisendile.
