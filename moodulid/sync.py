#!/usr/bin/env python3
"""
moodulid/sync.py: kalkulaatori moodulite osafailid <-> tervikfail.

ALLIKAS ON OSAD (moodulid/osad/*.phtml). Tervikfail moodulid/kalkulaator-uus.phtml on genereeritud:
see on osafailide sisu otsejärjestikune liitmine (failinimede järjekorras), ilma midagi lisamata
ja eemaldamata. Seega on iga osa täpselt see, mida Joomlas ühte moodulisse kleebitakse.

Käsud (käivita kaustast moodulid/ või kust tahes):
  python3 sync.py join            osad -> tervik (korda iga kord, kui osa on muutunud)
  python3 sync.py check [--lint]  kontrollib, et tervik = osade liitmine ja markerid on korras;
                                  --lint jooksutab lisaks `php -l` igale osale ja tervikule (kui php on olemas)
  python3 sync.py split [--force] tervik -> osad. Ühekordne üleminek või hädaabi, kui muudatus tehti
                                  kogemata terviku sees; kirjutab osad üle, seepärast nõuab --force,
                                  kui osad juba olemas on.

Osa reeglid (check kontrollib):
  - esimene rida on mooduli algusmarker, nt   <!-- KalkulaatorV3M (2)-->
  - viimane mitte-tühi rida on sama mooduli lõpumarker, nt   <!-- Lõpp: KalkulaatorV3M (2)-->
  - iga mooduli nimi esineb ainult ühes osas
Moodulite järjekord tervikus = osafailide nimede järjekord (01-, 02-, ...). Järjekorda muudad
failide ümbernimetamisega; uue mooduli lisad uue faili ja numbriga.

Ainult Pythoni standardteek. Failid loetakse ja kirjutatakse baitidena (UTF-8, reavahesid ei muudeta).
"""
import argparse
import pathlib
import re
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
PARTS_DIR = HERE / "osad"
WHOLE = HERE / "kalkulaator-uus.phtml"

# Tuntud moodulid: markeri nimi (tühikuteta) -> osafaili nimi. Tundmatu mooduli nime puhul (split) tehakse nimi ise.
KNOWN = {
    "KalkulaatorV3-top": "01-top.phtml",
    "KalkulaatorV3M(2)": "02-sisend.phtml",
    "KalkulaatorV3M(diagramm)": "03-diagramm.phtml",
    "KalkulaatorV3M(3)": "04-tulemus.phtml",
    "KalkulaatorV3-bottom": "05-bottom.phtml",
}

NAME = r"(KalkulaatorV3(?:-[A-Za-z0-9]+|M\s*\([^)]*\)))"
START_RE = re.compile(r"^<!--\s*" + NAME + r"\s*-->\s*$")
END_RE = re.compile(r"^<!--\s*Lõpp:\s*" + NAME + r"\s*-->\s*$")


class SyncError(Exception):
    pass


def key_of(match):
    """Markeri nimi tühikuteta: 'KalkulaatorV3M (2)' -> 'KalkulaatorV3M(2)'."""
    return re.sub(r"\s+", "", match.group(1))


def read_text(path):
    return path.read_bytes().decode("utf-8")


def line_text(line):
    return line.rstrip("\r\n")


def validate_part(name, text):
    """Kontrollib ühe osa markereid; tagastab mooduli nime."""
    lines = text.splitlines(keepends=True)
    if not lines:
        raise SyncError("%s: fail on tühi" % name)
    start = START_RE.match(line_text(lines[0]))
    if not start:
        raise SyncError("%s: esimene rida peab olema mooduli algusmarker (<!-- KalkulaatorV3... -->), nüüd: %r"
                        % (name, line_text(lines[0])[:60]))
    key = key_of(start)
    last = next((l for l in reversed(lines) if l.strip()), "")
    end = END_RE.match(line_text(last))
    if not end:
        raise SyncError("%s: viimane mitte-tühi rida peab olema lõpumarker (<!-- Lõpp: %s-->), nüüd: %r"
                        % (name, key, line_text(last)[:60]))
    if key_of(end) != key:
        raise SyncError("%s: alguses on %s, lõpus %s" % (name, key, key_of(end)))
    starts = [i for i, l in enumerate(lines) if START_RE.match(line_text(l))]
    if len(starts) != 1:
        raise SyncError("%s: osas on %d algusmarkerit, peab olema 1 (kaks moodulit ühes failis?)" % (name, len(starts)))
    return key


def load_parts():
    files = sorted(PARTS_DIR.glob("*.phtml"))
    if not files:
        raise SyncError("kaustas %s pole ühtegi .phtml faili (kasuta esmalt: split)" % PARTS_DIR)
    seen = {}
    parts = []
    for f in files:
        text = read_text(f)
        key = validate_part(f.name, text)
        if key in seen:
            raise SyncError("moodul %s on kahes failis: %s ja %s" % (key, seen[key], f.name))
        seen[key] = f.name
        parts.append((f.name, text))
    return parts


def joined():
    return "".join(text for _, text in load_parts())


def first_difference(a, b):
    la, lb = a.splitlines(), b.splitlines()
    for i in range(max(len(la), len(lb))):
        x = la[i] if i < len(la) else "(faili lõpp)"
        y = lb[i] if i < len(lb) else "(faili lõpp)"
        if x != y:
            return i + 1, x[:80], y[:80]
    return None


