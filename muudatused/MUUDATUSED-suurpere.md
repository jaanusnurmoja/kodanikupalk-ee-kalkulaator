# Diagrammisilt (lapse KdP), suurperetoetuse säilimine ja täiskasvanu KdP sihtrühmas

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

- `isLargeFamilyBenefitKept()`: suurperetoetus säilib, kui perekonna kärbe märkeruut **ei ole `checked`**.
  `getFamilyBenefitCutBoxes()` valib märkeruudu kahe tingimusega samas tr-is: märkeruudu id algab
  `child_value_eur_` **ja** väli `ubi_cost_cut_opt_values___opt_name_ro_<nr>` on `1`
  (`FAMILY_BENEFIT_CUT_OPT_NAME`). Ainult prefiks ei piisa, sest `ubiCostReducers` annab `child_` prefiksi
  igale reale, mille nimi sisaldab "Pere" (nt vanemahüvitis). Kui sobivat märkeruutu lehel pole
  (nt aasta lähteandmetes pole kärpekohta või `opt_name_ro_<nr>` puudub), käitub kalkulaator nagu varem.
- `readHousehold` lisab leibkonnale väljad `largeKept` (säilinud suurperetoetus kuus) ja
  `ubiExtra = childUbi + largeKept` (riigilt laekuv raha lisaks täiskasvanute kodanikupalgale).
- `ubiExtra` kasutatakse kõikjal, kus varem lisati kodanikupalga variandile `childUbi`:
  tulemustabel (Netotulu kokku, Riigilt tagasi, Tegelik maksukoormus), protsendiveerud ja suhe (`diff`),
  lause tulemuse kohta (netotulu režiimis "laste raha"), diagramm.
- Diagramm: KdP tulbas lisandub lasterikka pere toetuse lõik (3–6 last / 7+ last) täiskasvanute kodanikupalga
  ja laste lõikude vahele; leibkonna kirjelduse märkus ütleb, et toetus säilib.
- Tabeli märkus (`#household-note`): "…, lisaks säilib suurperetoetus 450 €."
- `isChildGroupTargeted()` on väljatõstetud abifunktsioon (sama loogika mis varem `readHousehold`-is).

## 3. Täiskasvanu kodanikupalk ainult siis, kui täiskasvanute sihtrühm on märgitud

Viga: kui kodanikupalk oli kõigile 300 €, aga sihtrühmaks oli märgitud ainult "Lapsed", said leibkonna täiskasvanud
ikkagi kodanikupalga (tabel, lause, diagramm: roheline "Täiskasvanute kodanikupalk"), kuigi nad ei kuulu sihtrühma.
Tulemus oli teine kui siis, kui täiskasvanule on 0 ja lapsele eraldi 300.

- `isAdultGroupTargeted()`: mõni täiskasvanute sihtrühm (pensionisaajad või ülejäänud) on märgitud
  (`countTargetGroups().adults > 0`); kui sihtrühma märkeruute lehel pole, loetakse: jah.
- `getAdultUbiMonthly(summa)`: täiskasvanu tegelik kodanikupalk = nimisumma või 0.
- `readWageContext` annab selle kontekstis väljana `c.ubiAdult`; `c.ubiPerMonth` jääb **nimisummaks** (lapse vaikimisi
  summa, mudeli kirjeldus, aastasumma väli). `c.ubiAdult` kasutavad: tabeli rida "Riigilt tagasi" (`#ubi`),
  netotulu (kogu neto, töö neto netotulu režiimis, brutopalga tagasiarvutus), sektordiagrammide väärtused ja
  leibkonna diagramm (täiskasvanute lõik ja silt).
- Diagrammi silt: lapse summa lisatakse sulgudes alati, kui see erineb täiskasvanu **tegelikust** summast; nüüd ei nõua
  see enam märkeruutu "Lastele teises suuruses". Ainult lapsed sihtrühmas: `Neto: KdP 0 €` / `(laps 300 €)`
  (täpselt sama, mis täiskasvanule 0 ja lapsele 300).
- Mudeli kirjeldus diagrammi all: "Mudel: kodanikupalk ainult lastele, 300 €" (kui lapsed on sihtrühmas) või
  "Mudel: kodanikupalka ei maksta, sihtrühmi pole märgitud".
