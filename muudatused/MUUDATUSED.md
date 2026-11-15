# Kodanikupalga kalkulaator: JS ümberstruktureerimine

Projekt: Kalkulaator (kodanikupalk.ee/kalkulaator). Ülesanne: tõsta `<div class="container">` sees olev inline-JS faili `ubiTaxCalcCompare.js`, jagada selle pikad funktsioonid väiksemateks ja jätta saidi toimimine samaks.

## Failid

| Fail | Mis see on |
|---|---|
| `ubiTaxCalcCompare.js` | uus JS-fail (asendab vana tervikuna) |
| `kalkulaator.html.diff` | HTML-i muudatused unified diff-ina (rakenda oma malli peale) |
| `kalkulaator.muudetud.html` | sama muudetud kujul. **Pärineb sinu saadetud lehe hetktõmmisest** (sees on JS-i loodud märkeruudud ja diagrammi SVG), seega ära kopeeri tervikuna, vaid kasuta diffi |
| `MUUDATUSED.md` | see fail |

## Tulemus numbrites

| | Enne | Pärast |
|---|---|---|
| Funktsioone JS-failis | 15 | 76 |
| Pikim funktsioon | `wageCalc` 714 rida | `calcChartValues` 70 rida (neist 13 `console.log`) |
| Teine pikim | `revenueCalc` 242 rida | `readWageContext` 56 rida |
| Mediaan-funktsioon | | 9 rida |
| Inline-JS ridu HTML-is | 748 | 61 (FB SDK, jQuery scroll jt, mida ma ei puutunud, ja 11 ühe-reale kutset) |

## Mida tegin

**1. Inline-funktsioonid kolisid faili.** HTML-ist läksid `ubiTaxCalcCompare.js`-i: `toggleVals`, `getYear`, `toggleChecked`, `checkPeople`, `GetSelectValue`, `ChangeTFMLabel`, `ChangeFundedPensionLabel`, `GetRadiobuttonValue`, `toggleAnnualRevenueVisibility`, `toggleRowVisibility`, `toggleRadioVisibility`, `setUbiAmount`, `setEurGross`, `calcPeople`, `ubiCostReducers`, `calcReductionFull`, `calcReduction`, `toggleCostReducers`, `drawChart`, `userLanguage`, `getNumericValue`, `updateAdultAmount`, `initializeCalculator`. Kõik nimed on samad, sest 57 inline-käsitlejat (`onclick="outputCalc();..."`) kutsuvad neid nimepidi.

**2. Parameetrid ühte kohta.** Sama if/else-ahel aasta kohta oli kopeeritud 5 funktsiooni (`revenueCalc`, `wageCalc`, `displayAlert` + 2 HTML-is). Nüüd on `SUPPORTED_YEARS`, `SOCIALTAX_MIN` (tabel), `getIncomeTaxRate`, `getTaxFreeYearDefault`, `getFundedPensionFromSocialTax`, `getCheckedYear`. **Uue aasta lisamiseks:** lisa aasta `SUPPORTED_YEARS` ja `SOCIALTAX_MIN`; vajadusel kohanda maksuvaba tulu ja tulumaksumäära funktsiooni.

**3. `revenueCalc` (242 rida) → 7 funktsiooni:** `readRevenueContext`, `annualRevenueFromEmployerCost` / `FromGross` / `FromNet` (kolm sisendirežiimi), `calcAnnualRevenue`, `calcTaxFreeSumFromRevenue`, `revenueCalc`.

**4. `wageCalc` (714 rida) → 18 funktsiooni**, mis jooksevad ühes kindlas järjekorras (järjekord on oluline, hilisemad sammud loevad varasemate väljakirjutatud väärtusi):
`readWageContext` → `calcTaxFreeMinimum` → `calcGrossWage` (+ `calcGrossWageUbiFromNet`) → `calcSocialTax` → `calcInsuranceAndPension` → `calcIncomeTax` → `calcUbiTaxFields` → `calcNetWage` → `applyTaxScenario` → `calcWageFund` → `calcGrossTaxAndBurden` → `calcChartValues` → `calcPercentages` (+ `writePercents`).
Kolm peaaegu identset protsendiblokki (~45 rida igaüks) said üheks `writePercents(den)`-ks, mille kolm varianti erinevad ainult selle poolest, mida loetakse 100 %-ks.

**5. Init-kood HTML-is on nüüd üks kutse.** Samas kohas, kus varem oli skript, on nüüd nt `<script>initUbiModel();</script>`. Asukoht ja täitmisjärjekord on samad.

## Kuidas HTML-i muuta

Muudatused on `kalkulaator.html.diff`-is. Skriptiplokid sinu saadetud lehe ridade järgi:

