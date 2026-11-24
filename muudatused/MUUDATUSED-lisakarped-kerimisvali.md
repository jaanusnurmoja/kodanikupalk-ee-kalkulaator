# Kodanikupalga kalkulaator: täiendavate kärbete kerimisväli diagrammi all (kasutajamugavus)

Failid:

- `moodulid/osad/03-diagramm.phtml`: kerimisvälja märgendus ja stiil diagrammi all (tervik `moodulid/kalkulaator-uus.phtml` on sellest genereeritud).
- `moodulid/osad/01-top.phtml`: ainult JS-i viite versioon `?v=20261121` → `?v=20261124`.
- `media/calculator/ubiTaxCalcCompare.js`: uus 13. osa (kerimisvälja loogika), üks rida `wageCalc()` lõpus ja **parandus** `calcReductionFull()`-is (vt allpool).

`calc-mobile.js`-i, `user.css`-i ega `index.php`-d ei muudetud. Muudatus on diffina failis `lisakarped-kerimisvali.diff` (rakendub main'i seisule enne PR-i #11; ei puuduta samu faile).

**Paigaldus:**

1. Lae üles `ubiTaxCalcCompare.js`.
2. Uuenda Joomlas moodulid `KalkulaatorV3-top` (JS-i versioon) ja `KalkulaatorV3M (diagramm)` (või kleebi kogu tervik).
3. Puhasta Joomla vahemälu ja tee brauseris Ctrl+F5.

Järjekord pole ohutuse jaoks oluline: kui uus moodul jõuab lehele enne uut JS-i, jääb kerimisväli lihtsalt peidetuks (`d-none`) ja midagi ei lähe katki; kui uus JS jõuab lehele enne moodulit, pole kerimisvälja kuhugi panna ja midagi ei juhtu (kontrollitud).
**Tagasivõtmine:** taasta eelmine `ubiTaxCalcCompare.js` ja moodulid. Fabriku välja ega selle skripti (`toggleVals`) ei muudetud.

## Mida kasutaja näeb

Diagrammi mooduli all (diagrammi, selle kirjelduse ja mudeli kirjelduse järel) on uus kaart **"Täiendavad kärped"**:

```
Täiendavad kärped (?)
[ ▼ |   300 mln €   | ▲ ]   Vaata, kuidas muutub maksukoormus ja netotulu, kui veelgi
                           kärpida muid riigieelarve kulusid 100 miljoni euro kaupa või
                           muul moel suurendada meetme rahastust.
```

- **Nooled ▼ / ▲** vähendavad / suurendavad Fabriku välja "Erinevad / määramata tuluallikad / kärpekohad" (`#all_value_eur_custom`) väärtust 100 mln € võrra. Diagramm, tulemuse lause ja tulemuste tabel uuenevad kohe. ▼ on nulli juures hall ja ei tee midagi.
- **Lühiselgitus** (sinu sõnastus) on alati nähtav. **"?" nupp** avab täpsema selgituse kolmes lõigus: mis see on, mida see muudab, et tegu on sama väljaga kärpekohtade tabeli juures. Teksti saad muuta moodulis (`03-diagramm.phtml`, `#fc-cuts-help`).
- **Kui väljale kirjutatakse oma arv**, näeb seda kerimisväljal: nt 150 000 000 → "150 mln €" ja kollane märkus "Kärpekohtade lahtrisse on kirjutatud oma summa 150 000 000 €. Nooled viivad selle 100 mln € sammule: ▼ 100 mln €, ▲ 200 mln €." Noole klõps viib summa lähima 100 mln sammuni üles või alla (nagu brauseri enda number-välja nooled). Samamoodi kajastub topeltklõps väljal (`toggleVals`: 0 ⇄ 100 mln).
- **Telefonis** (kärbete tabel peidetud) töötavad nooled ikka: need juhivad välja, mitte tabelit.
- Kui lehel **pole** Fabriku välja `#all_value_eur_custom`, jääb kaart peidetuks.

Paigutus: otsustasin diagrammi **alla** (täislaius), mitte kitsale vasakule veerule maksumudeli nuppude alla, sest seal (150 px) ei mahuks selgitus loetavalt. Kui tahad nooled siiski vasakule veerule, tuleb `#fc-cut-stepper` tõsta `.fc-side` sisse ja selgituse (`.fc-cuts-info`) võib peita, jättes ainult "?".

## Kuidas see töötab

- **Kerimisväli ei salvesta midagi ise.** Noole klõps arvutab uue väärtuse (lähim sammu kordne, mitte alla `min`), kirjutab selle välja `value`-sse ja käivitab väljal `change` sündmuse. See kutsub välja enda `onchange="calcReduction(this);outputCalc();"`. Arvutus on seega **täpselt sama**, mis siis, kui kasutaja kirjutaks summa ise (kontrollitud: kõik väljundid identsed). Samm ja miinimum loetakse välja `step` / `min` atribuutidest (vaikimisi 100 000 000 ja 0).
- **Näit loetakse alati väljalt.** `wageCalc()` lõpus kutsutakse `syncCutStepper()` (nagu 11. ja 12. osa). Seega uuendab see näitu ka siis, kui väärtust muudeti väljal käsitsi, topeltklõpsuga või muu koodi poolt. Kui väärtus pole muutunud, ei puututa DOM-i (väljund on elav piirkond ja ekraanilugeja ei loe sama väärtust uuesti).
- **Globaalsed funktsioonid** (HTML-i `onclick` vajab neid): `stepCuts(±1)`, `toggleCutsHelp()`, `syncCutStepper()`. Ülejäänud 13. osa on kinnine plokk (IIFE).
- **Ligipääsetavus:** nupud on `type="button"`, nimed "Vähenda / Suurenda 100 miljoni euro võrra", keelatud ▼ on `aria-disabled` (mitte `disabled`, et fookus ei kaoks), "?" nupul `aria-expanded` / `aria-controls`, näit on `<output>` (viib ekraanilugejale uue väärtuse).
- **Arvuvorming:** `toLocaleString("et-EE")`, nagu mujal failis: 1200 mln €, aga 12 300 mln € (eesti kirjaviis ei grupeeri 4-kohalisi arve).

## Parandus: kärbete lisaväli kadus arvutusest, kui kodanikupalga summat muudeti

Kerimisvälja ehitades leidsin **olemasoleva vea**, mis oleks seda kasutajale petlikuks teinud. Fabriku väli on `name="reductionValueCustom"`, aga `calcReductionFull()` summeerib ainult `name="reductionValue"` väljad (märkeruudud). Kui kodanikupalga summa muutus (`calcReduction(ubi-amount)` arvutab kärbete summa uuesti `calcReductionFull()`-ist), langes lisaväli arvutusest välja, kuigi väli näitas väärtust edasi.

Testis (stubitud globaalid: rahastusvajadus 5 mld, tulumaks 2,6 mld, deklareeritud tulu 16 mld): lisaväli 300 000 000 → kärbete summa 300 000 000, ühtlane tulumaks 45,63 %. Pärast kodanikupalga summa muutust **main'is** kärbete summa 0 ja maks 47,50 %, **parandusega** jääb 300 000 000 ja 45,63 %.

Parandus (`ubiTaxCalcCompare.js`): uus `customReductionValue()` (tühi, vigane või puuduv väli = 0), `calcReductionFull()` liidab selle lõppu ja `calcReduction()` kasutab muu elemendi kui märkeruudu / kodanikupalga summa korral lihtsalt `calcReductionFull()`-i (varem `calcReductionFull() + parseFloat(element.value)`, mis oleks nüüd kaks korda liitnud). Kõrvalmõju: tühi väli annab nüüd 0, mitte `NaN`. **See muudab olemasolevat arvutust**, aga ainult juhul, kui lisaväli ≠ 0; ilma lisakärbeta on tulemus sama (lause ja maksumudeli komplektid läbi).

## Piirangud ja teada märkused

1. **Ülempiiri pole.** Kui lisakärbe ületab rahastusvajaduse, läheb arvutatud maksumäär negatiivseks (testi stubidega: vajadus 5 mld; 5 mld → ühtlane tulumaks 16,25 %, 8 mld → −2,5 %, 20 mld → −77,5 %). See on **olemasoleva arvutuse** käitumine ja sama juhtub, kui sama summa väljale kirjutada, aga nooltega jõuab sinna kergemini. Võimalik edasiarendus: ▲ keelata, kui `realNeed` jõuab nulli. Seda ma **ei teinud**, sest see on sisuline otsus (kas ülejääk tähendab nulli või midagi muud).
2. **Nuppude `aria-label` tekstid** ("100 miljoni euro võrra") ja lühiselgituse "100 miljoni" on HTML-is kirjas käsitsi. Kui muudad Fabriku välja `step`-i, muuda ka need (JS arvutab sammu väljalt ja märkuse tekst järgib seda automaatselt).
3. **Nupu hoidmisega kordamist pole** (iga samm on üks klõps). Suure summa jaoks (nt 3 mld = 30 klõpsu) saab väljale kirjutada otse; kerimisväli näitab seda.
4. **Negatiivne summa** väljal (kuigi `min="0"`): kerimisväli näitab seda ja märkus selgitab, ▲ viib 0-ni.
5. **Mida ma ei testinud:** päris Fabriku CSS-i, päris seadmeid (iOS Safari, Android Chrome), päris Google Charts diagrammi. Testleht kasutab Bootstrapi, mallis olevat `user.css`-i ja Fabriku väljade järeleehitust (sinu antud väli täpselt nii, nagu see on).

## Kuidas kontrollisin

jsdom (PHP-ga renderdatud `kalkulaator-uus.phtml` + päris `ubiTaxCalcCompare.js`; Fabriku väli lisatud sinu antud kujul, HTML-i atribuutkäsitlejad `onchange` / `onclick` / `ondblclick` korratud nagu brauser), **43 kontrolli** kerimisvälja kohta + 3 kontrolli vana moodulit (kerimisvälja märgenduseta) vastu uut JS-i; Chromium (Playwright) päris klõpsude ja puudutustega.

| Kontroll | Tulemus |
|---|---|
| Algseis: kaart nähtav, "0 mln €", ▼ keelatud, märkust pole, selgitus suletud; ilma Fabriku väljata jääb peitu ega viska viga | jah |
| ▲: väli 100 000 000, `calcReduction` ja `outputCalc` täpselt korra, kärbete summa 100 000 000, tulemus muutub; 4 × ▲ = 400 mln, ▼ = 300 mln | jah |
| Noolte tulemus 300 mln = käsitsi väljale 300 000 000 kirjutamise tulemus (kärbete summa, maksumäär, netotulud, lause, diagrammi tulbad) | **identne** |
| ▼ nulli juures: arvutust ei käivitata, tulemus sama; ▲ ja ▼ tagasi = algne | jah |
| Oma arv: 150 mln → märkus + "▼ 100 mln, ▲ 200 mln"; ▲ → 200, ▼ → 100, 50 mln ▼ → 0; 123 456 789 → "123,46 mln €"; 1 200 000 000 ja 12 300 000 000 vormingud; tühi väli ja vigane tekst → 0 | jah |
| Topeltklõps väljal (`toggleVals`) kajastub; pärast kodanikupalga summa muutust jääb lisakärbe arvutusse (**main'is kadus**) | jah |
| "?" avab / sulgeb; `aria-controls`, `<output for=…>`; korduvad arvutused samal väärtusel ei puutu näitu | jah |
| Vana moodul + uus JS: ei vigu; uus moodul + main'i JS: kaart jääb peitu (`d-none`), `stepCuts` pole defineeritud | jah |
| Chromium 360 px (puudutusemulatsioon), 768 ja 1280 px: päris klõps / puudutus noolel muudab välja ja tulemust; 3 × ▲ → 300 mln; oma arv 150 mln; ? avab; ▼; ülevoolu pole (kaart ja leht), nupud 44 × 46 px | jah |
| Diagrammi, lause ja maksumudeli komplektid (22 + 38 kontrolli) uue terviku vastu | läbi |
| JS-vead Chromiumis uue ja main'i JS-iga (testkeskkonna omad: jQuery, Google Charts, Fabrik) | samad (9 + 9) |
| `sync.py check --lint`: markerid, tervik = osad, `php -l` | OK |
