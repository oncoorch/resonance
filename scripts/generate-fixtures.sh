#!/bin/sh
set -eu
FFMPEG="${FFMPEG:-/Users/Rattio/.local/bin/ffmpeg}"
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
OUT="$ROOT/tests/fixtures/audio"
mkdir -p "$OUT"
base='sine=frequency=440:duration=0.2'
"$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "$base" -metadata title='Jóga Test' -metadata artist='Björk' -metadata album='Fixtures' "$OUT/test.mp3"
"$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "$base" -c:a aac -metadata title='AAC Test' -metadata artist='Fixture' "$OUT/test.m4a"
"$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "$base" -c:a alac -metadata title='ALAC Test' -metadata artist='Fixture' "$OUT/test-alac.m4a"
"$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "$base" -metadata title='FLAC Test' -metadata artist='Fixture' "$OUT/test.flac"
"$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "$base" "$OUT/test.wav"
"$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "$base" "$OUT/test.aiff"
"$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "$base" -c:a libvorbis -metadata title='OGG Test' "$OUT/test.ogg"
"$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "$base" -c:a libopus -metadata title='Opus Test' "$OUT/test.opus"
"$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "$base" -c:a aac -f adts "$OUT/test.aac"