| Read | Plokk | Uus sisu |
|---|---|---|
| 193–199 | `toggleVals` | eemalda |
| 970–982 | `getYear` | eemalda |
| 984 | JS-i viide | `…ubiTaxCalcCompare.js?v=20261017` (**vahemälu!**, vt allpool). Asukoht sama |
| 986–1180 | lehe funktsioonid | `<script>checkPeople();</script>` |
| 1185–1198 | `ubiAmount` algväärtus | `<script>initUbiAmountFromBaseData();</script>` |
| 1382–1574 | mudeli algseis ja kärped | `<script>initUbiModel();</script>` |
| 1616–1628 | `eur` algväärtus | `<script>initEurFromBaseData();</script>` |
| 1632–1636 | mediaan | `<script>initMedianHint();</script>` |
| 1772–1866 | Google Charts + `drawChart` | `<script>initCharts();</script>` |
| 2116–2122 | brutopalga väljad | `<script>initGrossWageFields();</script>` |
| 2225–2242 | `userLanguage` + lehe laadimine | `<script>document.addEventListener('DOMContentLoaded', clickDefaultInputMode);</script>` |
| 2249–2384 | täiskasvanu summa lause | `<script>document.addEventListener('DOMContentLoaded', initializeCalculator);</script>` |

**Viide JS-ile jäi samasse kohta.** Ümber seda tõsta ei saa ilma käitumist muutmata: init-kutsed allpool vajavad funktsioone kohe parsimisel, mitte alles lehe laadimise lõpus.

**Vahemälu.** HTML ja JS tuleb vahetada koos. Uus HTML koos vana vahemällu jäänud JS-iga läheks katki (`initUbiModel is not defined`); `?v=` sunnib brauseri uue faili tooma. Vana HTML koos uue JS-iga töötab (kontrollitud): JS-i ID-konstandid on tahtlikult objekt `ADULT_AMOUNT_IDS`, mitte tippkihi `const UBI_AMOUNT_ID`, sest vana HTML-i inline-`const` annaks topeltdeklaratsiooni SyntaxError'i.

## Kuidas kontrollisin, et toimimine ei muutunud

Kirjutasin testistiku (jsdom), mis laeb lehe kahes variandis (originaal ja uus) ja võrdleb pärast iga toimingut kõiki lehe väljade väärtusi, märkeruutude/raadionuppude seisu, klasse, globaalset olekut, diagrammide andmeid, konsoolilogi ja viskunud vigu.

| Test | Tulemus |
|---|---|
| Juhuslik kasutajasimulatsioon (30 seemet × 120 sammu, 2 lehekonfiguratsiooni), vana HTML + uus JS | 0 erinevust 3630 võrdluses |
| Sama, uus HTML + uus JS | 0 erinevust 3630 võrdluses |
| Süstemaatiline ruudustik: 7 aastat × 3 sisendirežiimi × 32 märkeruudu kombinatsiooni × 17 summat × 2 lehekonfiguratsiooni | 0 erinevust 22 848 võrdluses |
| Mutatsioonitest: süstisin uude koodi 32 tahtlikku viga (maksumäärad, aastapiirid, miinimumid, valemid, tingimused, diagrammi värv jm), et näha, kas testistik need avastab | tabati 32 / 32 |

Simulatsioon ja ruudustik ootavad enne võrdlust ära lehe täieliku laadimise, nii et käivituvad ka `DOMContentLoaded` ja `load` käsitlejad (`initializeCalculator`, `clickDefaultInputMode`, diagrammide algjoonistus). Testistiku esimene versioon seda ei teinud; mutatsioonitest paljastas selle lünga (kuna "täiskasvanu summa" valem jäi katmata), ma parandasin testistiku ja kordasin kõiki teste.

Uue JS-faili katvus juhusliku simulatsiooniga: 98 % lauseid, 95 % harusid. Katmata jäid kohad, mis ka originaalis ei käivitu: kasutamata `resetValues` ja `userLanguage`, surnud haru `year == 2017`, vaikeargumentide harud ja jQuery `resize`-käsitleja sisu (testis on jQuery asendatud).

**Piirangud.** (1) Testisin sinu saadetud `<div class="container">` osa; kui lehe teised osad (väljaspool seda) loevad või kirjutavad neid funktsioone, siis neid ma ei näinud. (2) jsdom ei ole päris brauser: Google Charts on testis asendatud andmeid salvestava asendajaga (diagrammi **andmeid** võrdlesin, joonist mitte). (3) Soovitan enne avaldamist teha 5 minutit käsitsi proovi päris brauseris: aasta vahetus, kolm sisendirežiimi, kodanikupalga summa muutmine, sihtrühma ja kärbete märkeruudud.

## Väikesed muudatused peale ümberstruktureerimise

