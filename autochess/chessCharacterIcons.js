// ART (autochess-specific): Chess characters, not the plain board-piece
// icons reused from the main game — each is a small humanoid figure built
// only from rects/polygons/circles (no freehand curves, same lesson as
// chessPieceIcons.js: curves didn't render recognizably at this size).
// fill: currentColor, so the existing faction-tint CSS still applies.
const VIEWBOX = '0 0 44 44';

const ICONS = {
  // Footsoldier: melee grunt — sword and a small round shield.
  footsoldier: `
    <circle cx="22" cy="9" r="5"/>
    <polygon points="16,16 28,16 26,32 18,32"/>
    <circle cx="14" cy="23" r="4"/>
    <polygon points="29,15 33,11 35,13 31,17"/>
    <rect x="17" y="32" width="10" height="4" rx="1"/>
  `,
  // Lancer: ranged, mobile — a javelin mid-throw, leaning run pose.
  lancer: `
    <circle cx="20" cy="9" r="5"/>
    <polygon points="14,16 27,14 25,32 16,32"/>
    <polygon points="27,8 40,3 41,5 29,11"/>
    <polygon points="39,2 41,2 42,4 40,5"/>
    <rect x="15" y="32" width="10" height="4" rx="1"/>
  `,
  // Cleric: ranged caster — robe and a staff with an orb.
  cleric: `
    <circle cx="22" cy="8" r="4.6"/>
    <polygon points="14,33 17,15 27,15 30,33"/>
    <rect x="30" y="10" width="2.4" height="26"/>
    <circle cx="31.2" cy="8" r="3.4"/>
    <rect x="16" y="33" width="12" height="3.5" rx="1"/>
  `,
  // Bulwark: melee tank — wide stance, a big shield up front.
  bulwark: `
    <circle cx="22" cy="9" r="5"/>
    <rect x="14" y="15" width="16" height="17"/>
    <rect x="6" y="12" width="9" height="20" rx="2"/>
    <rect x="16" y="32" width="12" height="4" rx="1"/>
  `,
  // Warqueen: ranged elite — crowned, a scepter with a star finial.
  warqueen: `
    <polygon points="16,7 19,2 22,6 25,2 28,7"/>
    <circle cx="22" cy="9" r="4.6"/>
    <polygon points="13,34 16,15 28,15 31,34"/>
    <rect x="31" y="9" width="2.2" height="25"/>
    <polygon points="32,3 34,7 38,7 35,10 36,14 32,12 28,14 29,10 26,7 30,7"/>
    <rect x="15" y="34" width="14" height="3.5" rx="1"/>
  `,
  // High King: melee elite — crowned, cape, a sword held upright.
  highking: `
    <polygon points="16,7 19,2 22,6 25,2 28,7"/>
    <circle cx="22" cy="9" r="4.6"/>
    <polygon points="9,14 16,15 14,34 7,34"/>
    <polygon points="15,15 29,15 27,33 17,33"/>
    <rect x="29" y="5" width="2.6" height="22"/>
    <rect x="25.5" y="9" width="9" height="2.6"/>
    <rect x="17" y="33" width="10" height="3.5" rx="1"/>
  `,
};

export function chessCharacterIcon(type) {
  return `<svg viewBox="${VIEWBOX}" aria-hidden="true">${ICONS[type] || ''}</svg>`;
}
