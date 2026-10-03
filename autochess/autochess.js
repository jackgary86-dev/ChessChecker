import { createInitialState, stepBattle, runBattle, BOARD_SIZE } from './autochessRules.js';
import { pieceIconSvg } from './chessPieceIcons.js';
import { checkerIconSvg } from './checkersPieceIcons.js';

const CHESS_ICON = {
  footsoldier: 'p', lancer: 'n', cleric: 'b', bulwark: 'r', warqueen: 'q', highking: 'k',
};

const boardEl = document.getElementById('board');
const logPanel = document.getElementById('logPanel');
const winnerBanner = document.getElementById('winnerBanner');
const chessCountEl = document.getElementById('chessCount');
const checkersCountEl = document.getElementById('checkersCount');
const fightBtn = document.getElementById('fightBtn');
const instantBtn = document.getElementById('instantBtn');
const newBattleBtn = document.getElementById('newBattleBtn');
const speedSelect = document.getElementById('speedSelect');

let state = createInitialState();
let timer = null;
let running = false;

function unitIconHtml(unit) {
  return unit.faction === 'chess'
    ? pieceIconSvg(CHESS_ICON[unit.type])
    : checkerIconSvg(unit.type === 'draughtslord');
}

function render() {
  boardEl.innerHTML = '';
  const obstacleSet = new Set(state.obstacles.map((o) => `${o.row},${o.col}`));
  const unitAt = new Map();
  for (const u of state.units) {
    if (u.alive) unitAt.set(`${u.row},${u.col}`, u);
  }

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const sq = document.createElement('div');
      const key = `${row},${col}`;
      sq.className = 'sq ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
      if (obstacleSet.has(key)) sq.classList.add('obstacle');

      const unit = unitAt.get(key);
      if (unit) {
        const wrap = document.createElement('div');
        wrap.className = 'unit-wrap' + (unit.veteran ? ' veteran' : '');
        wrap.title = `${unit.name} #${unit.id} — HP ${unit.hp}/${unit.maxHp}, ATK ${unit.atk}`;

        const icon = document.createElement('div');
        icon.className = 'unit-icon ' + (unit.faction === 'chess' ? 'chess-faction' : 'checkers-faction');
        icon.innerHTML = unitIconHtml(unit);
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
  fightBtn.textContent = running ? 'Pause' : 'Fight!';
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

fightBtn.addEventListener('click', () => {
  if (running) stopLoop();
  else startLoop();
  render();
});

instantBtn.addEventListener('click', () => {
  stopLoop();
  state = runBattle(state);
  render();
});

newBattleBtn.addEventListener('click', () => {
  stopLoop();
  state = createInitialState();
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
