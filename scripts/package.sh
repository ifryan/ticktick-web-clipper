#!/usr/bin/env bash
# Build a store-ready ZIP from src/ (manifest at the archive root, no keys or OS junk).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$root/src/manifest.json")"
if grep -q '"key"' "$root/src/manifest.json"; then
  echo "error: remove the manifest \"key\" field before uploading to a store" >&2
  exit 1
fi
mkdir -p "$root/dist"
out="$root/dist/web-clipper-v$version.zip"
rm -f "$out"
(cd "$root/src" && zip -qr -X "$out" . -x '*.DS_Store' '*.pem' '*.crx')
echo "$out"
