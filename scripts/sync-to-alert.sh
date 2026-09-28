#!/usr/bin/env bash
# Mirrors this repo's game build into a checkout of jackgary86-dev/Alert's
# claude/checkers-chess branch, so the Game Portal submission
# (http://192.168.1.36:2016, portal-game.json key "checkers-chess") stays
# current with this repo's development.
#
# Usage:
#   scripts/sync-to-alert.sh /path/to/alert-checkout
#
# The target checkout should already have claude/checkers-chess checked
# out. This script only copies files; it does not commit or push.
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 /path/to/alert-checkout" >&2
  exit 1
fi

ALERT="$1"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ALERT/portal-game.json" ]; then
  echo "error: $ALERT doesn't look like the checkers-chess Alert branch (no portal-game.json)" >&2
  exit 1
fi

mkdir -p "$ALERT/public/chess" "$ALERT/public/checkers" "$ALERT/test"

cp "$HERE/index.html" "$ALERT/public/index.html"
cp "$HERE/shared.css" "$ALERT/public/shared.css"
cp "$HERE/chess/index.html" "$HERE/chess/chess.js" "$HERE/chess/chessRules.js" "$HERE/chess/style.css" \
   "$ALERT/public/chess/"
cp "$HERE/checkers/index.html" "$HERE/checkers/checkers.js" "$HERE/checkers/checkersRules.js" "$HERE/checkers/style.css" \
   "$ALERT/public/checkers/"

# Test files import the rules modules by relative path, which differs one
# level deeper here (test/ sits next to public/, not next to chess/checkers/).
sed 's#\.\./chess/chessRules\.js#../public/chess/chessRules.js#' \
  "$HERE/test/chessRules.test.js" > "$ALERT/test/chessRules.test.js"
sed 's#\.\./checkers/checkersRules\.js#../public/checkers/checkersRules.js#' \
  "$HERE/test/checkersRules.test.js" > "$ALERT/test/checkersRules.test.js"

echo "Synced $HERE -> $ALERT"
echo "Next, in $ALERT:"
echo "  node --test test/*.test.js   # confirm it still passes"
echo "  git add -A && git commit -m '...' && git push"
