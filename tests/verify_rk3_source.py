"""Independent XML-only check against the Word file, without the importer/docx."""
import csv
import json
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

root = Path(__file__).resolve().parents[1]
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(sys.argv[1]) as z:
    xml = ET.fromstring(z.read("word/document.xml"))
assert not xml.findall(".//w:tbl", ns)
expected, paragraph_count, manual = [], 0, []
for p in xml.findall("w:body/w:p", ns):
    text = re.sub(r"\s+", " ", "".join(t.text or "" for t in p.findall(".//w:t", ns))).strip()
    if not text:
        continue
    paragraph_count += 1
    style = p.find("w:pPr/w:pStyle", ns).get("{" + ns["w"] + "}val")
    is_manual = bool(re.match(r"^\d+\.\s", text))
    if style == "a4":
        assert not expected
    elif p.find("w:pPr/w:numPr", ns) is not None or is_manual:
        if is_manual:
            manual.append(text)
        correct = False
        for run in p.findall("w:r", ns):
            bold = run.find("w:rPr/w:b", ns)
            if bold is not None and bold.get("{" + ns["w"] + "}val") not in ("0", "false"):
                if "".join(t.text or "" for t in run.findall("w:t", ns)).strip():
                    correct = True
        if correct:
            expected[-1]["correct"].append(len(expected[-1]["options"]))
        expected[-1]["options"].append(re.sub(r"^\d+\.\s+", "", text) if is_manual else text)
    else:
        expected.append({"id": len(expected) + 1, "question": text, "options": [], "correct": []})

js = (root / "data/rk3-questions.js").read_text(encoding="utf8")
actual = json.loads(js.split("window.PATHOLOGY_QUESTIONS = ", 1)[1].rstrip(";\n"))
assert len(expected) == len(actual) == 157
assert paragraph_count == 823
assert sum(len(q["options"]) for q in actual) == 665
for source, item in zip(expected, actual):
    assert source == {k: item[k] for k in source}, f"Word mismatch: {source['id']}"
    assert item["multiple"] == (len(item["correct"]) > 1)
    assert all(0 <= i < len(item["options"]) for i in item["correct"])
assert [q["id"] for q in actual] == list(range(1, 158))
assert actual[25]["sourceOptionNumbers"] == [1, 2, 4]
assert actual[31]["sourceOptionNumbers"] == [1, 2, 3, 5]
for i in [28, 38, 41, 55, 109, 131, 143]:
    assert "sourceNote" in actual[i-1]
for a, b in [(81, 101), (83, 102), (85, 103)]:
    assert expected[a-1]["question"] == expected[b-1]["question"]
    assert expected[a-1]["options"] == expected[b-1]["options"]
    assert expected[a-1]["correct"] == expected[b-1]["correct"]
with (root / "docs/rk3/question_audit.csv").open(encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))
assert len(rows) == 157
assert [int(r["Номер задания"]) for r in rows] == list(range(1, 158))
print(json.dumps({"result": "passed", "questions_compared": 157, "options_compared": 665, "keys_compared": 157, "source_paragraphs_accounted_for": 823, "manual_options": manual, "audit_rows": len(rows)}, ensure_ascii=False, indent=2))
