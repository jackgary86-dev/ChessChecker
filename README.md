# ChessChecker

Basic hot-seat Chess and Checkers, played by two people on one screen. No
computer opponent, no network play. Each game is a separate static web app
with plain ES modules — no build step, no dependencies, no web fonts, no
CDNs (so it also works with no internet on the LAN).

- **Chess** — `chess/` — served on **port 3012**: `http://<IP of machine>:3012`
- **Checkers** — `checkers/` — served on **port 3013**: `http://<IP of machine>:3013`

A menu page at the repo root (`index.html`) links to both, for local
combined browsing; it isn't part of either per-port deployment.

This game is also submitted to the Game Portal at `http://192.168.1.36:2016`
(key `checkers-chess`), served from a mirrored `public/` build on the
`claude/checkers-chess` branch of the separate `jackgary86-dev/Alert` repo.
**When you land a feature here, also sync it there** — see `AGENTS.md` and
`scripts/sync-to-alert.sh`.

## How to play

**Chess** — click a piece to see its legal moves highlighted, click a
highlighted square to move it. Castling, en passant and pawn promotion
(you're asked to pick a piece) all work. The banner shows **Check**,
**Checkmate: White/Black wins**, or **Draw (stalemate)**. "Undo" steps back
one move at a time.

**Checkers** — click a piece, then a highlighted square. If a capture is
available anywhere on the board, only capture moves are offered — jumps are
mandatory. After a jump, if that same piece can jump again it must; the
turn pill says "must continue jumping" until the chain ends. Reaching the
far row kings a piece (gold ring), and kings move/jump in both directions.
"Undo" reverts one full turn (including a finished multi-jump chain).

Both games show whose turn it is, a captured-piece count for each side, and
save automatically to the browser's local storage — closing the tab and
coming back resumes the game in progress. "New game" resets.

## Run it locally

Each game only needs a static file server pointed at its own folder:

```bash
# Chess on port 3012
python3 -m http.server 3012 --directory chess

# Checkers on port 3013
python3 -m http.server 3013 --directory checkers

# Or, for the combined menu during development:
python3 -m http.server 8000
```

(`npm run serve:chess`, `npm run serve:checkers` and `npm run serve:menu` do
the same thing.) Then open `http://<IP of machine>:<port>/` from any device
on the LAN, or `http://localhost:<port>/` on the same machine.

## Project layout

```
chess/
  index.html       menu-free entry point, self-contained
  chessRules.js    pure rules engine (no DOM) — board state, move
                   generation, check/checkmate/stalemate, castling,
                   en passant, promotion
  chess.js         UI: click handling, rendering, undo, localStorage
  style.css        board + page styling (own copy, so the folder can be
                   served standalone on its own port)
checkers/
  index.html
  checkersRules.js pure rules engine — mandatory captures, multi-jump
                   chains, kinging, win detection
  checkers.js      UI wiring
  style.css
index.html          combined menu (dev convenience only)
shared.css          source stylesheet the two style.css copies are based on
TICKETS.md          the 20-ticket build plan (also filed as GitHub issues)
test/
  chessRules.test.js     node --test unit tests for the chess engine
  checkersRules.test.js  node --test unit tests for the checkers engine
  smoke.spec.js          Playwright: plays one move on each board at
                          1280px and 390px wide
```

## Testing

```bash
npm test           # node --test: pure rules-engine unit tests
npm run test:smoke # Playwright smoke test (needs `npm install` first)
```

The rules modules (`chessRules.js`, `checkersRules.js`) export pure
functions with no DOM dependency, so the unit tests import and exercise
them directly. The Playwright test serves the repo over plain HTTP (ES
module `<script>` tags are blocked by CORS when opened via `file://`),
opens each board, plays one legal move, and checks the squares stay at
least 40px even at a 390px-wide viewport.

## What's basic vs. what's next

This is the basic build: standard rules for both games, hot-seat only, no
computer opponent, no network multiplayer, no move history/notation, no
draw-by-repetition or 50-move rule. `TICKETS.md` and the repo's GitHub
issues track the build; future features and game modes are expected to
build on top of this.
