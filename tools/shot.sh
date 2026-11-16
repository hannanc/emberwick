#!/bin/bash
# Headless screenshot of the map that waits until the page says it is ready (data-ready="1" on <html>),
# retrying with a longer virtual-time budget, so a shot is never the "Waking the village" loading screen.
#
#   tools/shot.sh "http://localhost:8377/?cam=20,13,2.2&t=12:00&w=clear" ~/shots/square.png [1200,700]
#
# Notes: the snap Chromium can only write inside your home directory. Add &freeze=3000 to the URL for a
# frame that is drawn once and identical between runs. Needs Chromium (set CHROMIUM to its path).
URL=$1; OUT=$2; SIZE=${3:-1200,700}; BIN=${CHROMIUM:-chromium}
command -v "$BIN" >/dev/null || BIN=/snap/bin/chromium
[ -n "$URL" ] && [ -n "$OUT" ] || { sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }
FLAGS=(--headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size="$SIZE")
for budget in 12000 18000 26000; do
  if timeout 140 "$BIN" "${FLAGS[@]}" --virtual-time-budget=$budget --dump-dom "$URL" 2>/dev/null | grep -q 'data-ready="1"'; then
    rm -f "$OUT"
    timeout 140 "$BIN" "${FLAGS[@]}" --virtual-time-budget=$budget --screenshot="$OUT" "$URL" >/dev/null 2>&1
    [ -s "$OUT" ] && { echo "$OUT (budget $budget)"; exit 0; }
  fi
done
echo "the page never signalled ready; no screenshot taken" >&2
exit 1
