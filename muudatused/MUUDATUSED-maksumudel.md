# Kodanikupalga kalkulaator: maksumudeli valik diagrammi juures (kasutajamugavus, 2. etapp)

Failid: `moodulid/osad/03-diagramm.phtml` (nupud ja nende stiil; tervik `moodulid/kalkulaator-uus.phtml` on sellest genereeritud), `moodulid/osad/01-top.phtml` (JS-i viide `?v=20261120` → `?v=20261121`) ja `media/calculator/ubiTaxCalcCompare.js` (uus 12. osa ja üks rida `wageCalc()`-is). Muudatused on diffina failis `maksumudel.diff` (rakendub main'i seisule, kus lause etapp 1 on juba sees).

**Paigaldus:** laadi **JS esmalt üles**, alles siis uuenda Joomlas moodulid `KalkulaatorV3-top` ja `KalkulaatorV3M (diagramm)` (või kleebi kogu tervik). Põhjus: kui uus HTML jõuab lehele enne uut JS-i, on nupud tegevusetud (konsoolis `ReferenceError: setTaxScenario is not defined`); kalkulaator ise arvutab edasi ja tabeli valik ei muutu. Versiooninumbri tõstmine tagab, et brauser tõmbab uue JS-i vahemälust mööda. Moodulit (3) ei ole vaja muuta: tegelik valik jääb sinna.

## Mida kasutaja näeb

Diagrammimoodulis on pealkiri **Maksumudel** ja kaks nuppu, sõnastus sama mis tulemustabelis:

- **Variant 1** – ühtekuuluvusmaks
- **Variant 2** – üks ja ainus tulumaks

| Mooduli laius | Paigutus |
|---|---|
| alla 680 px (telefon, kitsas veerg) | nupud kõrvuti diagrammi kohal (legend ja diagramm nende all) |
| 680 px ja rohkem | nupud kitsas vasakus veerus üksteise all, diagramm paremal |

- Nupu vajutus muudab **kogu lehe**: tulemustabel, diagramm, selle kirjeldus ja lause uuenevad nagu tabeli nupu vajutusel. Ka tabeli nupu vajutus märgib diagrammi nupu ära. Tegelik valik jääb mooduli (3) nuppudele; diagrammi nupud on selle peegel.
- Valitud nupp on sinise raamiga ja täidetud täpiga, hõljutamisel raam tumeneb. Valik on **sõnades ja kujus**, mitte ainult värvis.
- Klaviatuur: Tab fokuseerib nupugruppi, nooleklahvid vahetavad valikut (nagu tavalised raadionupud), fookuses on nähtav kontuur. Grupil on silt (`role="radiogroup"`, `aria-labelledby` → "Maksumudel").

## Miks diagrammi nuppudel on teine `name`

Esialgne idee oli panna diagrammi nuppudele sama `name="taxscenario"`, nii et brauser hoiaks neid ise sünkroonis. See **ei sobi**, sest kalkulaatori JS käib `getElementsByName("taxscenario")` tsüklites läbi kõik sama nimega nupud ja "viimane võidab" (else-haru täidetakse iga nupu kohta, mis pole `checked && value 2`). Ekstra nupud lõhuksid variandi 2 arvutuse. Seetõttu:

- diagrammi nupud on `name="taxscenario_chart"`;
- `setTaxScenario(v)` märgib mooduli (3) nupu ja kutsub **ühe korra** `wageCalc()`-i (`.checked = true` seadmine ei käivita `onchange`'i, seega kaks arvutust ei teki);
- `wageCalc()` lõpus kutsub `syncTaxScenarioButtons()` diagrammi nupud tabeli järgi õigeks (see katab tabeli nupu vajutuse ja kõik muud kohad, mis nuppu muudavad).

Negatiivne kontroll testis kinnitab, et samanimeliste nuppudega annab variant 2 tõesti vale tulemuse.

## Kuidas see arvutusega seotud on

- `ubiTaxCalcCompare.js` 12. osa on kinnine plokk faili lõpus; globaalsed on ainult `setTaxScenario` ja `syncTaxScenarioButtons` (HTML-i `onchange` vajab neid). Kogu JS-faili muutus on +68 rida, ühtki olemasolevat rida ei eemaldatud (12. osa, päise registri uus punkt ja alljärgnev `wageCalc()` rida).
- `wageCalc()` lõpus on üks lisarida: `syncTaxScenarioButtons();` (pärast `renderResultSentence(c)` kutset).
- Kui moodulit (3) lehel pole (ei leita `taxscenario` nuppe), `setTaxScenario` ei tee midagi ja jätab diagrammi nupu varasemale valikule; viga ei teki.
- Vana HTML (ilma diagrammi nuppudeta) + uus JS töötab: `syncTaxScenarioButtons` ei leia nuppe ja tagastab.

## Miks lävi on 680 px

Diagrammi paigutuse otsustab JS-is `WIDE_MIN_PX = 500`: kui `#family-chart` kast on kitsam, joonistub diagramm kompaktse (kõrgema) paigutusega. Vasak veerg võtab 150 px + 16 px vahet, seega peab moodul olema vähemalt 666 px lai, et diagramm jääks ≥ 500 px. Lävi on **680 px** (680 − 150 − 16 = 514 px, väike varu).

Esimeses versioonis oli lävi 660 px ja veeru laius CSS-is 124 px, aga sisu minimaalne laius tegi veeru tegelikult 150 px laiaks. Mõõtmisel Chromiumis jäi diagramm 660–665 px moodulil **494–499 px** laiaks ja läks kompaktsesse paigutusse, mida kommentaar välistas. Parandatud: veeru laius on 150 px selgelt kirjas ja lävi 680 px; uuesti mõõdetud 640, 659, 660, 665, 666, 670, 680, 700 ja 760 px peal (kuni 670 px virnastatud paigutus ja diagramm täislaiuses `viewBox 0 0 500 170`, alates 680 px nupud vasakul ja diagramm 514+ px, ikka sama `viewBox`). **Kui muudad veeru laiust või vahet, hoia see summa ≥ 500 + varu** (märge on CSS-i kommentaaris).

Brauser, mis ei tunne `@container`-päringuid (Chrome alla 105, Safari alla 16, Firefox alla 110), jääb kitsa paigutuse peale: nupud on diagrammi kohal, kõik toimib. Seda varianti ma päris vana brauseriga ei katsetanud; see tuleneb CSS-i reeglist, et tundmatut `@container`-plokki ignoreeritakse.

## Kuidas kontrollisin

jsdom (PHP-ga renderdatud `kalkulaator-uus.phtml` + päris `ubiTaxCalcCompare.js`; Fabriku lähteandmed stubitud nagu etapis 1), **38 kontrolli**, kõik läbi:

| Kontroll | Tulemus |
|---|---|
| DOM: tabelis on täpselt 2 nuppu `taxscenario`, diagrammi juures 2 nuppu `taxscenario_chart`; diagrammi id-d (`family-chart` jt) iga üks kord; raadiogrupil on silt; vaikimisi variant 1 mõlemal pool | jah (6 kontrolli) |
| Diagrammi nupp = tabeli nupp: sisendirežiim (brutopalk / tööandja kulu / netotulu) × leibkond (1 täiskasvanu 0 last; 2 täiskasvanut 3 last) × variant 1/2 = 12 kombinatsiooni; võrreldud tabeli summad, diagrammi tulbad, kirjeldus ja lause **baitideni** | identsed; mõlema nupu valik sama (24 kontrolli) |
| Variant 2 annab tõesti teise tulemuse; kirjeldus mainib "ühtlane tulumaks"; tagasi variandile 1 = algne tulemus baitideni | jah (3) |
| Tabeli nupp → diagrammi nupud peegeldavad (1→2→1) | jah (2) |
| Servajuhud: moodulit (3) pole; vana HTML + uus JS | viga puudub (2) |
| Negatiivne kontroll: samanimelised nupud annavad vale tulemuse | jah (1) |

Lisaks:

- Etapi 1 komplektid (lause; vana ja uus JS vastastikku) jooksevad endiselt läbi.
- Uus HTML + vana JS (etapi 1 seis ilma 12. osata): kalkulaator arvutab, nupu vajutus annab `ReferenceError`, tabeli valik ja summad ei muutu.
- **Chromium (Playwright), päris klõps nupu sildil** (nii käivitub HTML-i `onchange`), laiusel 760, 700, 670, 560 ja telefoni vaateaknal 360 px: klõps "Variant 2" märgib tabeli ja diagrammi nupu, neto 4298,40 → 4450,00, lause ja diagramm uuenevad; nooleklahv ↑ viib valiku tagasi variandile 1 ja neto 4298,40; tabeli nupu märkimine märgib diagrammi nupu. Nupud on laial moodulil diagrammist vasakul, kitsal selle kohal. Ülekatet ei tekkinud; ekraanipildid vaatasin läbi laiustel 760, 670 ja 360 px (700 ja 560 px kohta kontrollisin ainult mõõtmisega: veeru ja diagrammi asukoht).
- `python3 moodulid/sync.py check --lint`: markerid korras, tervik = osad (baitideni), `php -l` OK kõigile osadele ja tervikule.

**Mida ma ei teinud:** ei jooksutanud päris Fabriku lähteandmetega ega Joomla lehel; ei kontrollinud Safaris ega Firefoxis (ainult Chromium); ei jooksutanud `calc-mobile.js`-i vahelehtedega vaadet (3. etapp). Diagramm on seal vaheklehe sees ja JS joonistab selle avamisel uuesti (see käitumine oli juba olemas), kuid nuppude paigutust avatud vahelehel ma ei katsetanud.

## Teada märkused

- Mooduli (3) kahel nupul on endiselt sama `id="taxscenario"` (kehtetu HTML, aga JS kasutab `name`'i). Ma ei muutnud seda, et mitte puutuda moodulit (3) ja Fabriku stiile; kui tahad, tuleks `id`-d eristada ja kontrollida, ega CSS / mobiili-JS neid ei kasuta.
- Nuppude sõnastus on kahes kohas (moodul 3 ja diagramm); muutes ühte, muuda ka teist.
- Variandi valik ei jää lehe uuesti laadimisel meelde (tabeli nupul ei jäänud ka).
- Terviku sünkroonimisel (`join`) kadus üks tühi rida, mis oli ainult tervikus (vana rida 543); sisu see ei muuda.
