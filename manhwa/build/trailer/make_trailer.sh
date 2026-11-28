#!/usr/bin/env bash
# manhwa/build/trailer/make_trailer.sh — preview.mp4 + original score + HyperFrames cards -> manhwa/trailer.mp4 (idempotent)
#   bash build/trailer/make_trailer.sh            # uses existing manhwa/preview.mp4 (re-record it first after scene changes:
#                                                 #   node build/record_preview.js --video)
#   REBUILD_CARDS=1 bash ...                      # re-render the two HyperFrames cards
#   OMW=/tmp/omw CHROME=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome  (hyperframes CLI dir / browser overrides)
# Uses plain ffmpeg (OpenMontage video_compose is edit-decision/governance based and does not fit a fixed concat+mux).
set -euo pipefail
M="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$M"
OMW="${OMW:-/tmp/omw}"; CHROME="${CHROME:-/opt/pw-browsers/chromium-1243/chrome-linux64/chrome}"
C=build/trailer/cards; A=assets/audio; OUT="${OUT:-trailer.mp4}"
CARD=3.0

# 1. timeline + score (+ stings)
node build/trailer/timeline.js
# (assets/audio/*.wav are gitignored: score.py always regenerates them deterministically, so a fresh clone works)
python3 build/sound/score.py
ffmpeg -v error -y -i "$A/score.wav" -c:a aac -b:a 192k -movflags +faststart "$A/score.m4a"

# 2. cards (HyperFrames, local CLI)
for d in open end; do
  if [ "${REBUILD_CARDS:-0}" = 1 ] || [ ! -f "$C/$d.mp4" ]; then
    (cd "$OMW" && PUPPETEER_EXECUTABLE_PATH="$CHROME" npx --no-install hyperframes render "$M/$C/$d" -o "$M/$C/$d.mp4" --fps 30 --crf 18 --quiet >/dev/null 2>&1)
  fi
done

# 3. concat video (normalise all to 720x1280 30 fps yuv420p) + mux audio
PV=$(ffprobe -v error -show_entries format=duration -of csv=p=0 preview.mp4)
TOT=$(python3 -c "print(round($CARD*2+$PV,3))")
END_AT=$(python3 -c "print(int(round(($CARD+$PV)*1000)))")
ffmpeg -v error -y -i "$C/open.mp4" -i preview.mp4 -i "$C/end.mp4" -i "$A/score.wav" -i "$A/sting_open.wav" -i "$A/sting_end.wav" \
 -filter_complex "
 [0:v]scale=720:1280,fps=30,setsar=1,format=yuv420p[v0];[1:v]scale=720:1280,fps=30,setsar=1,format=yuv420p[v1];[2:v]scale=720:1280,fps=30,setsar=1,format=yuv420p[v2];
 [v0][v1][v2]concat=n=3:v=1:a=0[v];
 [3:a]adelay=${CARD%.*}000|${CARD%.*}000[sc];[4:a]volume=0.9[so];[5:a]adelay=${END_AT}|${END_AT},volume=0.9[se];
 [sc][so][se]amix=inputs=3:normalize=0:duration=longest,atrim=0:${TOT},asetpts=N/SR/TB,alimiter=limit=0.8:level=0[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -crf 22 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t "$TOT" "$OUT"
echo "== $OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
ffmpeg -nostats -i "$OUT" -af ebur128=peak=true -vn -f null - 2>&1 | grep -E "^\s+(I|Peak|LRA):" | tr -s ' ' | tr '\n' ' '; echo
