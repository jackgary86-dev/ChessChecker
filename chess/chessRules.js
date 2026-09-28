// Pure chess rules engine. No DOM. Board: 8x8 array, row 0 = rank 8 (top), row 7 = rank 1 (bottom).
// col 0 = file a, col 7 = file h. Piece: { type: 'p'|'n'|'b'|'r'|'q'|'k', color: 'w'|'b' }.

export const FILES = 'abcdefgh';

export function squareName(row, col) {
  return FILES[col] + (8 - row);
}

export function initialState() {
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: 'b' };
    board[1][c] = { type: 'p', color: 'b' };
    board[6][c] = { type: 'p', color: 'w' };
    board[7][c] = { type: back[c], color: 'w' };
  }
  return {
    board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null, // { row, col } of the square a pawn can capture into
    status: 'active', // active | check | checkmate | stalemate
    winner: null,
  };
}

export function cloneState(state) {
  return {
    board: state.board.map((row) => row.map((p) => (p ? { ...p } : null))),
    turn: state.turn,
    castling: { ...state.castling },
    enPassant: state.enPassant ? { ...state.enPassant } : null,
    status: state.status,
    winner: state.winner,
  };
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

const SLIDE_DIRS = {
  b: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  r: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]],
};
const KNIGHT_JUMPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

// Pseudo-legal destinations for the piece at (row,col), ignoring self-check.
// Returns a list of move objects: { from:{row,col}, to:{row,col}, piece, capture, enPassant, castle, promotion:null }
function pseudoMovesFor(state, row, col) {
  const piece = state.board[row][col];
  if (!piece) return [];
  const moves = [];
  const other = piece.color === 'w' ? 'b' : 'w';

  const addIfOk = (r, c, opts = {}) => {
    if (!inBounds(r, c)) return false;
    const target = state.board[r][c];
    if (target && target.color === piece.color) return false;
    moves.push({ from: { row, col }, to: { row: r, col: c }, piece, capture: !!target, ...opts });
    return !target; // true => square was empty, sliding may continue
  };

  if (piece.type === 'n') {
    for (const [dr, dc] of KNIGHT_JUMPS) addIfOk(row + dr, col + dc);
  } else if (piece.type === 'k') {
    for (const [dr, dc] of KING_STEPS) addIfOk(row + dr, col + dc);
  } else if (SLIDE_DIRS[piece.type]) {
    for (const [dr, dc] of SLIDE_DIRS[piece.type]) {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        const target = state.board[r][c];
        if (target && target.color === piece.color) break;
        moves.push({ from: { row, col }, to: { row: r, col: c }, piece, capture: !!target });
        if (target) break;
        r += dr; c += dc;
      }
    }
  } else if (piece.type === 'p') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    const promoRow = piece.color === 'w' ? 0 : 7;
    // forward
    if (inBounds(row + dir, col) && !state.board[row + dir][col]) {
      const r = row + dir;
      if (r === promoRow) {
        for (const promo of ['q', 'r', 'b', 'n']) {
          moves.push({ from: { row, col }, to: { row: r, col }, piece, capture: false, promotion: promo });
        }
      } else {
        moves.push({ from: { row, col }, to: { row: r, col }, piece, capture: false });
        if (row === startRow && !state.board[row + 2 * dir][col]) {
          moves.push({ from: { row, col }, to: { row: row + 2 * dir, col }, piece, capture: false, doubleStep: true });
        }
      }
    }
    // captures
    for (const dc of [-1, 1]) {
      const r = row + dir, c = col + dc;
      if (!inBounds(r, c)) continue;
      const target = state.board[r][c];
      if (target && target.color === other) {
        if (r === promoRow) {
          for (const promo of ['q', 'r', 'b', 'n']) {
            moves.push({ from: { row, col }, to: { row: r, col: c }, piece, capture: true, promotion: promo });
          }
        } else {
          moves.push({ from: { row, col }, to: { row: r, col: c }, piece, capture: true });
        }
      } else if (state.enPassant && state.enPassant.row === r && state.enPassant.col === c) {
        moves.push({ from: { row, col }, to: { row: r, col: c }, piece, capture: true, enPassant: true });
      }
    }
  }
  return moves;
}

function findKing(state, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.type === 'k' && p.color === color) return { row: r, col: c };
    }
  }
  return null;
}

// Is (row,col) attacked by `byColor`, using pseudo-moves (cheap, no recursion into check).
export function isSquareAttacked(state, row, col, byColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p || p.color !== byColor) continue;
      if (p.type === 'p') {
        const dir = p.color === 'w' ? -1 : 1;
        if (row === r + dir && (col === c - 1 || col === c + 1)) return true;
        continue;
      }
      for (const m of pseudoMovesFor(state, r, c)) {
        if (m.to.row === row && m.to.col === col) return true;
      }
    }
  }
  return false;
}

