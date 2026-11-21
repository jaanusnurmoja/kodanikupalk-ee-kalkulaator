# Kodanikupalga kalkulaator: mahaarvamised enne palgavälja telefonis (kasutajamugavus, 3. etapp)

Fail: ainult `media/templates/site/cassiopeia_kalkulaator/css/user.css` (+7 rida, olemasoleva "alla 576 px" ploki lõpus). Moodulit (`kalkulaator-uus.phtml`), `ubiTaxCalcCompare.js`-i, `calc-mobile.js`-i ega `index.php`-d ei muudetud. Muudatus on diffina failis `mobiil-jarjekord.diff` (rakendub main'i seisule, kus maksumudeli etapp 2 on juba sees).

**Paigaldus:** laadi üles `user.css`, puhasta Joomla vahemälu ja tee brauseris Ctrl+F5. Ühtki moodulit pole vaja Joomlas uuendada.
**Tagasivõtmine:** kustuta rida `.calc-fit-cols > .col-R { order: -1; }` (või taasta eelmine `user.css`).

## Mida kasutaja näeb

Telefonis (vaateakna laius alla 576 px) on moodul 2 nüüd selles järjekorras:

1. **Mahaarvamised** ("Arvesta sotsiaalmaksu …", maksuvaba tulu, töötuskindlustusmaksed, kogumispension, maksuvaba tulu / aastatulu)
2. **Maksustatav tulu (nt töötasu)**: sisendi liik, summaväli, "2 täiskasvanut", lapsed
3. kohe selle all diagrammimoodul koos lausega ("See leibkond … saab … rohkem")

Enne oli järjekord vastupidine (palk, siis mahaarvamised, siis diagramm). Eesmärk: palgaväli, leibkonna tunnused ja tulemus on lähestikku.

Mõõdetud 360 × 740 px ekraanil (tulemus-lause olemas):

| | Enne | Pärast |
|---|---|---|
| Palgaväli (`#eur`) lehel (y, px) | 907 | 1337 |
| Palgaväljast tulemus-lause lõpuni | 827 px (ei mahu ekraanile) | **397 px (mahub 740 px ekraanile)** |
| Palgaväljast diagrammi lõpuni | 1364 px | 934 px (ei mahu veel) |

**Mida see EI lahenda:** diagramm ise (koos kirjelduse ja maksumudeli nuppudega) ei mahu palgaväljaga ühele telefoniekraanile (934 px > 740 px). Lause mahub. Diagrammi kõrguse vähendamine on eraldi töö.
**Hind:** palgaväli on nüüd lehe ülaosast kaugemal (mahaarvamiste ploki kõrguse, ca 430 px võrra). Kui kasutaja tahab muuta ainult palka, peab ta mahaarvamistest mööda kerima. Kui see segab, saab mahaarvamised ühtlasi peidetavaks teha sama nupuga nagu "Näita kärpevõimalusi" (`calc-mobile.js`, `CONFIG`); seda ma **ei teinud**, sest soov oli ümbertõstmine.

## Kuidas see töötab

Üks CSS-reegel:

```css
@media (max-width: 575.98px) {
  .calc-fit-cols > .col-R { order: -1; }
}
```

- `.calc-fit-cols` on mooduli 2 rida; `.col-R` selle parem veerg ("Mahaarvamised"), `.col-L` vasak ("Maksustatav tulu"). Bootstrapi `.row` on flex-konteiner, seega `order: -1` tõstab veeru visuaalselt ette.
- **Valija on tahtlikult `.calc-fit-cols > .col-R`.** Klasse `col-L` / `col-R` kasutab ka päismoodul (`01-top.phtml`, read 135 ja 161). Üldine `.col-R { order: -1 }` oleks päismoodulit lõhkunud. Mõõtmisel on päismooduli `order` mõlemal pool 0.
- Reegel kehtib ainult alla 576 px (Bootstrapi `sm`). Seal `col-sm-6` ei kehti ja veerud on alati üksteise all. Alates 576 px, kus veerud on kõrvuti, järjekorda ei muudeta: muidu vahetaksid veerud külgi ja arvutivaade muutuks.
- HTML, id-d, atribuudid ja JS jäävad samaks; kalkulaator arvutab nagu enne.

## Piirangud ja teada märkused

1. **576–767 px (nt telefon külili).** Mõõtmisel (Bootstrap + `user.css`) on veerud 576, 640 ja 700 px peal ikka üksteise all, 768 px peal kõrvuti. Üksteise all olles jääb palk mahaarvamiste ette (järjekorda ei muudeta). CSS ei tea, kas veerud murdusid või mahtusid kõrvuti, ja kõrvuti olles vahetaks `order` neid külgedele. Kui vaja, saab murdumise tuvastada JS-iga (`ResizeObserver`) ja klassi lisada; seda ma ei teinud, sest soov oli mobiilivaade ja külili telefonil on ekraani kõrgus nagunii väike.
2. **Ligipääsetavus.** `order` muudab ainult *visuaalset* järjekorda. Tab-klahv ja ekraanilugeja (TalkBack, VoiceOver) liiguvad endiselt HTML-i järjekorras: esmalt palgaväli, siis mahaarvamised, kuigi nähtavalt on need vastupidi. Plokid on teineteisest sõltumatud ega muuda üksteise tähendust, aga kui see on oluline, tuleks veerg JS-iga DOM-is ümber tõsta (`calc-mobile.js`; selle faili päises on lubadus "midagi ei tõsteta ümber", seda tuleks siis muuta).
3. **Ülevool 576 ja 992 px peal.** Testlehel on lehe laius 9 px (576) ja 27 px (992) laiem kui vaateaken. See oli **juba enne** täpselt sama ja muudatus seda ei mõjuta (leht on neil laiustel piksliti identne); vt ka `MUUDATUSED-mobiil.md` "Leitud, aga mitte muudetud".
4. Alla 576 px (320, 360, 390, 430, 575 px) ülevoolu ei ole ei enne ega pärast (0 px).

## Kuidas kontrollisin

Chromium (Playwright). Testleht: moodulid 1–5 PHP-ga renderdatult (`sync.py` osad), päris `ubiTaxCalcCompare.js` ja `calc-mobile.js`, mallifailist `index.php` võetud `.calc-layout` / vahelehtede struktuur, Bootstrap 5.3.3 ja main'i `user.css` (**enne**) ning muudetud `user.css` (**pärast**). Lähteandmed (Fabrik) on stubitud.

| Kontroll | Tulemus |
|---|---|
| Täislehe ekraanipilt enne ja pärast 13 laiusel (320, 360, 390, 430, 575, 576, 640, 700, 768, 991, 992, 1280, 1440 px): alates 576 px | **piksliti identne** (8 laiust) |
| Alla 576 px (5 laiust): lehe kõrgus sama; kõik mooduli 2 rea kohal ja all piksliti identne; muutub ainult mooduli 2 rida | jah |
| Päismooduli `col-L` / `col-R` asukoht ja mõõdud enne = pärast | jah, kõigil 13 laiusel |
| Horisontaalne ülevool alla 576 px | 0 px |
| Päris puudutused (telefoniemulatsioon 360 × 740, `hasTouch`): märkeruudu "Üksikisiku töötuskindlustusmakse" puudutus, "Arvesta maksuvaba tulu" eemaldamine, summa 1500 → 2000 trükkimine; igal sammul neto, "senise korra" neto, lause, ühtlane tulumaks ja märkeruutude seis **enne = pärast** | identne (4 sammu); tulemused sammude vahel erinevad (neto 4298,40 → 4437,28) |
| Vahelehe vahetus ("Lähteandmed" → "Kalkulaator") | järjekord säilib |
| Vaateakna pööramine 360 → 800 → 360 px | 800 px peal veerud kõrvuti samal kõrgusel, palk vasakul; tagasi 360 px peal mahaarvamised ees |
| Mooduli 2 DOM-i järjekord enne ja pärast | sama (`col-L`, siis `col-R`) |

**Mida ma ei teinud:** ei testinud päris Cassiopeia- ega Fabriku-CSS-iga (testleht kasutab Bootstrapi ja mallis olevat `user.css`-i), ei päris seadmetel (iOS Safari, Android Chrome) ega päris Google Chartsiga. Väikesed nihked paigutuses on päris saidil võimalikud.
