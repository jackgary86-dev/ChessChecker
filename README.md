# ChessChecker

Basic hot-seat Chess and Checkers, played by two people on one screen, plus
an autochess mode where the two games fight each other. No computer
opponent, no network play. Each mode is a separate static web app with
plain ES modules — no build step, no dependencies, no web fonts, no CDNs
(so it also works with no internet on the LAN).

- **Chess** — `chess/` — served on **port 3012**: `http://<IP of machine>:3012`
- **Checkers** — `checkers/` — served on **port 3013**: `http://<IP of machine>:3013`
- **Autochess** — `autochess/` — Chess vs Checkers, auto-battling; see below

A menu page at the repo root (`index.html`) links to both, for local
combined browsing; it isn't part of either per-port deployment.

This game is also submitted to the Game Portal at `http://192.168.1.36:2016`
(key `checkers-chess`), served from a mirrored `public/` build on the
`claude/checkers-chess` branch of the separate `jackgary86-dev/Alert` repo.
**When you land a feature here, also sync it there** — see `AGENTS.md` and
`scripts/sync-to-alert.sh`.

## How to play

Each player has a name (defaults to **Connor** and **Jack**) shown next to
their color (or, in Autochess, next to the faction they're rooting for) —
click either name to edit it; edits are remembered across reloads and all
three modes. A **History** link on each game and the menu shows every
player's win/loss/draw record, per game and combined, plus a recent-games
list.

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

**Autochess** — Chess lines up in its classic opening rows (rook, knight,
bishop, queen, king, bishop, knight, rook, then eight pawns — reskinned as
Footsoldier/Lancer/Cleric/Bulwark/Warqueen/High King), Checkers lines up in
its classic starting rows (reskinned as Draughtsman, with two pre-kinged
Draughts Lords), and four random tiles in the middle rows are blocked each
battle. Before the fight, a **drafting phase** lets you rearrange either
army within its own starting rows: click one of your units, then click
another of your own to swap their positions (the dashed gold outline shows
every tile you can drop on). Press **Start Battle!** when you're happy with
the arrangement — no input during the fight itself. **Fight!** watches it
resolve automatically, tick by tick (**Resolve instantly** skips straight to
the result, locking in the draft first if it hasn't been already), or
**New battle** for a fresh random layout and a new draft. Units are drawn as
their own small characters (`chessCharacterIcons.js`,
`checkersCharacterIcons.js`), not the plain board-piece icons the Chess and
Checkers games use. p1 roots for Chess, p2 for Checkers (Chess is the
faction that always acts first, same "p1 moves first" convention as
White/Red), and the result writes to the same match-history system as the
other two games.

The two sides play differently on purpose:

- **Chess is offense, fought as individuals.** Higher attack and mobility,
  no team mechanic — every unit just goes for the nearest enemy on its
  own. A mix of melee (Footsoldier, Bulwark, High King) and ranged
  (Lancer, Cleric, Warqueen) — ranged-heavy overall, hitting from further
  out. Chess loses the instant its High King falls, even with other units
  still standing.
- **Checkers is defense, fought as a hive — melee only.** Lower raw
  stats, but the group itself is the weapon:
  - **Hive shield** — 1 damage reduced for each adjacent living Checkers
    ally (minimum 1 still lands).
  - **Hive counter** — a Checkers unit struck while part of a chain of 3
    or more linked living allies immediately strikes back.
  - **Group movement** — when a few steps are equally good, a Checkers
    unit prefers the one that keeps it closest to its nearest ally, so
    the group moves and clusters together instead of scattering.
  - **Cornering** — a Checkers unit's target isn't just the nearest
    enemy; one with fewer free adjacent tiles (already more surrounded)
    is preferred, so the group converges on and traps the same target.
  - **Forward-only** — a base Draughtsman can only move with a forward
    row-component, the same as a real (un-kinged) checkers man; Draughts
    Lords move freely.
  - Checkers loses only once every unit is down.
- **Promotion, both sides.** A Footsoldier reaching the far row becomes a
  stronger Veteran — same role, just tougher. A Draughtsman reaching the
  far row becomes a **Draughts Champion**: free movement, ranged, and a
  bonus strike — the hive's purely defensive melee unit breaks away and
  becomes a lone offensive threat, the way a checkers man becomes a king.

Balance: after all of the above, a second pass (Footsoldier HP 8→10,
Draughtsman HP 13→11, keeping the hive-counter threshold at exactly 3 as
designed) brought the split to roughly 47.6% Chess / 47.7% Checkers / 4.7%
draw across 3,000 simulated battles. A regression test keeps both
factions' win rate between 35% and 65% going forward.

**Combat randomness.** Every hit's raw damage rolls within a ±15% band
(before the hive shield reduces it further) off its own seeded rng stream,
so the same battle seed always deals identical damage on replay — but two
different seeds starting from the same formation and obstacle layout no
longer play out move-for-move identically. The balance-regression test
above still holds with this on by default.

## Run it locally

Each game only needs a static file server pointed at its own folder:

```bash
# Chess on port 3012
python3 -m http.server 3012 --directory chess

# Checkers on port 3013
python3 -m http.server 3013 --directory checkers

# Autochess has no assigned port yet — run it from the combined menu below,
# or serve its folder directly:
python3 -m http.server 3014 --directory autochess

# Or, for the combined menu during development:
python3 -m http.server 8000
```

(`npm run serve:chess`, `npm run serve:checkers` and `npm run serve:menu` do
the same thing.) Then open `http://<IP of machine>:<port>/` from any device
on the LAN, or `http://localhost:<port>/` on the same machine.

## Project layout

Each game folder — Chess, Checkers, and Autochess alike — is self-contained
(own copy of `style.css`, `playerNames.js`, `historyStore.js`,
`historyLogic.js`, `history.html`/`history.js`) so it can be served
standalone on its own port; the root copies are the source these are kept
in sync from.

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
autochess/
  index.html
  autochessRules.js         pure battle engine (no DOM) — starting
                             formations, a draft phase, targeting (incl.
                             Checkers' cornering), movement (incl. group
                             cohesion and forward-only), the hive
                             shield/counter, promotion, seeded ±15% damage
                             variance, one simulation tick, a full-battle
                             runner — fully reproducible for a given seed
  chessCharacterIcons.js,
  checkersCharacterIcons.js own character art, not reused from the games
  autochess.js               UI: board/HP-bar rendering, Fight/Pause/Instant/
                              New battle, battle log, player names, and
                              match-history recording (AUTOCHESS-09)
  playerNames.js, historyLogic.js, historyStore.js, history.html/.js
                              this game's own copies, same as chess/checkers
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
  chessRules.test.js      node --test unit tests for the chess engine
  checkersRules.test.js   node --test unit tests for the checkers engine
  playerNames.test.js     node --test unit tests for name normalization
  historyLogic.test.js    node --test unit tests for match-history logic
  autochessRules.test.js  node --test unit tests for the autochess engine
  smoke.spec.js           Playwright: exercises each page (a move on the
                           chess/checkers boards, an instant autochess
                           battle) at 1280px and 390px wide
```

## Testing

```bash
npm test           # node --test: pure-logic unit tests (60 tests)
npm run test:smoke # Playwright smoke test (needs `npm install` first)
```

The pure-logic modules (`chessRules.js`, `checkersRules.js`, `historyLogic.js`,
`playerNames.js`'s `normalizeNames`, `autochessRules.js`) have no DOM or
localStorage dependency, so the unit tests import and exercise them
directly — including each Autochess mechanic in isolation (the hive
counter firing at exactly 3 linked and not at 2, cornering preferring a
surrounded enemy over a merely-nearer open one, group movement's ally-
distance tie-break, forward-only blocking a backward step, the Draughts
Champion's promotion, the drafting phase's swap/footprint/locking rules,
and seeded combat variance's ±15% bound, cross-seed variation, and
same-seed reproducibility) — plus a check that a third `game: 'autochess'`
match-history entry composes into its own stats bucket without disturbing
Chess's or Checkers'. The Playwright test serves the repo over plain
HTTP (ES module
`<script>` tags are blocked by CORS when opened via `file://`), opens each
board, plays one legal move (for Autochess: swaps two units in the draft
phase, then resolves the battle instantly), checks the squares stay at
least 40px even at a 390px-wide viewport, and (for Autochess) confirms the
finished battle shows up on its history page.

## What's basic vs. what's next

Standard rules for both games, hot-seat only, no computer opponent, no
network multiplayer, no draw-by-repetition or 50-move rule. Editable player
names, a persistent win/loss/draw history, and custom piece art for Chess
and Checkers (tickets #21-#25) are all in, plus the Autochess mode, its own
character art, faction mechanics, a balance pass, a drafting phase, seeded
combat randomness, and match-history integration (tickets #26-#31, #35-#41,
#32, #33, #34) — every planned Autochess ticket is now shipped. `TICKETS.md`
and the repo's GitHub issues track further work; new features and game
modes build on top of this.