def cmd_join(_args):
    text = joined()
    data = text.encode("utf-8")
    if WHOLE.exists() and WHOLE.read_bytes() == data:
        print("tervik on juba ajakohane: %s (muutmata)" % WHOLE.name)
        return 0
    WHOLE.write_bytes(data)
    print("kirjutatud: %s (%d osa, %d rida)" % (WHOLE.name, len(load_parts()), len(text.splitlines())))
    return 0


def cmd_split(args):
    if not WHOLE.exists():
        raise SyncError("terviku faili pole: %s" % WHOLE)
    existing = sorted(PARTS_DIR.glob("*.phtml")) if PARTS_DIR.exists() else []
    if existing and not args.force:
        raise SyncError("osad on juba olemas (%d faili kaustas %s). Osad on allikas, seepärast ei kirjuta ma neid\n"
                        "ilma --force-ita üle. Kui tahad tõesti terviku põhjal osad uuesti teha: split --force"
                        % (len(existing), PARTS_DIR.name))
    lines = read_text(WHOLE).splitlines(keepends=True)
    starts = [(i, key_of(m)) for i, l in enumerate(lines) for m in [START_RE.match(line_text(l))] if m]
    if not starts:
        raise SyncError("terviku seest ei leitud ühtegi mooduli algusmarkerit")
    if starts[0][0] != 0:
        raise SyncError("enne esimest mooduli algusmarkerit (rida %d) on teksti; see läheks osadest kaduma"
                        % (starts[0][0] + 1))
    keys = [k for _, k in starts]
    dups = sorted({k for k in keys if keys.count(k) > 1})
    if dups:
        raise SyncError("mooduli algusmarker esineb mitu korda: %s" % ", ".join(dups))
    bounds = [i for i, _ in starts] + [len(lines)]
    chunks = []
    for n, (_, key) in enumerate(starts, start=1):
        name = KNOWN.get(key) or "%02d-%s.phtml" % (n, re.sub(r"[^a-z0-9]+", "-", key.lower()).strip("-"))
        text = "".join(lines[bounds[n - 1]:bounds[n]])
        validate_part(name, text)
        chunks.append((name, text))
    if existing:
        for f in existing:
            f.unlink()
    PARTS_DIR.mkdir(exist_ok=True)
    for name, text in chunks:
        (PARTS_DIR / name).write_bytes(text.encode("utf-8"))
        print("  %-22s %4d rida" % (name, len(text.splitlines())))
    if joined().encode("utf-8") != WHOLE.read_bytes():
        raise SyncError("sisemine viga: osade liitmine ei võrdu terviku failiga")
    print("jagatud %d osaks; liitmine = tervik (baitideni)" % len(chunks))
    return 0


def php_lint(label, path):
    r = subprocess.run(["php", "-l", str(path)], capture_output=True, text=True)
    ok = r.returncode == 0
    print("  php -l %-22s %s" % (label, "OK" if ok else "VIGA\n" + (r.stdout + r.stderr).strip()))
    return ok


def cmd_check(args):
    parts = load_parts()  # kontrollib markereid
    print("markerid korras: %d osa (%s)" % (len(parts), ", ".join(n for n, _ in parts)))
    problems = 0
    if not WHOLE.exists():
        print("VIGA: terviku faili pole. Käivita: python3 sync.py join")
        problems += 1
    else:
        want = "".join(t for _, t in parts)
        have = read_text(WHOLE)
        if want != have:
            d = first_difference(want, have)
            print("VIGA: %s ei ole osadega sünkroonis." % WHOLE.name)
            if d:
                print("  esimene erinevus terviku real %d:\n    osadest:  %r\n    tervikus: %r" % d)
            print("  Kui muutsid osa:  python3 sync.py join\n"
                  "  Kui muutsid kogemata terviku sees: kanna muudatus vastavasse osasse ja siis join")
            problems += 1
        else:
            print("tervik = osade liitmine (baitideni)")
    if args.lint:
        if shutil.which("php") is None:
            print("php pole PATH-is, lint vahele jäetud")
        else:
            with_lint = [(n, PARTS_DIR / n) for n, _ in parts] + [(WHOLE.name, WHOLE)]
            for label, path in with_lint:
                if path.exists() and not php_lint(label, path):
                    problems += 1
    return 1 if problems else 0


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")  # Windowsi konsool ei vea ä/õ peale
    ap = argparse.ArgumentParser(description="Moodulite osafailid <-> tervikfail (osad on allikas).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("join", help="osad -> tervik").set_defaults(fn=cmd_join)
    p = sub.add_parser("check", help="kontrolli, et tervik = osad")
    p.add_argument("--lint", action="store_true", help="jooksuta ka php -l")
    p.set_defaults(fn=cmd_check)
    p = sub.add_parser("split", help="tervik -> osad (ühekordne / hädaabi)")
    p.add_argument("--force", action="store_true", help="kirjuta olemasolevad osad üle")
    p.set_defaults(fn=cmd_split)
    args = ap.parse_args(argv)
    try:
        return args.fn(args)
    except SyncError as e:
        print("VIGA: %s" % e, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
