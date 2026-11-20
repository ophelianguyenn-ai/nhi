#!/usr/bin/env python3
"""Build precise, click-to-highlight Vietnamese↔Korean phrase maps for lesson cards.

No external API, account key, translation model, or probabilistic machine translation.
Teacher-reviewed chunks win. Unreviewed chunks require two literal, nonoverlapping
source-text matches from verified/lexical evidence; uncertain words remain untouched.
Run idempotently after lessons.json changes and every day via GitHub Actions.
"""
import argparse
import json
import pathlib
import re
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[1]
LESSONS = ROOT / 'lessons.json'
CURATED = ROOT / 'scripts' / 'nov19_verified_phrase_pairs.json'
OUTPUT = ROOT / 'nhi-daily-pairs.js'

# Stable, high-confidence *morpheme / lexical* correspondences. Vietnamese
# multi-syllable words stay together; Korean particles remain with their host
# unless a verified pair unambiguously identifies the grammatical meaning.
LEXICAL = [
    ('nguyên liệu', '원료'), ('chất lượng', '품질'), ('hao hụt', '손실'),
    ('sản xuất', '생산'), ('sản lượng', '생산량'), ('tỷ lệ', '률'),
    ('tỷ lệ', '율'), ('lắng', '침전'), ('bùn', '슬러지'),
    ('bồn', '탱크'), ('thiết bị', '설비'), ('dầu', '유분'),
    ('dầu', '기름'), ('gia nhiệt', '가열'), ('đường ống', '배관'),
    ('thu hồi', '회수'), ('dung tích', '용량'), ('chứa', '저장'),
    ('thời gian', '시간'), ('đầu tư', '투자'), ('tài liệu', '자료'),
    ('hồ sơ', '서류'), ('báo cáo', '보고'), ('nghiệm thu', '검수'),
    ('công ty', '회사'), ('nhà máy', '공장'), ('công trường', '현장'),
    ('người phụ trách', '담당자'), ('giám đốc', '대표님'),
    ('kế toán', '회계'), ('chi phí', '비용'), ('độ', '온도'),
    ('phê duyệt', '승인'), ('xem xét', '검토'), ('xác nhận', '확인'),
    ('tiến độ', '진행'), ('kiểm tra', '검사'), ('bảo quản', '보관'),
    ('thời gian lắng', '침전 시간'), ('hàm lượng', '함량'),
    ('axit citric', '구연산'), ('nước', '물'), ('cặn', '침전물'),
    ('xe', '차량'), ('khách hàng', '고객'), ('dự kiến', '예정'),
]


def _rows():
    payload = json.loads(LESSONS.read_text(encoding='utf-8'))
    for lesson in payload.get('lessons', []):
        for row in lesson.get('items', []):
            if isinstance(row, list) and len(row) >= 5 and row[0]:
                yield lesson.get('id', ''), row


def _find_all(text, fragment, lang):
    """Find literal spans; protect VI word boundaries and case."""
    text = str(text)
    fragment = str(fragment)
    if not fragment.strip():
        return []
    hay = text.casefold() if lang == 'vi' else text
    needle = fragment.casefold() if lang == 'vi' else fragment
    result = []
    start = 0
    while True:
        i = hay.find(needle, start)
        if i < 0:
            return result
        end = i + len(needle)
        good = True
        if lang == 'vi':
            # Pair boundaries never split through Vietnamese words.
            if i and (hay[i-1].isalnum() or hay[i-1] == '_'):
                good = False
            if end < len(hay) and (hay[end].isalnum() or hay[end] == '_'):
                good = False
        if good:
            result.append((i, end))
        start = i + 1


def _valid_pairs(vi, ko, pairs):
    if not isinstance(pairs, list):
        return []
    out, covered_vi, covered_ko = [], [], []
    for pair in pairs:
        if not isinstance(pair, list) or len(pair) < 2:
            continue
        a, b = pair[:2]
        if not isinstance(a, str) or not isinstance(b, str) or not a.strip() or not b.strip():
            continue
        av, bk = _find_all(vi, a, 'vi'), _find_all(ko, b, 'ko')
        match = next(((v, k) for v in av for k in bk
                      if not any(v[0] < x[1] and v[1] > x[0] for x in covered_vi)
                      and not any(k[0] < x[1] and k[1] > x[0] for x in covered_ko)), None)
        if match:
            v, k = match
            covered_vi.append(v)
            covered_ko.append(k)
            out.append([a, b])
    return out


