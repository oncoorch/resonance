#!/usr/bin/env python3
"""Conservative metadata writer for staged copies only.

JSON request on stdin: {"path": "/absolute/staged.file", "tags": {...}}.
This helper never copies, moves, deletes, follows symlinks, or touches audio streams.
"""
from __future__ import annotations

import json
import os
import stat
import sys
from pathlib import Path
from typing import Any

import mutagen

SUPPORTED = {".mp3", ".flac", ".m4a", ".mp4", ".ogg", ".oga", ".opus", ".wav", ".aif", ".aiff", ".aifc"}
ALLOWED = {"title", "artist", "album", "albumartist", "track", "disc", "year", "genre", "compilation"}
KEYS = {"title": "title", "artist": "artist", "album": "album", "albumartist": "albumartist", "track": "tracknumber", "disc": "discnumber", "year": "date", "genre": "genre", "compilation": "compilation"}


def checked_path(raw: str) -> Path:
    path = Path(raw)
    if not path.is_absolute():
        raise ValueError("path must be absolute")
    info = os.lstat(path)
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode):
        raise ValueError("path must be a regular non-symlink file")
    if path.suffix.lower() not in SUPPORTED:
        raise ValueError("unsupported tag container")
    return path


def checked_staged_path(raw: str, staging_raw: str) -> Path:
    staging = Path(staging_raw)
    if not staging.is_absolute():
        raise ValueError("stagingRoot must be absolute")
    root_info = os.lstat(staging)
    if stat.S_ISLNK(root_info.st_mode) or not stat.S_ISDIR(root_info.st_mode):
        raise ValueError("stagingRoot must be a regular non-symlink directory")
    root = staging.resolve(strict=True)
    candidate = checked_path(raw).resolve(strict=True)
    try:
        relative = candidate.relative_to(root)
    except ValueError as error:
        raise ValueError("path is outside stagingRoot") from error
    current = root
    for part in relative.parts[:-1]:
        current = current / part
        info = os.lstat(current)
        if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
            raise ValueError("staging path contains a symlink or non-directory")
    return candidate


def load_easy(path: Path):
    audio = mutagen.File(path, easy=True)
    if audio is None:
        raise ValueError("unsupported or corrupt audio file")
    if audio.tags is None:
        audio.add_tags()
    return audio


def read_tags(path: Path) -> dict[str, Any]:
    audio = load_easy(path)
    result: dict[str, Any] = {}
    for public, native in KEYS.items():
        value = audio.tags.get(native) if audio.tags is not None else None
        if value:
            first = value[0] if isinstance(value, list) else value
            result[public] = first
    return result


def update(path: Path, values: dict[str, Any]) -> dict[str, Any]:
    unknown = set(values) - ALLOWED
    if unknown:
        raise ValueError(f"unsupported fields: {', '.join(sorted(unknown))}")
    audio = load_easy(path)
    written: list[str] = []
    for public, value in values.items():
        if value is None:
            continue
        native = KEYS[public]
        if public == "compilation":
            value = "1" if bool(value) else "0"
        audio[native] = [str(value)]
        written.append(public)
    audio.save()
    return {"status": "updated", "written": written, "tags": read_tags(path)}


def main() -> int:
    try:
        if len(sys.argv) == 3 and sys.argv[1] == "--read":
            print(json.dumps(read_tags(checked_path(sys.argv[2])), ensure_ascii=False))
            return 0
        if len(sys.argv) != 1:
            raise ValueError("usage: main.py [--read ABSOLUTE_PATH]")
        request = json.load(sys.stdin)
        if not isinstance(request, dict) or not isinstance(request.get("path"), str) or not isinstance(request.get("stagingRoot"), str) or not isinstance(request.get("tags"), dict):
            raise ValueError("invalid request")
        print(json.dumps(update(checked_staged_path(request["path"], request["stagingRoot"]), request["tags"]), ensure_ascii=False))
        return 0
    except Exception as error:
        print(json.dumps({"status": "error", "message": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