export function isInCheck(state, color) {
  const king = findKing(state, color);
  if (!king) return false;
  return isSquareAttacked(state, king.row, king.col, color === 'w' ? 'b' : 'w');
}

// Apply a move to a (cloned) state in place, updating castling rights and en passant.
function applyMoveMutating(state, move) {
  const { from, to } = move;
  const piece = state.board[from.row][from.col];
  const other = piece.color === 'w' ? 'b' : 'w';

  if (move.enPassant) {
    state.board[from.row][to.col] = null; // captured pawn sits beside the destination
  }

  state.board[to.row][to.col] = move.promotion ? { type: move.promotion, color: piece.color } : piece;
  state.board[from.row][from.col] = null;

  if (move.castle) {
    const row = from.row;
    if (move.castle === 'K') {
      state.board[row][5] = state.board[row][7];
      state.board[row][7] = null;
    } else {
      state.board[row][3] = state.board[row][0];
      state.board[row][0] = null;
    }
  }

  // King/rook moves or rook captures revoke castling rights.
  if (piece.type === 'k') {
    if (piece.color === 'w') { state.castling.wK = false; state.castling.wQ = false; }
    else { state.castling.bK = false; state.castling.bQ = false; }
  }
  const revokeRookRights = (row, col, color) => {
    if (color === 'w' && row === 7 && col === 7) state.castling.wK = false;
    if (color === 'w' && row === 7 && col === 0) state.castling.wQ = false;
    if (color === 'b' && row === 0 && col === 7) state.castling.bK = false;
    if (color === 'b' && row === 0 && col === 0) state.castling.bQ = false;
  };
  if (piece.type === 'r') revokeRookRights(from.row, from.col, piece.color);
  revokeRookRights(to.row, to.col, other);

  state.enPassant = move.doubleStep ? { row: (from.row + to.row) / 2, col: from.col } : null;
  state.turn = other;
  return state;
}

// Legal moves for the piece at (row,col): pseudo-legal, minus those leaving own king in check,
// plus castling for the king.
export function legalMovesFor(state, row, col) {
  const piece = state.board[row][col];
  if (!piece || piece.color !== state.turn) return [];
  const moves = pseudoMovesFor(state, row, col);

  if (piece.type === 'k') {
    const opp = piece.color === 'w' ? 'b' : 'w';
    const rights = state.castling;
    const homeRow = piece.color === 'w' ? 7 : 0;
    if (row === homeRow && col === 4 && !isInCheck(state, piece.color)) {
      const kingside = piece.color === 'w' ? rights.wK : rights.bK;
      const queenside = piece.color === 'w' ? rights.wQ : rights.bQ;
      if (kingside && !state.board[homeRow][5] && !state.board[homeRow][6] &&
          state.board[homeRow][7] && state.board[homeRow][7].type === 'r' &&
          !isSquareAttacked(state, homeRow, 5, opp) && !isSquareAttacked(state, homeRow, 6, opp)) {
        moves.push({ from: { row, col }, to: { row: homeRow, col: 6 }, piece, capture: false, castle: 'K' });
      }
      if (queenside && !state.board[homeRow][3] && !state.board[homeRow][2] && !state.board[homeRow][1] &&
          state.board[homeRow][0] && state.board[homeRow][0].type === 'r' &&
          !isSquareAttacked(state, homeRow, 3, opp) && !isSquareAttacked(state, homeRow, 2, opp)) {
        moves.push({ from: { row, col }, to: { row: homeRow, col: 2 }, piece, capture: false, castle: 'Q' });
      }
    }
  }

  return moves.filter((m) => {
    const next = cloneState(state);
    applyMoveMutating(next, m);
    return !isInCheck(next, piece.color);
  });
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

// Applies a move (must be one produced by legalMovesFor) and returns the new state, with status set.
export function applyMove(state, move) {
  const next = cloneState(state);
  const captured = move.capture
    ? (move.enPassant ? state.board[move.from.row][move.to.col] : state.board[move.to.row][move.to.col])
    : null;
  applyMoveMutating(next, move);
  const inCheck = isInCheck(next, next.turn);
  const hasMoves = allLegalMoves(next, next.turn).length > 0;
  if (!hasMoves) {
    next.status = inCheck ? 'checkmate' : 'stalemate';
    next.winner = inCheck ? (next.turn === 'w' ? 'b' : 'w') : null;
  } else {
    next.status = inCheck ? 'check' : 'active';
    next.winner = null;
  }
  return { state: next, captured };
}
