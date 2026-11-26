# Kodanikupalga kalkulaator: 2027. aasta andmed

Failid:

- `moodulid/osad/01-top.phtml`: uus aasta nupp **2027** (`btn btn-lg btn-outline-success`, id `year2027`) 2026 järel; JS-i viite versioon `?v=20261124` → `?v=20261126`. **Vaikimisi valitud on endiselt 2026** (`checked="checked"` jäi `year2026` peale). Tervik `moodulid/kalkulaator-uus.phtml` on sellest genereeritud (`sync.py join`).
- `media/calculator/ubiTaxCalcCompare.js`: 2027 lisatud tabelitesse `SUPPORTED_YEARS`, `SOCIALTAX_MIN` ja `CHILD_BENEFITS`; `getCheckedYear()` jätab vahele aasta nupu, mida lehel pole.
- `moodulid/README.md`: osa 01 kirjelduses aasta valik 2020–2027.

Muudatus diffina: `2027.diff`. `calc-mobile.js`-i, `user.css`-i ega Fabriku väljade seadeid ei muudetud.

## Aastapõhised parameetrid 2027

| Parameeter | Väärtus | Kus koodis | Allikas / olek |
|---|---|---|---|
| Sotsiaalmaksu kuumäär | 946 € → minimaalne kohustus **312,18 €** kuus | `SOCIALTAX_MIN[2027]` (uus) | Kuumäär on eelmise aasta alampalk: kooskõlas koodis olevate väärtustega 2023-2026 (654, 725, 820, 886 € × 33%). 946 € on 2026. aasta alampalk (alates 1. aprillist, [ERR](https://www.err.ee/1609943063/tooandjad-ja-ametiuhingud-joudsid-alampalga-kusimuses-kokkuleppele)). Sama number on 2027. aasta riigieelarve seaduse eelnõus 1037 SE (§ 2 lg 6, nii viitavad kaks palgakalkulaatorit); eelnõu on kolmandal lugemisel, seadust pole vastu võetud ja eelnõu teksti ise ma avada ei saanud. |
| Tulumaksumäär | 22% | `getIncomeTaxRate` (`y >= 2025`, muutmata) | sama mis 2025-2026; 2027 kohta EMTA lehel veel eraldi andmeid ei ole, kalkulaatorid kasutavad 22% |
| Maksuvaba tulu | 8400 € aastas (700 € kuus) | `getTaxFreeYearDefault` (`y >= 2026`, muutmata) | sama mis 2026; 2027 kohta ainult palgakalkulaatorite lehed |
| Töötuskindlustus | 1,6% töötaja, 0,8% tööandja | kõvakodeeritud, muutmata | määrad jäävad muutmata 2027-2030 ([ERR](https://www.err.ee/1610140258/tootuskindlustusmakse-maarad-jaavad-jargmiseks-neljaks-aastaks-muutmata)) |
| Kogumispension | 2% + 4% sotsiaalmaksust | `getFundedPensionFromSocialTax` (muutmata) | muutuse kohta 2027. aastaks andmeid ei leidnud |
| Lapsetoetus / suurpere toetus | 80 / 100 € ja 450 / 650 € | `CHILD_BENEFITS[2027]` (uus) | **eeldus**: 2027 kohta muudatusi ei leidnud, summad võetud 2026. aasta omad. Üksikvanema lisatoetust (ettepanek 80 → 100 € alates 1. septembrist 2026) mudelis ei ole. |

2027. aasta alampalk **997 €** ei mõjuta 2027. aasta sotsiaalmaksu: see läheb **2028. aasta** kuumääraks (997 × 33% = 329,01 €), kui 2028 lisatakse.

Lastetoetuste eeldus ja sotsiaalmaksu number tuleb **detsembris, kui riigieelarve seadus on vastu võetud**, üle kontrollida. Muuta tuleb siis ainult need kaks rida `ubiTaxCalcCompare.js`-is.

## Paigaldus

1. **Fabrik:** 2027. aasta kirje (`/kalkulaator/ubi-model-archive/details/59/2027`) on loodud (2026-11-26); nupp viib sellele lehele.
2. Lae üles `ubiTaxCalcCompare.js`.
3. Uuenda Joomlas moodul `KalkulaatorV3-top` (või kleebi kogu tervik).
4. Puhasta Joomla vahemälu ja tee brauseris Ctrl+F5.

Järjekord: **JS enne**. Vana HTML + uus JS töötab nagu enne (`getCheckedYear` ei viska viga puuduva nupu pärast; kontrollitud). Uus HTML + vana JS: 2026 ja varasemad töötavad, aga 2027 valikul puuduks sotsiaalmaksu hoiatus ja lastetoetused.

**Tagasivõtmine:** taasta eelmine `ubiTaxCalcCompare.js` ja moodul `KalkulaatorV3-top`.

## Kontroll

- `python3 moodulid/sync.py check --lint`: markerid korras, tervik = osad, `php -l` OK; `node --check` OK.
- JS-i aastaloogika simuleeritult (DOM-i asendajaga): vana HTML (ilma 2027 nuputa) + uus JS → vaikimisi 2026, vigu ei tule; uus HTML → 2026 vaikimisi, 2027 valitavana; `getSocialTaxMin(2027)` = 312,18; maksumäär 22%, maksuvaba 8400, 3 lapse raha 710 € (260 + 450), sama mis 2026. Samad testid vana JS-iga 2027 puhul ebaõnnestuvad, test on seega tundlik.
- Nupuriba renderdatud Bootstrap 5-ga: 2027 on rohelise äärega (success outline), 2026 kollane ja valitud; kui valida 2027, täitub see roheliseks.
- **Ei kontrollitud** päris lehel: seda, kuidas diagramm ja tulemuste tabel 2027 alusandmetega käituvad (uus JS ja moodul pole veel saidil, Fabriku kirje on olemas).
