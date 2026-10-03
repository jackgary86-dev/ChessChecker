// ART (autochess-specific): Checkers characters — round "disc warriors"
// that keep the board-piece identity (a round body), not humanoid like the
// Chess characters, so the two factions read as visually distinct worlds.
// Built only from rects/polygons/circles. A Draughtsman that promotes
// becomes a Champion: it visually breaks from the round hive-body into a
// more angular, winged, weapon-raised silhouette — the defender becoming
// an attacker.
const VIEWBOX = '0 0 40 40';

function draughtsman() {
  return `
    <circle class="disc-outer" cx="20" cy="23" r="13"/>
    <circle class="disc-inner" cx="20" cy="23" r="9.8"/>
    <ellipse class="disc-shine" cx="16" cy="18" rx="4.6" ry="2.6"/>
    <circle cx="20" cy="9" r="4.2"/>
    <polygon points="22,19 32,13 33,15 23,21"/>
  `;
}

function draughtslord() {
  return `
    <circle class="disc-outer" cx="20" cy="23" r="14.5"/>
    <circle class="disc-inner" cx="20" cy="23" r="11"/>
    <ellipse class="disc-shine" cx="15.5" cy="17" rx="5" ry="2.8"/>
    <circle cx="20" cy="8" r="4.6"/>
    <path class="disc-crown" d="M13 8l2.6-4.4 2.6 3.4 2.4-4.8 2.4,4.8 2.6-3.4 2.6,4.4-1.3,2.6H14.3z"/>
    <polygon points="22,18 33,10 34.5,12.3 23.5,20"/>
    <rect x="31.5" y="7" width="4.5" height="4.5" rx="1"/>
  `;
}

function draughtschampion() {
  // Broken free of the round hive-body: an angular, winged, weapon-raised
  // figure mid-throw — a ranged attacker now, not a clustered defender.
  return `
    <circle cx="20" cy="10" r="4.6"/>
    <polygon points="13,34 16,16 24,16 27,34"/>
    <polygon points="9,15 16,18 14,24 6,20"/>
    <polygon points="31,15 24,18 26,24 34,20"/>
    <polygon points="24,13 37,6 38.5,8.3 26.5,15.5"/>
    <polygon points="36,4 39,4.5 39.5,7.5 37,6.5"/>
    <rect x="15" y="34" width="10" height="3.5" rx="1"/>
  `;
}

export function checkersCharacterIcon(type, isChampion) {
  if (type === 'draughtslord') return `<svg viewBox="${VIEWBOX}" aria-hidden="true">${draughtslord()}</svg>`;
  if (isChampion) return `<svg viewBox="${VIEWBOX}" aria-hidden="true">${draughtschampion()}</svg>`;
  return `<svg viewBox="${VIEWBOX}" aria-hidden="true">${draughtsman()}</svg>`;
}
