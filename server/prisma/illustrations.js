// Illustrations des logements de démonstration, générées sans image externe.
const LARGEUR = 960;
const HAUTEUR = 540;

function fenetres({ x, y, colonnes, lignes, l, h, ecartX, ecartY, couleur, allumees = [] }) {
  let svg = '';
  for (let c = 0; c < colonnes; c += 1) {
    for (let r = 0; r < lignes; r += 1) {
      const teinte = allumees.includes(`${c}-${r}`) ? '#fde68a' : couleur;
      svg += `<rect x="${x + c * (l + ecartX)}" y="${y + r * (h + ecartY)}" width="${l}" height="${h}" rx="5" fill="${teinte}"/>`;
    }
  }
  return svg;
}

function palmier(x, sol, hauteur, couleur = '#14532d') {
  const haut = sol - hauteur;
  const feuille = (dx, dy) => `<path d="M${x} ${haut} q${dx * 0.55} ${dy - 42} ${dx} ${dy}" fill="none" stroke="${couleur}" stroke-width="15" stroke-linecap="round"/>`;
  return `<path d="M${x - 6} ${sol} q10 ${-hauteur / 2} 6 ${-hauteur}" fill="none" stroke="#7c4a21" stroke-width="13" stroke-linecap="round"/>${[
    [-92, 34],
    [-66, 62],
    [-30, 78],
    [34, 76],
    [70, 60],
    [96, 30],
  ]
    .map(([dx, dy]) => feuille(dx, dy))
    .join('')}`;
}

function cadre({ ciel, soleil, collines, sol, contenu }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}" viewBox="0 0 ${LARGEUR} ${HAUTEUR}">
    <defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ciel[0]}"/><stop offset="1" stop-color="${ciel[1]}"/></linearGradient></defs>
    <rect width="${LARGEUR}" height="${HAUTEUR}" fill="url(#c)"/>
    <circle cx="${soleil[0]}" cy="${soleil[1]}" r="66" fill="${soleil[2]}"/>
    <path d="M0 410 C180 340 330 400 520 362 S820 330 960 382 V540 H0Z" fill="${collines}"/>
    <rect y="462" width="${LARGEUR}" height="78" fill="${sol}"/>
    ${contenu}
  </svg>`;
}

const SOL = 462;

export const ILLUSTRATIONS = [
  // Immeuble de plusieurs étages
  cadre({
    ciel: ['#7dd3c0', '#f4f1d0'],
    soleil: [770, 110, '#fde68a'],
    collines: '#86c5a4',
    sol: '#4b7f5e',
    contenu: `<rect x="290" y="96" width="370" height="${SOL - 96}" rx="10" fill="#f8f1e4"/>
      <rect x="270" y="80" width="410" height="26" rx="8" fill="#b45f3c"/>
      ${[172, 262, 352].map((y) => `<rect x="280" y="${y}" width="390" height="11" rx="5" fill="#b45f3c"/>`).join('')}
      ${fenetres({ x: 322, y: 122, colonnes: 4, lignes: 3, l: 62, h: 46, ecartX: 21, ecartY: 44, couleur: '#3f8f88', allumees: ['1-0', '3-1', '0-2'] })}
      <rect x="436" y="392" width="78" height="70" rx="8" fill="#7c4a21"/>
      ${palmier(190, SOL, 210)}${palmier(788, SOL, 170)}`,
  }),
  // Petit studio en bord de mer
  cadre({
    ciel: ['#38bdf8', '#d9f99d'],
    soleil: [180, 112, '#fef3c7'],
    collines: '#2dd4bf',
    sol: '#d9b382',
    contenu: `<rect x="372" y="206" width="280" height="${SOL - 206}" rx="10" fill="#ffffff"/>
      <rect x="352" y="188" width="320" height="26" rx="8" fill="#0f766e"/>
      ${fenetres({ x: 410, y: 240, colonnes: 2, lignes: 1, l: 88, h: 76, ecartX: 28, ecartY: 0, couleur: '#7dd3fc', allumees: ['1-0'] })}
      <rect x="474" y="356" width="78" height="106" rx="8" fill="#0f766e"/>
      <circle cx="540" cy="414" r="5" fill="#fde68a"/>
      ${palmier(250, SOL, 190, '#166534')}${palmier(778, SOL, 225, '#166534')}`,
  }),
  // Maison au coucher du soleil
  cadre({
    ciel: ['#f97316', '#fde68a'],
    soleil: [720, 190, '#fff7d6'],
    collines: '#a16207',
    sol: '#57733f',
    contenu: `<rect x="262" y="272" width="436" height="${SOL - 272}" rx="8" fill="#fbe9cf"/>
      <path d="M226 284 480 138 734 284Z" fill="#9a3412"/>
      ${fenetres({ x: 300, y: 318, colonnes: 2, lignes: 1, l: 82, h: 68, ecartX: 192, ecartY: 0, couleur: '#92400e', allumees: ['0-0', '1-0'] })}
      <rect x="442" y="338" width="78" height="124" rx="8" fill="#7c2d12"/>
      ${palmier(138, SOL, 225, '#3f3f12')}${palmier(842, SOL, 180, '#3f3f12')}`,
  }),
];
