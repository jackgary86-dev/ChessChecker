import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, legalMovesFor, allLegalMoves, applyMove } from '../checkers/checkersRules.js';

test('initial position: red has 7 legal simple moves', () => {
  const s = initialState();
  assert.equal(allLegalMoves(s, 'r').length, 7);
});

test('red pieces only move toward black (down the board)', () => {
  const s = initialState();
  const moves = legalMovesFor(s, 2, 1);
  assert.ok(moves.every((m) => m.to.row > m.from.row));
});

test('capture is mandatory when available', () => {
  let s = initialState();
  // Clear a lane and set up a forced capture for black.
  s.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  s.board[2][3] = { color: 'r', king: false };
  s.board[3][4] = { color: 'b', king: false };
  s.board[5][6] = { color: 'b', king: false }; // black also has a non-capturing option, but no jump
  s.turn = 'b';
  const movesAt42 = legalMovesFor(s, 5, 6);
  assert.equal(movesAt42.length, 0, 'non-capturing piece has no legal moves while a capture exists');
  const movesAt34 = legalMovesFor(s, 3, 4);
  assert.equal(movesAt34.length, 1);
  assert.equal(movesAt34[0].capture, true);
});

test('multi-jump chain must continue with the same piece', () => {
  let s = initialState();
  s.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  s.board[2][1] = { color: 'r', king: false };
  s.board[3][2] = { color: 'b', king: false };
  s.board[5][4] = { color: 'b', king: false };
  s.turn = 'r';
  let moves = legalMovesFor(s, 2, 1);
  assert.equal(moves.length, 1);
  let r = applyMove(s, moves[0]);
  s = r.state;
  assert.equal(r.continued, true);
  assert.equal(s.turn, 'r'); // still red's turn: must keep jumping
  assert.deepEqual(s.forcedFrom, { row: 4, col: 3 });
  moves = legalMovesFor(s, 4, 3);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].to.row, 6);
  assert.equal(moves[0].to.col, 5);
});

test('kinging on the back row lets a piece move backward', () => {
  let s = initialState();
  s.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  s.board[6][1] = { color: 'r', king: false };
  s.turn = 'r';
  const moves = legalMovesFor(s, 6, 1);
  const toKingRow = moves.find((m) => m.to.row === 7);
  assert.ok(toKingRow);
  const { state } = applyMove(s, toKingRow);
  assert.equal(state.board[7][toKingRow.to.col].king, true);
  const kingMoves = legalMovesFor({ ...state, turn: 'r' }, 7, toKingRow.to.col);
  assert.ok(kingMoves.some((m) => m.to.row < 7), 'king should be able to move back up the board');
});

test('a side with no pieces loses', () => {
  let s = initialState();
  s.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  s.board[2][1] = { color: 'r', king: false };
  s.board[3][2] = { color: 'b', king: false };
  s.turn = 'r';
  const moves = legalMovesFor(s, 2, 1);
  const { state } = applyMove(s, moves[0]); // captures black's only piece
  assert.equal(state.status, 'over');
  assert.equal(state.winner, 'r');
});
