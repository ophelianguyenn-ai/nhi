"""Offline, non-billable checks for FPT Marketplace Ban Mai and Edge InJoon."""
import asyncio
import importlib.util
import json
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from urllib.error import HTTPError
from unittest.mock import patch

module_path = pathlib.Path(__file__).with_name('generate_selected_voices.py')
spec = importlib.util.spec_from_file_location('selected_voice_audio', module_path)
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)

VALID_WAV = b'RIFF' + bytes(4) + b'WAVE' + bytes(48)

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
    def test_correct_marketplace_voice_and_endpoint(self):
        self.assertEqual(audio.VOICE, {'vi': 'std_banmai', 'ko': 'ko-KR-InJoonNeural'})
        self.assertEqual(audio.FPT_MODEL, 'FPT.TTS-pro')
        self.assertEqual(audio.FPT_ENDPOINT, 'https://mkp-api.fptcloud.com/v1/audio/speech')

    def test_voice_specific_paths_do_not_overwrite_legacy(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(audio, 'ROOT', pathlib.Path(tmp)):
            p = audio.target_path('vi', 'Báo cáo tiến độ')
            self.assertIn('/audio/vi/fpt-marketplace-banmai-v1/', p.as_posix())
            self.assertNotEqual(p.name, audio.target_path('ko', 'Báo cáo tiến độ').name)

    def test_marketplace_auth_json_voice_and_binary_wav(self):
        seen = []
        def fake_open(req, timeout):
            seen.append(req)
            return FakeHTTP(VALID_WAV)
        with patch.object(audio.request, 'urlopen', side_effect=fake_open):
            wav = audio._post_fpt('Xin chào ạ', ' marketplace-key ')
        self.assertEqual(wav, VALID_WAV)
        self.assertEqual(seen[0].full_url, audio.FPT_ENDPOINT)
        self.assertEqual(seen[0].get_header('Authorization'), 'Bearer marketplace-key')
        self.assertEqual(seen[0].get_header('Content-type'), 'application/json')
        payload = json.loads(seen[0].data)
        self.assertEqual(payload['model'], 'FPT.TTS-pro')
        self.assertEqual(payload['voice'], 'std_banmai')
        self.assertEqual(payload['input'], 'Xin chào ạ')
        self.assertEqual(payload['response_format'], 'wav')
        self.assertNotIn('marketplace-key', seen[0].full_url)
        self.assertNotIn('marketplace-key', seen[0].data.decode())

    def test_formatting_whitespace_from_secret_is_sanitized(self):
        seen = []
        with patch.object(audio.request, 'urlopen', side_effect=lambda req, timeout: (seen.append(req) or FakeHTTP(VALID_WAV))):
            audio._post_fpt('Xin chào', 'key\nval\r\nue')
        self.assertEqual(seen[0].get_header('Authorization'), 'Bearer keyvalue')

    def test_empty_secret_and_non_wav_response_rejected(self):
        with self.assertRaisesRegex(ValueError, 'FPT_MARKETPLACE_API_KEY'):
            audio._post_fpt('Xin chào', ' \n ')
        for body in (b'{"error":"unauthorized"}', b'not-a-wav', b'RIFF' + bytes(30)):
            with patch.object(audio.request, 'urlopen', return_value=FakeHTTP(body)):
                with self.assertRaises(RuntimeError):
                    audio._post_fpt('Xin chào', 'sample-key')

    def test_minimum_and_maximum_text_length(self):
        for text in ('a', 'x' * 5001):
            with self.assertRaises(ValueError):
                audio._fpt_bytes(text, 'key')
        with patch.object(audio, '_post_fpt', return_value=VALID_WAV) as synth:
            self.assertEqual(audio._fpt_bytes('xe', 'key'), VALID_WAV)
            synth.assert_called_once_with('xe.', 'key')

    def test_mp3_conversion_uses_ffmpeg_and_deletes_temporary_wav(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = pathlib.Path(tmp) / 'output.mp3'
            with patch.object(audio.subprocess, 'run') as runner:
                audio._encode_mp3(VALID_WAV, target)
                runner.assert_called_once()
                args = runner.call_args.args[0]
                self.assertEqual(args[0], 'ffmpeg')
                self.assertIn('libmp3lame', args)
                self.assertEqual(args[-1], str(target))
                self.assertFalse(pathlib.Path(args[args.index('-i')+1]).exists())

    def test_fpt_unauthorized_stops_first_call_even_if_partial_is_allowed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'scripts/daily-audio-texts.json').write_text(
                json.dumps([['giải nhiệt bằng không khí', '공랭 방식'],
                            ['giải nhiệt bằng nước', '수랭 방식']], ensure_ascii=False))
            manifest = root / 'audio-manifest.json'
            manifest.write_text('{}')
            opts = SimpleNamespace(scope='daily', language='vi', offset=0,
                                   limit=0, delay=0, dry_run=False,
                                   allow_partial=True, max_failures=3)
            denied = HTTPError('https://mkp-api.fptcloud.com/v1/audio/speech',
                               401, 'Unauthorized', {}, None)
            with patch.object(audio, 'ROOT', root), patch.object(audio, 'MANIFEST', manifest), \
                 patch.object(audio, '_generate', side_effect=denied) as generate, \
                 patch.dict('os.environ', {'FPT_MARKETPLACE_API_KEY': 'fake-key'}, clear=True):
                with self.assertRaisesRegex(SystemExit, 'HTTP 401'):
                    asyncio.run(audio.run(opts))
                self.assertEqual(generate.call_count, 1)
            self.assertEqual(manifest.read_text(), '{}')

    def test_dry_run_and_missing_marketplace_key_never_edit_manifest(self):
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
                    patch.dict('os.environ', {'FPT_API_KEY': 'old-console-key'}, clear=True):
                asyncio.run(audio.run(settings))
                settings.language = 'vi'
                settings.dry_run = False
                with self.assertRaisesRegex(SystemExit, 'FPT_MARKETPLACE_API_KEY'):
                    asyncio.run(audio.run(settings))
            self.assertEqual(path.read_text(), '{}')

    def test_auto_prioritizes_missing_newest_lessons_before_legacy(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'scripts/daily-audio-texts.json').write_text('[]', encoding='utf-8')
            (root / 'index.html').write_text('', encoding='utf-8')
            (root / 'lessons.json').write_text(json.dumps({'lessons': [
                {'id': 'old', 'items': [['1', 'w', '', 'Câu cũ', '이전 문장']]},
                {'id': 'latest', 'items': [['2', 'w', '', 'Bài mới nhất', '최신 문장']]}
            ]}, ensure_ascii=False), encoding='utf-8')
            path = root / 'audio-manifest.json'
            path.write_text(json.dumps({
                'vi|Câu cũ': {'src': 'audio/vi/legacy.mp3', 'start': 0, 'end': 1},
                'ko|이전 문장': {'src': 'audio/ko/legacy.mp3', 'start': 0, 'end': 1}
            }), encoding='utf-8')
            opts = SimpleNamespace(scope='auto', language='both', offset=0, limit=0,
                                   vi_limit=1, ko_limit=1, delay=0,
                                   dry_run=False, allow_partial=False, max_failures=3)
            calls = []
            async def stub_generate(lang, phrase, dest, api_key):
                calls.append((lang, phrase))
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(b'ID3' + b'x' * 600)
                return 1.5
            with patch.object(audio, 'ROOT', root), patch.object(audio, 'MANIFEST', path), \
                 patch.object(audio, '_generate', side_effect=stub_generate), \
                 patch.dict('os.environ', {'FPT_MARKETPLACE_API_KEY': 'test-key'}, clear=True):
                asyncio.run(audio.run(opts))
            result = json.loads(path.read_text(encoding='utf-8'))
            self.assertEqual(calls, [('ko', '최신 문장'), ('vi', 'Bài mới nhất')])
            self.assertEqual(result['vi|Bài mới nhất']['voice'], 'std_banmai')
            self.assertEqual(result['ko|최신 문장']['voice'], 'ko-KR-InJoonNeural')
            self.assertNotIn('voice', result['vi|Câu cũ'])

    def test_auto_keeps_injoon_generation_when_fpt_key_is_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'scripts/daily-audio-texts.json').write_text('[]', encoding='utf-8')
            (root / 'index.html').write_text('', encoding='utf-8')
            (root / 'lessons.json').write_text(json.dumps({'lessons': [
                {'items': [['1', 'w', '', 'Tiếng Việt', '한국어']]}
            ]}, ensure_ascii=False), encoding='utf-8')
            path = root / 'audio-manifest.json'
            path.write_text('{}')
            opts = SimpleNamespace(scope='auto', language='both', offset=0, limit=0,
                                   vi_limit=1, ko_limit=1, delay=0,
                                   dry_run=False, allow_partial=True, max_failures=3)
            calls = []
            async def stub_generate(lang, phrase, dest, api_key):
                calls.append((lang, phrase))
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(b'ID3' + b'x' * 600)
                return 1.4
            with patch.object(audio, 'ROOT', root), patch.object(audio, 'MANIFEST', path), \
                 patch.object(audio, '_generate', side_effect=stub_generate), \
                 patch.dict('os.environ', {}, clear=True):
                asyncio.run(audio.run(opts))
            result = json.loads(path.read_text())
            self.assertEqual(calls, [('ko', '한국어')])
            self.assertNotIn('vi|Tiếng Việt', result)
            self.assertIn('ko|한국어', result)


    def test_auto_preserves_ko_update_after_fpt_401(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'scripts/daily-audio-texts.json').write_text('[]', encoding='utf-8')
            (root / 'index.html').write_text('', encoding='utf-8')
            (root / 'lessons.json').write_text(json.dumps({'lessons': [
                {'items': [['1', 'w', '', 'Báo cáo tiến độ', '진행 보고']]}
            ]}, ensure_ascii=False), encoding='utf-8')
            path = root / 'audio-manifest.json'
            path.write_text('{}')
            opts = SimpleNamespace(scope='auto', language='both', offset=0, limit=0,
                                   vi_limit=1, ko_limit=1, delay=0,
                                   dry_run=False, allow_partial=True, max_failures=3)
            calls = []
            async def stub_generate(lang, phrase, dest, api_key):
                calls.append(lang)
                if lang == 'vi':
                    raise HTTPError('https://mkp-api.fptcloud.com/v1/audio/speech',
                                    401, 'Unauthorized', {}, None)
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(b'ID3' + b'x' * 600)
                return 1.6
            with patch.object(audio, 'ROOT', root), patch.object(audio, 'MANIFEST', path), \
                 patch.object(audio, '_generate', side_effect=stub_generate), \
                 patch.dict('os.environ', {'FPT_MARKETPLACE_API_KEY': 'bad-key'}, clear=True):
                asyncio.run(audio.run(opts))
            self.assertEqual(calls, ['ko', 'vi'])
            result = json.loads(path.read_text())
            self.assertIn('ko|진행 보고', result)
            self.assertNotIn('vi|Báo cáo tiến độ', result)


if __name__ == '__main__':
    unittest.main()
