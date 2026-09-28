// ART-01: custom flat geometric chess piece icons — a deliberate simple
// visual language built only from rects, polygons and circles (no freehand
// curves), the same low-poly approach as the checkers piece art. Colored
// via CSS (fill: currentColor) so the existing white/black theming applies.
const VIEWBOX = '0 0 45 45';
const BASE = '<rect x="12" y="33" width="21" height="4.5" rx="1"/>';

const ICONS = {
  p: `<circle cx="22.5" cy="14" r="5.5"/>
      <polygon points="16,33 22.5,19 29,33"/>
      ${BASE}`,

  r: `<rect x="13" y="16" width="19" height="14"/>
      <rect x="13" y="13" width="19" height="3"/>
      <rect x="13" y="9" width="4.5" height="5"/>
      <rect x="20.3" y="9" width="4.5" height="5"/>
      <rect x="27.5" y="9" width="4.5" height="5"/>
      ${BASE}`,

  n: `<polygon points="13,24 14.5,29 16,33 32,33 30,16 24,12 26,8 23,11 19,10 15,16"/>
      <circle cx="27" cy="14.5" r="1" fill="var(--bg,#1b1d22)"/>
      ${BASE}`,

  b: `<circle cx="22.5" cy="9" r="2.6"/>
      <polygon points="22.5,13 28,22 30,30 15,30 17,22"/>
      <rect x="19" y="19.5" width="7" height="2.2"/>
      ${BASE}`,

  q: `<circle cx="12" cy="9.5" r="2"/><circle cx="22.5" cy="6.5" r="2.2"/><circle cx="33" cy="9.5" r="2"/>
      <polygon points="12,9.5 17,18 22.5,9.5 28,18 33,9.5 30,26 15,26"/>
      ${BASE}`,

  k: `<rect x="21" y="5" width="3" height="7.5"/>
      <rect x="18" y="7.5" width="9" height="3"/>
      <polygon points="16,16 29,16 32,30 13,30"/>
      ${BASE}`,
};

export function pieceIconSvg(type) {
  return `<svg viewBox="${VIEWBOX}" aria-hidden="true">${ICONS[type] || ''}</svg>`;
}
