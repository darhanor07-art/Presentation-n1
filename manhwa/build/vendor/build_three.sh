#!/usr/bin/env bash
# Bundle the pinned three.js subset into src/vendor/three.min.js (IIFE, window.THREE) + LICENSE.
set -euo pipefail
cd "$(dirname "$0")"
THREE_V=0.181.2; ESB_V=0.28.2
[ -d node_modules/three ] || npm install --no-audit --no-fund --no-save --prefix . "three@$THREE_V" "esbuild@$ESB_V"
mkdir -p ../../src/vendor
./node_modules/.bin/esbuild three_entry.js --bundle --minify --format=iife --global-name=__THREE_NS \
  --footer:js='window.THREE=__THREE_NS;' --legal-comments=none --target=es2019 --outfile=../../src/vendor/three.min.js
cp node_modules/three/LICENSE ../../src/vendor/three.LICENSE.txt
ls -l ../../src/vendor/three.min.js
