// MIRRIN — white PDP: 6 photos + 360° inspect, swatches, sizes, bag (demo).

import { PRODUCTS, BAG_KEY, money, wordmarkHTML } from './products.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const params = new URLSearchParams(location.search);
const productId = params.get('id') || 'lime';

const state = {
  product: PRODUCTS.find((p) => p.id === productId) || PRODUCTS[0],
  shot: 0,
  size: 'M',
  qty: 1,
  cart: (() => {
    try {
      return JSON.parse(localStorage.getItem(BAG_KEY) || '[]');
    } catch {
      return [];
    }
  })(),
  front: 'A',
};

const saveBag = (bag) => {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  } catch {
    /* private mode */
  }
};

function buildGallery(product) {
  const looks = (product.looks || []).slice(0, 3).map((src, i) => ({ type: 'photo', src, label: 'Look 0' + (i + 1) }));
  const details = (product.details || []).slice(0, 3).map((src, i) => ({ type: 'photo', src, label: 'Detail 0' + (i + 1) }));
  const inspect = [{ type: '3d', label: '360°', src: product.looks?.[0] }];
  return [...looks, ...details, ...inspect];
}

let inspect = null;
async function getInspect() {
  if (inspect) return inspect;
  const { JacketInspect } = await import('./scene3d.js');
  inspect = new JacketInspect($('#inspect3d'), state.product);
  return inspect;
}

function setTheme(product) {
  const root = document.documentElement.style;
  root.setProperty('--accent', product.accent);
  root.setProperty('--accent-soft', product.accentSoft);
  root.setProperty('--glow', product.glow);
  document.documentElement.dataset.theme = product.id;
  document.title = `MIRRIN — ${product.name} ${product.colorway}`;
}

function showShot() {
  const product = state.product;
  const gallery = buildGallery(product);
  if (state.shot >= gallery.length) state.shot = 0;
  const shot = gallery[state.shot];
  const stage = $('#stage');

  $$('#thumbs [data-shot]').forEach((t) => t.classList.toggle('is-on', +t.dataset.shot === state.shot));

  if (shot.type === '3d') {
    stage.classList.add('is-3d');
    stage.style.backgroundImage = 'none';
    $('#shotBadge').textContent = '3D INSPECT';
    getInspect().then((ins) => {
      ins.setRunning(true);
      ins._resize();
    });
    return;
  }
  stage.classList.remove('is-3d');
  if (inspect) inspect.setRunning(false);
  const incoming = state.front === 'A' ? $('#stageB') : $('#stageA');
  const outgoing = state.front === 'A' ? $('#stageA') : $('#stageB');
  stage.style.backgroundImage = `url(${shot.src})`;
  incoming.src = shot.src;
  incoming.alt = `${product.name} ${shot.label}`;
  incoming.classList.add('is-on');
  outgoing.classList.remove('is-on');
  state.front = state.front === 'A' ? 'B' : 'A';
  $('#shotBadge').textContent = shot.label;
}

function render() {
  const product = state.product;
  const gallery = buildGallery(product);
  if (state.shot >= gallery.length) state.shot = 0;
  setTheme(product);
  $('#crumbs').innerHTML = `<a href="./">Home</a> / <a href="./#shop">Shop</a> / <span>${product.name} ${product.colorway}</span>`;

  $('#thumbs').innerHTML = gallery
    .map(
      (shot, i) => `
    <button type="button" class="pdp__thumb ${i === state.shot ? 'is-on' : ''} ${shot.type === '3d' ? 'is-3d' : ''}"
      data-shot="${i}" data-src="${shot.src || ''}"
      ${shot.type !== '3d' && i < 5 ? `style="background-image:url(${shot.src})"` : ''}
      aria-label="${shot.label}">${shot.type === '3d' ? '360°' : ''}</button>
  `
    )
    .join('');

  const lazyThumbs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const el = en.target;
        if (!en.isIntersecting || el.style.backgroundImage || el.classList.contains('is-3d')) return;
        el.style.backgroundImage = `url(${el.dataset.src})`;
        lazyThumbs.unobserve(el);
      });
    },
    { rootMargin: '80px' }
  );
  $$('#thumbs [data-src]').forEach((el) => {
    if (!el.style.backgroundImage && !el.classList.contains('is-3d')) lazyThumbs.observe(el);
  });

  $('#fitNote').textContent = product.fit || '';
  $('#reviewCount').textContent = `${product.reviews || 2} reviews`;

  $('#info').innerHTML = `
    <div class="pdp__brand">MIRRIN</div>
    <h1>${product.name} ${product.colorway}</h1>
    <span class="pdp__sticker pdp__sticker--wm">${wordmarkHTML(product)}</span>
    <div class="pdp__sub">${product.gender}</div>
    <div class="pdp__stars">★★★★★ <span>${product.rating || 5} · ${product.reviews || 2} ratings</span></div>
    <div class="pdp__price">${money(product.price)}</div>
    <p class="pdp__blurb">${product.blurb}</p>
    <div class="pdp__label">Colour</div>
    <div class="pdp__swatches">
      ${PRODUCTS.map(
        (p) => `
        <a class="pdp__swatch ${p.id === product.id ? 'is-on' : ''}" href="./buy.html?id=${p.id}&w=2"
          title="${p.name} ${p.colorway}" style="background-image:url(${p.looks?.[0] || p.background})"></a>
      `
      ).join('')}
    </div>
    <div class="pdp__label">Size</div>
    <div class="pdp__sizes">
      ${['XS', 'S', 'M', 'L', 'XL']
        .map(
          (s) => `<button type="button" data-size="${s}" class="${state.size === s ? 'is-on' : ''}">${s}</button>`
        )
        .join('')}
    </div>
    <div class="pdp__buyrow">
      <div class="pdp__qty">
        <button type="button" data-q="-1">−</button>
        <span>${state.qty}</span>
        <button type="button" data-q="1">+</button>
      </div>
      <button class="btn btn--solid pdp__bag" id="addBag">ADD TO BAG</button>
    </div>
    <button type="button" class="pdp__3d" id="inspectBtn">View in 3D</button>
    <div class="pdp__specs">
      <div><b>Fabric</b><span>${product.fabric}</span></div>
      <div><b>Length</b><span>${product.length}</span></div>
      <div><b>Fit</b><span>${product.fit}</span></div>
    </div>
  `;

  const others = PRODUCTS.filter((p) => p.id !== product.id);
  $('#similar').innerHTML = others
    .map(
      (p) => `
    <a class="pdp__card" href="./buy.html?id=${p.id}&w=2">
      <span class="pdp__card-img" data-src="${p.looks?.[2] || p.looks?.[0]}"></span>
      <span class="pdp__card-name">${p.name}</span>
      <span class="pdp__card-meta">${p.colorway} · ${money(p.price)}</span>
    </a>
  `
    )
    .join('');
  const lazySimilar = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const el = en.target;
        if (!en.isIntersecting || el.style.backgroundImage) return;
        el.style.backgroundImage = `url(${el.dataset.src})`;
        lazySimilar.unobserve(el);
      });
    },
    { rootMargin: '120px' }
  );
  $$('#similar [data-src]').forEach((el) => lazySimilar.observe(el));

  bindInfo();
  $$('#thumbs [data-shot]').forEach((t) => t.addEventListener('click', () => goToShot(+t.dataset.shot)));
  showShot();
}

