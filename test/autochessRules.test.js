import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, stepBattle, runBattle, livingUnits, BOARD_SIZE, UNIT_DEFS,
  moveDraftUnit, startBattle,
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
  state.variance = false; // exact damage math, not the AUTOCHESS-08 roll
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
  state.variance = false; // exact damage math, not the AUTOCHESS-08 roll
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
  state.variance = false; // exact damage math, not the AUTOCHESS-08 roll
  state.units.push({ id: 0, type: 'draughtslord', name: 'Draughts Lord', faction: 'checkers', row: 3, col: 3, hp: 18, maxHp: 18, atk: 3, range: 1, speed: 1, doubleHit: true, veteran: false, alive: true });
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

test('hive counter: a Checkers unit struck while linked to 2+ allies (a chain of 3+) strikes back', () => {
  const state = createInitialState(1);
  state.units = [];
  state.obstacles = [];
  // Chain: A(3,4)-B(2,4)-C(1,4), each link adjacent to the next, so A is in
  // a linked group of 3 even though A and C aren't themselves adjacent.
  state.units.push({ id: 0, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 3, col: 3, hp: 8, maxHp: 8, atk: 4, range: 1, speed: 1, doubleHit: false, veteran: false, alive: true });
  state.units.push({ id: 1, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 3, col: 4, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: true, alive: true });
  state.units.push({ id: 2, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 2, col: 4, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: true, alive: true });
  state.units.push({ id: 3, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 1, col: 4, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: true, alive: true });
  const next = stepBattle(state);
  // Checked via the log rather than final HP: a full tick also lets A, B
  // and C each take their own ordinary turn (and the cornering logic has
  // them all converge on the same lone attacker too), so the attacker's
  // final HP reflects a lot more than just the counter. The log message is
  // the precise, isolated signal that the counter mechanic itself fired.
  assert.ok(
    next.log.some((line) => /hive \(3 linked\) counter-attacks/.test(line)),
    'expected a hive counter-attack log entry for a linked group of 3',
  );
});

test('no counter when fewer than 3 Checkers units are linked together', () => {
  const state = createInitialState(1);
  state.units = [];
  state.obstacles = [];
  state.units.push({ id: 0, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 3, col: 3, hp: 8, maxHp: 8, atk: 4, range: 1, speed: 1, doubleHit: false, veteran: false, alive: true });
  state.units.push({ id: 1, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 3, col: 4, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: true, alive: true });
  state.units.push({ id: 2, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 2, col: 4, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: true, alive: true });
  const next = stepBattle(state);
  assert.ok(
    !next.log.some((line) => /counter-attacks/.test(line)),
    'only 2 linked: no counter-attack should fire',
  );
});

test('cornering: Checkers prefers a more-surrounded enemy over a merely-nearer open one', () => {
  const state = createInitialState(1);
  state.units = [];
  // Wall the "cornered" enemy in on three sides with obstacles, leaving it
  // only one way out, while the "open" enemy (equally far) has no obstacles
  // around it at all.
  state.obstacles = [{ row: 2, col: 1 }, { row: 3, col: 1 }, { row: 4, col: 1 }];
  state.units.push({ id: 0, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 3, col: 4, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: true, alive: true });
  // veteran:true so forward-only restriction (tested separately below)
  // doesn't block the sideways step this scenario needs.
  // Both decoys are immobile (speed 0) so they don't themselves close the
  // distance before the checkers unit's own turn — this isolates target
  // *selection*, not an emergent side effect of who moves first this tick.
  state.units.push({ id: 1, type: 'footsoldier', name: 'Cornered', faction: 'chess', row: 3, col: 2, hp: 8, maxHp: 8, atk: 0, range: 1, speed: 0, doubleHit: false, veteran: false, alive: true });
  state.units.push({ id: 2, type: 'footsoldier', name: 'Open', faction: 'chess', row: 3, col: 6, hp: 8, maxHp: 8, atk: 0, range: 1, speed: 0, doubleHit: false, veteran: false, alive: true });
  const next = stepBattle(state);
  const mover = next.units.find((u) => u.id === 0);
  // Both enemies are equally far (distance 2); the checkers unit should
  // advance toward the cornered one (col decreasing toward 2), not the
  // open one (which would mean col increasing toward 6).
  assert.equal(mover.col, 3, 'expected the checkers unit to step toward the cornered enemy');
});

test('group movement: Checkers prefers the step that stays closest to an ally', () => {
  const state = createInitialState(1);
  state.units = [];
  // Block the diagonal step so the only choice left is between a pure-row
  // step (3,3)->(2,3) or a pure-col step (3,3)->(3,2); only the pure-col
  // step stays adjacent to the ally at (3,1).
  state.obstacles = [{ row: 2, col: 2 }];
  state.units.push({ id: 0, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 3, col: 3, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: true, alive: true });
  state.units.push({ id: 1, type: 'draughtsman', name: 'Ally', faction: 'checkers', row: 3, col: 1, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: true, alive: true });
  state.units.push({ id: 2, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 0, col: 0, hp: 1000, maxHp: 1000, atk: 0, range: 0, speed: 0, doubleHit: false, veteran: false, alive: true });
  const next = stepBattle(state);
  const mover = next.units.find((u) => u.id === 0);
  assert.equal(mover.row, 3);
  assert.equal(mover.col, 2);
});

