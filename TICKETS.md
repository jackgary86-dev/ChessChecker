# Tickets: basic Chess & Checkers build

Two separate hot-seat, two-player, no-network, no-computer-opponent games.
Chess serves on port 3012, Checkers on port 3013 (`http://<IP of machine>:3012`
and `:3013`). This ticket list covers the *basic* build only; more features
and game modes come later.

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
