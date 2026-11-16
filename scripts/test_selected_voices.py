"""Offline, no-charge checks for the Ban Mai/InJoon migration."""
import asyncio
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

module_path = pathlib.Path(__file__).with_name('generate_selected_voices.py')
spec = importlib.util.spec_from_file_location('selected_voice_audio', module_path)
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


class FakeHTTP:
    def __init__(self, body):
        self.body = body
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def read(self):
        return self.body


class VoiceMigrationTests(unittest.TestCase):
    def test_selected_voices_are_exact(self):
        self.assertEqual(audio.VOICE, {'vi': 'banmai', 'ko': 'ko-KR-InJoonNeural'})

    def test_voice_specific_paths_preserve_legacy_audio(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(audio, 'ROOT', pathlib.Path(tmp)):
            p = audio.target_path('vi', 'Báo cáo tiến độ')
            self.assertIn('/audio/vi/fpt-banmai-v1/', p.as_posix())
            self.assertNotEqual(p.name, audio.target_path('ko', 'Báo cáo tiến độ').name)

    def test_fpt_request_uses_secret_header_and_utf8_body(self):
        seen = []
        def fake_open(req, timeout):
            seen.append(req)
            return FakeHTTP(json.dumps({'error': 0, 'async': 'https://example.org/clip.mp3'}).encode())
        with patch.object(audio.request, 'urlopen', side_effect=fake_open):
            url = audio._post_fpt('Xin chào ạ', 'secret-value')
        self.assertEqual(url, 'https://example.org/clip.mp3')
        self.assertEqual(seen[0].get_header('Api_key'), 'secret-value')
        self.assertEqual(seen[0].get_header('Voice'), 'banmai')
        self.assertEqual(seen[0].data, 'Xin chào ạ'.encode('utf-8'))
        self.assertNotIn('secret-value', seen[0].full_url)

    def test_fpt_error_and_non_https_url_fail_closed(self):
        for data in ({'error': 1, 'message': 'bad key'},
                     {'error': 0, 'async': 'http://example.org/no.mp3'}):
            with patch.object(audio.request, 'urlopen',
                              return_value=FakeHTTP(json.dumps(data).encode())):
                with self.assertRaises(RuntimeError):
                    audio._post_fpt('Xin chào', 'key')

    def test_minimum_and_maximum_text_length(self):
        for text in ('a', 'ab', 'x' * 5001):
            with self.assertRaises(ValueError):
                audio._fpt_bytes(text, 'key')

    def test_dry_run_and_missing_key_never_edit_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'scripts/daily-audio-texts.json').write_text(
                json.dumps([['Báo cáo tiến độ', '진행 상황 보고']], ensure_ascii=False))
            path = root / 'audio-manifest.json'
            path.write_text('{}')
            settings = SimpleNamespace(scope='daily', language='both',
                                       offset=0, limit=30, delay=0,
                                       dry_run=True, allow_partial=False, max_failures=3)
            with patch.object(audio, 'ROOT', root), patch.object(audio, 'MANIFEST', path), \
                    patch.dict('os.environ', {}, clear=True):
                asyncio.run(audio.run(settings))
                settings.language = 'vi'
                settings.dry_run = False
                with self.assertRaises(SystemExit):
                    asyncio.run(audio.run(settings))
            self.assertEqual(path.read_text(), '{}')


if __name__ == '__main__':
    unittest.main()