test('a base Draughtsman cannot step backward (forward-only, like an un-kinged checkers man)', () => {
  const state = createInitialState(1);
  state.units = [];
  state.obstacles = [];
  // Draughtsman's forward direction is toward row 0. An enemy directly
  // behind it (higher row) gives it nowhere legal to step.
  state.units.push({ id: 0, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 3, col: 3, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: false, alive: true });
  state.units.push({ id: 1, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 6, col: 3, hp: 1000, maxHp: 1000, atk: 0, range: 1, speed: 0, doubleHit: false, veteran: false, alive: true });
  const next = stepBattle(state);
  const mover = next.units.find((u) => u.id === 0);
  assert.equal(mover.row, 3, 'a forward-only Draughtsman must not retreat toward the enemy behind it');
  assert.equal(mover.col, 3);
});

test('a Draughts Lord (not forward-restricted) can step toward an enemy behind it', () => {
  const state = createInitialState(1);
  state.units = [];
  state.obstacles = [];
  state.units.push({ id: 0, type: 'draughtslord', name: 'Draughts Lord', faction: 'checkers', row: 3, col: 3, hp: 20, maxHp: 20, atk: 4, range: 1, speed: 1, doubleHit: true, veteran: false, alive: true });
  state.units.push({ id: 1, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 6, col: 3, hp: 1000, maxHp: 1000, atk: 0, range: 1, speed: 0, doubleHit: false, veteran: false, alive: true });
  const next = stepBattle(state);
  const mover = next.units.find((u) => u.id === 0);
  assert.equal(mover.row, 4, 'a Draughts Lord should be able to step toward an enemy behind it');
});

test('a Draughtsman reaching the far row becomes a Champion: ranged, double-striking, unrestricted', () => {
  const state = createInitialState(1);
  state.units = [];
  state.obstacles = [];
  state.units.push({ id: 0, type: 'draughtsman', name: 'Draughtsman', faction: 'checkers', row: 1, col: 0, hp: 13, maxHp: 13, atk: 2, range: 1, speed: 1, doubleHit: false, veteran: false, alive: true });
  // Far, non-threatening enemy so the Draughtsman just marches to row 0 this tick.
  state.units.push({ id: 1, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 0, col: 7, hp: 1000, maxHp: 1000, atk: 0, range: 0, speed: 0, doubleHit: false, veteran: false, alive: true });
  const next = stepBattle(state);
  const champion = next.units.find((u) => u.id === 0);
  assert.equal(champion.row, 0);
  assert.equal(champion.veteran, true);
  assert.equal(champion.name, 'Draughts Champion');
  assert.equal(champion.range, 2);
  assert.equal(champion.doubleHit, true);
  assert.equal(champion.maxHp, Math.round(13 * 1.5));
  assert.equal(champion.atk, Math.round(2 * 1.5));
});

// AUTOCHESS-06 balance regression guard: not a precise target, just a wide
// band (~300 battles across varied seeds, both factions should win between
// 35% and 65% of the time) to catch a future stat change that makes one
// side dominate the way the pre-balance-pass stats did (that split was
// roughly 42/53, but an earlier draft landed at 66/32 — well outside this
// band).
test('neither faction dominates: both win between 35% and 65% of simulated battles', () => {
  const results = { chess: 0, checkers: 0, draw: 0 };
  const trials = 300;
  for (let i = 0; i < trials; i++) {
    const r = runBattle(createInitialState(`balance-regression-${i}`));
    results[r.winner]++;
  }
  const chessRate = results.chess / trials;
  const checkersRate = results.checkers / trials;
  assert.ok(chessRate >= 0.35 && chessRate <= 0.65, `chess win rate ${chessRate} out of band`);
  assert.ok(checkersRate >= 0.35 && checkersRate <= 0.65, `checkers win rate ${checkersRate} out of band`);
});

// AUTOCHESS-07: drafting/placement phase.

test('a fresh battle starts in the draft phase, fully formed in classic formation', () => {
  const state = createInitialState(1);
  assert.equal(state.phase, 'draft');
  assert.equal(livingUnits(state, 'chess').length, 16);
  assert.equal(livingUnits(state, 'checkers').length, 12);
});

test('moveDraftUnit swaps two friendly units within their own faction footprint', () => {
  const state = createInitialState(1);
  const a = state.units.find((u) => u.row === 0 && u.col === 0); // bulwark
  const b = state.units.find((u) => u.row === 0 && u.col === 4); // high king
  const next = moveDraftUnit(state, a.id, b.row, b.col);
  const movedA = next.units.find((u) => u.id === a.id);
  const movedB = next.units.find((u) => u.id === b.id);
  assert.deepEqual({ row: movedA.row, col: movedA.col }, { row: 0, col: 4 });
  assert.deepEqual({ row: movedB.row, col: movedB.col }, { row: 0, col: 0 });
  // Nothing else about either unit changes, just position.
  assert.equal(movedA.type, a.type);
  assert.equal(movedB.type, b.type);
});

