// Pure autochess battle engine. No DOM. One 8x8 board, two fixed factions in
// their classic starting rows, 4 random impassable obstacles in the neutral
// middle ground, then a fully automatic, deterministic (given a seed) battle.
//
// Design:
// - Chess = offense, individuals: higher ATK and mobility, no team bonuses,
//   each unit always just goes for the nearest enemy on its own. A mix of
//   melee (Footsoldier, Bulwark, High King) and ranged (Lancer, Cleric,
//   Warqueen) — ranged-heavy overall, hitting from further out.
// - Checkers = defense, hive mind, melee only: lower raw stats, but
//   several linked mechanics make the group itself dangerous —
//     - Hive shield: 1 damage reduced per adjacent living Checkers ally
//       (minimum 1 damage always gets through).
//     - Hive counter: a Checkers unit struck while part of a chain of 3+
//       linked living Checkers allies immediately strikes back.
//     - Group movement: when several forward steps are equally valid, a
//       Checkers unit prefers the one that keeps it closest to its nearest
//       living ally, so they move and cluster together.
//     - Cornering: a Checkers unit's target isn't just the nearest enemy —
//       an enemy with fewer free adjacent tiles (more already surrounded)
//       is preferred, so the group converges on and traps targets.
//     - Forward-only movement: a base Draughtsman can only move with a
//       forward row-component, same as a real (un-kinged) checkers man;
//       Draughts Lords and promoted Draughtsmen move in any direction.
// - Chess loses the instant its High King dies (echoes checkmate); Checkers
//   loses when every unit is dead (echoes "no pieces left"). Asymmetric on
//   purpose.
// - A Footsoldier that reaches the enemy's home row promotes to a stronger
//   Veteran (echoes pawn promotion: same role, just stronger). A
//   Draughtsman that reaches the enemy's home row promotes to a Draughts
//   Champion: free movement, ranged, and a bonus strike — the hive's
//   purely defensive melee unit becomes a lone offensive threat, the way
//   a checkers man becomes a king.
// - Draft phase: createInitialState places both armies in their classic
//   formation, same as always, but the returned state starts in
//   phase:'draft'. Before the fight, moveDraftUnit can swap any two
//   friendly units within that army's own starting tiles (so the roster
//   and footprint never change, just who stands where). stepBattle flips
//   phase to 'battle' on its first call regardless of whether the draft
//   was touched, so every existing caller that skips straight to
//   stepBattle/runBattle — tests included — behaves exactly as before.

export const BOARD_SIZE = 8;
const HIVE_SHIELD_PER_ALLY = 1;
const HIVE_COUNTER_GROUP_SIZE = 3;
const PROMOTE_MULT = 1.5;
const CHAMPION_RANGE = 2;
const OBSTACLE_COUNT = 4;
const DEFAULT_MAX_TICKS = 300;

export const UNIT_DEFS = {
  footsoldier: { faction: 'chess', hp: 10, atk: 4, range: 1, speed: 1, name: 'Footsoldier' },
  lancer: { faction: 'chess', hp: 11, atk: 5, range: 2, speed: 2, name: 'Lancer' },
  cleric: { faction: 'chess', hp: 9, atk: 5, range: 3, speed: 1, name: 'Cleric' },
  bulwark: { faction: 'chess', hp: 16, atk: 4, range: 1, speed: 1, name: 'Bulwark' },
  warqueen: { faction: 'chess', hp: 15, atk: 7, range: 2, speed: 2, name: 'Warqueen' },
  highking: { faction: 'chess', hp: 14, atk: 5, range: 1, speed: 1, name: 'High King' },
  draughtsman: { faction: 'checkers', hp: 11, atk: 2, range: 1, speed: 1, name: 'Draughtsman' },
  draughtslord: {
    faction: 'checkers', hp: 20, atk: 4, range: 1, speed: 1, name: 'Draughts Lord', doubleHit: true,
  },
};

const PROMOTABLE = { footsoldier: true, draughtsman: true };
const CHESS_BACK_ROW = ['bulwark', 'lancer', 'cleric', 'warqueen', 'highking', 'cleric', 'lancer', 'bulwark'];

function mulberry32(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromInput(seed) {
  if (typeof seed === 'number') return seed >>> 0;
  if (typeof seed === 'string') {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
    return h >>> 0;
  }
  return (Math.random() * 0xffffffff) >>> 0;
}

function chebyshev(a, b) {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

// The fixed set of tiles each faction's classic formation occupies — always
// fully occupied, 16 for Chess and 12 for Checkers. Used both to place the
// opening formation and, during the draft phase, to validate a rearrangement
// stays within that faction's own footprint.
function chessTiles() {
  const tiles = [];
  for (let col = 0; col < BOARD_SIZE; col++) tiles.push({ row: 0, col });
  for (let col = 0; col < BOARD_SIZE; col++) tiles.push({ row: 1, col });
  return tiles;
}

function checkersTiles() {
  const tiles = [];
  for (let row = 5; row <= 7; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 !== 1) continue; // dark squares only, standard draughts setup
      tiles.push({ row, col });
    }
  }
  return tiles;
}

