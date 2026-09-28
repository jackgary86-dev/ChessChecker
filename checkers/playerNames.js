// Pure name-normalization logic (NAMES-02), kept separate from localStorage
// so it's directly unit-testable. loadPlayerNames/savePlayerNames below are
// the thin, untested IO wrapper, same pattern as saveGame/loadGame in the
// two games' UI modules.
export const DEFAULT_NAMES = Object.freeze({ p1: 'Connor', p2: 'Jack' });
export const NAMES_KEY = 'chesschecker-names-v1';

export function normalizeNames(raw) {
  const p1 = (raw && typeof raw.p1 === 'string' && raw.p1.trim()) || DEFAULT_NAMES.p1;
  const p2 = (raw && typeof raw.p2 === 'string' && raw.p2.trim()) || DEFAULT_NAMES.p2;
  return { p1, p2 };
}

export function loadPlayerNames() {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    return raw ? normalizeNames(JSON.parse(raw)) : { ...DEFAULT_NAMES };
  } catch (e) {
    return { ...DEFAULT_NAMES };
  }
}

export function savePlayerNames(names) {
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify(normalizeNames(names)));
  } catch (e) { /* sandboxed storage: ignore */ }
}
