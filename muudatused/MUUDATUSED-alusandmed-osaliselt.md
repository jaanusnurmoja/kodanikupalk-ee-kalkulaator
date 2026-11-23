# Kodanikupalga kalkulaator: lähteandmete osaline peitmine (kasutajamugavus)

Failid:

- `media/templates/site/cassiopeia_kalkulaator/js/calc-mobile.js` (+97 / −26 rida): peitmisloogika ja seaded.
- `media/templates/site/cassiopeia_kalkulaator/css/user.css`: ainult kommentaar (nupud on nüüd kõigil laiustel).

Moodulid (`kalkulaator-uus.phtml`), `ubiTaxCalcCompare.js`, `index.php` ega Fabriku seadistus **ei muutu**. Muudatus on diffina failis `alusandmed-osaliselt.diff` (rakendub main'i seisule, kus PR #10 on sees).

**Paigaldus:** lae üles `calc-mobile.js` (`user.css` on valikuline, muutus on ainult kommentaar), puhasta Joomla vahemälu ja tee brauseris Ctrl+F5.
**Tagasivõtmine:** taasta eelmine `calc-mobile.js`. Ainult arvutivaate vana välimuse tagasi saamiseks (kitsas vaade jääb uueks) piisab seadest `baseOnWide: false`, vt allpool.

## Mida kasutaja näeb

Juhendi `fabriku-osalise-peitmise-juhend.html` järgi:

| Osa | Vaikimisi |
|---|---|
| `#group161` "Peamised lähteandmed": pealkiri, sissejuhatus ("Kujunda ise saajate ring"), lõpumärkus (lapsestandardite selgitus) | **nähtav** |
| `#group161` read **aasta, ametlikud lapse ülalpidamiskulud, minimaalne lapsestandard** | **nähtav** |
| `#group161` read **pensionisaajad, lapsed, ülejäänud** (suurte sihtrühmade arvud ja märkeruudud) | **nähtav** |
| `#group162` "Valik võimalikke kärpekohti" (intro, lisasumma väli, tabel) | **nähtav** (kitsas vaates oli varem peidus) |
| `#group161` read rahvaarv, deklareeritud tulu, tulumaks kokku, pensioni baasosa (kuus ja aastas), korrigeeritud tulu | peidus |
| `#group210` sotsiaalmaks, `#group164` kommentaarid, `#group205` muud andmed, `#group207` kaduvad toetused | peidus |

Lähteandmete all (rea "Peamised lähteandmed" ja kärpetabeli vahel) on kaks nuppu:

- **"Näita kõiki alusandmeid"** ⇄ **"Peida lisaandmed"**: avab / sulgeb kõik peidetud osad.
- **"Peida kärpevõimalused"** ⇄ **"Näita kärpevõimalusi"**: kärpekohtade tabel on vaikimisi lahti ja saab vajadusel peita (nagu varem kitsas vaates).

| Vaade | Enne | Nüüd |
|---|---|---|
| Arvutivaade (≥ 992 px) | kõik lähteandmed nähtavad, nuppe pole | põhiosa ja kärpetabel nähtavad, lisaandmed nupu taga |
| Kitsas vaade (< 992 px) | **kõik** lähteandmed ja kärpetabel peidus | põhiosa ja kärpetabel nähtavad, lisaandmed nupu taga |

**NB! Arvutivaade muutub** (lisaandmed on vaikimisi peidus). Seda tegin, sest juhendis on peitmine kirjas ilma laiuse piiranguta. Kui tahad arvutivaate jätta endiseks, pane `calc-mobile.js` alguses `CONFIG.baseOnWide` väärtuseks `false`: siis on arvutivaates kõik nagu enne ja nupud tekivad ainult kitsas vaates.

## Kuidas see töötab

- **Sama mehhanism nagu seni.** Peidetakse klassiga `visually-hidden` + atribuut `inert`. Elemendid ja nende väärtused jäävad DOM-i alles, kalkulaatori JS loeb neid nagu enne (kontrollitud: tulumaks, rahvaarv, korrigeeritud tulu, sotsiaalmaks, kommentaar loetavad). Midagi ei eemaldata ega tõsteta ümber, id-d jäävad samaks. Fabriku enda peidetud (`fabrikHide`) elemente (kuupäev, id) ei puututa.
- **Osaline peitmine (`CONFIG.basePartial`).** `#group161` on grupp, millest peidetakse vaid osa: kõik grupi Fabriku elemendikonteinerid (`.fabrikElementContainer`), mis ei sisalda ühtegi "jääb nähtavaks" elementi, saavad peidetuks. Nähtavaks jäävad konteinerid, milles on üks neist Fabriku näiduelementidest: `ubi_model_base_data___year_ro`, `…child_per_month_ro`, `…alt_child_std_ro`, `…pension_receivers_ro`, `…others_inc_children_ro`, `…income_tax_payers_ro`. Neid tuvastatakse Fabriku serveris renderdatud id-de järgi, mitte JS-iga loodud märkeruutude (`#old`, `#child`, `#adult`) järgi, nii ei sõltu see JS-i käivitumise järjekorrast.
- **Turvavõrk.** Kui ühtegi "jääb nähtavaks" elementi ei leita (nt Fabriku väljade nimed muutuvad), ei peideta `#group161`-st midagi.
- **Terved grupid (`CONFIG.baseDataSelectors`)** on nüüd `#group210`, `#group164`, `#group205`, `#group207` (`#group161` on viidud osaliste hulka). **Kärbete grupp** on `CONFIG.cutsSelectors` (`#group162`), vaikimisi lahti (`startCollapsed.cuts: false`).
- **Nupuriba** tekib grupi `#group161` ja esimese tervikuna peidetava grupi (`#group210`) vahele. Kui seal gruppe pole, tuleb riba osaliselt peidetava grupi järele.
- **Olek.** Kasutaja viimane valik (avatud / suletud) säilib ekraani pööramisel ja laiuse muutmisel (1280 → 360 → 1280 px: nupud ei dubleeru).
- **Seaded** (`calc-mobile.js`, `CONFIG`): `baseDataSelectors`, `basePartial`, `cutsSelectors`, `baseOnWide`, `startCollapsed` (`base`, `cuts`, `tax`), `labels`.
- **Väike refaktor:** nuppude loomine ei sõltu enam kitsast vaatest (uus `syncToggles()`); kitsa vaate muu loogika (vahelehed, diagrammid, maksuvalikute nupp telefonil) on sama.

## Piirangud ja teada märkused

1. **Kommentaaride grupp `#group164` on vaikimisi peidus** (juhendi järgi). Selles on märge "ANDMED ON VEEL MITTETÄIELIKUD …". Kui see peaks olema kõigile nähtav, tõsta `#group164` `baseDataSelectors`-ist välja.
2. **Nupuriba asub peidetud ridade all.** Kui avad lisaandmed, ilmuvad peidetud read nupust **kõrgemale** (grupi `#group161` sisse) ja nupp liigub allapoole. Teised peidetud grupid tulevad nupu alla.
3. **Maksude arvestamise nupp** (telefonil, mooduli (2) veerg "Mahaarvamised") ei muutu.
4. **Mida ma ei testinud:** päris Fabriku CSS-i, päris seadmeid (iOS Safari, Android Chrome) ja päris Joomla lehte. Testleht kasutab Bootstrapi, mallis olevat `user.css`-i ja Fabriku andmepaani järeleehitust (juhendi grupid, read, id-d, märkeruudud, kärpetabel).

## Kuidas kontrollisin

Chromium (Playwright), laiused 1280, 768 ja 360 px (viimane puudutusemulatsiooniga), **enne** = main'i `calc-mobile.js`, **pärast** = see haru. Kokku 50 automaatkontrolli, kõik läbi.

| Kontroll | Tulemus |
|---|---|
| Nähtavad: aasta, lapsestandardid, 3 sihtrühma ja märkeruudud, kärbete lisaväli, tabel, `#group161` pealkiri / sissejuhatus / lõpumärkus (3 laiust) | jah |
| Peidus: rahvaarv, tulumaks, pensioni baasosa read, korrigeeritud tulu, grupid 210 / 164 / 205 / 207 (3 laiust) | jah |
| Nupud: tekst, `aria-expanded`, asukoht (`#group161` ja `#group210` vahel) | jah |
| Peidetud väärtused loetavad; peidetud elementidel `visually-hidden` + `inert`; `fabrikHide` elemente ei puututud; märkeruudud fookustatavad; ülevoolu pole | jah |
| "Näita kõiki alusandmeid" avab kõik (meie märkeid ei jää), uuesti vajutus peidab; kärbete nupp peidab ja näitab tabeli | jah (3 laiust) |
| Ekraani pööramine 1280 → 360 → 1280: olek säilib, nupuriba täpselt üks | jah |
| `baseOnWide: false`: arvutivaates nuppe ega märkeid pole ja kõik nähtav; telefonil nupud ja osaline peitmine; 360 → 1280 eemaldab nupud ja märked | jah |
| Kalkulaatori tulemus (lause, netotulud) enne = pärast; JS-vead samad (testkeskkonna omad: jQuery, Google Charts, Fabrik) | jah |
