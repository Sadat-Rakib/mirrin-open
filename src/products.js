// MIRRIN FW26 — product catalogue (order = carousel order)

export const BG_MODE =
  new URLSearchParams(location.search).get('bg') === 'mountain' ? 'pass' : 'frame';

const plate = (c) => (BG_MODE === 'pass' ? `backgrounds/pass-${c}.jpg` : `backgrounds/loop-${c}.jpg`);
const loop = (c) => (BG_MODE === 'pass' ? '' : `backgrounds/loop-${c}.mp4`);

export const PRODUCTS = [
  {
    id: 'lime',
    index: 1,
    name: 'CASH MONEY',
    colorway: 'GREEN',
    gender: "MEN'S PUFFER",
    price: 249,
    model: 'models/green.glb',
    background: plate('green'),
    loop: loop('green'),
    wordmark: { top: 'Cash Money', bottom: 'GREEN' },
    poster: 'campaign/looks/green-studio-full.jpg',
    details: [
      'campaign/details/green-collar.jpg',
      'campaign/details/green-zip.jpg',
      'campaign/details/green-wet.jpg',
    ],
    looks: [
      'campaign/looks/green-studio-full.jpg',
      'campaign/looks/green-studio-mid.jpg',
      'campaign/looks/green-studio-close.jpg',
    ],
    accent: '#b6f000',
    accentSoft: '#d4ff4a',
    light: 0x9be000,
    rim: 0x6fbf00,
    glow: 'rgba(160,220,0,0.45)',
    headline: ['CASH MONEY', 'GREEN'],
    tagline: 'More than money. A mindset.',
    cta: 'SHOP CASH MONEY GREEN',
    blurb: 'High-visibility lime. Feather-light fill, ripstop shell — engineered to be seen and to last.',
    fabric: 'Nano Prene Tech™ shell, recycled loft fill',
    length: 'Standard menswear crop',
    fit: 'Model wears size M',
    rating: 5,
    reviews: 2,
  },
  {
    id: 'blue',
    index: 2,
    name: 'DEEP FREEZE',
    colorway: 'BLUE',
    gender: "MEN'S PUFFER",
    price: 249,
    model: 'models/blue.glb',
    background: plate('blue'),
    loop: loop('blue'),
    wordmark: { top: 'Deep Freeze', bottom: 'BLUE' },
    poster: 'campaign/looks/blue-studio-full.jpg',
    details: [
      'campaign/details/blue-collar.jpg',
      'campaign/details/blue-zip.jpg',
      'campaign/details/blue-wet.jpg',
    ],
    looks: [
      'campaign/looks/blue-studio-full.jpg',
      'campaign/looks/blue-studio-mid.jpg',
      'campaign/looks/blue-studio-close.jpg',
    ],
    accent: '#2f8fff',
    accentSoft: '#7ab8ff',
    light: 0x2a7ae8,
    rim: 0x155ad0,
    glow: 'rgba(47,143,255,0.45)',
    headline: ['DEEP FREEZE', 'BLUE'],
    tagline: 'Not just a color. A mindset.',
    cta: 'SHOP DEEP FREEZE BLUE',
    blurb: 'Saturated sky blue. A liquid-sheen thermal core built for the city and the cold.',
    fabric: 'Nano Prene Tech™ shell, recycled loft fill',
    length: 'Standard menswear crop',
    fit: 'Model wears size M',
    rating: 5,
    reviews: 2,
  },
  {
    id: 'pink',
    index: 3,
    name: 'CHERRY BOMB',
    colorway: 'PINK',
    gender: "WOMEN'S PUFFER",
    price: 269,
    model: 'models/pink.glb',
    background: plate('pink'),
    loop: loop('pink'),
    wordmark: { top: 'Cherry Bomb', bottom: 'PINK' },
    poster: 'campaign/details/pink-collar.jpg',
    details: [
      'campaign/details/pink-detail-1.jpg',
      'campaign/details/pink-detail-2.jpg',
      'campaign/details/pink-detail-3.jpg',
    ],
    looks: [
      'campaign/details/pink-collar.jpg',
      'campaign/details/pink-zip.jpg',
      'campaign/details/pink-wet.jpg',
    ],
    accent: '#ff2e86',
    accentSoft: '#ff79b0',
    light: 0xff2e86,
    rim: 0xd01860,
    glow: 'rgba(255,46,134,0.45)',
    headline: ['CHERRY BOMB', 'PINK'],
    tagline: 'Not a trend. A temperature.',
    cta: 'SHOP CHERRY BOMB PINK',
    blurb: 'A cropped women’s cut in electric pink. Cloud-soft loft, wind-sealed seams.',
    fabric: 'Nano Prene Tech™ shell, recycled loft fill',
    length: 'Cropped womenswear',
    fit: 'Model wears size S',
    rating: 5,
    reviews: 1,
  },
];

export const BAG_KEY = 'mirrin-bag';

export const money = (n) => '$' + Number(n).toLocaleString('en-US');

// Chrome-style two-line wordmark lockup rendered as text (gothic top + brush bottom)
export function wordmarkHTML(p) {
  return `<span class="wm"><span class="wm__top">${p.wordmark.top}</span><span class="wm__bottom">${p.wordmark.bottom}</span></span>`;
}
