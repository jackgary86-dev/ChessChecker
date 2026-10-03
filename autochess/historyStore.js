// localStorage IO for match history, wrapped in try/catch — pure logic
// lives in historyLogic.js instead, so it can be unit tested without a
// storage dependency.
const HISTORY_KEY = 'chesschecker-history-v1';

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) { /* sandboxed storage: ignore */ }
}
