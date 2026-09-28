// Pure match-history logic (HISTORY-01), no DOM, no localStorage — directly
// unit-testable, the same way the rules engines are. An entry looks like:
//   { date: <ISO string>, game: 'chess'|'checkers',
//     players: { p1, p2 }, result: 'p1'|'p2'|'draw' }
// p1/p2 match each game's own "moves first" convention (White in Chess,
// Red in Checkers), same as NAMES-01/02.

export function appendResult(history, entry) {
  return [...history, entry];
}

function emptyRecord() {
  return { wins: 0, losses: 0, draws: 0 };
}

// { <playerName>: { wins, losses, draws, byGame: { chess: {...}, checkers: {...} } } }
export function summarize(history) {
  const stats = {};
  const ensure = (name, game) => {
    if (!stats[name]) stats[name] = { ...emptyRecord(), byGame: {} };
    if (!stats[name].byGame[game]) stats[name].byGame[game] = emptyRecord();
    return stats[name];
  };

  for (const entry of history) {
    const { game, players, result } = entry;
    ensure(players.p1, game);
    ensure(players.p2, game);
    if (result === 'draw') {
      for (const name of [players.p1, players.p2]) {
        stats[name].draws++;
        stats[name].byGame[game].draws++;
      }
    } else {
      const winner = result === 'p1' ? players.p1 : players.p2;
      const loser = result === 'p1' ? players.p2 : players.p1;
      stats[winner].wins++;
      stats[winner].byGame[game].wins++;
      stats[loser].losses++;
      stats[loser].byGame[game].losses++;
    }
  }
  return stats;
}

// Most recent first.
export function recentGames(history, limit = 10) {
  return [...history].slice(-limit).reverse();
}

export function describeResult(entry) {
  const { players, result } = entry;
  if (result === 'draw') return `${players.p1} and ${players.p2} drew`;
  const winner = result === 'p1' ? players.p1 : players.p2;
  const loser = result === 'p1' ? players.p2 : players.p1;
  return `${winner} beat ${loser}`;
}
