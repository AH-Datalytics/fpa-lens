"""Run the tropical ingest against live feeds into a local, gitignored folder,
so the page can be viewed on localhost without touching the public blob store.

Google density is switched on here only: viewing it locally is internal use
under Weather Lab's terms. Output must never be committed or published.

    python ingest/scripts/local_preview.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gulfwatch import pipeline  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "public" / "tropical" / "local-preview"


class LocalStore:
    def __init__(self, root: Path):
        self.root = root

    def _path(self, path: str) -> Path:
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        return target

    def get_json(self, path):
        target = self.root / path
        return json.loads(target.read_text(encoding="utf-8")) if target.exists() else None

    def put_json(self, path, obj):
        self._path(path).write_text(json.dumps(obj), encoding="utf-8")

    def put_bytes(self, path, data, content_type):
        self._path(path).write_bytes(data)


def main() -> None:
    os.environ["GOOGLE_DENSITY_ENABLED"] = "1"
    manifest = pipeline.run(fetch=requests.get, store=LocalStore(OUT))
    densities = {s["id"]: sorted(s.get("density", {})) for s in manifest["storms"]}
    print(f"mode={manifest['mode']} storms={len(manifest['storms'])} errors={len(manifest['errors'])} density={densities}")


if __name__ == "__main__":
    main()