function goToShot(i) {
  const len = buildGallery(state.product).length;
  state.shot = ((i % len) + len) % len;
  showShot();
}

function bindInfo() {
  $$('[data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      render();
    })
  );
  $$('[data-q]').forEach((b) =>
    b.addEventListener('click', () => {
      state.qty = Math.max(1, state.qty + Number(b.dataset.q));
      render();
    })
  );
  $('#addBag')?.addEventListener('click', addToBag);
  $('#inspectBtn')?.addEventListener('click', () => goToShot(buildGallery(state.product).length - 1));
}

function addToBag() {
  const product = state.product;
  const existing = state.cart.find((x) => x.id === product.id && x.size === state.size);
  if (existing) existing.qty += state.qty;
  else state.cart.push({ id: product.id, qty: state.qty, size: state.size });
  saveBag(state.cart);
  renderCart();
  toast(`${product.name} ${product.colorway} · ${state.size} added`);
  bumpBadge();
}

function bumpBadge() {
  const count = state.cart.reduce((n, x) => n + x.qty, 0);
  const badge = $('#cartCount');
  badge.textContent = count;
  badge.classList.toggle('is-on', count > 0);
}

function renderCart() {
  const count = state.cart.reduce((n, x) => n + x.qty, 0);
  const badge = $('#cartCount');
  badge.textContent = count;
  badge.classList.toggle('is-on', count > 0);
  const items = $('#cartItems');
  const empty = $('#cartEmpty');
  if (state.cart.length) {
    empty.classList.add('is-hidden');
    items.innerHTML = state.cart
      .map((row) => {
        const p = PRODUCTS.find((x) => x.id === row.id);
        return `<div class="cart__item">
        <span class="cart__item-thumb" style="background-image:url(${p.looks?.[0] || p.background})"></span>
        <div class="cart__item-meta">
          <div class="cart__item-name">${p.name} ${p.colorway}</div>
          <div class="cart__item-gender">Size ${row.size}</div>
        </div>
        <div class="cart__item-price">${money(p.price * row.qty)}</div>
      </div>`;
      })
      .join('');
  } else {
    items.innerHTML = '';
    empty.classList.remove('is-hidden');
  }
  const total = state.cart.reduce((sum, row) => {
    const p = PRODUCTS.find((x) => x.id === row.id);
    return sum + p.price * row.qty;
  }, 0);
  $('#cartTotal').textContent = money(total);
}

function openCart() {
  $('#cart').classList.add('is-open');
  $('#scrim').classList.add('is-open');
}

function closeCart() {
  $('#cart').classList.remove('is-open');
  $('#scrim').classList.remove('is-open');
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('is-on'), 2200);
}

$('#prevShot').addEventListener('click', () => goToShot(state.shot - 1));
$('#nextShot').addEventListener('click', () => goToShot(state.shot + 1));
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') goToShot(state.shot + 1);
  if (e.key === 'ArrowLeft') goToShot(state.shot - 1);
  if (e.key === 'Escape') closeCart();
});

let swipeX = 0;
$('#stage').addEventListener('pointerdown', (e) => {
  swipeX = e.clientX;
});
$('#stage').addEventListener('pointerup', (e) => {
  if (buildGallery(state.product)[state.shot]?.type === '3d') return;
  const dx = e.clientX - swipeX;
  if (dx > 40) goToShot(state.shot - 1);
  if (dx < -40) goToShot(state.shot + 1);
});

$('#navCart').addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);
$('#scrim').addEventListener('click', closeCart);

const burger = $('#navBurger');
const links = $('#navLinks');
burger?.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});

render();
renderCart();
