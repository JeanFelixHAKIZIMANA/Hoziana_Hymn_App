"""Convert the Hoziana hymnal text export into structured JSON.

Usage: python3 -I scripts/parse_hymnal.py <book.txt> src/data/hymns.json design/hymnal-conversion-report.md
"""
import json, re, sys

src, out_json, out_report = sys.argv[1:4]
raw = open(src, encoding="utf-8").read().splitlines()

PAGE = re.compile(r"^\s*-\s*[ivx\d]+\s*-\s*\d*\s*$")
VOLUME = re.compile(r"^VOLUME\s+([IVX\d]+),\s*(\d{4})")
# "12. TITLE12 [Key] / Scripture"  (title is upper case, footnote number glued on)
HEADER = re.compile(r"^(\d{1,3})\s*\.\s*([A-ZÀ-Ý][A-ZÀ-Ý’'\s,().:\d-]*?[A-ZÀ-Ý)’'])\s*(\d{1,3})?\s*(\[[^\]]*\])?\s*(?:/\s*(.*))?$")
FOOTNOTE = re.compile(r"^(\d{1,3})\s*\.\s*([A-Z][a-zà-ÿ].*)$")
ROMAN = re.compile(r"^\s*(I{1,3}|IV|V|VI{1,3}|IX|X)\s*\.\s*(.*)$")
ROMAN_VAL = {"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9,"X":10}
REPEAT = re.compile(r"\s*[/\\]\s*(\d{1,2})?\s*$")

def parse_header(num, text):
    m = re.search(r"(?<=[A-ZÀ-Ý’')])\s?" + str(num) + r"(?!\d)", text)
    if m:
        title, rest = text[: m.start()], text[m.end():]
    else:
        cut = min([i for i in (text.find("["), text.find(" / ")) if i >= 0] or [len(text)])
        title, rest = text[:cut], text[cut:]
    key = re.search(r"\[([^\]]*)\]", rest)
    scripture = re.sub(r"\[[^\]]*\]", "", rest).strip().lstrip("/").strip() or None
    title = " ".join(title.split()).strip(" /")
    return {"number": num, "title": title, "titleUpper": title,
            "key": key.group(1).strip() if key and key.group(1).strip() else None,
            "scripture": scripture, "_lines": []}

body_start = next(i for i, l in enumerate(raw) if VOLUME.match(l.strip()))
hymns, credits, volume, issues = [], {}, None, []
cur, in_footnotes, last_fn = None, False, None

for line in raw[body_start:]:
    s = line.strip()
    if not s:
        continue
    if PAGE.match(s):
        in_footnotes = False
        continue
    m = VOLUME.match(s)
    if m:
        volume = {"label": m.group(1), "year": int(m.group(2))}
        continue
    fm = FOOTNOTE.match(s)
    if fm and cur is not None and cur["number"] - 5 <= int(fm.group(1)) <= cur["number"]:
        in_footnotes = True
        last_fn = int(fm.group(1))
        credits[last_fn] = fm.group(2).strip()
        continue
    if in_footnotes:
        # continuation of a footnote (credits run to the bottom of the page)
        credits[last_fn] += " " + s
        continue
    expected = 1 if cur is None else cur["number"] + 1
    hm = re.match(r"^(\d{1,3})\s*\.\s*(.+)$", s)
    if hm and int(hm.group(1)) == expected and re.match(r"[A-ZÀ-Ý’' ]{3}", hm.group(2)):
        h = parse_header(expected, hm.group(2))
        h["volume"] = volume["label"] if volume else None
        h["volumeYear"] = volume["year"] if volume else None
        cur = h
        hymns.append(cur)
        continue
    if cur is not None:
        cur["_lines"].append(s)

# Part labels as the book writes them. Swahili hymns use Mume/Mke/Wote; a few
# labels are misspelt (Gab, Base, Gose) and are corrected below.
PART = re.compile(r"^(Gore|Bose|Gabo|Gab|Abagabo|Abagore|Basse|Base|Bamwe|Umwe|Mume|Mke|Wote|Solo|Gose)\s*:\s*(.*)$")
FIX_PART = {"Gab": "Gabo", "Base": "Basse"}
SPOKEN = re.compile(r"^Ijambo\s*:\s*(.*)$")
REFRAIN_CUE = re.compile(r"^Inyikirizo\s*:\s*(.*)$")

def norm(text):
    return " ".join(REPEAT.sub("", PART.sub(r"\2", text)).split()).lower()

def line_obj(text, prev_part=None):
    rep = None
    m = REPEAT.search(text)
    if m and (m.group(1) or text.rstrip().endswith("/")):
        rep = int(m.group(1) or 2)
        text = text[: m.start()]
    part, heading = None, None
    pm = PART.match(text)
    cue = REFRAIN_CUE.match(text)
    if pm:
        part, text = FIX_PART.get(pm.group(1), pm.group(1)), pm.group(2)
        if part == "Gose":  # misprint inside a Gore/Bose exchange: it answers the previous part
            part = "Gore" if prev_part == "Bose" else "Bose"
    elif cue:
        heading, text = "refrain", cue.group(1).rstrip(".") + "…"
    o = {"text": " ".join(text.split())}
    if rep: o["repeat"] = rep
    if part: o["part"] = part
    if heading: o["heading"] = heading
    return o

def mark_sections(lines):
    # The book prints no blank lines, so mark where a stanza changes texture:
    # lines sung by everyone giving way to a call-and-response exchange, and back
    # again once an exchange is over. Unlabelled lines inside an exchange (fewer
    # than four, or after a single part line) continue the part before them.
    marked = [bool(l.get("part") or l.get("heading")) for l in lines]
    mode, plain_run, exchange = "plain", 0, 0
    for i, l in enumerate(lines):
        if l.get("heading"):
            l["gap"] = True
            mode, plain_run = "plain", 1
        elif l.get("part"):
            if mode == "plain":
                if plain_run >= 2:
                    l["gap"] = True
                mode, exchange = "parts", 0
            exchange += 1
        elif mode == "parts":
            j = i
            while j < len(lines) and not marked[j]:
                j += 1
            if exchange >= 2 and j - i >= 4:
                l["gap"] = True
                mode, plain_run = "plain", 1
        else:
            plain_run += 1
    if lines:
        lines[0].pop("gap", None)
    return lines

SCRIPTURE = re.compile(r"^(\d\s?)?[A-Z][A-Za-z]+\.?\s?\d+[\d:;,.\s-]*$")

def sentence_case(title, lyrics):
    # The book prints titles in capitals. Use sentence case, but keep a word
    # capitalised when the lyrics capitalise it mid-line (Yesu, Imana, Yerusalemu...).
    words = title.lower().split(" ")
    out = []
    for i, w in enumerate(words):
        prefix, _, core = w.rpartition("’")  # "cy’imana": judge "imana" on its own
        core = re.sub(r"^[^a-zà-ÿ]*", "", core)
        mid = re.findall(r"(?:(?<=[a-zà-ÿ,] )|(?<=’))(" + re.escape(core) + r")\b", lyrics, flags=re.I) if core else []
        proper = mid and sum(m[0].isupper() for m in mid) > len(mid) / 2
        if proper and prefix:
            w = prefix + "’" + core[0].upper() + core[1:]
        elif i == 0 or proper:
            w = re.sub(r"[a-zà-ÿ]", lambda m: m.group(0).upper(), w, count=1)
        out.append(w)
    return " ".join(out)

for h in hymns:
    lines = h.pop("_lines")
    while lines and not ROMAN.match(lines[0]) and SCRIPTURE.match(lines[0]) and (h["scripture"] is None or h["scripture"].endswith(",")):
        h["scripture"] = ((h["scripture"] or "") + " " + lines.pop(0)).strip()
    h["_text"] = " ".join(lines)
    where = {}
    for k, l in enumerate(lines):
        where.setdefault(norm(l), []).append(k)
    verse_starts = [k for k, l in enumerate(lines) if ROMAN.match(l)] + [len(lines)]

    # Blocks in book order: an unnumbered opening ("pre"), numbered verses, spoken
    # passages ("Ijambo:"), and the rest of a block after a spoken passage.
    blocks, spoken = [{"type": "pre", "lines": []}], None
    for idx, s in enumerate(lines):
        next_verse = next(k for k in verse_starts if k > idx) if idx < len(lines) - 1 else len(lines)
        rm = ROMAN.match(s) or re.match(r"^(\d{1,2})\s*\.\s+(.*)$", s)
        if rm and (rm.group(1) in ROMAN_VAL or rm.group(1).isdigit()):
            n = ROMAN_VAL.get(rm.group(1)) or int(rm.group(1))
            blocks.append({"type": "verse", "number": n, "lines": [rm.group(2)] if rm.group(2) else []})
            spoken = None
            continue
        sm = SPOKEN.match(s)
        if sm:
            spoken = {"type": "spoken", "lines": [sm.group(1)] if sm.group(1).strip() else [], "_resume": blocks[-1]}
            spoken["_parts"], spoken["_start"] = None, idx
            blocks.append(spoken)
            continue
        if spoken is not None:
            labelled = bool(PART.match(s))
            if spoken["_parts"] is None and not spoken["lines"]:
                spoken["_parts"] = labelled  # a reading shared between parts runs to the next verse
            elsewhere = any(k < spoken["_start"] or k > next_verse for k in where[norm(s)])
            ends = bool(spoken["lines"]) and elsewhere or (not spoken["_parts"] and labelled)
            if not ends:
                spoken["lines"].append(s)
                continue
            resume = spoken["_resume"]
            blocks.append({**{k: resume[k] for k in ("type", "number") if k in resume}, "continued": True, "lines": []})
            spoken = None
        blocks[-1]["lines"].append(s)

    has_verses = any(b["type"] == "verse" for b in blocks)
    pre_lines = blocks[0]["lines"]
    for b in blocks:
        for k in ("_resume", "_parts", "_start"):
            b.pop(k, None)
        if b["type"] == "pre":
            b.update({"type": "refrain"} if has_verses else {"type": "verse", "number": 1})
    blocks = [b for b in blocks if b["lines"] or b["type"] == "spoken"]
    for i, b in enumerate(blocks):
        # A block whose opening was only a spoken passage is not a continuation.
        if b.get("continued") and not any(o["type"] == b["type"] and o.get("number") == b.get("number") for o in blocks[:i]):
            del b["continued"]

    # Refrain printed once after verse I: lines beyond the length of verse II.
    verses = [i for i, b in enumerate(blocks) if b["type"] == "verse" and not b.get("continued")]
    if len(verses) >= 2 and not pre_lines and verses[1] == verses[0] + 1:
        v1, v2 = blocks[verses[0]], blocks[verses[1]]
        n = len(v2["lines"])
        is_part = [bool(PART.match(l)) for l in v1["lines"]]
        if len(v1["lines"]) > n and is_part[n - 1] and is_part[n] and not PART.match(v2["lines"][-1]):
            # The cut falls inside a call-and-response exchange, but verse II does not end in one,
            # so the count is misleading. Cut where verse I turns to call-and-response if that
            # is about the length of verse II; otherwise leave verse I whole.
            t = next((i for i in range(1, len(is_part)) if is_part[i] and not is_part[i - 1]), None)
            n = t if t is not None and abs(t - n) <= 2 else len(v1["lines"])
        extra = v1["lines"][n:]
        if extra:
            v1["lines"] = v1["lines"][:n]
            blocks.insert(verses[0] + 1, {"type": "refrain", "lines": extra, "inferred": True})
    stanzas = blocks
    for st in stanzas:
        objs, prev = [], None
        for l in st["lines"]:
            o = line_obj(l, prev)
            prev = o.get("part", prev)
            objs.append(o)
        st["lines"] = mark_sections(objs)
    h["stanzas"] = stanzas
    h["title"] = sentence_case(h["titleUpper"], h.pop("_text"))
    h["credit"] = credits.get(h["number"])
    c = h["credit"] or ""
    am = re.search(r"(?:Yahimbwe|Yanditswe|Yahinduwe|Yaririmbwe|Yigishijwe|Yatunganijwe)(?:\s+mu mwaka w[’']\s*\d{4})?\s+(?:na|n[’'])\s*(?:Pasitori|Pastor|PAsitori|Dr)?\.?\s*([^,0-9]+)", c)
    ym = re.search(r"mwaka w[’']\s*(\d{4})", c)
    h["author"] = " ".join(am.group(1).split()) if am else None
    h["year"] = int(ym.group(1)) if ym else None
    nums = [st["number"] for st in stanzas if st["type"] == "verse" and not st.get("continued")]
    if not stanzas: issues.append((h["number"], "no text"))
    if nums != list(range(1, len(nums) + 1)): issues.append((h["number"], f"verse numbers {nums}"))
    if not h["credit"]: issues.append((h["number"], "no credit footnote"))
    if not h["key"]: issues.append((h["number"], "no key"))
    if any(st.get("inferred") for st in stanzas): issues.append((h["number"], "refrain inferred from line count"))
    if any("part" in l for st in stanzas for l in st["lines"]): issues.append((h["number"], "call-and-response parts (Gore/Bose)"))
    if any(st["type"] == "spoken" for st in stanzas): issues.append((h["number"], "spoken passage (Ijambo)"))
    if not h["author"]: issues.append((h["number"], "author not recognised in credit"))

found = [h["number"] for h in hymns]
missing = sorted(set(range(1, max(found) + 1)) - set(found))
json.dump({"source": "Igitabo cy'indirimbo za Korali Hoziyana (ADEPR Nyarugenge)", "count": len(hymns), "hymns": hymns},
          open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

kinds = {}
for n, k in issues:
    kinds.setdefault(re.sub(r"\[.*\]", "", k).strip(), []).append(n)
with open(out_report, "w", encoding="utf-8") as r:
    r.write(f"# Hymnal conversion report\n\nHymns parsed: {len(hymns)} (numbers {found[0]}–{found[-1]}). Missing numbers: {missing or 'none'}.\n\n")
    r.write("| Check | Count | Hymns |\n| --- | --- | --- |\n")
    for k, ns in kinds.items():
        r.write(f"| {k} | {len(ns)} | {', '.join(map(str, ns))} |\n")
    r.write("""
## What each check means

- **Refrain inferred**: the book prints the refrain once, right after verse I, without a label. The converter treats the lines of verse I beyond the length of verse II as the refrain. Worth a quick look on each of these hymns.
- **Call-and-response parts**: lines marked `Gore:` / `Bose:` (and `Gabo:`, `Basse:`, `Solo:`, and `Mume:` / `Mke:` / `Wote:` in Swahili hymns; misprints `Gab:`, `Base:`, `Gose:` are corrected) are kept, with the part stored separately so the reader can show it as a small label.
- **No credit / no key / author not recognised**: the book itself has no footnote or no `[key]`, or the credit is worded in a way the converter does not read.
- **Spoken passage**: `Ijambo:` marks a reading or spoken word. It is kept as its own block, shown in the reader with a "Spoken" label. The converter ends it at the next part label, verse number, or a line that recurs elsewhere in the hymn (the refrain).
- **Sections inside a stanza**: the book has no blank lines, so the converter adds a smaller gap where lines sung by everyone turn into a Gore/Bose exchange, or where four or more unlabelled lines follow one.
- Repeat marks such as `/2` are removed from the text and stored as `repeat: 2` on the line.
""")
print(len(hymns), "hymns; missing", missing)
for k, ns in kinds.items(): print(f"{k}: {len(ns)}")