test('moveDraftUnit refuses to move a unit outside its own faction footprint', () => {
  const state = createInitialState(1);
  const chessUnit = state.units.find((u) => u.faction === 'chess');
  const next = moveDraftUnit(state, chessUnit.id, 5, 1); // a Checkers tile
  assert.deepEqual(next, state, 'an out-of-footprint destination must be a no-op');
});

test('moveDraftUnit refuses to swap with an enemy unit', () => {
  const state = createInitialState(1);
  const chessUnit = state.units.find((u) => u.row === 0 && u.col === 0);
  const checkersUnit = state.units.find((u) => u.faction === 'checkers');
  const next = moveDraftUnit(state, chessUnit.id, checkersUnit.row, checkersUnit.col);
  assert.deepEqual(next, state, 'moving onto an enemy-occupied tile must be a no-op');
});

test('moveDraftUnit is a no-op once the battle has started', () => {
  let state = createInitialState(1);
  state = startBattle(state);
  const a = state.units.find((u) => u.row === 0 && u.col === 0);
  const b = state.units.find((u) => u.row === 0 && u.col === 4);
  const next = moveDraftUnit(state, a.id, b.row, b.col);
  assert.deepEqual(next, state, 'draft moves must be rejected once phase is battle');
});

test('startBattle locks in the draft phase and changes nothing else', () => {
  const state = createInitialState(1);
  const next = startBattle(state);
  assert.equal(next.phase, 'battle');
  assert.deepEqual(next.units, state.units);
  assert.deepEqual(next.obstacles, state.obstacles);
});

test('stepBattle forces phase to battle on its very first call, even if the draft was never touched', () => {
  const state = createInitialState(1);
  assert.equal(state.phase, 'draft');
  const next = stepBattle(state);
  assert.equal(next.phase, 'battle');
});

test('a battle run straight from createInitialState (skipping the draft API entirely) behaves exactly as before', () => {
  const r1 = runBattle(createInitialState('draft-compat-1'));
  assert.ok(['chess', 'checkers', 'draw'].includes(r1.winner));
  assert.equal(r1.phase, 'battle');
});

// AUTOCHESS-08: seeded combat randomness.

function singleAttackerSetup(seed, atk) {
  const state = createInitialState(seed);
  state.units = [];
  state.obstacles = [];
  state.units.push({
    id: 0, type: 'footsoldier', name: 'Footsoldier', faction: 'chess', row: 3, col: 3,
    hp: 8, maxHp: 8, atk, range: 1, speed: 1, doubleHit: false, veteran: false, alive: true,
  });
  // A lone, harmless, high-hp dummy: it never fights back or dies, so the
  // only thing that changes its hp is the attacker's one roll this tick.
  state.units.push({
    id: 1, type: 'footsoldier', name: 'Dummy', faction: 'checkers', row: 3, col: 4,
    hp: 1000, maxHp: 1000, atk: 0, range: 1, speed: 0, doubleHit: false, veteran: false, alive: true,
  });
  return state;
}

test('createInitialState enables combat variance by default, with its own seeded rng stream', () => {
  const state = createInitialState(1);
  assert.equal(state.variance, true);
  assert.equal(typeof state.rngState, 'number');
});

test('createInitialState(seed, { variance: false }) starts with variance disabled', () => {
  const state = createInitialState(1, { variance: false });
  assert.equal(state.variance, false);
});

test('setting variance:false reproduces the exact pre-AUTOCHESS-08 damage math (flat atk, no roll)', () => {
  const state = singleAttackerSetup(1, 4);
  state.variance = false;
  const next = stepBattle(state);
  assert.equal(next.units.find((u) => u.id === 1).hp, 996);
});

test('combat variance keeps rolled damage within its configured ±15% band', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const next = stepBattle(singleAttackerSetup(seed, 4));
    const dealt = 1000 - next.units.find((u) => u.id === 1).hp;
    // atk 4 * [0.85, 1.15] = [3.4, 4.6], which only ever rounds to 3, 4 or 5.
    assert.ok(dealt >= 3 && dealt <= 5, `damage ${dealt} (seed ${seed}) outside the ±15% band around atk 4`);
  }
});

test('combat variance makes an identical formation deal different damage across different seeds', () => {
  const dealt = new Set();
  for (let seed = 1; seed <= 15; seed++) {
    const next = stepBattle(singleAttackerSetup(seed, 10));
    dealt.add(1000 - next.units.find((u) => u.id === 1).hp);
  }
  assert.ok(dealt.size > 1, `expected damage to vary across seeds, got only ${[...dealt]}`);
});

test('combat variance is itself deterministic: the same seed deals identical damage on every replay', () => {
  const dealtFor = (seed) => {
    const next = stepBattle(singleAttackerSetup(seed, 7));
    return 1000 - next.units.find((u) => u.id === 1).hp;
  };
  assert.equal(dealtFor('replay-me'), dealtFor('replay-me'));
});
