// Pure checkers rules engine. No DOM. 8x8 board, dark squares only (row+col odd).
// Piece: { color: 'r'|'b', king: boolean }. Red starts at the top (rows 0-2), Black at
// the bottom (rows 5-7) [row 0 = top of the board as drawn].

export function isDark(row, col) {
  return (row + col) % 2 === 1;
}

export function initialState() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!isDark(row, col)) continue;
      if (row < 3) board[row][col] = { color: 'r', king: false };
      else if (row > 4) board[row][col] = { color: 'b', king: false };
    }
  }
  return { board, turn: 'r', status: 'active', winner: null, forcedFrom: null };
}

export function cloneState(state) {
  return {
    board: state.board.map((row) => row.map((p) => (p ? { ...p } : null))),
    turn: state.turn,
    status: state.status,
    winner: state.winner,
    forcedFrom: state.forcedFrom ? { ...state.forcedFrom } : null,
  };
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function forwardDirs(piece) {
  if (piece.king) return [-1, 1];
  return piece.color === 'r' ? [1] : [-1]; // red moves down the board, black moves up
}

// Jumps available for the single piece at (row,col). Each jump: { from, to, over, capture:true }
function jumpsFor(state, row, col) {
  const piece = state.board[row][col];
  if (!piece) return [];
  const other = piece.color === 'r' ? 'b' : 'r';
  const jumps = [];
  for (const dr of forwardDirs(piece)) {
    for (const dc of [-1, 1]) {
      const mr = row + dr, mc = col + dc; // captured piece
      const lr = row + 2 * dr, lc = col + 2 * dc; // landing square
      if (!inBounds(lr, lc)) continue;
      const mid = state.board[mr]?.[mc];
      if (mid && mid.color === other && !state.board[lr][lc]) {
        jumps.push({ from: { row, col }, to: { row: lr, col: lc }, over: { row: mr, col: mc }, capture: true, piece });
      }
    }
  }
  return jumps;
}

function stepsFor(state, row, col) {
  const piece = state.board[row][col];
  if (!piece) return [];
  const steps = [];
  for (const dr of forwardDirs(piece)) {
    for (const dc of [-1, 1]) {
      const r = row + dr, c = col + dc;
      if (inBounds(r, c) && !state.board[r][c]) {
        steps.push({ from: { row, col }, to: { row: r, col: c }, capture: false, piece });
      }
    }
  }
  return steps;
}

function anyCaptureAvailable(state, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === color && jumpsFor(state, r, c).length) return true;
    }
  }
  return false;
}

// Legal moves for the piece at (row,col), honoring the mandatory-capture rule and an
// in-progress multi-jump (state.forcedFrom locks moves to that one piece).
export function legalMovesFor(state, row, col) {
  const piece = state.board[row][col];
  if (!piece || piece.color !== state.turn) return [];
  if (state.forcedFrom) {
    if (state.forcedFrom.row !== row || state.forcedFrom.col !== col) return [];
    return jumpsFor(state, row, col);
  }
  if (anyCaptureAvailable(state, state.turn)) return jumpsFor(state, row, col);
  return stepsFor(state, row, col);
}

export function allLegalMoves(state, color = state.turn) {
  const all = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === color) all.push(...legalMovesFor(state, r, c));
    }
  }
  return all;
}

function checkWinner(state) {
  const other = state.turn === 'r' ? 'b' : 'r';
  // state.turn is the side to move *after* the move just applied; if they have no
  // legal moves (no pieces, or no moves at all), the other side wins.
  if (allLegalMoves(state, state.turn).length === 0) {
    state.status = 'over';
    state.winner = other;
  } else {
    state.status = 'active';
    state.winner = null;
  }
  return state;
}

// Applies a move (from legalMovesFor). Handles kinging and multi-jump continuation.
export function applyMove(state, move) {
  const next = cloneState(state);
  const piece = next.board[move.from.row][move.from.col];
  next.board[move.from.row][move.from.col] = null;
  let captured = null;
  if (move.capture) {
    captured = next.board[move.over.row][move.over.col];
    next.board[move.over.row][move.over.col] = null;
  }
  const backRow = piece.color === 'r' ? 7 : 0;
  const kinged = !piece.king && move.to.row === backRow;
  next.board[move.to.row][move.to.col] = { ...piece, king: piece.king || kinged };

  if (move.capture && !kinged) {
    const more = jumpsFor(next, move.to.row, move.to.col);
    if (more.length) {
      next.forcedFrom = { row: move.to.row, col: move.to.col };
      // turn does not change: same player continues the multi-jump
      return { state: next, captured, continued: true };
    }
  }
  next.forcedFrom = null;
  next.turn = piece.color === 'r' ? 'b' : 'r';
  checkWinner(next);
  return { state: next, captured, continued: false };
}
