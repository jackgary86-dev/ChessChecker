import { initialState, legalMovesFor, applyMove } from './checkersRules.js';
import { checkerIconSvg } from './checkersPieceIcons.js';
import { loadPlayerNames, savePlayerNames } from './playerNames.js';
import { loadHistory, saveHistory } from './historyStore.js';
import { appendResult } from './historyLogic.js';

const STORE_KEY = 'chesschecker-checkers-v1';

const boardEl = document.getElementById('board');
const turnPill = document.getElementById('turnPill');
const banner = document.getElementById('banner');
const redCapturedEl = document.getElementById('redCaptured');
const blackCapturedEl = document.getElementById('blackCaptured');
const redCapturedLabel = document.getElementById('redCapturedLabel');
const blackCapturedLabel = document.getElementById('blackCapturedLabel');
const p1NameInput = document.getElementById('p1NameInput');
const p2NameInput = document.getElementById('p2NameInput');

// NAMES-01/02: names are editable and persisted (playerNames.js), shared
// across both games. p1 always plays the side that moves first (Red here,
// White in Chess); PLAYER_NAMES maps that onto this game's colors.
let playerNames = loadPlayerNames();
let PLAYER_NAMES = { r: playerNames.p1, b: playerNames.p2 };

let state = initialState();
let history = []; // snapshots taken at the start of each full turn (undo reverts a whole turn)
let captures = { r: [], b: [] };
let selected = null;
let legalForSelected = [];
let resultRecorded = false; // guards against logging the same finished game twice
let turnStartSnapshot = { state, captures: { r: [], b: [] }, resultRecorded };

function saveGame() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ state, captures, resultRecorded }));
  } catch (e) { /* sandboxed storage: ignore */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    state = data.state;
    captures = data.captures || { r: [], b: [] };
    resultRecorded = !!data.resultRecorded;
    return true;
  } catch (e) {
    return false;
  }
}

function recordGameResult(finishedState) {
  const entry = {
    date: new Date().toISOString(),
    game: 'checkers',
    players: { p1: playerNames.p1, p2: playerNames.p2 },
    result: finishedState.winner === 'r' ? 'p1' : 'p2',
  };
  saveHistory(appendResult(loadHistory(), entry));
}

function refreshNameDisplay() {
  PLAYER_NAMES = { r: playerNames.p1, b: playerNames.p2 };
  redCapturedLabel.textContent = PLAYER_NAMES.r;
  blackCapturedLabel.textContent = PLAYER_NAMES.b;
  if (p1NameInput.value !== playerNames.p1) p1NameInput.value = playerNames.p1;
  if (p2NameInput.value !== playerNames.p2) p2NameInput.value = playerNames.p2;
}

function onNameChange() {
  playerNames = { p1: p1NameInput.value, p2: p2NameInput.value };
  savePlayerNames(playerNames);
  playerNames = loadPlayerNames(); // pick up normalization (trims, falls back on empty)
  refreshNameDisplay();
  render();
}

function renderCapturedTray(el, pieces) {
  el.innerHTML = '';
  for (const p of pieces) {
    const icon = document.createElement('span');
    icon.className = 'mini-piece checker ' + (p.color === 'r' ? 'red' : 'black');
    icon.innerHTML = checkerIconSvg(p.king);
    el.appendChild(icon);
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
        disc.className = 'checker ' + (piece.color === 'r' ? 'red' : 'black');
        disc.innerHTML = checkerIconSvg(piece.king);
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

  const turnColorName = state.turn === 'r' ? 'Red' : 'Black';
  turnPill.textContent = `${PLAYER_NAMES[state.turn]} (${turnColorName}) to move` +
    (state.forcedFrom ? ' — must continue jumping' : '');
  turnPill.className = 'turn-pill ' + (state.turn === 'r' ? 'red' : 'black');

  banner.className = 'banner hidden';
  if (state.status === 'over') {
    banner.textContent = PLAYER_NAMES[state.winner] + ' wins';
    banner.className = 'banner over';
  }

  renderCapturedTray(redCapturedEl, captures.r);
  renderCapturedTray(blackCapturedEl, captures.b);
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
    turnStartSnapshot = {
      state,
      captures: { r: [...captures.r], b: [...captures.b] },
      resultRecorded,
    };
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
  if (state.status === 'over' && !resultRecorded) {
    recordGameResult(state);
    resultRecorded = true;
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
  resultRecorded = false;
  turnStartSnapshot = { state, captures: { r: [], b: [] }, resultRecorded };
  saveGame();
  render();
}

function undo() {
  const last = history.pop();
  if (!last) return;
  state = last.state;
  captures = last.captures;
  resultRecorded = last.resultRecorded;
  selected = null;
  legalForSelected = [];
  saveGame();
  render();
}

document.getElementById('newGame').addEventListener('click', newGame);
document.getElementById('undo').addEventListener('click', undo);
p1NameInput.addEventListener('change', onNameChange);
p2NameInput.addEventListener('change', onNameChange);

if (!loadGame()) {
  state = initialState();
}
refreshNameDisplay();
render();