// Exported so the UI can highlight a selected unit's valid drop tiles
// without duplicating the tile-set logic.
export function factionTiles(faction) {
  return faction === 'chess' ? chessTiles() : checkersTiles();
}

export function createInitialState(seed) {
  const rng = mulberry32(seedFromInput(seed));
  const units = [];
  let nextId = 0;
  const makeUnit = (type, row, col) => {
    const def = UNIT_DEFS[type];
    return {
      id: nextId++,
      type,
      name: def.name,
      faction: def.faction,
      row,
      col,
      hp: def.hp,
      maxHp: def.hp,
      atk: def.atk,
      range: def.range,
      speed: def.speed,
      doubleHit: !!def.doubleHit,
      veteran: false,
      alive: true,
    };
  };

  CHESS_BACK_ROW.forEach((type, col) => units.push(makeUnit(type, 0, col)));
  for (let col = 0; col < BOARD_SIZE; col++) units.push(makeUnit('footsoldier', 1, col));

  for (const { row, col } of checkersTiles()) {
    const isLord = row === 7 && (col === 2 || col === 4);
    units.push(makeUnit(isLord ? 'draughtslord' : 'draughtsman', row, col));
  }

  // Obstacles only ever land in the neutral middle (rows 2-4), so they can
  // never overlap a starting unit.
  const candidates = [];
  for (let row = 2; row <= 4; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) candidates.push({ row, col });
  }
  const obstacles = [];
  const pool = [...candidates];
  for (let i = 0; i < OBSTACLE_COUNT && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    obstacles.push(pool.splice(idx, 1)[0]);
  }

  const chessCount = units.filter((u) => u.faction === 'chess').length;
  const checkersCount = units.length - chessCount;
  return {
    phase: 'draft',
    tick: 0,
    winner: null,
    log: [`Battle begins: ${chessCount} Chess vs ${checkersCount} Checkers.`],
    obstacles,
    units,
  };
}

function cloneState(state) {
  return {
    phase: state.phase,
    tick: state.tick,
    winner: state.winner,
    log: state.log,
    obstacles: state.obstacles.map((o) => ({ ...o })),
    units: state.units.map((u) => ({ ...u })),
  };
}

// Draft phase: before the fight, either side's units can be rearranged
// within their own faction's classic footprint (chessTiles()/checkersTiles())
// — never into the neutral middle or the enemy's rows. Since that footprint
// is always fully occupied, "moving" a unit onto an ally's tile swaps them;
// moving onto an unoccupied tile of its own faction (impossible today, but
// kept general) just relocates it. A no-op (same faction's state back
// unchanged) covers every invalid request: wrong phase, unknown unit, enemy
// unit on the destination, or a destination outside that unit's own tiles.
export function moveDraftUnit(state, unitId, toRow, toCol) {
  if (state.phase !== 'draft') return state;
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return state;
  const onOwnTiles = factionTiles(unit.faction).some((t) => t.row === toRow && t.col === toCol);
  if (!onOwnTiles) return state;
  if (unit.row === toRow && unit.col === toCol) return state;
  const occupant = state.units.find((u) => u.row === toRow && u.col === toCol);
  if (occupant && occupant.faction !== unit.faction) return state;

  const next = cloneState(state);
  const movingUnit = next.units.find((u) => u.id === unitId);
  const occupyingUnit = occupant ? next.units.find((u) => u.id === occupant.id) : null;
  const fromRow = movingUnit.row;
  const fromCol = movingUnit.col;
  movingUnit.row = toRow;
  movingUnit.col = toCol;
  if (occupyingUnit) {
    occupyingUnit.row = fromRow;
    occupyingUnit.col = fromCol;
  }
  return next;
}

// Locks in the draft and signals the fight starts now. stepBattle already
// forces phase to 'battle' on its first call, so this just gives the UI an
// explicit, immediate transition to show before the first tick runs.
export function startBattle(state) {
  if (state.phase !== 'draft') return state;
  return { ...cloneState(state), phase: 'battle' };
}

function isObstacle(state, row, col) {
  return state.obstacles.some((o) => o.row === row && o.col === col);
}

function isOccupied(state, row, col, excludeId) {
  return state.units.some((u) => u.alive && u.id !== excludeId && u.row === row && u.col === col);
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function freeAdjacentTiles(state, unit) {
  let free = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = unit.row + dr;
      const c = unit.col + dc;
      if (!inBounds(r, c)) continue; // off-board isn't a free escape tile
      if (isObstacle(state, r, c)) continue;
      if (isOccupied(state, r, c, unit.id)) continue;
      free++;
    }
  }
  return free;
}

