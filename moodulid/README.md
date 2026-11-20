# Kalkulaatori moodulid

**Allikas on `osad/*.phtml`.** Tervikfail `kalkulaator-uus.phtml` on genereeritud (osade otsejärjestikune liitmine) ja seda käsitsi ei muudeta. Iga osa on täpselt see, mida Joomlas ühte moodulisse kleebitakse: koos PHP-ga ning algus- ja lõpumarkeriga.

| Osa | Moodul (markeri nimi) | Sisu |
|---|---|---|
| `osad/01-top.phtml` | `KalkulaatorV3-top` | aasta valik (2020–2026) ja "näita rohkem" nupp |
| `osad/02-sisend.phtml` | `KalkulaatorV3M (2)` | sisendid: kodanikupalk, palk (brutopalk / tööandja kulu / netotulu), lapsed, mahaarvamised, aastatulu |
| `osad/03-diagramm.phtml` | `KalkulaatorV3M (diagramm)` | tulemuse lause ja leibkonna kuise sissetuleku diagramm |
| `osad/04-tulemus.phtml` | `KalkulaatorV3M (3)` | "Tulemus": protsendi aluse valik, tulemustabel ja maksutulude jaotumine |
| `osad/05-bottom.phtml` | `KalkulaatorV3-bottom` | `initializeCalculator` ja Google Translate |

Moodulite järjekord tervikus on **failinimede järjekord**. Järjekorda muudad failide ümbernimetamisega.

## Töövoog

1. Muuda vajalikku osa (`osad/…`).
2. `python3 moodulid/sync.py join` uuendab terviku.
3. `python3 moodulid/sync.py check --lint` kontrollib markereid, et tervik = osad (baitideni) ja jooksutab `php -l` igale osale (kui `php` on olemas).
4. Commit'i osad ja tervik **koos**.

Joomlas otse mooduli sees tehtud muudatuse viid tagasi nii: kopeeri mooduli täielik sisu vastavasse osafaili (üle kogu faili) ja tee `join`.

## Osa reeglid (`check` kontrollib)

- esimene rida on mooduli algusmarker, nt `<!-- KalkulaatorV3M (2)-->`;
- viimane mitte-tühi rida on sama mooduli lõpumarker, nt `<!-- Lõpp: KalkulaatorV3M (2)-->` (selle taha ei tohi midagi kirjutada);
- iga moodul on ainult ühes failis ja ühes failis on ainult üks moodul.

Uue mooduli lisad uue failina sobiva numbriga (nt `06-uus.phtml`); skripti muutma ei pea.

## Hädaabi

Kui muudatus tehti kogemata terviku sees, märkab `check` seda (aegunud tervik, näitab esimest erinevat rida). Selle osadesse toomiseks: `python3 moodulid/sync.py split --force`. **See kirjutab kõik osad terviku põhjal üle**, seega tee seda ainult siis, kui osades pole veel salvestamata tööd.
