import {
  initialState, legalMovesFor, applyMove, squareName,
} from './chessRules.js';

const GLYPH = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};
const STORE_KEY = 'chesschecker-chess-v1';

const boardEl = document.getElementById('board');
const turnPill = document.getElementById('turnPill');
const banner = document.getElementById('banner');
const whiteCapturedEl = document.getElementById('whiteCaptured');
const blackCapturedEl = document.getElementById('blackCaptured');
const promoOverlay = document.getElementById('promoOverlay');
const promoBox = document.getElementById('promoBox');

let state = initialState();
let history = []; // { state, captured, capturedBy } snapshots for undo
let captures = { w: [], b: [] }; // pieces captured, keyed by the color that lost them
let selected = null; // { row, col }
let legalForSelected = [];

function saveGame() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ state, captures }));
  } catch (e) { /* sandboxed storage: ignore */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    state = data.state;
    captures = data.captures || { w: [], b: [] };
    return true;
  } catch (e) {
    return false;
  }
}

function render() {
  boardEl.innerHTML = '';
  const inCheckColor = state.status === 'check' || state.status === 'checkmate' ? state.turn : null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = document.createElement('div');
      sq.className = 'sq ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.row = row;
      sq.dataset.col = col;
      const piece = state.board[row][col];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece ' + (piece.color === 'w' ? 'white' : 'black');
        span.textContent = GLYPH[piece.color][piece.type];
        sq.appendChild(span);
        if (piece.type === 'k' && piece.color === inCheckColor) sq.classList.add('check-sq');
      }
      if (selected && selected.row === row && selected.col === col) sq.classList.add('selected');
      const move = legalForSelected.find((m) => m.to.row === row && m.to.col === col);
      if (move) {
        const dot = document.createElement('div');
        dot.className = 'dot' + (move.capture ? ' capture' : '');
        sq.appendChild(dot);
      }
      sq.addEventListener('click', () => onSquareClick(row, col));
      boardEl.appendChild(sq);
    }
  }

  turnPill.textContent = (state.turn === 'w' ? 'White' : 'Black') + ' to move';
  turnPill.className = 'turn-pill ' + (state.turn === 'w' ? 'white' : 'black');

  banner.className = 'banner hidden';
  if (state.status === 'check') {
    banner.textContent = 'Check';
    banner.className = 'banner check';
  } else if (state.status === 'checkmate') {
    banner.textContent = 'Checkmate: ' + (state.winner === 'w' ? 'White' : 'Black') + ' wins';
    banner.className = 'banner over';
  } else if (state.status === 'stalemate') {
    banner.textContent = 'Draw (stalemate)';
    banner.className = 'banner over';
  }

  whiteCapturedEl.textContent = captures.w.map((p) => GLYPH.b[p.type]).join(' ');
  blackCapturedEl.textContent = captures.b.map((p) => GLYPH.w[p.type]).join(' ');
}

function onSquareClick(row, col) {
  if (state.status === 'checkmate' || state.status === 'stalemate') return;
  const move = legalForSelected.find((m) => m.to.row === row && m.to.col === col);
  if (move) {
    performMove(move);
    return;
  }
  const piece = state.board[row][col];
  if (piece && piece.color === state.turn) {
    selected = { row, col };
    legalForSelected = legalMovesFor(state, row, col);
  } else {
    selected = null;
    legalForSelected = [];
  }
  render();
}

function performMove(move) {
  const finish = (chosenMove) => {
    history.push({ state, captures: { w: [...captures.w], b: [...captures.b] } });
    const { state: next, captured } = applyMove(state, chosenMove);
    if (captured) captures[captured.color].push(captured);
    state = next;
    selected = null;
    legalForSelected = [];
    saveGame();
    render();
  };

  if (move.promotion) {
    const options = legalForSelected.filter((m) => m.to.row === move.to.row && m.to.col === move.to.col);
    showPromotionPicker(state.turn, (piece) => {
      finish(options.find((m) => m.promotion === piece) || options[0]);
    });
    return;
  }
  finish(move);
}

function showPromotionPicker(color, onPick) {
  promoBox.innerHTML = '';
  for (const type of ['q', 'r', 'b', 'n']) {
    const btn = document.createElement('button');
    btn.textContent = GLYPH[color][type];
    btn.addEventListener('click', () => {
      promoOverlay.classList.add('hidden');
      onPick(type);
    });
    promoBox.appendChild(btn);
  }
  promoOverlay.classList.remove('hidden');
}

function newGame() {
  state = initialState();
  history = [];
  captures = { w: [], b: [] };
  selected = null;
  legalForSelected = [];
  saveGame();
  render();
}

function undo() {
  const last = history.pop();
  if (!last) return;
  state = last.state;
  captures = last.captures;
  selected = null;
  legalForSelected = [];
  saveGame();
  render();
}

document.getElementById('newGame').addEventListener('click', newGame);
document.getElementById('undo').addEventListener('click', undo);

if (!loadGame()) {
  state = initialState();
}
render();
