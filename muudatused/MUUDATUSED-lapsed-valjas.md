# Lapsed sihtrühmast väljas: senised perehüvitised säilivad

Muudetud on ainult `media/calculator/ubiTaxCalcCompare.js` (moodulite HTML-i ei muudetud).
Diff: `muudatused/lapsed-valjas.diff`.

## Probleem

Kui sihtrühma märkeruut `id="child"` ("Lapsed") ei ole märgitud, aga leibkonna koosseisus on lapsi, siis
lülitatakse lapse- ja suurperetoetuste kärpekohad välja (`toggleCostReducers`), seega neid kärpida ei saa.
Kodanikupalga variandis peab sel juhul jätkuma senine perehüvitiste süsteem. Varem lisati KdP variandile ainult
suurperetoetus (ja ainult siis, kui kärbe märkeruut oli märkimata); lapsetoetus kadus KdP tulbast ja tabelist.

## Muudatused

- `readHousehold`: uus `hh.keepsOldBenefits` (lapsed pole sihtrühmas), `hh.allowanceKept` (säilinud lapsetoetus) ja
  `hh.largeKept` (suurperetoetus säilib alati, kui lapsed pole sihtrühmas; vastasel juhul nagu varem: kui perekonna
  kärbe märkeruut pole märgitud). `hh.ubiExtra = laste kodanikupalk + allowanceKept + largeKept` ehk laste raha KdP
  variandis on sel juhul sama mis senise korra järgi. Kõik, mis kasutab `ubiExtra` (tabeli netotulu, "Riigilt
  tagasi", maksukoormus, protsendid, lause), arvestab seda automaatselt.
- Diagramm: KdP tulbas lisanduvad lasterikka pere toetus ja iga lapse lapsetoetus (nagu senise korra tulbas);
  legend ütleb "Laps (lapsetoetus 2026)"; mudeli märkus: "Lapsed ei kuulu kodanikupalga sihtrühma, seega jätkub neile
  senine perehüvitiste süsteem (lapsetoetus ja suurperetoetus)."
- Selgitus tulemustabeli kohal (`describeHousehold`): "…kodanikupalka lastele ei maksta (lapsed pole sihtrühmas),
  seega senised perehüvitised säilivad."
- "Lastele teises suuruses": `syncChildUbiAvailability()` (kutsutakse `calcPeople`-ist) lülitab märkeruudu
  `ubi_child_x` ja välja `ubi-amount-child` välja (`disabled`, silt poolläbipaistev, vihje `title`-ina), kui lapsed
  pole sihtrühmas. Märkeruudu seis ja sisestatud summa **jäävad alles** ning kehtivad uuesti, kui lapsed on taas
  sihtrühmas. `isChildUbiSeparate()` on väljalülitatud olekus `false`, seega ka lause "sama suured kulud nagu
  kõigile võrdse korral" (`#altSentence`) on siis nähtav.

## Käitumine (jsdom, Fabriku mock-andmetega, 2026: 2 × 2126 €, 3 last, 300 € kõigile, lapsed väljas)

| | main (enne) | pärast |
|---|---|---|
| netotulu kodanikupalgaga | 3680,86 | **3940,86** (+ 260 € lapsetoetus 80+80+100) |
| Riigilt tagasi | 1050 (600 + 450) | **1310** (600 + 450 + 260) |
| perekonna kärbe märkeruut märgitud või märkimata | andis erineva tulemuse | **sama tulemus** |
| lapse eraldi summa märgitud (nt 150) | mõjutas silti | ei mõjuta; märkeruut ja väli keelatud, seis säilib |
| lapsed taas sihtrühmas | – | lapse summa (150) kehtib uuesti, silt "(laps 150 €)" tagasi |

Kui lapsed **on** sihtrühmas (ka siis, kui ainult lapsed on märgitud), on tulemused main'iga identsed.

## Alternatiivid "Lastele teises suuruses" jaoks (kui väljalülitamine ei sobi)

- Peita märkeruut ja väli täielikult (ruumi kokkuhoid, aga kasutaja ei näe, miks valik kadus).
- Jätta valik lubatuks, kuid ignoreerida seda ja näidata vihjet (kasutaja võib arvata, et summa kehtib).
- Võtta märkeruut automaatselt maha (kaotab kasutaja sisestatud summa).

Valitud on väljalülitamine koos oleku säilitamisega: nähtav, selgitab end vihjega ja summa ei kao.

## Teada

- Kui `child` on maha võetud ja leibkonnas lapsi pole (`children_count` = 0), ei muutu midagi.
- JS-failile viitava `?v=` parameetri (osa `01-top.phtml`) võib vaja minna tõsta, et brauser võtaks uue faili.
