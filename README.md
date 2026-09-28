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

Each player has a name (defaults to **Connor** and **Jack**) shown next to
their color — click either name to edit it; edits are remembered across
reloads and both games. A **History** link on each game and the menu shows
every player's win/loss/draw record, per game and combined, plus a
recent-games list.

**Chess** — click a piece to see its legal moves highlighted, click a
highlighted square to move it. Castling, en passant and pawn promotion
(you're asked to pick a piece) all work. The banner shows **Check**,
**Checkmate: Connor/Jack wins**, or **Draw (stalemate)**. "Undo" steps back
one move at a time.

**Checkers** — click a piece, then a highlighted square. If a capture is
available anywhere on the board, only capture moves are offered — jumps are
mandatory. After a jump, if that same piece can jump again it must; the
turn pill says "must continue jumping" until the chain ends. Reaching the
far row kings a piece (gold crown mark), and kings move/jump in both
directions. "Undo" reverts one full turn (including a finished multi-jump
chain).

Both games show whose turn it is, a captured-piece tray for each side, and
save automatically to the browser's local storage — closing the tab and
coming back resumes the game in progress. "New game" resets the board (not
the match history). Pieces are drawn as custom inline SVG icons, not font
glyphs — no external images, fonts, or CDNs.

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

Each game folder is self-contained (own copy of `style.css`, `playerNames.js`,
`historyStore.js`, `historyLogic.js`, `history.html`/`history.js`) so it can
be served standalone on its own port; the root copies are the source these
are kept in sync from.

```
chess/
  index.html            entry point, self-contained
  chessRules.js         pure rules engine (no DOM) — board state, move
                         generation, check/checkmate/stalemate, castling,
                         en passant, promotion
  chessPieceIcons.js    custom inline SVG piece icons (ART-01)
  chess.js              UI: click handling, rendering, undo, localStorage
  history.html/.js      this game's match-history page
  style.css
checkers/
  index.html
  checkersRules.js      pure rules engine — mandatory captures, multi-jump
                         chains, kinging, win detection
  checkersPieceIcons.js custom inline SVG piece/disc icons (ART-01)
  checkers.js           UI wiring
  history.html/.js
  style.css
playerNames.js       pure name normalization (NAMES-02) + localStorage IO
historyLogic.js      pure match-history logic (HISTORY-01): append/summarize/
                     recent-games/describe, unit tested
historyStore.js      localStorage IO for match history
history.html/.js     combined-menu match-history page
index.html           combined menu (dev convenience only)
shared.css           source stylesheet the per-game style.css copies are based on
TICKETS.md           the full ticket list (also filed as GitHub issues)
test/
  chessRules.test.js     node --test unit tests for the chess engine
  checkersRules.test.js  node --test unit tests for the checkers engine
  playerNames.test.js    node --test unit tests for name normalization
  historyLogic.test.js   node --test unit tests for match-history logic
  smoke.spec.js          Playwright: plays one move on each board at
                          1280px and 390px wide
```

## Testing

```bash
npm test           # node --test: pure-logic unit tests (23 tests)
npm run test:smoke # Playwright smoke test (needs `npm install` first)
```

The pure-logic modules (`chessRules.js`, `checkersRules.js`, `historyLogic.js`,
`playerNames.js`'s `normalizeNames`) have no DOM or localStorage dependency,
so the unit tests import and exercise them directly. The Playwright test
serves the repo over plain HTTP (ES module `<script>` tags are blocked by
CORS when opened via `file://`), opens each board, plays one legal move, and
checks the squares stay at least 40px even at a 390px-wide viewport.

## What's basic vs. what's next

Standard rules for both games, hot-seat only, no computer opponent, no
network multiplayer, no draw-by-repetition or 50-move rule. Editable player
names, a persistent win/loss/draw history, and custom piece art (tickets
#21-#25) are all in. `TICKETS.md` and the repo's GitHub issues track further
work; new features and game modes build on top of this.
