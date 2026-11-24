"""Import the complete RK3 Word bank; retain source wording, order and bold keys.

Usage: python tools/import_rk3.py SOURCE.docx
Requires python-docx. Never fills missing choices or silently corrects medical keys.
"""
import csv
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from docx import Document

ROOT = Path(__file__).resolve().parents[1]
MANUAL = re.compile(r"^(\d+)\.\s+")
REVIEW = {
    28: "В исходнике выделено «3 % NaCl» для изотонической гипогидратации. Соответствие раствора указанному типу нарушения требует проверки; ключ файла сохранён.",
    38: "В исходнике выделена гипоосмолярная гипогидратация как состояние с жаждой. Формулировка и ключ требуют уточнения; ответ файла сохранён.",
    41: "В исходнике выделено «Заболеваний печени» как причина продукционной гиперазотемии. Вопрос не уточняет заболевание и механизм; ключ требует проверки.",
    55: "В исходнике выделено «Ослабление эффекта трефонов». Направление изменения действия ростовых факторов требует проверки; ключ файла сохранён.",
    109: "В исходнике выделено «2-3 дня». Условия полной водной депривации не уточнены; числовой ключ требует проверки.",
    131: "В исходнике выделен гиперкортизолизм как причина снижения основного обмена. Ключ требует проверки; ответ файла сохранён.",
    143: "В исходнике выделено только отсутствие контактного торможения. Вариант об увеличении сиаловых кислот также требует обсуждения; исходный одиночный ключ сохранён.",
}


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def main(source):
    source = Path(source)
    doc = Document(source)
    assert not doc.tables, "Unexpected tables: review the importer before proceeding"
    questions, used, manual_paragraphs = [], [], []
    # Last saved Word pagination, not a freshly rendered page count.
    page, pages = 1, {}
    for i, p in enumerate(doc.paragraphs):
        breaks = list(p._p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}lastRenderedPageBreak"))
        pages[i] = [page, page + len(breaks)]
        page += len(breaks)
        text = clean(p.text)
        if not text:
            continue
        used.append(i)
        if p.style.name == "Title":
            assert not questions and text.startswith("РК_3"), "Unexpected title"
            continue
        manual = MANUAL.match(text)
        if p.style.name == "List Paragraph" or manual:
            assert questions, f"Option before question at paragraph {i}"
            if manual:
                manual_paragraphs.append(i)
            runs = [r for r in p.runs if r.text.strip()]
            bold = any(r.bold is True for r in runs)
            # A partial word highlight must not silently become a complete key.
            assert not bold or all(r.bold is True for r in runs), f"Partial bold at {i}"
            questions[-1]["sourceOptions"].append({
                "text": MANUAL.sub("", text) if manual else text,
                "sourceText": text, "paragraph": i,
                "sourceLabel": int(manual[1]) if manual else len(questions[-1]["sourceOptions"]) + 1,
                "bold": bold,
            })
        else:
            assert p.style.name == "Body Text", f"Unexpected style {p.style.name} at {i}"
            questions.append({"id": len(questions) + 1, "question": text, "paragraph": i, "sourceOptions": []})

    duplicates, prompts = defaultdict(list), defaultdict(list)
    for q in questions:
        q["options"] = [o["text"] for o in q["sourceOptions"]]
        q["correct"] = [i for i, o in enumerate(q["sourceOptions"]) if o["bold"]]
        assert q["correct"] and len(q["options"]) >= 2, f"Incomplete question {q['id']}"
        duplicates[json.dumps([q["question"], q["options"]], ensure_ascii=False)].append(q["id"])
        prompts[q["question"]].append(q["id"])
    groups = [g for g in duplicates.values() if len(g) > 1]
    conflicts = [g for g in groups if len({tuple(questions[i-1]["correct"]) for i in g}) > 1]
    assert not conflicts, f"Conflicting duplicate keys: {conflicts}"

    data = []
    for q in questions:
        item = {k: q[k] for k in ("id", "question", "options", "correct")}
        item["multiple"] = len(q["correct"]) > 1
        notes = []
        if q["id"] in REVIEW:
            notes.append(REVIEW[q["id"]])
        labels = [o["sourceLabel"] for o in q["sourceOptions"]]
        if labels != list(range(1, len(labels) + 1)):
            item["sourceOptionNumbers"] = labels
            notes.append("В исходнике варианты пронумерованы " + ", ".join(map(str, labels)) + ". Все имеющиеся варианты сохранены; отсутствующий вариант не добавлялся.")
        for group in groups:
            if q["id"] in group:
                notes.append("Повтор в исходном файле: задания " + ", ".join(map(str, group)) + ". Оба вхождения сохранены в порядке документа.")
        if notes:
            item["sourceNote"] = " ".join(notes)
        data.append(item)

    config = {"number": 3, "storageKey": "pathologyTrainerProgressRK3V1", "sessionKey": "pathologyTrainerActiveSessionRK3V1", "dataPath": "data/rk3-questions.js"}
    output = ROOT / "data/rk3-questions.js"
    output.write_text("window.PATHOLOGY_RK_CONFIG = " + json.dumps(config, ensure_ascii=False, indent=2) + ";\nwindow.PATHOLOGY_QUESTIONS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    audit_dir = ROOT / "docs/rk3"
    audit_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "source": source.name, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "source_nonempty_paragraphs": len(used), "questions": len(data),
        "options": sum(len(q["options"]) for q in data),
        "correct_options": sum(len(q["correct"]) for q in data),
        "manual_option_paragraphs_zero_based": manual_paragraphs,
        "duplicate_full_items": groups, "conflicting_duplicate_keys": conflicts,
        "repeated_prompts": [g for g in prompts.values() if len(g) > 1],
        "review_keys": list(REVIEW),
        "pagination": "Last-saved Word page-break markers; not freshly rendered or verified page references",
        "source_question_numbering": "No explicit question numbers in Word; site IDs follow source order, including repeats",
        "option_counts": dict(Counter(len(q["options"]) for q in data)),
    }
    assert len(used) == 1 + len(data) + report["options"], "Unaccounted source paragraphs"
    (audit_dir / "import-summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    with (audit_dir / "question_audit.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Тип задания", "Номер задания", "Страница источника", "Тема", "Решение", "Обоснование решения"])
        for q, item in zip(questions, data):
            first, last = pages[q["paragraph"]][0], pages[q["sourceOptions"][-1]["paragraph"]][1]
            location = f"Не верифицирована; сохранённая разметка DOCX {first}–{last}; абзацы {q['paragraph']+1}–{q['sourceOptions'][-1]['paragraph']+1}"
            w.writerow(["Один ответ" if not item["multiple"] else "Несколько ответов", q["id"], location, "РК-3", "Включено; ключ требует проверки" if q["id"] in REVIEW else "Включено", f"Порядок исходника; {len(q['options'])} вариантов; выделенный ответ: {', '.join(str(i+1) for i in q['correct'])}. " + item.get("sourceNote", "Полная формулировка и все варианты сохранены.")])
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main(sys.argv[1])
