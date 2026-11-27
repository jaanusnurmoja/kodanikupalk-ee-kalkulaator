# Kodanikupalga kalkulaator: netotulu režiimi arvutusvead (parandus)

Failid:

- `media/calculator/ubiTaxCalcCompare.js`: kolm olemasolevat funktsiooni lihtsustatud (`calcGrossWageUbiFromNet`, `calcIncomeTax`, `calcSocialTax`) ja kolm uut abifunktsiooni (`grossUbiFromNetVariant1`, `incomeTaxOn`, `socialTaxFor`).
- `moodulid/osad/01-top.phtml`: JS-i viite versioon `?v=20261126` → `?v=20261127`. Tervik `moodulid/kalkulaator-uus.phtml` on sellest genereeritud (`sync.py join`; `check --lint` korras).

Muudatus diffina: `netotulu.diff` (rakendub main'i seisule, kus 2027 on juba sees). HTML-i, `calc-mobile.js`-i, CSS-i ega Fabriku seadeid ei muudetud. Brutopalga ja tööandja kulu režiimi arvutus on pärast parandust **baitideni sama** (vt Kontroll).

## Mis viga oli

Netotulu režiimis (`input_3`) arvutatakse iga tulemus kaks korda: senise korra järgi ja kodanikupalgaga (KdP). Vea põhjuseid oli neli; esimene tekitab sinu kirjeldatud hüppe, ülejäänud kolm tekitasid pildinäidete muud vead.

| # | Koht | Viga | Kuidas nähtav |
|---|---|---|---|
| 1 | `calcGrossWageUbiFromNet`, variant 1 (ühtekuuluvusmaks) | Tulumaksu hargnemine (0 või 22%) otsustati **sisestatud neto** järgi (`c.incomeTaxRate = sum − maksuvaba ≤ 0 ? 0 : 22%`), mitte selle järgi, kas **KdP variandi enda brutopalk** ületab maksuvaba. Kui neto on maksuvabast suurem, aga KdP bruto jääb sellest alla, eeldati 22% tulumaksu, mida tegelikult ei maksta. | 2026: neto 700 → Brutopalk: KdP 259,91 (õige), **700,01 → 59,93** (peab olema 259,92). Sama valem andis sellistele netodele vale brutopalga kogu vahemikus ca **maksuvaba + kodanikupalk − maksuvaba × ühtekuuluvusmaksu määr**, st 2026: 700,01–~1009,9; 2025: 654,01–~944; 2027: 700,01–~1036,8. |
| 2 | `calcIncomeTax` | Üks `if` nullis tulumaksu **mõlemal** variandil, kui ükskõik kumma variandi brutopalk jäi maksuvabast alla. KdP bruto on selles vahemikus maksuvabast väiksem, seega nullis see ka senise korra tulumaksu. | Senine bruto = neto (tulumaksu lõiku pole) ja "Neto: 2026" ≠ sisestatud neto (2026: sisestatud 1009, tulemus 1096; 2027: 1036 → 1131). |
| 3 | `calcSocialTax` | Kui ainult ühe variandi sotsiaalmaks jäi kuumäära alla, uuendati ainult seda; teise variandi väli jäi **eelmise arvutuse väärtusele**. | "Tööandja kulud" tulbad ja lause kasutasid vana sotsiaalmaksu: 2026 neto 1010 juures senine 292 (peab 362) ja lause "397,17 € võrra vähem"; 2025 neto 944 juures vana jääk 834,31. |
| 4 | `calcGrossWageUbiFromNet`, variant 1 | Kui töötaja töötuskindlustus ja/või kogumispension on märgitud, arvestas valem ühtekuuluvusmaksu alusena brutopalka miinus need maksed, aga `calcUbiTaxFields` (tabel, diagramm) arvutab selle **kogu brutopalgalt** (päises "kogu brutotulult"). | Tööandjalt kättesaadav osa Brutopalk: KdP tulbas ≠ Neto: KdP tulba omaga (kuni 76 € erinevust 2026. aasta nettodel 1100–4000 €). |

Variant 2 (üks ja ainus tulumaks) ei sisaldanud viga 1 ega 4, aga viga 2 ja 3 mõjutasid seda (senise korra pool).

## Mida muutsin

- **`grossUbiFromNetVariant1(c)`** (uus): lahendab KdP brutopalga täpselt kahe juhu kaudu ja valib selle, mille eeldus kehtib:
  - A) KdP bruto maksustatav osa ei ületa maksuvaba (tulumaksu pole): `G = N / (1 − ins − a)`;
  - B) ületab: `G = (N − r·maksuvaba) / ((1 − ins)(1 − r) − a)`;
  - `N` = sisestatud neto − kodanikupalk, `a` = ühtekuuluvusmaks, `r` = tulumaksumäär, `ins` = töötaja töötuskindlustus + pension.
  Kui `ins` on 0 ja neto ≤ maksuvaba, on tulemus sama mis varem; kui valem juhus B ei kehti (nimetaja ≤ 0), jäetakse juhu A tulemus.
