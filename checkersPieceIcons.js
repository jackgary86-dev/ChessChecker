// ART-01: custom checkers piece art — layered inline SVG (rim, face, a
// highlight, and a distinct crown mark for kings) instead of a flat CSS
// circle. Colors come from CSS classes on the wrapping .checker element
// (see style.css) so red/black stay theme-driven.
export function checkerIconSvg(isKing) {
  const crown = isKing
    ? `<path class="disc-crown" d="M8 14.5l3.2-5.5 3.3 4.3 3-6 3 6 3.3-4.3 3.2 5.5-1.6 3.2H9.6z"/>`
    : '';
  return `<svg viewBox="0 0 32 32" aria-hidden="true">
    <circle class="disc-outer" cx="16" cy="17" r="13"/>
    <circle class="disc-inner" cx="16" cy="17" r="9.8"/>
    <ellipse class="disc-shine" cx="12" cy="12" rx="4.6" ry="2.6"/>
    ${crown}
  </svg>`;
}
