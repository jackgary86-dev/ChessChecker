import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState, legalMovesFor, allLegalMoves, applyMove, isInCheck, squareName,
} from '../chess/chessRules.js';

function findMove(moves, toRow, toCol, extra = {}) {
  return moves.find((m) => m.to.row === toRow && m.to.col === toCol &&
    Object.entries(extra).every(([k, v]) => m[k] === v));
}

test('initial position has 20 legal moves for white', () => {
  const s = initialState();
  assert.equal(allLegalMoves(s, 'w').length, 20);
});

test('pawn cannot move backward or jump two after moving', () => {
  const s = initialState();
  const moves = legalMovesFor(s, 6, 4); // e2
  assert.equal(moves.length, 2); // e3, e4
  assert.ok(findMove(moves, 5, 4));
  assert.ok(findMove(moves, 4, 4));
});

test('knight has 2 legal opening moves each', () => {
  const s = initialState();
  assert.equal(legalMovesFor(s, 7, 1).length, 2); // b1 knight
});

test('en passant capture is offered and works', () => {
  let s = initialState();
  // 1. e4 e5? no: set up e2-e4, then black a7-a5, then e4-e5, then d7-d5, e5xd6 e.p.
  let r = applyMove(s, findMove(legalMovesFor(s, 6, 4), 4, 4)); s = r.state; // e2-e4
  r = applyMove(s, findMove(legalMovesFor(s, 1, 0), 3, 0)); s = r.state; // a7-a5 (keep simple)
  r = applyMove(s, findMove(legalMovesFor(s, 4, 4), 3, 4)); s = r.state; // e4-e5
  r = applyMove(s, findMove(legalMovesFor(s, 1, 3), 3, 3)); s = r.state; // d7-d5 (double step)
  assert.deepEqual(s.enPassant, { row: 2, col: 3 });
  const moves = legalMovesFor(s, 3, 4); // white pawn e5
  const ep = findMove(moves, 2, 3, { enPassant: true });
  assert.ok(ep, 'en passant move should be legal');
  r = applyMove(s, ep); s = r.state;
  assert.equal(s.board[3][3], null); // captured black pawn removed
  assert.equal(s.board[2][3].type, 'p');
});

test('castling kingside is legal once path is clear and squares safe', () => {
  let s = initialState();
  const moves = ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f1c4', 'f8c5'];
  const apply = (fr, fc, tr, tc) => {
    const m = findMove(legalMovesFor(s, fr, fc), tr, tc);
    s = applyMove(s, m).state;
  };
  apply(6, 4, 4, 4); // e4
  apply(1, 4, 3, 4); // e5
  apply(7, 6, 5, 5); // Nf3
  apply(0, 6, 2, 5); // Nf6
  apply(7, 5, 4, 2); // Bc4
  apply(0, 5, 3, 2); // Bc5
  const kingMoves = legalMovesFor(s, 7, 4);
  const castle = findMove(kingMoves, 7, 6, { castle: 'K' });
  assert.ok(castle, 'white should be able to castle kingside');
  s = applyMove(s, castle).state;
  assert.equal(s.board[7][6].type, 'k');
  assert.equal(s.board[7][5].type, 'r');
});

test("fool's mate reaches checkmate", () => {
  let s = initialState();
  const apply = (fr, fc, tr, tc) => {
    const m = findMove(legalMovesFor(s, fr, fc), tr, tc);
    assert.ok(m, `expected legal move ${squareName(fr, fc)}->${squareName(tr, tc)}`);
    s = applyMove(s, m).state;
  };
  apply(6, 5, 5, 5); // f3
  apply(1, 4, 3, 4); // e5
  apply(6, 6, 4, 6); // g4
  apply(0, 3, 4, 7); // Qh4#
  assert.equal(s.status, 'checkmate');
  assert.equal(s.winner, 'b');
});

test('stalemate is detected with no legal moves and no check', () => {
  // Classic stalemate skeleton: white king a1, black king a3 & black queen b3 -> white to move.
  let s = initialState();
  s.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  s.board[7][0] = { type: 'k', color: 'w' }; // a1
  s.board[5][0] = { type: 'k', color: 'b' }; // a3
  s.board[5][1] = { type: 'q', color: 'b' }; // b3
  s.turn = 'w';
  s.castling = { wK: false, wQ: false, bK: false, bQ: false };
  assert.equal(allLegalMoves(s, 'w').length, 0);
  assert.equal(isInCheck(s, 'w'), false);
});
