# Kodanikupalga kalkulaator: lause tulemuse kohta (kasutajamugavus, 1. etapp)

Failid: `moodulid/kalkulaator-uus.phtml` (uus element `#result-sentence` ja selle stiil diagrammimoodulis, JS-i viide `?v=20261120`) ja `media/calculator/ubiTaxCalcCompare.js` (uus 11. osa ja üks rida `wageCalc()`-is). Muudatused on diffina failis `lause.diff` (rakendub main'i seisule, kus diagrammimoodul on juba mooduli 3 ees).

**Paigaldus:** vaheta kaks faili koos. Lisamoodulit pole vaja: lause on diagrammimooduli (4) sees, pealkirja "Leibkonna ühe kuu sissetulek" all. Kui tahad lauset mujale, tõsta element `<p id="result-sentence">` ära; JS leiab selle id järgi. Vana HTML uue JS-iga töötab (elementi pole, midagi ei juhtu), uus HTML vana JS-iga jätab lause peidetuks. Mõlemad kontrollitud.

## Mida lause ütleb

Näide (kasutaja soovitud kuju): *See leibkond (2 täiskasvanut, 3 last, brutopalk 2 × 1 500 €) saab kodanikupalgaga kuus **940,40 €** võrra rohkem kui senise korra järgi.*

| Sisendirežiim | Mille vahet lause näitab |
|---|---|
| **Brutopalk** ja **Tööandja kulu** | tulemustabeli rea "Netotulu kokku" väärtus "kodanikupalgaga" miinus "senise korra järgi", kogu leibkonna kohta kuus. Sõnad: *rohkem* / *vähem* / *sama palju* (vahe alla poole sendi loetakse samaks). |
| **Netotulu** | täiskasvanute neto on mõlemas süsteemis sama (sisestatud summa), seega neto vahe oleks alati 0. Lause näitab selle asemel tööandja kulu (palgafond) vahet: *"Selle leibkonna (…) netotulu tagamiseks kulutab tööandja kodanikupalgaga kuus 60,86 € võrra vähem kui senise korra järgi."* Kui lapsi on, lisandub lause laste raha vahe kohta. |

- Leibkonna kirjeldus sulgudes on sama mis diagrammi kirjelduses: täiskasvanute arv, laste arv (kui on), sisendi nimetus ja summa ("2 × 1 500 €").
- Summa on paksus kirjas, eesti kirjaviis (koma, tuhandete eraldaja, ",00" jäetakse ära). Summa ja "€" ei lähe ridade vahel lahku.
- Vasak äär: roheline = rohkem, punane = vähem, hall = sama / tööandja kulu lause. Tähendus on alati sõnades, mitte ainult värvis.
- Lause on peidetud, kuni arvutust pole tehtud, ja ka siis, kui tulemus pole arv (tühi sisend, "NaN").
- `role="status"` + `aria-live="polite"`. Kuna arvutus käivitub sageli kaks korda toimingu kohta, ei kirjutata lauset DOM-i uuesti, kui see pole muutunud (ekraanilugeja ei loe sama lauset kaks korda).

## Kuidas see arvutusega seotud on

- `wageCalc()` kutsub `renderResultSentence(c)` **viimasena**, pärast `applyHousehold(c)`-i ja `renderFamilyChart(...)`-i. Seega loeb lause tulemustabeli juba leibkonna väärtustega kirjutatud spane (`totalnet`, `netwage_std`, netotulu režiimis `wagefund_ubi`, `wagefund_std`) ja on alati sama mis tabel. Lause ei kirjuta ühtegi arvutuse välja.
- Netotulu režiimis võetakse laste raha vahe otse sisenditest (`hh.childUbi − hh.childStd`), mitte neto spanidest, et sentide ümardus ei annaks "0,01 € vähem".
- **Sõnastus on 11. osa alguses objektis `TEXT`**: muuda seal, loogikat puutuma ei pea. Mallides `{household}` ja `{amount}`.
- Kõik abifunktsioonid on kinnises plokis; globaalseks tehakse ainult `renderResultSentence`.
- Mobiilivaates ei vajanud `calc-mobile.js` muudatust: lause on kalkulaatori vahelehel diagrammi kohal.

## Kuidas kontrollisin

jsdom (PHP-ga renderdatud `kalkulaator-uus.phtml` + päris `ubiTaxCalcCompare.js`; Fabriku lähteandmed stubitud: kodanikupalk 500 €, ühtekuuluvusmaks 28,32%, ühtlane tulumaks 35%, aasta 2026, maksuvaba 700 €), 13 olekut (22 kontrolli) ja 12 servajuhu kontrolli:

| Kontroll | Tulemus |
|---|---|
| Lause summa ja suund = tabeli "Netotulu kokku" vahe | kõigis brutopalga / tööandja kulu / netotulu-vabades olekutes (1 ja 2 täiskasvanut, 0–3 last, variant 1 ja 2, lapse eraldi summa, väike ja suur palk) |
| Lause = diagrammi tulpade "Neto: KdP" − "Neto: aasta" vahe | kõigis (±0,02 €) |
| Netotulu režiimi lause = tabeli palgafondide vahe ja laste raha vahe | jah |
| Üks täiskasvanu → 2 täiskasvanut → tagasi ühe täiskasvanuni | lause taastub identsena |
| Sama arvutus kaks korda | lause DOM-i ei puututa (MutationObserver: 0 muutust) |
| "sama palju", vahe < 0,5 senti, "NaN", 1 laps, 12 345,60 € | õige sõnastus / peidetud |
| Vana HTML + uus JS; uus HTML + vana JS (git HEAD) | viga puudub, tabel arvutub endiselt |

Visuaalselt kontrollitud Chromiumis laiustel 1000 ja 360 px (rohkem / vähem / netotulu režiim).

**Mida ma ei teinud:** ei jooksutanud eelmise etapi 703 juhusliku oleku testistikku (seda ei ole repos) ega kasutanud päris Fabriku lähteandmeid; lause ainult loeb olemasolevaid tabeli välju, seega erinevus peaks tekkima ainult siis, kui tabel ise on tühi / NaN (siis lause peitub).

## Teada märkused

- Lause ei ole diagrammi mudelist, vaid tabelist. Diagrammi tulp "Neto: KdP" võib tabelist erineda kuni ±0,03 € (vt `MUUDATUSED-diagramm.md`), seega lause ja tabel on alati samad, diagramm sendi täpsuseni samuti.
- Netotulu režiimi sõnastus on sisuline otsus: "X € võrra rohkem" ei sobiks, sest neto on seal sisendina fikseeritud. Kui tahad seal midagi muud (nt ainult tööandja kulu või ainult laste raha), vaheta `costSentence` või `TEXT`.
- Kui lehel on ainult üks täiskasvanu ja lapsi pole, ütleb lause ikkagi "See leibkond (1 täiskasvanu, …)", et sõnastus oleks kõigil juhtudel sama.