- **`incomeTaxOn(gross, uiEmployee, pension, c)`** (uus): tulumaks ühelt brutopalgalt. `calcIncomeTax` kutsub seda **kummagi variandi jaoks eraldi**, oma brutopalgaga.
- **`socialTaxFor(gross, c)`** (uus): 33% brutopalgast, kuid mitte alla kuumäära (kui märkeruut on valitud). `calcSocialTax` arvutab seda mõlemale variandile eraldi, seega vana väärtus ei jää.
- Senise korra brutopalga valem (`calcGrossWage`) jäi samaks: seal on `c.incomeTaxRate` õige.

## Mida kasutaja näeb

Kontrollitud lehe päris JS-iga (Fabriku andmed stubitud: ühtekuuluvusmaks 2025 31,04%, 2026 29,59%, 2027 28,6%, pildinäidete järgi). Neto, 1 täiskasvanu, ühtekuuluvusmaks, ilma töötuskindlustuseta:

| Aasta, neto | Näitaja | Enne | Pärast |
|---|---|---|---|
| 2026, 700 | Brutopalk: KdP | 259,91 | 259,91 (muutmata) |
| 2026, **700,01** | Brutopalk: KdP | **59,93** | **259,92** |
| 2026, 700,01 | lause "kulutab tööandja … võrra vähem" | 640,08 € | 440,09 € (neto 700: 440,09 €) |
| 2026, 1009 | Brutopalk: senine / neto senine | 1096,15 / 1096,15 | 1096,15 / **1009** |
| 2026, 1009 | Brutopalk: KdP | 698,20 | 698,76 |
| 2026, 1010 | senine sotsiaalmaks / lause | 292,38 / 397,17 € | 362,16 / 466,95 € |
| 2025, 944 | senine tulumaks / sotsiaalmaks | 0 / 834,31 (jääk) | 81,79 / 338,51 |
| 2027, 1036 | Brutopalk: senine / KdP | 1130,77 (neto 1131) / 698,38 | 1130,77 (neto **1036**) / 698,88 |

Tööandjalt kättesaadav osa Brutopalk: KdP tulbas on nüüd igal netol sama mis Neto: KdP tulbas (neto − kodanikupalk).

## NB: kui töötuskindlustus või pension on märgitud

Netotulu režiimis + variant 1 + töötaja töötuskindlustus ja/või kogumispension märgitud muutub KdP brutopalk (kontrollitud 2026, neto 1100–4000 €: kuni 167 € ehk 2,3%). Põhjus on viga 4: ühtekuuluvusmaks arvutatakse kogu brutopalgalt (nii tabelis kui diagrammil), seega vana valem andis tööandjalt kättesaadavaks osaks vale summa. Sinu reegel "Brutopalk: KdP ja Neto: KdP tööandjalt kättesaadav osa alati võrdne" täitub nüüd ka siis. Kui ühtekuuluvusmaksu alus peaks siiski olema bruto miinus kindlustusmaksed, tuleb muuta `calcUbiTaxFields` (ja valemis `grossUbiFromNetVariant1` `a`-i käsitlus), mitte tagasi vana valemi juurde.

## Paigaldus

1. Lae üles `ubiTaxCalcCompare.js`.
2. Uuenda Joomlas moodul `KalkulaatorV3-top` (või kleebi kogu tervik): ainult JS-i viite versiooninumber `?v=20261127`.
3. Puhasta Joomla vahemälu ja tee brauseris Ctrl+F5.

