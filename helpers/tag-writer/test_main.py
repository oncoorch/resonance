import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[2]
HELPER = Path(__file__).parent / "main.py"

class WriterTests(unittest.TestCase):
    def test_updates_supported_tags_on_staged_copy_without_changing_source(self):
        with tempfile.TemporaryDirectory() as directory:
            source = ROOT / "tests/fixtures/audio/test.mp3"
            staged = Path(directory) / "staged.mp3"
            shutil.copy2(source, staged)
            original = source.read_bytes()
            request = {"path": str(staged), "stagingRoot": directory, "tags": {"title": "Título nuevo", "artist": "Artista", "album": "Álbum", "track": 2, "disc": 1, "year": 2026, "genre": "Rock"}}
            result = subprocess.run([str(Path(__file__).parent / ".venv/bin/python"), str(HELPER)], input=json.dumps(request), text=True, capture_output=True, check=True)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "updated")
            self.assertEqual(source.read_bytes(), original)
            verify = json.loads(subprocess.run([str(Path(__file__).parent / ".venv/bin/python"), str(HELPER), "--read", str(staged)], text=True, capture_output=True, check=True).stdout)
            self.assertEqual(verify["title"], "Título nuevo")

    def test_rejects_unsupported_container(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "track.aac"
            path.write_bytes(b"not-a-supported-tag-container")
            result = subprocess.run([str(Path(__file__).parent / ".venv/bin/python"), str(HELPER)], input=json.dumps({"path": str(path), "stagingRoot": directory, "tags": {"title": "x"}}), text=True, capture_output=True)
            self.assertNotEqual(result.returncode, 0)

    def test_rejects_supported_absolute_file_outside_staging_root(self):
        with tempfile.TemporaryDirectory() as staging, tempfile.TemporaryDirectory() as outside:
            path = Path(outside) / "track.mp3"
            shutil.copy2(ROOT / "tests/fixtures/audio/test.mp3", path)
            original = path.read_bytes()
            result = subprocess.run([str(Path(__file__).parent / ".venv/bin/python"), str(HELPER)], input=json.dumps({"path": str(path), "stagingRoot": staging, "tags": {"title": "forbidden"}}), text=True, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("staging", result.stderr.lower())
            self.assertEqual(path.read_bytes(), original)

if __name__ == "__main__": unittest.main()
