# Kodanikupalga kalkulaator: etapp 2 (uued funktsioonid)

Failid: `kalkulaator-uus.phtml` (HTML, PHP ja moodulikommentaarid alles) ja `kalkulaator/ubiTaxCalcCompare.js`. Muudatused on diffina failis `kalkulaator/etapp2.diff` (rakendub etapi 1 failidele; tagurpidi `patch -R` annab etapi 1 seisu tagasi).

**Paigaldus:** vaheta kaks faili koos. HTML-is on JS-i viide `?v=20261031` (vahemälu). Uus HTML vana JS-iga ei tööta (`onUbiAmountChange is not defined`); vana HTML uue JS-iga töötab (kontrollitud).

## 1. Lapse eraldi kodanikupalk

Päises, põhilahtri all: märkeruut **"Lastele teises suuruses"** (`ubi_child_x`). Sisselülitatult ilmub:

| id | Mis |
|---|---|
| `ubi-amount-child` | lapse kodanikupalk kuus (kollane lahter) |
| `ubiChildPerYear` | readonly, lapse summa aastas |
| `ubi-child-box` | pakk, mille märkeruut näitab/peidab (`d-none`) |

- Vaikimisi on lapse lahtris sama summa mis põhilahtris. Kuni kasutaja lapse lahtrit ise ei muuda, järgib see põhilahtrit; pärast seda jääb kasutaja summa (ka märkeruudu väljalülitamisel ja uuesti sisselülitamisel).
- **Vajalik kate (grossNeed)** = 12 × (märgitud täiskasvanud + pensionärid × põhisumma + märgitud lapsed × lapse summa). Väljalülitatult nagu varem: kõik märgitud sihtrühmad × põhisumma. See arvutus on funktsioonis `calcGrossNeed()`, mida kasutavad `initUbiModel`, `toggleCostReducers` ja uued käsitlejad. Sealt jooksevad edasi kärped, "vajalik kate neto" ning uue ühtse tulumaksu ja lisamaksu määr.
- Lause "Kui kodanikupalk oleks täiskasvanule X ja lapsele Y, siis kulud oleksid sama suured nagu kõigile võrdse Z korral" **peidetakse**, kui lapse eraldi summa on sees, sest põhisumma ei ole siis enam "kõigile võrdne" (`id="altSentence"`).

## 2. Leibkond tulemustabelis

Välja `eur` all: märkeruut **"2 täiskasvanut"** (`adults2_x`, vaikimisi ei ole) ja **"Lapsi:"** (`children_count`, vaikimisi 0). Mõlemal täiskasvanul on sama tulu.

| Rida | Senise korra järgi | Kodanikupalgaga |
|---|---|---|
| Palgafond, sotsiaalmaks, töötuskindlustus, brutopalk, kogumispension, tulumaks, ühtekuuluvusmaks, üks ja ainus tulumaks, neto tööandjalt, brutomaksukoormus | × täiskasvanute arv | × täiskasvanute arv |
| Netotulu kokku | × täiskasvanute arv + lapsetoetus + suurperetoetus | × täiskasvanute arv (sh nende kodanikupalk) + laste arv × lapse kodanikupalk |
| Riigilt tagasi | lapsetoetus + suurperetoetus (tühi, kui lapsi pole) | täiskasvanute arv × kodanikupalk + laste kodanikupalk |
| Tegelik (neto) maksukoormus | brutomaksukoormus − riigilt tagasi | sama |

- Protsendid arvutatakse leibkonna summadest, valitud alusega (palgafond / brutopalk / netotulu). Netotulu alusel on 100% kogu leibkonna neto (tööandjalt + laste raha). Üks täiskasvanu ja 0 last (vaikimisi) annab täpselt sama tulemuse mis enne.
- Tulemuse kohal ilmub märkus, mis näitab leibkonda ja lastele laekuvat raha lahtikirjutatuna.
- Laste kodanikupalk = laste arv × (`ubi-amount-child`, kui märkeruut on sees; muidu põhisumma). Kui sihtrühma märkeruut "lapsed" (`id="child"`) on ära võetud, siis lastele kodanikupalka ei arvestata (märkus ütleb seda).
- Lapsi saab olla ka ühe täiskasvanu korral (märkeruut "2 täiskasvanut" on siis ära märkimata).
- **Diagrammid** jäävad ühe täiskasvanu kohta (pealkirjad ütlevad "brutopalk X"); leibkonna vaade puudutab tulemustabelit.

### Lapsetoetused (`CHILD_BENEFITS`, JS-i 3. osa), eurot kuus

| Aasta | Lapsetoetus 1.–2. laps | 3. ja järgmine laps | Suurperetoetus 3–6 last (pere kohta) | 7+ last |
|---|---|---|---|---|
| 2020–2022 | 60 | 100 | 300 | 400 |
| 2023 | 80 | 100 | 650 | 850 |
| 2024–2026 | 80 | 100 | 450 | 650 |

