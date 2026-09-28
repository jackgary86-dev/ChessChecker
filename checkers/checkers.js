import { initialState, legalMovesFor, applyMove } from './checkersRules.js';

const STORE_KEY = 'chesschecker-checkers-v1';
const boardEl = document.getElementById('board');
const turnPill = document.getElementById('turnPill');
const banner = document.getElementById('banner');
const redCapturedEl = document.getElementById('redCaptured');
const blackCapturedEl = document.getElementById('blackCaptured');

let state = initialState();
let history = []; // snapshots taken at the start of each full turn (undo reverts a whole turn)
let captures = { r: [], b: [] };
let selected = null;
let legalForSelected = [];
let turnStartSnapshot = { state, captures: { r: [], b: [] } };

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
    captures = data.captures || { r: [], b: [] };
    return true;
  } catch (e) {
    return false;
  }
}

function render() {
  boardEl.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = document.createElement('div');
      sq.className = 'sq ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.row = row;
      sq.dataset.col = col;
      const piece = state.board[row][col];
      if (piece) {
        const disc = document.createElement('span');
        disc.className = 'checker ' + (piece.color === 'r' ? 'red' : 'black') + (piece.king ? ' king' : '');
        sq.appendChild(disc);
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

  turnPill.textContent = (state.turn === 'r' ? 'Red' : 'Black') + ' to move' +
    (state.forcedFrom ? ' — must continue jumping' : '');
  turnPill.className = 'turn-pill ' + (state.turn === 'r' ? 'red' : 'black');

  banner.className = 'banner hidden';
  if (state.status === 'over') {
    banner.textContent = (state.winner === 'r' ? 'Red' : 'Black') + ' wins';
    banner.className = 'banner over';
  }

  redCapturedEl.textContent = captures.r.length ? String(captures.r.length) + ' piece(s)' : '';
  blackCapturedEl.textContent = captures.b.length ? String(captures.b.length) + ' piece(s)' : '';
}

function onSquareClick(row, col) {
  if (state.status === 'over') return;
  const move = legalForSelected.find((m) => m.to.row === row && m.to.col === col);
  if (move) {
    performMove(move);
    return;
  }
  const piece = state.board[row][col];
  if (state.forcedFrom) {
    // mid multi-jump: only the forced piece may be (re)selected
    if (state.forcedFrom.row === row && state.forcedFrom.col === col) {
      selected = { row, col };
      legalForSelected = legalMovesFor(state, row, col);
    }
    render();
    return;
  }
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
  if (!state.forcedFrom) {
    // starting a fresh turn: remember where undo should return to
    turnStartSnapshot = { state, captures: { r: [...captures.r], b: [...captures.b] } };
  }
  const { state: next, captured, continued } = applyMove(state, move);
  if (captured) captures[captured.color].push(captured);
  state = next;
  if (continued) {
    selected = { row: move.to.row, col: move.to.col };
    legalForSelected = legalMovesFor(state, move.to.row, move.to.col);
  } else {
    selected = null;
    legalForSelected = [];
    history.push(turnStartSnapshot);
  }
  saveGame();
  render();
}

function newGame() {
  state = initialState();
  history = [];
  captures = { r: [], b: [] };
  selected = null;
  legalForSelected = [];
  turnStartSnapshot = { state, captures: { r: [], b: [] } };
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
