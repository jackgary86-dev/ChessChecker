import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, stepBattle, runBattle, livingUnits, BOARD_SIZE, UNIT_DEFS,
} from '../autochess/autochessRules.js';

test('createInitialState is deterministic for a given seed', () => {
  const a = createInitialState(42);
  const b = createInitialState(42);
  assert.deepEqual(a.obstacles, b.obstacles);
  assert.deepEqual(a.units, b.units);
});

test('different seeds usually produce different obstacle layouts', () => {
  const a = createInitialState(1);
  const b = createInitialState(2);
  assert.notDeepEqual(a.obstacles, b.obstacles);
});

test('starting roster: 16 Chess units, 12 Checkers units', () => {
  const state = createInitialState(7);
  assert.equal(livingUnits(state, 'chess').length, 16);
  assert.equal(livingUnits(state, 'checkers').length, 12);
  assert.equal(state.units.filter((u) => u.type === 'highking').length, 1);
  assert.equal(state.units.filter((u) => u.type === 'draughtslord').length, 2);
});

test('obstacles only ever land in the neutral middle (rows 2-4), never on a unit', () => {
  const state = createInitialState(99);
  assert.equal(state.obstacles.length, 4);
  const seen = new Set();
  for (const o of state.obstacles) {
    assert.ok(o.row >= 2 && o.row <= 4, `obstacle row ${o.row} should be 2-4`);
    const key = `${o.row},${o.col}`;
    assert.ok(!seen.has(key), 'obstacles should be at distinct tiles');
    seen.add(key);
    assert.ok(!state.units.some((u) => u.row === o.row && u.col === o.col), 'obstacle must not overlap a unit');
  }
});

test('a battle always resolves to a winner or a draw within the tick cap', () => {
  const result = runBattle(createInitialState('fixed-seed-1'));
  assert.ok(['chess', 'checkers', 'draw'].includes(result.winner));
});

test('running the same seed to completion twice gives the same result (deterministic combat)', () => {
  const r1 = runBattle(createInitialState('repeat-me'));
  const r2 = runBattle(createInitialState('repeat-me'));
  assert.equal(r1.winner, r2.winner);
  assert.equal(r1.tick, r2.tick);
  assert.deepEqual(r1.units, r2.units);
});

test('Chess loses instantly the moment its High King dies, even with Chess units still alive', () => {
  let state = createInitialState(5);
  const king = state.units.find((u) => u.type === 'highking');
  king.hp = 0;
  king.alive = false;
  // Advancing one more tick should compute the win condition from this state.
  state = stepBattle(state);
  assert.equal(state.winner, 'checkers');
});

test('Checkers only loses when every Checkers unit is dead', () => {
  let state = createInitialState(5);
  for (const u of state.units) {
    if (u.faction === 'checkers') { u.hp = 0; u.alive = false; }
  }
  state = stepBattle(state);
  assert.equal(state.winner, 'chess');
});

test('the hive shield reduces damage to a Checkers unit for each adjacent living Checkers ally', () => {
  const state = createInitialState(1);
  state.units = [];
  state.obstacles = [];
  // One chess attacker next to a lone checkers target with no allies around.
  state.units.push({ id: 0, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 3, col: 3, hp: 8, maxHp: 8, atk: 4, range: 1, speed: 1, veteran: false, alive: true });
  state.units.push({ id: 1, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 3, col: 4, hp: 12, maxHp: 12, atk: 2, range: 1, speed: 1, veteran: false, alive: true });
  const next = stepBattle(state);
  const target = next.units.find((u) => u.id === 1);
  assert.equal(target.hp, 8, 'no allies adjacent: full 4 damage goes through');
});