Allikad: Sotsiaalministeerium (perehüvitiste seaduse muudatus 2023, laste ja perede toetamise KKK, perepoliitiliste meetmete ülevaade 2025), riigikogu eelnõu seletuskiri. Seaduse nimetus on "lasterikka pere toetus" (varem "suurpere vanema toetus"). **2026. aasta summad kinnitas ainult teisene allikas (palgakulu.ee) ja 2025. aasta Sotsiaalministeeriumi dokument; palun kontrolli enne avaldamist Sotsiaalkindlustusameti lehel.** Mudelisse ei ole võetud üksikvanema lapse toetust, elatisabi ega mitmike toetust.

## Teised muudatused

- **Ubi-amount'i käsitleja järjekord.** Varem: `setUbiAmount; outputCalc(); calcPeople(this)`, mistõttu tabel kasutas viimase klahvivajutuse järel veel eelmist maksumäära (päis uuenes alles pärast tabelit). Nüüd `onUbiAmountChange(this)`: päis, siis tabel.
- **Parandus: kärbete summa.** `calcReduction` liitis kodanikupalga kuusumma lahtri muutmisel kärbete summale (nt "kärbitud 4350000517.31 €" 4350000000.00 asemel; ainult siis, kui `element` oli tekstiväli, ehk `ubi-amount`). Uus märkeruut käivitaks seda iga kord, seepärast parandasin: `ubi-amount` ei lisa kärpeid. Mõju: realNeed, uue ühtse tulumaksu ja lisamaksu määr muutuvad väga vähe (kuusumma / kärbete summa), harva näha teisel komakohal. Kui tahad vana käitumist, eemalda `else if (element.id === "ubi-amount")` haru `calcReduction`-ist.
- Uued abiväljad HTML-is: `household-note`, `ubi_label_extra` (rea "Riigilt tagasi" lisasilt, nähtav kui lastele makstakse toetust), `netwage_chart` (peidetud; diagrammi "töötaja saab palgana kätte" väärtus jääb ühe täiskasvanu kohta).
- Tulemustabeli spanid on arvutuse vahemälu (hilisemad sammud loevad neid), seepärast salvestab leibkonna vaade ühe täiskasvanu väärtused (`personValues`) ja taastab need enne järgmist arvutust. Ilma selleta kuhjuksid korrutamised.

## Kuidas kontrollisin

Sama jsdom-testistik nagu etapis 1 (aastad 2020–2026; kolm sisendirežiimi; mõlemad maksustsenaariumid; sotsiaalmaksu miinimum sees/väljas; kõik kolm protsendialust).

| Test | Tulemus |
|---|---|
| Juhuslikud kasutajatoimingud (3 aastat × 12 seemet × 60 sammu, 2196 võrdlust): etapi 1 HTML + JS vs uus HTML + JS, vaikeolekus | 0 erinevust (baasiks etapi 1 kood koos kärbete parandusega) |
| Sama, vana HTML + uus JS | 0 erinevust (615 võrdlust) |
| Leibkond: 7 aastat × režiimid × variandid × summad × 6 leibkonna seadistust (2 täisk., 3, 4, 7, 8 last jne): iga rida ja iga protsent kontrollarvutusega; tagasi vaikeolekusse annab täpselt algsed väärtused (ei kuhju) | 412 027 kontrolli, 0 viga |
| Päis ja lapse lahter: vajalik kate, kärped, maksumäärad, sihtrühmade märkeruudud, sünkroon põhilahtriga, lause peitmine, laste arvu veasisendid ("abc", "-3", "2.7", tühi) | 44 kontrolli, 0 viga |
| Harness'i tundlikkus: kolm tahtlikku viga uues koodis | kõik avastati |

**Piirangud.** (1) jsdom ei ole päris brauser; paigutust vaatasin Chromiumis Bootstrap 5-ga, saidi enda CSS-i ma ei näinud. (2) Lähteandmete tabeli (Fabrik) lahtrid on testis asendatud näidisväärtustega. (3) Enne avaldamist tee 5 minutit käsitsi proovi päris lehel: märkeruut "Lastele teises suuruses", "2 täiskasvanut" ja lapsi 0/1/3/7, kõigi kolme protsendialusega.

## Leiud, mida ei muutnud

- `calcReduction` else-haru (tekstiväli, mis pole `ubi-amount`) liidab elemendi väärtuse kärbete summale, kuigi `calcReductionFull()` loeb tekstiväljad (`row.type == "text"`) juba sisse. Kui selline väli lehel on, loetakse selle väärtus kaks korda. Ma ei näinud lehe selle osa HTML-i, seega ei puutunud.
- `toggleCostReducers` uuendab päist (vajalik kate, inimeste arv) ainult siis, kui sihtrühmal on vähemalt üks kärbe; sihtrühma märkeruut, millel pole ühtegi kärpekohta, päist ei uuenda.
