# Kodanikupalga kalkulaator: diagrammivaade (moodul 4)

Failid: `moodulid/kalkulaator-uus.phtml` (uus plokk `KalkulaatorV3M (4)`, JS-i viide `?v=20261117`) ja `media/calculator/ubiTaxCalcCompare.js` (uus 10. osa ja kaks rida `wageCalc()`-is). Muudatused on diffina failis `diagramm.diff` (rakendub etapi 2 + mobiili failidele).

**Paigaldus:** vaheta kaks faili koos ja lisa Joomla moodulihalduris uus moodul (positsioon `calc`) plokiga `<!-- KalkulaatorV3M (4)-->` … `<!-- Lõpp: KalkulaatorV3M (4)-->`. Pane see moodulite järjekorras tulemuse mooduli (3) järele. Vana HTML uue JS-iga töötab (moodulita lehel on diagrammi mudel `null` ja midagi ei joonistata; kontrollitud). Uus HTML vana JS-iga jätab diagrammi tühjaks, midagi ei katke.

## Mida diagramm näitab

Kogu leibkonna kuine sissetulek (€ kuus), ainult kalkulaatoris tehtud valiku kohta, võrreldes kehtiva (valitud aasta) korraga. Tulbad ülevalt alla:

| Tulp | Lõigud |
|---|---|
| **Tööandja kulud** | brutopalk, sotsiaalmaks, tööandja töötuskindlustus (ainult kui märgitud) |
| **Brutopalk** | tööandjalt kättesaadav neto, töötaja töötuskindlustus ja kogumispension (kui märgitud), ühtekuuluvusmaks + tulumaks **või** ühtlane tulumaks (valitud maksustsenaariumi järgi) |
| **Neto: KdP X €** | tööandjalt kättesaadav neto, vanemate kodanikupalk, iga lapse kodanikupalk (eraldi lõik lapse kohta) |
| **Neto: 2026** (valitud aasta) | tööandjalt kättesaadav neto, lasterikka pere toetus (3–6 / 7+ last), iga lapse lapsetoetus |

- "Netotulu" sisendirežiimis on senise korra ja kodanikupalga brutopalk erinev; siis on tööandja kulude ja brutopalga tulbad mõlemad kahes variandis ("senine" / "KdP").
- Lõigu kohal hiirt hoides näha summat (`<title>`); numbrid lõigus ainult siis, kui lõik on piisavalt lai. Tulba lõpus on tulba kogusumma.
- **Legend** on diagrammi kohal ja näitab ainult neid lõike, mis diagrammil on. Ühtekuuluvusmaks on triibuline nagu eeskujus; värvid on eeskujust (tööandjalt kättesaadav `#8CA3B8`, tulumaks `#FFC000`, vanemate KdP `#31869B`, lasterikka pere toetus `#8064A2` / `#5B4580`, laps `#A9D7E2`).
- **Vasakul** on leibkonna kirjeldus (püstist sissetulekuliigi kirjet pole):
  - `Lapsi: 4, vanemaid: 2, vanemate brutopalk: 2 × 2092 €` (sissetulekuliik: brutopalk / tööandja kulu / netotulu; ühe vanema korral "vanema …")
  - `Mudel: kodanikupalk 592,71 €, lapse kodanikupalk 517 €` (lapse osa ainult siis, kui lapse summa on eraldi)
  - `ühtekuuluvusmaks 28,62% kogu brutotulult, tulumaks endisel kujul` või `ühtlane tulumaks 50,57% kogu brutotulult`
  - märkus, kui lapsed pole kodanikupalga sihtrühmas.
- Telefoniks on kitsas paigutus: sildid jagatakse kaheks reaks ja joonis kasutab väiksemat viewBox-i. Paigutus valitakse diagrammi kasti laiuse järgi (alla 500 px kitsas) ja vahetub akna suuruse muutmisel või vahelehe avamisel (`ResizeObserver`).