- Lisaks parandatud `toggleCostReducers`: sihtrühma märkeruut, millel pole oma kärpekohta (nt "Ülejäänud", kui
  ühegi kärbe nimi ei anna prefiksi `adult_`), ei jõudnud tsüklis ühegi reani ja päis (vajalik kate, maksumäärad,
  sihtrühma inimeste arv) jäi eelmise klõpsu väärtustele. Tulemus sõltus klikkide järjekorrast
  (nt Pensionisaajad enne Ülejäänud: vajalik kate 3,76 mld, lisanduv maks 21,14% 4,80% asemel). Nüüd uuendatakse päis alati.

**Miks 5307 ja 4770 erinesid:** 5307 oli seisus, kus kärbeid polnud märgitud (ühtekuuluvusmaks 6,30%, täiskasvanute
600 € sees), 4770 aga seisus, kus vanemahüvitise kärbe oli märgitud (4,80%). Vahe 537 = 600 (täiskasvanute kodanikupalk)
− 63 (maksumäära vahe). Samas kärbeseisus on mõlemad variandid nüüd identsed: 4770,46 (4,80%) ja 4706,68 (6,30%).

## Käitumine (kontrollitud jsdom-is, Fabriku mock-andmetega, aasta 2024)

| Stsenaarium | Enne | Pärast |
|---|---|---|
| lapsi 0, 2 last, või kärbe märgitud | – | **identne** |
| 3 last, kärbe märkimata | netotulu 2197,60; Riigilt tagasi 1200 | 2647,60; 1650 (+450 suurperetoetus) |
| 7 last, kärbe märkimata | – | +650 (7+ last) |
| 3 last, lapse summa 150, kärbe märkimata | silt "Neto: KdP 300 €" | silt + "(laps 150 €)", +450 |
| 3 last, perekonna kärbe märkimata, **vanemahüvitise märkeruut märgitud** | – | suurperetoetus säilib (+450) |
| 3 last, perekonna kärbe märgitud, vanemahüvitis märkimata | – | ei säili |
| 2026, 2 täisk. (2 × 2126 €), 3 last, 300 € kõigile, **ainult lapsed sihtrühmas**, vanemahüvitise kärbe märgitud | netotulu 5370,46 (täisk. +600) | 4770,46, sama mis täisk. 0 + laps 300 |
| sama, kõik kärped märkimata (6,30%) | 5306,68 | 4706,68, sama mis täisk. 0 + laps 300 |
| tavaolukorrad (kõik täiskasvanute sihtrühmad märgitud; lapsi 0, 3 last, 2 täisk., lapse summa, netotulu režiim, 2023) | – | identne |

## Teadlikud piirid / hiljem lahendada

- Lapsetoetuste ja suurperetoetuse kärbete eraldi näitamine/valimine: jäetud hilisemaks (autori otsus).
  Praegu on need Fabriku kärpeloetelus ühes reas ("Peretoetused: kõik asendatavad, v.a. van. hüv.").
  Vanemahüvitise (ja teiste `opt_name` ≠ 1) märkeruudud ei mõjuta suurperetoetuse säilimist. Kui `opt_name` = 1
  on mitmel real, säilib suurperetoetus ainult siis, kui **kõik** need märkeruudud on märkimata.
- Märkeruudu seis loetakse `checked` järgi. Kui sihtrühm "lapsed" on maha võetud, on märkeruut keelatud
  (`disabled`), kuid selle `checked` jääb alles: valikulise kärbe korral (vaikimisi märkimata) säilib suurperetoetus
  siis ka ilma laste kodanikupalgata; kohustusliku (vaikimisi märgitud) kärbe korral mitte.
- "Täiskasvanud sihtrühmas" tähendab: märgitud on pensionisaajad **või** ülejäänud (nagu `countTargetGroups` juba loeb).
  Kui märgitud on ainult pensionisaajad, saab leibkonna täiskasvanu kodanikupalga endiselt (leibkonna palgatöötaja
  tegelikku sihtrühma ei eristata).
- Lapsetoetus ise (mitte suurperetoetus) KdP variandile ei lisandu, nagu ka varem.
- JS-failile viitava `?v=20261120` parameetri (osa `01-top.phtml`) võib vaja minna tõsta, et brauser võtaks uue faili.