def _lexicon(rows, curated):
    # High-confidence correspondences explicitly written for recent lessons.
    known = {(v, k) for v, k in LEXICAL}
    for pairs in curated.values():
        for v, k in pairs:
            if v and k and len(v) <= 80 and len(k) <= 80:
                known.add((v, k))
    for _, row in rows:
        vi, ko = str(row[3]).strip(), str(row[4]).strip()
        for pair in (row[6] if len(row) > 6 and isinstance(row[6], list) else []):
            if isinstance(pair, list) and len(pair) >= 2 and pair[0] and pair[1]:
                if len(str(pair[0])) < 80 and len(str(pair[1])) < 80:
                    known.add((str(pair[0]), str(pair[1])))
        # Lesson vocabulary supplies grounded correspondences, not guesses.
        if (row[1] == 'w' and 2 <= len(vi) <= 52 and 1 <= len(ko) <= 45
                and not any(x in vi.lower() for x in (' / ', ' hoặc ', ' hay ', ';'))
                and not any(x in ko for x in (' / ', ';'))):
            known.add((vi, ko))
    # Prefer specific short lexical units, avoiding the unspecific whole
    # sentence as an early greedy match.
    return sorted(known, key=lambda p: (len(p[0].split()), len(p[0]), len(p[1]), p))


def _infer(row, dictionary):
    vi, ko = str(row[3]).strip(), str(row[4]).strip()
    accepted, vi_spans, ko_spans = [], [], []
    for a, b in dictionary:
        if len(a) > len(vi) or len(b) > len(ko):
            continue
        av, bk = _find_all(vi, a, 'vi'), _find_all(ko, b, 'ko')
        for v in av:
            if any(v[0] < e and v[1] > s for s, e in vi_spans):
                continue
            k = next((k for k in bk if not any(k[0] < e and k[1] > s for s, e in ko_spans)), None)
            if k:
                accepted.append([a, b])
                vi_spans.append(v)
                ko_spans.append(k)
                break
    # A single match is not useful as a "breakdown". Keep unsplittable
    # loanwords and other lexical units intact instead of inventing translations.
    return accepted if len(accepted) >= 2 else []


def generate():
    rows = list(_rows())
    curated_doc = json.loads(CURATED.read_text(encoding='utf-8')) if CURATED.exists() else {}
    curated = curated_doc.get('by_id', {})
    dictionary = _lexicon(rows, curated)
    result = {}
    counts = Counter()
    for lesson_id, row in rows:
        identifier = str(row[0])
        vi, ko = str(row[3]).strip(), str(row[4]).strip()
        original = row[6] if len(row) > 6 and isinstance(row[6], list) else []
        original_valid = _valid_pairs(vi, ko, original)
        if len(original_valid) > 1:
            counts['author_already_segmented'] += 1
            continue
        manual = curated.get(identifier)
        if manual:
            matched = _valid_pairs(vi, ko, manual)
            if len(matched) != len(manual):
                raise ValueError(f'Stale reviewed segments for {identifier}: {len(matched)}/{len(manual)}')
            if len(matched) > 1:
                result[identifier] = matched
                counts['curated'] += 1
                continue
        inferred = _infer(row, dictionary)
        if inferred:
            result[identifier] = inferred
            counts['inferred'] += 1
        else:
            counts['whole_unit_or_needs_review'] += 1
    ordered = {k: result[k] for k in sorted(result)}
    body = ('/* Generated Vietnamese↔Korean word links. Reviewed pairs win; '
            'new words are matched from existing lesson evidence only. */\n'
            'window.NHI_DAILY_PAIRS='
            + json.dumps(ordered, ensure_ascii=False, separators=(',', ':'))
            + ';\n')
    return body, counts, len(rows)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--check', action='store_true',
                   help='Validate and report only; do not write the generated JS')
    args = p.parse_args()
    content, counts, n = generate()
    print(f'Lesson cards: {n}; already authored={counts["author_already_segmented"]}; '
          f'reviewed={counts["curated"]}; inferred={counts["inferred"]}; '
          f'intact/unreviewed={counts["whole_unit_or_needs_review"]}', flush=True)
    if args.check:
        return
    old = OUTPUT.read_text(encoding='utf-8') if OUTPUT.exists() else None
    if content == old:
        print('No new phrase segmentation needed.', flush=True)
    else:
        OUTPUT.write_text(content, encoding='utf-8')
        print(f'Updated {OUTPUT.name} with validated segment matches.', flush=True)


if __name__ == '__main__':
    main()