Järjekord: JS enne. Vana HTML + uus JS töötab (HTML ei muutunud muus kui versiooninumbris). **Tagasivõtmine:** taasta eelmine `ubiTaxCalcCompare.js`.

## Kontroll

jsdom (PHP-ga renderdatud `kalkulaator-uus.phtml` + päris `ubiTaxCalcCompare.js`; Fabriku lähteandmed stubitud nagu varasemates etappides). Sama ruudustik vana ja uue JS-iga.

- **Reprodutseerimine enne parandust:** 2026 neto 700,01 → Brutopalk: KdP 59,93; 1010 → lause "397,17 € võrra vähem"; 1009, 2025/944 ja 2027/1036 annavad samad vead kui pildinäidetel (neto senine 1096 / 1131, sotsiaalmaksu jäägid).
- **17 500 arvutust netotulu režiimis, kus neto on suurem kui kodanikupalk** (aastad 2025–2027 × maksumudel 1/2 × töötuskindlustus × pension × sotsiaalmaksu kuumäär × maksuvaba märkeruut, neto 50–4000 € sammuga 50, tihedalt maksuvaba ja kodanikupalga lävede ümber ±0,03, ning neto 600–1300 € sammuga 1 €; lisaks 36 leibkonna juhtu, mis jooksid veata): **uus kood 0 viga, vana 11 358**. Iga arvutuse kohta kontrolliti: senise korra neto = sisestatud; KdP tööandjalt kättesaadav osa (bruto − töötaja kindlustus ja pension − ühtekuuluvusmaks ja tulumaks / ühtlane tulumaks) = neto − kodanikupalk (±0,03 €); mõlema variandi brutopalk = sõltumatu bisektsiooniga leitud etalon; sotsiaalmaks ja tulumaks kummagi variandi oma brutost.
- Vana koodi vead tihedal ruudustikul (variant 1, ilma kindlustuseta, täisarvulised netod): 2025: 655–943 (+ sotsiaalmaksu jäägid kuni ~1021), 2026: 701–1009 (kuni ~1099), 2027: 701–1036 (kuni ~1158).
- Kohad, kus vana kood läbis kontrolli, aga tulemus siiski muutus: 51 juhtu, suurim erinevus **0,01 €** (senise korra tulumaks, mis oli vanas koodis ümardusvahe tõttu nullitud).
- **Brutopalga ja tööandja kulu režiim: 1344 kombinatsiooni (aastad × režiimid × maksumudel × märkeruudud × summad × leibkond 1 täiskasvanu / 2 täiskasvanut + 2 last), kogu tulemuste DOM ja sisendite väärtused identsed vana koodiga.**
- Tulemuse lause uues koodis neto 700 → 440,09 €, 700,01 → 440,09 €, 1009 → 466,74 €, 1010 → 466,95 € (enne 640,08 / 397,95 / 397,17): lause järgib nüüd neto muutust sujuvalt. Lause tuleb tabeli ja diagrammi väärtustest, seetõttu sama põhjus.
- `node --check` OK; `python3 moodulid/sync.py check --lint` OK (tervik = osad, `php -l`).

**Ei kontrollitud:** päris Fabriku lähteandmetega (stubitud ühtekuuluvusmaksu määrad on pildinäidetest tagasi arvutatud, seega piirid võivad päris andmetel paar senti nihkuda); päris brauseris ega Joomla lehel; `calc-mobile.js`-i vahelehtedega vaadet ei jooksutanud (see loeb samu tulemusvälju).

## Teadaolev piir (ei muutnud)

Kui sisestatud neto on **väiksem kui kodanikupalk** (nt 400 € ja kodanikupalk 517 €), on tööandjalt kättesaadav osa negatiivne ja KdP brutopalk negatiivne. See oli nii ka enne ja pole mõistlik tulemus kummagi koodi puhul; nendel netodel erinevad vana ja uus KdP-poole arvud (mõlemad mõttetud), senise korra poole arvud paranevad (viga 2). Kui tahad, võib sinna lisada hoiatuse või lugeda KdP brutopalga nulliks; see on eraldi otsus.
