"""Offline, non-billable checks for FPT Marketplace Ban Mai and Edge InJoon."""
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

if __name__ == '__main__':
    unittest.main()
