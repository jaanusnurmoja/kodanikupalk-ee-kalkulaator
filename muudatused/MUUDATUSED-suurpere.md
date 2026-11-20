# Diagrammisilt (lapse KdP) ja suurperetoetuse säilimine

Muudetud on ainult `media/calculator/ubiTaxCalcCompare.js` (moodulite HTML-i ei muudetud).
Diff: `muudatused/suurpere.diff`.

## 1. Diagrammisilt "Neto: KdP …"

- Kõigile ühesugune summa või sihtrühmas ainult täiskasvanu: silt jääb `Neto: KdP 600 €`.
- Lapse summa erineb täiskasvanu omast (märkeruut "Lastele teises suuruses" sees, lapsed sihtrühmas ja
  summad päriselt erinevad): `Neto: KdP 600 €` ja teisel real `(laps 300 €)`.
- Uus abifunktsioon `netUbiLabel(hh, ubiMonthly)` (10. osa). `labelLines` toetab nüüd selgesõnalist reavahetust
  `\n`; lai paigutus ei murdnud silti varem üldse ja pikk silt oleks servast välja jäänud.
- Ekraanilugeja kokkuvõttes (`aria-label`) on reavahetus asendatud tühikuga.

## 2. Suurperetoetus säilib, kui lapsetoetuste kärbe pole märgitud

- `isLargeFamilyBenefitKept()` (`getFamilyBenefitCutBoxes()` kogub kõik märkeruudud, mille id algab
  `child_value_eur_`): suurperetoetus säilib, kui ükski neist **ei ole `checked`**. Kui selliseid märkeruute lehel pole
  (nt aasta lähteandmetes pole kärpekohta), käitub kalkulaator nagu varem.
- `readHousehold` lisab leibkonnale väljad `largeKept` (säilinud suurperetoetus kuus) ja
  `ubiExtra = childUbi + largeKept` (riigilt laekuv raha lisaks täiskasvanute kodanikupalgale).
- `ubiExtra` kasutatakse kõikjal, kus varem lisati kodanikupalga variandile `childUbi`:
  tulemustabel (Netotulu kokku, Riigilt tagasi, Tegelik maksukoormus), protsendiveerud ja suhe (`diff`),
  lause tulemuse kohta (netotulu režiimis "laste raha"), diagramm.
- Diagramm: KdP tulbas lisandub lasterikka pere toetuse lõik (3–6 last / 7+ last) täiskasvanute kodanikupalga
  ja laste lõikude vahele; leibkonna kirjelduse märkus ütleb, et toetus säilib.
- Tabeli märkus (`#household-note`): "…, lisaks säilib suurperetoetus 450 €."
- `isChildGroupTargeted()` on väljatõstetud abifunktsioon (sama loogika mis varem `readHousehold`-is).

## Käitumine (kontrollitud jsdom-is, Fabriku mock-andmetega, aasta 2024)

| Stsenaarium | Enne | Pärast |
|---|---|---|
| lapsi 0, 2 last, või kärbe märgitud | – | **identne** |
| 3 last, kärbe märkimata | netotulu 2197,60; Riigilt tagasi 1200 | 2647,60; 1650 (+450 suurperetoetus) |
| 7 last, kärbe märkimata | – | +650 (7+ last) |
| 3 last, lapse summa 150, kärbe märkimata | silt "Neto: KdP 300 €" | silt + "(laps 150 €)", +450 |

## Teadlikud piirid / hiljem lahendada

- Lapsetoetuste ja suurperetoetuse kärbete eraldi näitamine/valimine: jäetud hilisemaks (autori otsus).
  Praegu on need Fabriku kärpeloetelus ühes reas; kui loetelus on mitu `child_value_eur_*` märkeruutu, säilib
  suurperetoetus ainult siis, kui **kõik** on märkimata.
- Märkeruudu seis loetakse `checked` järgi. Kui sihtrühm "lapsed" on maha võetud, on märkeruut keelatud
  (`disabled`), kuid selle `checked` jääb alles: valikulise kärbe korral (vaikimisi märkimata) säilib suurperetoetus
  siis ka ilma laste kodanikupalgata; kohustusliku (vaikimisi märgitud) kärbe korral mitte.
- Lapsetoetus ise (mitte suurperetoetus) KdP variandile ei lisandu, nagu ka varem.
- JS-failile viitava `?v=20261120` parameetri (osa `01-top.phtml`) võib vaja minna tõsta, et brauser võtaks uue faili.