// Chess (individualist): always the plain nearest living enemy.
function findNearestEnemy(state, unit) {
  let best = null;
  let bestDist = Infinity;
  for (const u of state.units) {
    if (!u.alive || u.faction === unit.faction) continue;
    const d = chebyshev(unit, u);
    if (d < bestDist || (d === bestDist && (best === null || u.id < best.id))) {
      best = u;
      bestDist = d;
    }
  }
  return best;
}

// Checkers (hive): prefers a target that is both close AND already more
// cornered (fewer free adjacent tiles), so the group converges on and
// traps the same enemy instead of each unit picking its own.
function findCorneredEnemy(state, unit) {
  let best = null;
  let bestScore = Infinity;
  for (const u of state.units) {
    if (!u.alive || u.faction === unit.faction) continue;
    const dist = chebyshev(unit, u);
    const free = freeAdjacentTiles(state, u);
    const score = dist + free; // lower = closer and/or more surrounded
    if (score < bestScore || (score === bestScore && (best === null || u.id < best.id))) {
      best = u;
      bestScore = score;
    }
  }
  return best;
}

function findTarget(state, unit) {
  return unit.faction === 'checkers' ? findCorneredEnemy(state, unit) : findNearestEnemy(state, unit);
}

function livingAdjacentAllies(state, unit) {
  let count = 0;
  for (const u of state.units) {
    if (u.id === unit.id || !u.alive || u.faction !== unit.faction) continue;
    if (chebyshev(u, unit) === 1) count++;
  }
  return count;
}

// Size of the chain-linked group of living same-faction units unit belongs
// to (itself included): A-B adjacent and B-C adjacent counts A, B and C as
// one linked group of 3, even though A and C aren't themselves adjacent.
function linkedGroupSize(state, unit) {
  const visited = new Set([unit.id]);
  const queue = [unit];
  while (queue.length) {
    const cur = queue.pop();
    for (const u of state.units) {
      if (!u.alive || u.faction !== unit.faction || visited.has(u.id)) continue;
      if (chebyshev(u, cur) === 1) {
        visited.add(u.id);
        queue.push(u);
      }
    }
  }
  return visited.size;
}

function nearestAllyDistance(state, unit) {
  let best = Infinity;
  for (const u of state.units) {
    if (u.id === unit.id || !u.alive || u.faction !== unit.faction) continue;
    const d = chebyshev(unit, u);
    if (d < best) best = d;
  }
  return best;
}

function applyDamage(state, target, rawAmount, log) {
  let amount = rawAmount;
  if (target.faction === 'checkers') {
    const allies = livingAdjacentAllies(state, target);
    amount = Math.max(1, rawAmount - allies * HIVE_SHIELD_PER_ALLY);
  }
  target.hp -= amount;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    log.push(`${target.name} #${target.id} falls.`);
  }
  return amount;
}

function attack(state, attacker, target, log) {
  const dealt = applyDamage(state, target, attacker.atk, log);
  log.push(`${attacker.name} #${attacker.id} hits ${target.name} #${target.id} for ${dealt}.`);
  if (attacker.doubleHit && target.alive) {
    const dealt2 = applyDamage(state, target, attacker.atk, log);
    log.push(`${attacker.name} #${attacker.id} strikes again for ${dealt2}.`);
  }
  // Hive counter: a Checkers unit struck while linked to 2+ other living
  // Checkers allies (a chain of 3 or more) strikes straight back.
  if (target.faction === 'checkers' && target.alive && attacker.alive) {
    const groupSize = linkedGroupSize(state, target);
    if (groupSize >= HIVE_COUNTER_GROUP_SIZE) {
      const counterDealt = applyDamage(state, attacker, target.atk, log);
      log.push(
        `${target.name} #${target.id}'s hive (${groupSize} linked) counter-attacks `
        + `${attacker.name} #${attacker.id} for ${counterDealt}!`,
      );
    }
  }
}

// A base Draughtsman moves like a real (un-kinged) checkers man: forward
// only, toward the enemy home row. Draughts Lords and promoted Draughtsmen
// (now Champions) move freely, like a kinged piece.
function isForwardOnly(unit) {
  return unit.type === 'draughtsman' && !unit.veteran;
}

function forwardRowSign(unit) {
  return unit.faction === 'chess' ? 1 : -1;
}

