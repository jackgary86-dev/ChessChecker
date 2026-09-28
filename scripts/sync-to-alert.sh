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

cp "$HERE/index.html" "$HERE/shared.css" "$HERE/playerNames.js" "$HERE/historyLogic.js" \
   "$HERE/historyStore.js" "$HERE/history.html" "$HERE/history.js" \
   "$ALERT/public/"
cp "$HERE/chess/index.html" "$HERE/chess/chess.js" "$HERE/chess/chessRules.js" "$HERE/chess/chessPieceIcons.js" \
   "$HERE/chess/style.css" "$HERE/chess/playerNames.js" "$HERE/chess/historyLogic.js" "$HERE/chess/historyStore.js" \
   "$HERE/chess/history.html" "$HERE/chess/history.js" \
   "$ALERT/public/chess/"
cp "$HERE/checkers/index.html" "$HERE/checkers/checkers.js" "$HERE/checkers/checkersRules.js" \
   "$HERE/checkers/checkersPieceIcons.js" "$HERE/checkers/style.css" "$HERE/checkers/playerNames.js" \
   "$HERE/checkers/historyLogic.js" "$HERE/checkers/historyStore.js" \
   "$HERE/checkers/history.html" "$HERE/checkers/history.js" \
   "$ALERT/public/checkers/"

# Test files import the pure modules by relative path, which differs one
# level deeper here (test/ sits next to public/, not next to the repo root
# or chess/checkers/ directly).
sed 's#\.\./chess/chessRules\.js#../public/chess/chessRules.js#' \
  "$HERE/test/chessRules.test.js" > "$ALERT/test/chessRules.test.js"
sed 's#\.\./checkers/checkersRules\.js#../public/checkers/checkersRules.js#' \
  "$HERE/test/checkersRules.test.js" > "$ALERT/test/checkersRules.test.js"
sed 's#\.\./historyLogic\.js#../public/historyLogic.js#' \
  "$HERE/test/historyLogic.test.js" > "$ALERT/test/historyLogic.test.js"
sed 's#\.\./playerNames\.js#../public/playerNames.js#' \
  "$HERE/test/playerNames.test.js" > "$ALERT/test/playerNames.test.js"

echo "Synced $HERE -> $ALERT"
echo "Next, in $ALERT:"
echo "  node --test test/*.test.js   # confirm it still passes"
echo "  git add -A && git commit -m '...' && git push"
