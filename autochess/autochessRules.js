// Pure autochess battle engine. No DOM. One 8x8 board, two fixed factions in
// their classic starting rows, 4 random impassable obstacles in the neutral
// middle ground, then a fully automatic, deterministic (given a seed) battle.
//
// Design:
// - Chess = offense, individuals: higher ATK and mobility, no team bonuses,
//   each unit always just goes for the nearest enemy on its own.
// - Checkers = defense, hive mind: lower raw stats, but every living
//   Checkers unit reduces damage it takes by 1 per adjacent living Checkers
//   ally (minimum 1 damage always gets through) — defense through numbers
//   and closeness, not individual toughness.
// - Chess loses the instant its High King dies (echoes checkmate); Checkers
//   loses when every unit is dead (echoes "no pieces left"). Asymmetric on
//   purpose.
// - A Footsoldier/Draughtsman that reaches the enemy's home row promotes to
//   a stronger "Veteran" once (echoes pawn promotion / checkers kinging).

export const BOARD_SIZE = 8;
const HIVE_SHIELD_PER_ALLY = 1;
const PROMOTE_MULT = 1.5;
const OBSTACLE_COUNT = 4;
const DEFAULT_MAX_TICKS = 300;

export const UNIT_DEFS = {
  footsoldier: { faction: 'chess', hp: 8, atk: 4, range: 1, speed: 1, name: 'Footsoldier' },
  lancer: { faction: 'chess', hp: 12, atk: 6, range: 1, speed: 2, name: 'Lancer' },
  cleric: { faction: 'chess', hp: 10, atk: 5, range: 2, speed: 1, name: 'Cleric' },
  bulwark: { faction: 'chess', hp: 16, atk: 4, range: 1, speed: 1, name: 'Bulwark' },
  warqueen: { faction: 'chess', hp: 16, atk: 8, range: 2, speed: 2, name: 'Warqueen' },
  highking: { faction: 'chess', hp: 14, atk: 5, range: 1, speed: 1, name: 'High King' },
  draughtsman: { faction: 'checkers', hp: 13, atk: 2, range: 1, speed: 1, name: 'Draughtsman' },
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
      veteran: false,
      alive: true,
    };
  };

  CHESS_BACK_ROW.forEach((type, col) => units.push(makeUnit(type, 0, col)));
  for (let col = 0; col < BOARD_SIZE; col++) units.push(makeUnit('footsoldier', 1, col));

  for (let row = 5; row <= 7; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 !== 1) continue; // dark squares only, standard draughts setup
      const isLord = row === 7 && (col === 2 || col === 4);
      units.push(makeUnit(isLord ? 'draughtslord' : 'draughtsman', row, col));
    }
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
    tick: 0,
    winner: null,
    log: [`Battle begins: ${chessCount} Chess vs ${checkersCount} Checkers.`],
    obstacles,
    units,
  };
}

function cloneState(state) {
  return {
    tick: state.tick,
    winner: state.winner,
    log: state.log,
    obstacles: state.obstacles.map((o) => ({ ...o })),
    units: state.units.map((u) => ({ ...u })),
  };
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

function livingAdjacentAllies(state, unit) {
  let count = 0;
  for (const u of state.units) {
    if (u.id === unit.id || !u.alive || u.faction !== unit.faction) continue;
    if (chebyshev(u, unit) === 1) count++;
  }
  return count;
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
  if (UNIT_DEFS[attacker.type].doubleHit && target.alive) {
    const dealt2 = applyDamage(state, target, attacker.atk, log);
    log.push(`${attacker.name} #${attacker.id} strikes again for ${dealt2}.`);
  }
}

function stepToward(state, unit, target) {
  const dr = Math.sign(target.row - unit.row);
  const dc = Math.sign(target.col - unit.col);
  const tries = [];
  if (dr !== 0 && dc !== 0) tries.push([dr, dc]);
  if (dr !== 0) tries.push([dr, 0]);
  if (dc !== 0) tries.push([0, dc]);
  for (const [stepR, stepC] of tries) {
    const nr = unit.row + stepR;
    const nc = unit.col + stepC;
    if (inBounds(nr, nc) && !isObstacle(state, nr, nc) && !isOccupied(state, nr, nc, unit.id)) {
      return { row: nr, col: nc };
    }
  }
  return null;
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
  log.push(`${unit.name} #${unit.id} is promoted to Veteran!`);
}

function unitAct(state, unit, log) {
  if (!unit.alive) return;
  const enemy = findNearestEnemy(state, unit);
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
