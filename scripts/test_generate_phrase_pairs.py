"""Offline regression tests for daily Vietnamese↔Korean micro-segmentation."""
import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

PATH = pathlib.Path(__file__).with_name('generate_phrase_pairs.py')
SPEC = importlib.util.spec_from_file_location('daily_phrase_pairs', PATH)
gen = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gen)


class MicroSegmentationTests(unittest.TestCase):
    def test_does_not_link_unsupported_or_overlapping_fragments(self):
        pairs = [['thời gian', '시간'], ['lắng', '침전'],
                 ['thời gian lắng', '침전 시간'], ['không thấy', '없음']]
        valid = gen._valid_pairs('thời gian lắng', '침전 시간', pairs)
        self.assertEqual(valid, [['thời gian', '시간'], ['lắng', '침전']])

    def test_infers_two_grounded_morpheme_links(self):
        row = ['1', 'w', 'Quy trình', 'thời gian lắng', '침전 시간', 1]
        dictionary = [('lắng', '침전'), ('thời gian', '시간'),
                      ('giả mạo', '거짓')]
        self.assertEqual(gen._infer(row, dictionary),
                         [['lắng', '침전'], ['thời gian', '시간']])

    def test_keeps_unmatched_one_word_unit_intact(self):
        row = ['x', 'w', '', 'điểm phần trăm', '퍼센트포인트', 1]
        self.assertEqual(gen._infer(row, [('điểm', '포인트')]), [])

    def test_verified_override_wins_and_does_not_overwrite_authored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'lessons.json').write_text(json.dumps({'lessons': [{
                'id': 'today',
                'items': [
                    ['manual', 's', '', 'tỷ lệ hao hụt', '손실률', 1],
                    ['authored', 's', '', 'bồn chứa bùn', '슬러지 저장탱크', 1,
                     [['bồn', '탱크'], ['chứa bùn', '슬러지 저장']]],
                    ['new', 'w', '', 'thời gian lắng', '침전 시간', 1],
                    ['single', 'w', '', 'điểm phần trăm', '퍼센트포인트', 1]
                ]
            }]}, ensure_ascii=False), encoding='utf-8')
            (root / 'scripts/nov19_verified_phrase_pairs.json').write_text(
                json.dumps({'by_id': {'manual': [['tỷ lệ', '률'], ['hao hụt', '손실']]}},
                           ensure_ascii=False), encoding='utf-8')
            with patch.object(gen, 'ROOT', root), \
                 patch.object(gen, 'LESSONS', root / 'lessons.json'), \
                 patch.object(gen, 'CURATED', root / 'scripts/nov19_verified_phrase_pairs.json'), \
                 patch.object(gen, 'OUTPUT', root / 'nhi-daily-pairs.js'):
                result, counts, total = gen.generate()
                self.assertEqual(total, 4)
                payload = json.loads(result.split('window.NHI_DAILY_PAIRS=', 1)[1][:-2])
                self.assertEqual(payload['manual'], [['tỷ lệ', '률'], ['hao hụt', '손실']])
                self.assertNotIn('authored', payload)
                self.assertIn('new', payload)
                self.assertNotIn('single', payload)

    def test_stale_reviewed_pairs_fail_rather_than_silently_misalign(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'lessons.json').write_text(
                json.dumps({'lessons': [{'items': [
                    ['card1', 's', '', 'đường ống', '배관', 1]
                ]}]}, ensure_ascii=False), encoding='utf-8')
            (root / 'scripts/nov19_verified_phrase_pairs.json').write_text(
                json.dumps({'by_id': {'card1': [
                    ['đường', '배관'], ['không có', '없습니다']
                ]}}, ensure_ascii=False), encoding='utf-8')
            with patch.object(gen, 'ROOT', root), \
                 patch.object(gen, 'LESSONS', root / 'lessons.json'), \
                 patch.object(gen, 'CURATED', root / 'scripts/nov19_verified_phrase_pairs.json'):
                with self.assertRaisesRegex(ValueError, 'Stale reviewed'):
                    gen.generate()


if __name__ == '__main__':
    unittest.main()
