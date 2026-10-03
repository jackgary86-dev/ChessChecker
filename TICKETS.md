# Tickets: basic Chess & Checkers build

Two separate hot-seat, two-player, no-network, no-computer-opponent games.
Chess serves on port 3012, Checkers on port 3013 (`http://<IP of machine>:3012`
and `:3013`). This ticket list covers the *basic* build only; more features
and game modes come later.

All 20 tickets below (#1-#20 in the repo's GitHub issues) are done, shipped
in commit `cf56219`. The **Next phase** section (#21-#25) and the
**Autochess** sections (#26-#31, #35-#41, #32, #33, #34) track everything
after the basic build.

## Chess
1. **CHESS-01** — Board model: 8x8 state, standard starting position, FEN-free
   internal representation, `cloneState`/`squareName` helpers.
2. **CHESS-02** — Sliding & stepping piece move generation (rook, bishop,
   queen, knight, king) as pure pseudo-legal move functions.
3. **CHESS-03** — Pawn moves: single/double step, diagonal captures, no
   backward moves, blocked-path handling.
4. **CHESS-04** — Check detection: `isSquareAttacked` / `isInCheck`, and
   filtering pseudo-legal moves down to legal moves (can't leave own king in
   check).
5. **CHESS-05** — Castling: king/rook-moved tracking, empty-and-safe squares
   between, king not in/through/into check.
6. **CHESS-06** — En passant: track the file of a pawn that just double-stepped,
   allow the one-move capture, clear the flag after.
7. **CHESS-07** — Pawn promotion: reaching the last rank prompts a piece choice
   (queen/rook/bishop/knight) before the move completes.
8. **CHESS-08** — Game status: checkmate, stalemate, and "Check" banner; no
   legal moves for the side to move decides mate vs. stalemate.
9. **CHESS-09** — UI: click-to-select a piece, highlight its legal
   destinations, click-to-move; captured piece tray; turn indicator
   (White/Black).
10. **CHESS-10** — Undo: a move stack that can pop back through castling, en
    passant and promotion moves.

## Checkers
11. **CHECK-01** — Board model: 8x8, dark squares only, standard starting
    rows for Red and Black.
12. **CHECK-02** — Simple diagonal forward-move generation (non-king).
13. **CHECK-03** — Jump/capture generation: adjacent enemy piece, empty
    landing square two steps away.
14. **CHECK-04** — Mandatory-capture rule: if any capture exists for the side
    to move, only capture moves are legal.
15. **CHECK-05** — Multi-jump chains: after a jump, the same piece must keep
    jumping while further jumps are available before turn passes.
16. **CHECK-06** — Kinging: reaching the far back row promotes to king; kings
    move and jump both directions.
17. **CHECK-07** — Win detection: a side with no pieces or no legal moves
    loses.
18. **CHECK-08** — UI: click-to-select, legal-move highlighting including
    forced-capture squares, turn indicator (Red/Black), captured tray.
19. **CHECK-09** — Undo: reverse one full turn (including a completed
    multi-jump) at a time.

## Shared
20. **SHARED-01** — localStorage save/restore per game (wrapped in
    try/catch), mobile layout (board scales, ≥40px squares at 390px wide,
    no sideways scroll), `node --test` unit tests for both rules modules,
    and a Playwright smoke test that plays one move on each board at
    1280px and 390px.

## Next phase (not part of the basic build)

Filed as GitHub issues #21-#25. All five are done.

21. **NAMES-01** — Name the two seats "Connor" and "Jack" instead of
    White/Black, Red/Black, shown in the turn indicator, captured trays and
    end-of-game banner. Keep color meaning visible too.
22. **NAMES-02** — Make player names editable and persist them in
    localStorage across reloads and across both games. Depends on NAMES-01.
    `playerNames.js`: pure normalization + a localStorage wrapper; an
    editable name field with a color swatch sits under each game's topbar.
23. **HISTORY-01** — Record each finished game (date, game type, both
    player names, result) to a persistent history in localStorage, as pure
    testable logic. Depends on NAMES-01. `historyLogic.js` (pure:
    `appendResult`/`summarize`/`recentGames`/`describeResult`, unit tested)
    plus `historyStore.js` (the localStorage IO). Each game records its
    result once, right when checkmate/stalemate/"no moves left" is reached.
24. **HISTORY-02** — History log UI: each player's win/loss/draw record per
    game and combined, plus a recent-games list. Depends on HISTORY-01. A
    "History" page (`history.html`/`history.js`) reachable from each game's
    topbar and the root menu.
25. **ART-01** — Custom piece art for both games, replacing the unicode
    glyphs and plain discs: hand-built inline SVG icons
    (`chessPieceIcons.js`, `checkersPieceIcons.js`) using only simple
    shapes (rects/polygons/circles), colored via CSS so White/Black and
    Red/Black stay theme-driven. No external assets, fonts, or CDNs.

## Autochess

A third mode: Chess vs Checkers, auto-battling. Filed as GitHub issues
#26-#31. All six are done.

26. **AUTOCHESS-01** — Pure battle engine (`autochessRules.js`, no DOM):
    unit stat definitions, classic starting formations (Chess's real
    back-row order, Checkers' real dark-square starting rows), and a
    seeded, fully deterministic simulation — movement, targeting, attacks,
    promotion, and win conditions.
27. **AUTOCHESS-02** — Faction identities: **Chess is offense** (higher
    attack/mobility, no team mechanic — each unit just goes for the
    nearest enemy on its own) vs **Checkers is defense** (lower raw stats,
    but a "hive mind" shield: 1 damage reduced per adjacent living
    Checkers ally). Chess loses instantly if its High King falls, even
    with other units alive; Checkers loses only when every unit is down —
    asymmetric on purpose, echoing each game's own win condition.
28. **AUTOCHESS-03** — Four random impassable tiles in the neutral middle
    rows, reseeded on every new battle; movement avoids them (and they can
    never overlap a unit's starting square, by construction).
29. **AUTOCHESS-04** — Battle UI: board/HP-bar/Veteran-badge rendering
    (reusing the existing chess/checkers piece-icon art, faction-tinted),
    Fight!/Pause/Resolve-instantly/New-battle controls, a speed selector, a
    battle log, and a winner banner. Linked from the root menu.
30. **AUTOCHESS-05** — Tests: unit tests for the engine (determinism,
    starting roster counts, obstacle placement, both win conditions, the
    hive shield's exact damage reduction, the Draughts Lord's double hit,
    promotion) and a Playwright smoke test that resolves a battle
    instantly and checks the board at 1280px and 390px.
31. **AUTOCHESS-06** — Balance pass. Grid-searched several stat tweaks
    (Draughtsman and Draughts Lord hp/atk, Footsoldier hp/atk, the hive
    shield's strength) across hundreds of simulated battles per candidate.
    Dropping Draughtsman hp from 14 to 13 alone brought the split from an
    initial 42% Chess / 53% Checkers / 5% draw to roughly 47% Chess / 49%
    Checkers / 4% draw over 3,000 battles — within about a point and a
    half of even. Added a regression test (`test/autochessRules.test.js`)
    that keeps both factions' win rate between 35% and 65% going forward.

## Autochess: characters, faction mechanics, and a second balance pass

Filed as GitHub issues #35-#41. All seven are done.

35. **AUTOCHESS-10** — Custom character art (`chessCharacterIcons.js`,
    `checkersCharacterIcons.js`), replacing the reused chess/checkers
    board-piece icons from AUTOCHESS-04. Small humanoid figures for Chess
    (each with a prop that shows its role — sword, javelin, staff, shield,
    scepter, crown), round "disc warrior" figures for Checkers that keep
    the board-piece identity. A promoted Draughts Champion visually breaks
    from the round hive-body into an angular, winged, gold-tinted
    attacker. Built only from rects/polygons/circles, same lesson as
    ART-01: freehand curves didn't render recognizably at this size.
36. **AUTOCHESS-11** — Chess leans ranged: Lancer became a ranged javelin
    unit (was melee) and Cleric's range extended from 2 to 3, alongside
    the already-ranged Warqueen. Chess is now a 3-melee/3-ranged mix
    (Footsoldier, Bulwark, High King vs Lancer, Cleric, Warqueen),
    ranged-heavy in practice since the ranged units also hit hardest.
    Checkers stays melee-only (confirmed: both Draughtsman and Draughts
    Lord are range 1).
37. **AUTOCHESS-12** — Checkers group movement: `stepToward` now scores
    every equally-valid step for a Checkers unit by distance to its
    nearest living ally and prefers the closest, so the hive moves and
    clusters together turn over turn instead of each unit pathing
    independently.
38. **AUTOCHESS-13** — Checkers cornering: target selection
    (`findCorneredEnemy`) scores enemies by distance *and* how many free
    adjacent tiles they have left, preferring an already-more-surrounded
    enemy over a merely-nearer open one — the group converges on and traps
    the same target instead of spreading its attacks thin.
39. **AUTOCHESS-14** — Hive counter-attack: a Checkers unit struck while
    part of a chain-linked group of 3 or more living Checkers allies
    (`linkedGroupSize`, a BFS over adjacency — A-B-C counts even when A
    and C aren't themselves adjacent) immediately strikes back at its
    attacker for its own ATK.
40. **AUTOCHESS-15** — Forward-only movement and the Draughts Champion
    promotion. A base Draughtsman can now only move with a forward
    row-component, same as a real un-kinged checkers man; Draughts Lords
    (and promoted Draughtsmen) move freely. A Draughtsman reaching the far
    row promotes to a **Draughts Champion**: the usual 1.5x hp/atk boost,
    plus range 2, a bonus strike (`doubleHit`), and freedom from the
    forward-only restriction — the hive's purely defensive melee unit
    becomes a lone offensive threat, echoing a checkers man becoming a
    king.
41. **AUTOCHESS-16** — Second balance pass, after all of the above
    significantly shifted the matchup (an interim check showed Checkers
    winning roughly 70-75% of battles). Explicitly kept the hive-counter
    threshold at exactly 3 linked allies rather than tuning it away for
    balance. Grid-searched Footsoldier/Draughtsman hp and atk instead;
    Footsoldier hp 8→10 and Draughtsman hp 13→11 brought the split to
    roughly 47.6% Chess / 47.7% Checkers / 4.7% draw over 3,000 battles.
    8 new unit tests cover the new mechanics individually (group movement,
    cornering, the counter firing at exactly 3 linked and not at 2,
    forward-only blocking, Draughts Lord/Champion exemption from it, and
    Champion promotion's range/doubleHit/name change).

## Autochess: drafting phase

Filed as GitHub issue #32. Done.

32. **AUTOCHESS-07** — A manual drafting/placement phase before the fight.
    Every battle now starts in `phase: 'draft'` with both armies already in
    their classic formation (unchanged roster and footprint); before
    pressing **Start Battle!**, either side can rearrange its own units by
    clicking one, then clicking another of its own units to swap them —
    `moveDraftUnit` only allows a destination within that unit's own
    faction's starting tiles (16 for Chess, 12 for Checkers), so this is
    pure rearrangement, not a roster/points system, and never touches the
    separate randomized-obstacle zone. `stepBattle` unconditionally forces
    `phase` to `'battle'` on its very first call regardless of whether the
    draft was touched, so every existing caller — including the balance-pass
    regression test — behaves byte-for-byte as before when the draft API is
    never used. 8 new unit tests cover the draft API directly (phase
    defaults, swap, footprint validation, enemy-tile rejection, locking),
    plus a Playwright check that clicking two units swaps them before the
    fight starts.

## Autochess: combat randomness

Filed as GitHub issue #33. Done.

33. **AUTOCHESS-08** — Controlled, seeded randomness in combat. Every hit's
    raw damage now rolls within a ±15% band before the hive shield is
    applied, using its own seeded rng stream (`state.rngState`, salted off
    the battle seed so it never interferes with the obstacle-layout draws).
    Same seed replayed twice still deals identical damage every time
    (reproducible/testable — `node --test` enforces this), but two
    different seeds on an otherwise identical starting layout no longer
    play out the same way. `createInitialState(seed, { variance: false })`
    (or setting `state.variance = false` directly, as the pre-existing
    exact-damage-math tests now do) turns the roll into a flat 1x
    multiplier, so every prior test kept its exact assertions unchanged.
    6 new unit tests cover the default-on behavior, the opt-out, the ±15%
    bound, cross-seed variation, and same-seed reproducibility; the
    AUTOCHESS-06 balance-regression test (both factions 35%-65% over 300
    battles) still passes with variance on by default.

## Autochess: match-history integration

Filed as GitHub issue #34. Done.

34. **AUTOCHESS-09** — Autochess results now write to the same
    win/loss/draw match-history system Chess and Checkers already use.
    p1 roots for Chess, p2 for Checkers (Chess is the faction that acts
    first each battle, matching the "p1 moves first" convention White/Red
    already use); a new players-row on the Autochess page shows and edits
    both names, shared with the other two games via `playerNames.js`. Like
    Chess and Checkers, the Autochess folder now carries its own copies of
    `playerNames.js`, `historyLogic.js`, `historyStore.js`, `history.html`
    and `history.js` for standalone-port self-containment, plus a new
    **History** link in its topbar. `historyLogic.js` needed no changes at
    all — `summarize`/`recentGames`/`describeResult` were already generic
    over the `game` field, so a third game type just composed; `history.js`
    (all four copies: root, chess/, checkers/, autochess/) gained an
    Autochess column and a proper 3-way game-name label (previously any
    non-chess `game` value rendered as "Checkers", a latent bug this fixed).
    A `resultRecorded` guard (matching Chess/Checkers' own pattern) stops a
    battle from double-logging. 1 new unit test confirms autochess results
    compose into their own `byGame` bucket without affecting chess/checkers
    totals; the Playwright smoke test now resolves a battle, navigates to
    the Autochess history page, and confirms the result actually landed
    there.

This closes the Autochess backlog opened after AUTOCHESS-16 — #32, #33 and
#34 are all shipped.
