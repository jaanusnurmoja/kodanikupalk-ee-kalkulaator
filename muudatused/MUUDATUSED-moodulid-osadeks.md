# Moodulid osadeks: iga mooduli oma fail, tervik genereeritud

**Otsus:** osad (`moodulid/osad/*.phtml`) on allikas, tervikfail `moodulid/kalkulaator-uus.phtml` on genereeritud. Töövoog on kirjas failis `moodulid/README.md`.

## Mis lisandus

- `moodulid/osad/01-top … 05-bottom.phtml`: viis moodulit, iga algusmarkerist lõpumarkerini (koos PHP-ga). Faili sees on viis plokki, mitte neli: viies on põhjamoodul `KalkulaatorV3-bottom` (`initializeCalculator`, Google Translate).
- `moodulid/sync.py`: `join` (osad → tervik), `check [--lint]`, `split [--force]` (tervik → osad; ühekordne üleminek ja hädaabi). Ainult Pythoni standardteek, failid loetakse ja kirjutatakse baitidena.
- `moodulid/README.md`: töövoog, osa reeglid, hädaabi.
- `.gitattributes`: terviku fail on `linguist-generated`, nii et GitHub voltib selle diffi kokku ja ülevaatuses näed ainult osade muudatusi.

`kalkulaator-uus.phtml` ise **ei muutunud** (sha256 enne = pärast = osade konkatenatsioon).

## Kuidas see on tehtud

- Jagamine käib *algusmarkerite* järgi: osa = algusmarkerist kuni järgmise algusmarkerini. Moodulite vahelised tühjad read jäävad eelmise osa lõppu, seega `join` on konstruktsiooni poolest baitideni täpne.
- `check` nõuab: osa esimene rida on algusmarker, viimane mitte-tühi rida on sama mooduli lõpumarker, iga moodul on ainult ühes failis.
- Moodulite järjekord tervikus = failinimede järjekord; uue mooduli lisad uue numbriga failina, skripti muutma ei pea.

## Kuidas kontrollisin

| Kontroll | Tulemus |
|---|---|
| split → join → terviku sha256 | identne originaaliga (`b588cfff…`) |
| `php -l` igale osale ja tervikule | kõik OK |
| iga osa eraldi renderdus PHP-ga `E_ALL`-iga (et-EE ja en-GB) | hoiatusi pole; osa 1 lingid saavad `/en` eesliite; oodatud elemendid (`#eur`, `#result-sentence`, `#family-chart`, `#totalnet`, `google_translate_element`) olemas |
| osade renderduste liitmine vs terviku renderdus | baitideni sama |
| aegunud tervik (osa sisu muudetud) | `check` annab exit 1 ja näitab esimese erineva rea; `join` parandab |
| katkine / vale lõpumarker, sama moodul kahes failis, kaks moodulit ühes failis, tekst lõpumarkeri taga | `check` annab selge vea (exit 2) |
| `split` kui osad juba olemas | keeldub ilma `--force`-ita; `--force` taastab osad terviku põhjal |
| tekst enne esimest markerit tervikus | `split` keeldub (see läheks kaduma) |
| uus moodul failina `06-uus.phtml` | `join` lisab selle terviku lõppu |

**Mida ma ei teinud:** ei katsetanud skripti Windowsis (kasutab `pathlib` ja baitifaile ning väldib cp1252-väliseid märke, aga pole jooksutatud) ega pannud `check`-i automaatselt commit'i või GitHub Actionsi külge. Mõlemat saab lisada, kui soovid.