- Lekkivad globaalmuutujad said kohalikeks: `X` (`round`-is), `n` (`revenueCalc`-is), `unitLabel` (`ChangeTFMLabel`-is). Neid ei kasutanud keegi mujal.
- Implitsiitsed elemendid-globaalid (`fpp_1`, `ubi`, `wagefund_std`, `grosswage_std`, `ui_employer_std`, `socialtax_std`; brauser teeb elemendi ID-st `window.<id>`) asendasin `getElementById`-ga. Kontrollitud: kõik ID-d on lehel unikaalsed.
- Eemaldatud kasutamata muutujad ja lugemised (nt `targetPeople`, `year2017`–`year2019`, `tfMonthDefault` `revenueCalc`-is, `rows`, `adult`).
- Eemaldasin tegevusetu `onpageshow` atribuudi `<script>` elemendilt (see sündmus kuulub aknale, mitte skriptile).
- **Kommenteeritud vana kood** (umbes 90 rida: 2017–2019 aastaharud, `netwageChange`, `ubiCalc`, `toggleAdult`, vanad valemivariandid) **jäi uuest failist välja**; originaalis on see alles. Kaks kommentaari, mis kirjeldasid protsendi aluse muutust, säilitasin. Kui tahad mõne tagasi, ütle.
- `console.log` read jätsin kõik alles (vt soovitused).

## Leiud originaalkoodis, mida ma tahtlikult EI parandanud

Parandamine muudaks käitumist, seega on need sinu otsustada:

1. `toggleAnnualRevenueVisibility` otsib elemente `revenue_row`, `taxfree_heading`, `taxfree_row`, mida selles `container`-is pole. Kui neid pole ka mujal lehel, viskab funktsioon `TypeError`. `GetRadiobuttonValue` vajab `<form name="wage">`, mida siin osas samuti pole. Aasta-raadionupu `onclick` katkeb neis kohtades, aga `window.open` on selleks ajaks juba lehe vahetamise käivitanud, seega pole see nähtav.
2. `taxfree_sum` välja `oninput` kirjutab elementi `tmpdebug`, mida pole (`TypeError`, kui kuskil mujal seda pole).
3. `writeValues`: `fieldId.includes("_ubi", -4)` negatiivne teine argument käitub nagu 0, ehk otsitakse sõne kogu ID-st, mitte lõpust. Kui keegi "parandab" selle `endsWith`-iks, muutub käitumine. Jätsin kommentaariga.
4. Kaks raadionuppu on sama `id="taxscenario"`. Kood kasutab `getElementsByName`, nii et töötab, aga HTML on vigane.
5. Tegevusetu jQuery scroll-kuulaja (mõlema haru sisu kommenteeritud) ja `document.write("")` lehe päises ei tee midagi. Võib eemaldada. Ma ei puutunud, sest see on päisemoodul.

## Soovitused järgmiseks sammuks

Neid **ei teinud** ma sel korral, sest need muudavad käitumist või vajavad sinu otsust. Mõõtsin originaalil:

| Toiming | `outputCalc` | `drawChart` | `getElementById` | `console.log` |
|---|---|---|---|---|
| Klõps raadionupul / märkeruudul | **2×** | **2×** | ~500 | 28 |
| Üks klahvivajutus brutopalga väljal | **2×** | **2×** | ~520 | 28 |

1. **Arvutus käivitub iga toimingu peale kaks korda.** Põhjus: HTML-is on `onclick`, `onchange` ja `onkeyup` (või `oninput`), kõik sama `outputCalc();drawChart();` kutsega. Lahendus: üks `addEventListener('input'/'change')` kuulaja per väli. Kogu 57 inline-käsitleja saaks siis asendada ühe `bindCalculator()` funktsiooniga ja HTML-ist kaoksid pikad `onkeyup=… onchange=… onclick=…` read. Siin on risk käitumise muutumises (sündmuste järjekord, `this`), seetõttu tuleks seda teha eraldi sammuna ja sama testistikuga üle kontrollida.
2. **`drawChart` joonistab kaks 3D-sektordiagrammi iga kord uuesti**, ka siis, kui väärtused ei muutunud. Hoia viimased andmed ja joonista ainult muutuse korral.
3. **14 `console.log` rida arvutuse kohta** (28 toimingu kohta). Pane `DEBUG` lipu taha või eemalda.
4. **`getElementById` ~240 korda arvutuse kohta.** Uus kood teeb neid umbes 16 % rohkem (klõpsu kohta 600 vs 518), sest väikesed funktsioonid otsivad oma elemendid ise. Absoluutselt on see tühine (mikrosekundid), aga ümberstruktureerimine **ei kiirenda**. Päris kiirenduse annaks elemendiviidete ühekordne vahemällu panek (`getWageElements()` DOM-i valmimisel) ning punktid 1–3.