## Kuidas see arvutusega seotud on

- `wageCalc()` koostab diagrammi mudeli (`buildFamilyChartModel(c)`) **enne** `applyHousehold(c)`-i (tulemustabeli spanid on siis veel ühe täiskasvanu väärtused) ja joonistab (`renderFamilyChart(model)`) pärast seda. Diagramm ainult loeb arvutuse välju ega kirjuta ühtegi.
- Kuna arvutus käivitub ühe kasutajatoimingu kohta sageli kaks korda, joonistatakse uuesti ainult siis, kui mudel või paigutus muutus.
- HTML-i elemendid: `#family-chart-legend`, `#family-chart-desc`, `#family-chart`. Kõik abifunktsioonid on 10. osa kinnises plokis; globaalseks tehakse ainult `buildFamilyChartModel` ja `renderFamilyChart`.
- Lapsetoetused tulevad samast tabelist (`CHILD_BENEFITS`) mis tulemustabelis.

## Kuidas kontrollisin

jsdom-testistik (PHP-ga renderdatud moodul + stubitud lähteandmed, Google Charts ja jQuery), 703 juhuslikku olekut: aasta 2023–2026, kolm sisendirežiimi, mõlemad maksustsenaariumid, töötuskindlustus / pension / sotsiaalmaksu miinimum, 1 või 2 täiskasvanut, 0–9 last, lapse eraldi summa, kõik kolm protsendialust; lai ja kitsas paigutus.

| Kontroll | Tulemus |
|---|---|
| "Neto: KdP" tulba kogusumma = tulemustabeli "Netotulu kokku" | kõigil juhtudel (±0,03 €) |
| "Neto: aasta" kogusumma = tabeli senine neto | kõigil juhtudel |
| Tööandja kulude tulp(ad) = tabeli palgafond (senine / KdP) | kõigil juhtudel |
| Brutopalga tulp(ad) = tabeli brutopalk (senine / KdP) | kõigil juhtudel |
| Kõik lehe id-ga väljad (195 elementi; diagrammi enda elemendid välja arvatud) moodulita lehega võrreldes | 0 erinevust |
| JS vead (moodulita ja mooduliga leht) | 0 |
| SVG-s ja kirjelduses `NaN` / `undefined` | 0 |

Visuaalselt kontrollitud Chromiumis laiustel 1200 (kitsas veerg), 820 ja 390 px. 104 juhtu jäeti võrdlusest välja, sest tulemustabel ise on seal tühi / NaN / ≤ 0 (nt tööandja kulu 0 € või netotulu väiksem kui kodanikupalk); diagramm näitab neil nulli.

## Teada märkused

- **Netotulu režiim, brutopalga ja neto tulba tööandjalt kättesaadav osa.** Kui netotulu režiimis on märgitud töötaja töötuskindlustus ja/või kogumispension, erineb "Brutopalk: KdP" tulba tööandjalt kättesaadav osa "Neto: KdP" tulba omast veidi (näites 2955 vs 3014 €, ligi 1%). Põhjus on olemasolevas valemis `calcGrossWageUbiFromNet`: brutopalk arvutatakse nii, et ühtekuuluvusmaks on võetud brutopalgast *pärast* töötuskindlustust ja pensioni, tulemustabel aga arvutab ühtekuuluvusmaksu (`ubicontrib`) kogu brutopalgast. Diagramm näitab mõlemat nii, nagu tabel; valemit ma ei muutnud. Ilma töötuskindlustuse ja pensionita on kogused võrdsed.
- Tulumaksu- ja ühtekuuluvusmaksu protsendid tulevad lehe päisest (`addedTax`, `newFlatTax`), seega sõltuvad avatud aasta lähteandmetest.
- Diagramm näitab praegu ainult valitud stsenaariumi; mitme stsenaariumi võrdlus (nagu eeskuju eri perede rühmades) on võimalik järgmine samm.
