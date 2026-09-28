import {
  initialState, legalMovesFor, applyMove, squareName,
} from './chessRules.js';
import { pieceIconSvg } from './chessPieceIcons.js';
import { loadPlayerNames, savePlayerNames } from './playerNames.js';
import { loadHistory, saveHistory } from './historyStore.js';
import { appendResult } from './historyLogic.js';

const STORE_KEY = 'chesschecker-chess-v1';

const boardEl = document.getElementById('board');
const turnPill = document.getElementById('turnPill');
const banner = document.getElementById('banner');
const whiteCapturedEl = document.getElementById('whiteCaptured');
const blackCapturedEl = document.getElementById('blackCaptured');
const whiteCapturedLabel = document.getElementById('whiteCapturedLabel');
const blackCapturedLabel = document.getElementById('blackCapturedLabel');
const promoOverlay = document.getElementById('promoOverlay');
const promoBox = document.getElementById('promoBox');
const p1NameInput = document.getElementById('p1NameInput');
const p2NameInput = document.getElementById('p2NameInput');

// NAMES-01/02: names are editable and persisted (playerNames.js), shared
// across both games. p1 always plays the side that moves first (White
// here, Red in Checkers); PLAYER_NAMES maps that onto this game's colors.
let playerNames = loadPlayerNames();
let PLAYER_NAMES = { w: playerNames.p1, b: playerNames.p2 };

let state = initialState();
let history = []; // { state, captures, resultRecorded } snapshots for undo
let captures = { w: [], b: [] }; // pieces captured, keyed by the color that lost them
let selected = null; // { row, col }
let legalForSelected = [];
let resultRecorded = false; // guards against logging the same finished game twice

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
    captures = data.captures || { w: [], b: [] };
    resultRecorded = !!data.resultRecorded;
    return true;
  } catch (e) {
    return false;
  }
}

function recordGameResult(finishedState) {
  const entry = {
    date: new Date().toISOString(),
    game: 'chess',
    players: { p1: playerNames.p1, p2: playerNames.p2 },
    result: finishedState.status === 'stalemate' ? 'draw' : (finishedState.winner === 'w' ? 'p1' : 'p2'),
  };
  saveHistory(appendResult(loadHistory(), entry));
}

function refreshNameDisplay() {
  PLAYER_NAMES = { w: playerNames.p1, b: playerNames.p2 };
  whiteCapturedLabel.textContent = PLAYER_NAMES.w;
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
    icon.className = 'mini-piece ' + (p.color === 'w' ? 'white' : 'black');
    icon.innerHTML = pieceIconSvg(p.type);
    el.appendChild(icon);
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
        span.innerHTML = pieceIconSvg(piece.type);
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

  const turnColorName = state.turn === 'w' ? 'White' : 'Black';
  turnPill.textContent = `${PLAYER_NAMES[state.turn]} (${turnColorName}) to move`;
  turnPill.className = 'turn-pill ' + (state.turn === 'w' ? 'white' : 'black');

  banner.className = 'banner hidden';
  if (state.status === 'check') {
    banner.textContent = 'Check';
    banner.className = 'banner check';
  } else if (state.status === 'checkmate') {
    banner.textContent = 'Checkmate: ' + PLAYER_NAMES[state.winner] + ' wins';
    banner.className = 'banner over';
  } else if (state.status === 'stalemate') {
    banner.textContent = 'Draw (stalemate)';
    banner.className = 'banner over';
  }

  renderCapturedTray(whiteCapturedEl, captures.w);
  renderCapturedTray(blackCapturedEl, captures.b);
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
    history.push({
      state,
      captures: { w: [...captures.w], b: [...captures.b] },
      resultRecorded,
    });
    const { state: next, captured } = applyMove(state, chosenMove);
    if (captured) captures[captured.color].push(captured);
    state = next;
    selected = null;
    legalForSelected = [];
    if ((state.status === 'checkmate' || state.status === 'stalemate') && !resultRecorded) {
      recordGameResult(state);
      resultRecorded = true;
    }
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
    btn.className = 'promo-piece ' + (color === 'w' ? 'white' : 'black');
    btn.innerHTML = pieceIconSvg(type);
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
  resultRecorded = false;
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
