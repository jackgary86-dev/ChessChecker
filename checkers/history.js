import { loadHistory } from './historyStore.js';
import { summarize, recentGames, describeResult } from './historyLogic.js';

const recordsWrap = document.getElementById('recordsWrap');
const recentWrap = document.getElementById('recentWrap');

const GAME_LABELS = { chess: 'Chess', checkers: 'Checkers', autochess: 'Autochess' };

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render() {
  const history = loadHistory();
  const stats = summarize(history);
  const names = Object.keys(stats).sort();

  recordsWrap.innerHTML = '<h2>Records</h2>';
  if (names.length === 0) {
    recordsWrap.innerHTML += '<p class="hint">No games recorded yet. Finish a game to see records here.</p>';
  } else {
    const table = document.createElement('table');
    table.className = 'history-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Player</th><th>Wins</th><th>Losses</th><th>Draws</th>' +
      '<th>Chess (W-L-D)</th><th>Checkers (W-L-D)</th><th>Autochess (W-L-D)</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const name of names) {
      const s = stats[name];
      const chess = s.byGame.chess || { wins: 0, losses: 0, draws: 0 };
      const checkers = s.byGame.checkers || { wins: 0, losses: 0, draws: 0 };
      const autochess = s.byGame.autochess || { wins: 0, losses: 0, draws: 0 };
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(name)}</td><td>${s.wins}</td><td>${s.losses}</td><td>${s.draws}</td>` +
        `<td>${chess.wins}-${chess.losses}-${chess.draws}</td>` +
        `<td>${checkers.wins}-${checkers.losses}-${checkers.draws}</td>` +
        `<td>${autochess.wins}-${autochess.losses}-${autochess.draws}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    recordsWrap.appendChild(table);
  }

  recentWrap.innerHTML = '<h2>Recent games</h2>';
  const recent = recentGames(history, 15);
  if (recent.length === 0) {
    recentWrap.innerHTML += '<p class="hint">No games yet.</p>';
  } else {
    const list = document.createElement('ul');
    list.className = 'history-list';
    for (const entry of recent) {
      const li = document.createElement('li');
      const when = new Date(entry.date).toLocaleString();
      const gameName = GAME_LABELS[entry.game] || entry.game;
      li.textContent = `${when} — ${gameName}: ${describeResult(entry)}`;
      list.appendChild(li);
    }
    recentWrap.appendChild(list);
  }
}

render();