test('hive shield: two adjacent allies each reduce incoming damage by 1', () => {
  const state = createInitialState(1);
  state.units = [];
  state.obstacles = [];
  state.units.push({ id: 0, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 3, col: 3, hp: 8, maxHp: 8, atk: 4, range: 1, speed: 1, veteran: false, alive: true });
  state.units.push({ id: 1, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 3, col: 4, hp: 12, maxHp: 12, atk: 2, range: 1, speed: 1, veteran: false, alive: true });
  state.units.push({ id: 2, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 2, col: 4, hp: 12, maxHp: 12, atk: 2, range: 1, speed: 1, veteran: false, alive: true });
  state.units.push({ id: 3, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 4, col: 4, hp: 12, maxHp: 12, atk: 2, range: 1, speed: 1, veteran: false, alive: true });
  const next = stepBattle(state);
  const target = next.units.find((u) => u.id === 1);
  // 4 raw damage - 2 allies * 1 shield/ally = 2 damage.
  assert.equal(target.hp, 10);
});

test('Draughts Lord double-hits: two damage instances against the same target in one attack', () => {
  const state = createInitialState(1);
  state.units = [];
  state.obstacles = [];
  state.units.push({ id: 0, type: 'draughtslord', name: 'Draughts Lord', faction: 'checkers', row: 3, col: 3, hp: 18, maxHp: 18, atk: 3, range: 1, speed: 1, veteran: false, alive: true });
  state.units.push({ id: 1, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 3, col: 4, hp: 20, maxHp: 20, atk: 4, range: 1, speed: 1, veteran: false, alive: true });
  const next = stepBattle(state);
  // tick 0 is chess-first, so footsoldier (id1) attacks the lord first (-4 hp),
  // then the lord double-hits back: -3 -3 = -6.
  const target = next.units.find((u) => u.id === 1);
  assert.equal(target.hp, 14);
});

test('obstacles block movement: a unit cannot step onto a blocked tile', () => {
  const state = createInitialState(1);
  state.obstacles = [{ row: 3, col: 4 }];
  state.units = [
    { id: 0, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 3, col: 3, hp: 8, maxHp: 8, atk: 4, range: 1, speed: 1, veteran: false, alive: true },
    { id: 1, type: 'footsoldier', name: 'Footsoldier', faction: 'checkers', row: 3, col: 5, hp: 12, maxHp: 12, atk: 2, range: 1, speed: 1, veteran: false, alive: true },
  ];
  // checkers-unit-faction mislabeled on purpose to keep it a non-adjacent single mover test
  state.units[1].faction = 'checkers';
  const next = stepBattle(state);
  const mover = next.units.find((u) => u.id === 0);
  assert.notDeepEqual({ row: mover.row, col: mover.col }, { row: 3, col: 4 }, 'must not move onto the obstacle');
});

test('a Footsoldier reaching the far row promotes to Veteran (one-time hp/atk boost)', () => {
  const state = createInitialState(1);
  state.units = [];
  state.obstacles = [];
  state.units.push({ id: 0, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: BOARD_SIZE - 2, col: 0, hp: 8, maxHp: 8, atk: 4, range: 1, speed: 1, veteran: false, alive: true });
  // A far-away enemy straight down-board, so the footsoldier marches toward
  // row 7 (its promotion row) without reaching combat range this tick.
  state.units.push({ id: 1, type: 'footsoldier', name: 'Footsoldier', faction: 'checkers', row: BOARD_SIZE - 1, col: 7, hp: 1000, maxHp: 1000, atk: 0, range: 0, speed: 0, veteran: false, alive: true });
  const next = stepBattle(state);
  const mover = next.units.find((u) => u.id === 0);
  assert.equal(mover.row, BOARD_SIZE - 1);
  assert.equal(mover.veteran, true);
  assert.equal(mover.maxHp, Math.round(8 * 1.5));
  assert.equal(mover.atk, Math.round(4 * 1.5));
});

test('UNIT_DEFS has stats for every unit type used in the starting roster', () => {
  const state = createInitialState(3);
  for (const u of state.units) {
    assert.ok(UNIT_DEFS[u.type], `missing UNIT_DEFS for ${u.type}`);
  }
});
