import {
  createInitialState, stepBattle, runBattle, moveDraftUnit, startBattle, factionTiles, BOARD_SIZE,
} from './autochessRules.js';
import { chessCharacterIcon } from './chessCharacterIcons.js';
import { checkersCharacterIcon } from './checkersCharacterIcons.js';

const boardEl = document.getElementById('board');
const logPanel = document.getElementById('logPanel');
const winnerBanner = document.getElementById('winnerBanner');
const chessCountEl = document.getElementById('chessCount');
const checkersCountEl = document.getElementById('checkersCount');
const fightBtn = document.getElementById('fightBtn');
const instantBtn = document.getElementById('instantBtn');
const newBattleBtn = document.getElementById('newBattleBtn');
const speedSelect = document.getElementById('speedSelect');
const draftHint = document.getElementById('draftHint');

let state = createInitialState();
let timer = null;
let running = false;
let selectedUnitId = null;

function render() {
  boardEl.innerHTML = '';
  const isDraft = state.phase === 'draft';
  boardEl.classList.toggle('draft-mode', isDraft);
  const obstacleSet = new Set(state.obstacles.map((o) => `${o.row},${o.col}`));
  const unitAt = new Map();
  for (const u of state.units) {
    if (u.alive) unitAt.set(`${u.row},${u.col}`, u);
  }
  const selectedUnit = selectedUnitId == null ? null : state.units.find((u) => u.id === selectedUnitId);
  const dropSet = selectedUnit ? new Set(factionTiles(selectedUnit.faction).map((t) => `${t.row},${t.col}`)) : null;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const sq = document.createElement('div');
      const key = `${row},${col}`;
      sq.className = 'sq ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.row = row;
      sq.dataset.col = col;
      if (obstacleSet.has(key)) sq.classList.add('obstacle');
      if (dropSet && dropSet.has(key)) sq.classList.add('draft-droppable');

      const unit = unitAt.get(key);
      if (unit) {
        const isChampion = unit.type === 'draughtsman' && unit.veteran;
        const wrap = document.createElement('div');
        wrap.className = 'unit-wrap' + (unit.veteran ? ' veteran' : '') + (isChampion ? ' champion' : '');
        if (unit.id === selectedUnitId) wrap.classList.add('draft-selected');
        const rangeLabel = unit.range > 1 ? `ranged (${unit.range})` : 'melee';
        wrap.title = `${unit.name} #${unit.id} — HP ${unit.hp}/${unit.maxHp}, ATK ${unit.atk}, ${rangeLabel}`;

        const icon = document.createElement('div');
        icon.className = 'unit-icon ' + (unit.faction === 'chess' ? 'chess-faction' : 'checkers-faction');
        icon.innerHTML = unit.faction === 'chess'
          ? chessCharacterIcon(unit.type)
          : checkersCharacterIcon(unit.type, isChampion);
        wrap.appendChild(icon);

        const track = document.createElement('div');
        track.className = 'hp-bar-track';
        const fill = document.createElement('div');
        const pct = Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100));
        fill.className = 'hp-bar-fill' + (pct < 30 ? ' low' : '');
        fill.style.width = pct + '%';
        track.appendChild(fill);
        wrap.appendChild(track);

        sq.appendChild(wrap);
      }
      boardEl.appendChild(sq);
    }
  }

  const chessAlive = state.units.filter((u) => u.faction === 'chess' && u.alive).length;
  const checkersAlive = state.units.filter((u) => u.faction === 'checkers' && u.alive).length;
  chessCountEl.textContent = `Chess: ${chessAlive}`;
  checkersCountEl.textContent = `Checkers: ${checkersAlive}`;

  logPanel.innerHTML = state.log.slice(-40).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  logPanel.scrollTop = logPanel.scrollHeight;

  draftHint.classList.toggle('hidden', !isDraft);

  if (state.winner) {
    winnerBanner.classList.remove('hidden', 'chess', 'checkers', 'draw');
    winnerBanner.classList.add(state.winner);
    winnerBanner.textContent = state.winner === 'draw' ? 'Draw — both armies fell.'
      : state.winner === 'chess' ? 'Chess wins the battle!' : 'Checkers wins the battle!';
    stopLoop();
    fightBtn.disabled = true;
    instantBtn.disabled = true;
  } else {
    winnerBanner.classList.add('hidden');
    fightBtn.disabled = false;
    instantBtn.disabled = false;
  }
  fightBtn.textContent = isDraft ? 'Start Battle!' : (running ? 'Pause' : 'Fight!');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function tick() {
  state = stepBattle(state);
  render();
}

function startLoop() {
  if (running || state.winner) return;
  running = true;
  timer = setInterval(tick, Number(speedSelect.value));
  render();
}

function stopLoop() {
  running = false;
  if (timer) clearInterval(timer);
  timer = null;
}

boardEl.addEventListener('click', (e) => {
  if (state.phase !== 'draft') return;
  const sq = e.target.closest('.sq');
  if (!sq) return;
  const row = Number(sq.dataset.row);
  const col = Number(sq.dataset.col);
  const unitHere = state.units.find((u) => u.alive && u.row === row && u.col === col);

  if (selectedUnitId == null) {
    if (unitHere) selectedUnitId = unitHere.id;
  } else if (unitHere && unitHere.id === selectedUnitId) {
    selectedUnitId = null;
  } else {
    const next = moveDraftUnit(state, selectedUnitId, row, col);
    if (next !== state) state = next;
    selectedUnitId = null;
  }
  render();
});

fightBtn.addEventListener('click', () => {
  if (state.phase === 'draft') {
    state = startBattle(state);
    selectedUnitId = null;
  }
  if (running) stopLoop();
  else startLoop();
  render();
});

instantBtn.addEventListener('click', () => {
  stopLoop();
  if (state.phase === 'draft') state = startBattle(state);
  selectedUnitId = null;
  state = runBattle(state);
  render();
});

newBattleBtn.addEventListener('click', () => {
  stopLoop();
  state = createInitialState();
  selectedUnitId = null;
  fightBtn.disabled = false;
  instantBtn.disabled = false;
  render();
});

speedSelect.addEventListener('change', () => {
  if (running) {
    stopLoop();
    startLoop();
  }
});

render();