function stepToward(state, unit, target) {
  const dr = Math.sign(target.row - unit.row);
  const dc = Math.sign(target.col - unit.col);
  let tries = [];
  if (dr !== 0 && dc !== 0) tries.push([dr, dc]);
  if (dr !== 0) tries.push([dr, 0]);
  if (dc !== 0) tries.push([0, dc]);

  if (isForwardOnly(unit)) {
    const fwd = forwardRowSign(unit);
    tries = tries.filter(([stepR]) => stepR === fwd);
  }

  const valid = tries
    .map(([stepR, stepC]) => ({ row: unit.row + stepR, col: unit.col + stepC }))
    .filter(({ row, col }) => inBounds(row, col) && !isObstacle(state, row, col) && !isOccupied(state, row, col, unit.id));

  if (valid.length === 0) return null;
  if (valid.length === 1 || unit.faction !== 'checkers') return valid[0];

  // Checkers group movement: among equally-reachable steps, prefer the one
  // that stays closest to the nearest living Checkers ally, so the hive
  // moves and clusters together rather than scattering.
  let best = valid[0];
  let bestAllyDist = Infinity;
  for (const candidate of valid) {
    const probe = { ...unit, row: candidate.row, col: candidate.col };
    const d = nearestAllyDistance(state, probe);
    if (d < bestAllyDist) {
      bestAllyDist = d;
      best = candidate;
    }
  }
  return best;
}

function moveUnit(state, unit, target, log) {
  let moved = 0;
  for (let i = 0; i < unit.speed; i++) {
    if (chebyshev(unit, target) <= unit.range) break;
    const step = stepToward(state, unit, target);
    if (!step) break;
    unit.row = step.row;
    unit.col = step.col;
    moved++;
  }
  if (moved > 0) log.push(`${unit.name} #${unit.id} advances.`);
}

function checkPromotion(unit, log) {
  if (!PROMOTABLE[unit.type] || unit.veteran) return;
  const promotionRow = unit.faction === 'chess' ? BOARD_SIZE - 1 : 0;
  if (unit.row !== promotionRow) return;
  unit.veteran = true;
  unit.maxHp = Math.round(unit.maxHp * PROMOTE_MULT);
  unit.hp = Math.min(unit.maxHp, Math.round(unit.hp * PROMOTE_MULT));
  unit.atk = Math.round(unit.atk * PROMOTE_MULT);
  if (unit.type === 'draughtsman') {
    // The hive's purely defensive melee unit breaks away and becomes a
    // lone offensive threat: ranged, double-striking, free to move any
    // direction — a checkers man crowned into a king.
    unit.range = CHAMPION_RANGE;
    unit.doubleHit = true;
    unit.name = 'Draughts Champion';
    log.push(`${unit.name} #${unit.id} breaks from the hive and is crowned a Champion!`);
  } else {
    log.push(`${unit.name} #${unit.id} is promoted to Veteran!`);
  }
}

function unitAct(state, unit, log) {
  if (!unit.alive) return;
  const enemy = findTarget(state, unit);
  if (!enemy) return;
  if (chebyshev(unit, enemy) <= unit.range) {
    attack(state, unit, enemy, log);
  } else {
    moveUnit(state, unit, enemy, log);
    if (enemy.alive && chebyshev(unit, enemy) <= unit.range) {
      attack(state, unit, enemy, log);
    }
  }
  checkPromotion(unit, log);
}

function computeWinner(state) {
  const king = state.units.find((u) => u.type === 'highking');
  const chessAlive = state.units.some((u) => u.faction === 'chess' && u.alive);
  const checkersAlive = state.units.some((u) => u.faction === 'checkers' && u.alive);
  if (!king || !king.alive) return checkersAlive ? 'checkers' : 'draw';
  if (!chessAlive && !checkersAlive) return 'draw';
  if (!chessAlive) return 'checkers';
  if (!checkersAlive) return 'chess';
  return null;
}

// Advances the battle by one tick: every living unit acts once. Which
// faction acts first alternates by tick, so neither side keeps a permanent
// first-strike edge.
export function stepBattle(state) {
  if (state.winner) return state;
  const next = cloneState(state);
  next.phase = 'battle';
  const log = [];
  const chessUnits = next.units.filter((u) => u.faction === 'chess');
  const checkersUnits = next.units.filter((u) => u.faction === 'checkers');
  const order = next.tick % 2 === 0 ? [...chessUnits, ...checkersUnits] : [...checkersUnits, ...chessUnits];
  for (const unit of order) unitAct(next, unit, log);
  next.tick += 1;
  next.log = log.length ? [...next.log, ...log] : next.log;
  next.winner = computeWinner(next);
  return next;
}

export function runBattle(initialState, maxTicks = DEFAULT_MAX_TICKS) {
  let state = initialState;
  while (!state.winner && state.tick < maxTicks) state = stepBattle(state);
  if (!state.winner) {
    state = { ...state, winner: 'draw', log: [...state.log, 'Battle timed out at the tick cap: a draw.'] };
  }
  return state;
}

export function livingUnits(state, faction) {
  return state.units.filter((u) => u.alive && (!faction || u.faction === faction));
}
