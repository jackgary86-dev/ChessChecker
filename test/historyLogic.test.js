import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendResult, summarize, recentGames, describeResult } from '../historyLogic.js';

test('appendResult returns a new array without mutating the original', () => {
  const original = [];
  const entry = { date: '2026-01-01T00:00:00.000Z', game: 'chess', players: { p1: 'Connor', p2: 'Jack' }, result: 'p1' };
  const next = appendResult(original, entry);
  assert.equal(original.length, 0);
  assert.equal(next.length, 1);
  assert.equal(next[0], entry);
});

test('summarize combines wins/losses across game types for the same player', () => {
  const history = [
    { date: '2026-01-01', game: 'chess', players: { p1: 'Connor', p2: 'Jack' }, result: 'p1' }, // Connor beats Jack at chess
    { date: '2026-01-02', game: 'checkers', players: { p1: 'Connor', p2: 'Jack' }, result: 'p2' }, // Jack beats Connor at checkers
  ];
  const stats = summarize(history);
  assert.equal(stats.Connor.wins, 1);
  assert.equal(stats.Connor.losses, 1);
  assert.equal(stats.Connor.byGame.chess.wins, 1);
  assert.equal(stats.Connor.byGame.checkers.losses, 1);
  assert.equal(stats.Jack.wins, 1);
  assert.equal(stats.Jack.losses, 1);
  assert.equal(stats.Jack.byGame.chess.losses, 1);
  assert.equal(stats.Jack.byGame.checkers.wins, 1);
});

test('summarize counts a draw for both players, combined and per game', () => {
  const history = [
    { date: '2026-01-01', game: 'chess', players: { p1: 'Connor', p2: 'Jack' }, result: 'draw' },
  ];
  const stats = summarize(history);
  assert.equal(stats.Connor.draws, 1);
  assert.equal(stats.Jack.draws, 1);
  assert.equal(stats.Connor.byGame.chess.draws, 1);
  assert.equal(stats.Jack.byGame.chess.draws, 1);
});

test('recentGames returns most-recent-first, respecting the limit', () => {
  const history = [
    { date: '1', game: 'chess', players: { p1: 'A', p2: 'B' }, result: 'p1' },
    { date: '2', game: 'chess', players: { p1: 'A', p2: 'B' }, result: 'p2' },
    { date: '3', game: 'chess', players: { p1: 'A', p2: 'B' }, result: 'draw' },
  ];
  const recent = recentGames(history, 2);
  assert.equal(recent.length, 2);
  assert.equal(recent[0].date, '3');
  assert.equal(recent[1].date, '2');
});

test('describeResult formats a win and a draw', () => {
  const win = { players: { p1: 'Connor', p2: 'Jack' }, result: 'p1' };
  const draw = { players: { p1: 'Connor', p2: 'Jack' }, result: 'draw' };
  assert.equal(describeResult(win), 'Connor beat Jack');
  assert.equal(describeResult(draw), 'Connor and Jack drew');
});

// AUTOCHESS-09: a third game type ('autochess') composes with the existing
// two without any changes to this module — summarize/recentGames/
// describeResult were already generic over `game`, so this just proves it.
test('summarize keeps autochess results in their own byGame bucket, alongside chess and checkers', () => {
  const history = [
    { date: '2026-01-01', game: 'chess', players: { p1: 'Connor', p2: 'Jack' }, result: 'p1' },
    { date: '2026-01-02', game: 'checkers', players: { p1: 'Connor', p2: 'Jack' }, result: 'p2' },
    { date: '2026-01-03', game: 'autochess', players: { p1: 'Connor', p2: 'Jack' }, result: 'p1' },
  ];
  const stats = summarize(history);
  assert.equal(stats.Connor.wins, 2);
  assert.equal(stats.Connor.losses, 1);
  assert.equal(stats.Connor.byGame.autochess.wins, 1);
  assert.equal(stats.Jack.byGame.autochess.losses, 1);
  assert.equal(stats.Connor.byGame.chess.wins, 1, 'autochess must not bleed into the chess bucket');
});
