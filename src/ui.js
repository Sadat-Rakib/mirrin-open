// MIRRIN — campaign chrome: loader, backgrounds, hero copy, sidecards, picker,
// shop cards, cart drawer, demo checkout. The 3D scene talks to us through callbacks.

import { PRODUCTS, BAG_KEY, BG_MODE, money, wordmarkHTML } from './products.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad2 = (n) => String(n).padStart(2, '0');

const loadBag = () => {
  try {
    return JSON.parse(localStorage.getItem(BAG_KEY) || '[]');
  } catch {
    return [];
  }
};
const saveBag = (bag) => {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  } catch {
    /* private mode */
  }
};

export class App {
  constructor(products) {
    this.products = products;
    this.scene = null;
    this.active = 0;
    this.thumbs = {};
    this.cart = loadBag();
    this.size = 'M';
    this.qty = 1;
    this.bgFront = $('#bgA');
    this.bgBack = $('#bgB');
    this._preload();
    this._buildStatic();
    this._bindChrome();
    this._observe();
    this._renderCart();
    this._bumpBadge();
  }

  /* ---------------- scene wiring ---------------- */

  bindScene(scene) {
    this.scene = scene;
    $('#nextBtn').addEventListener('click', () => scene.next());
    $('#prevBtn').addEventListener('click', () => scene.prev());
    $('#labelShop')?.addEventListener('click', () => this.openShop(this.products[this.active].id));
    $('#markShop')?.addEventListener('click', () => this.openShop(this.products[this.active].id));
    $('#markShop')?.addEventListener('pointerenter', () => {
      if (this.scene && this.scene._gust) this.scene._gust(0.18, 0);
    });
    $$('#picker [data-pick]').forEach((btn) => {
      btn.addEventListener('pointerenter', () => this._preview(this.products[+btn.dataset.pick]));
      btn.addEventListener('pointerleave', () => this._preview(this.products[this.active]));
      btn.addEventListener('click', () => scene.goTo(+btn.dataset.pick));
    });
  }

  _preview(p) {
    if (!p) return;
    this._setAccent(p);
    this._swapBackground(p);
    const mark = $('#heroMark');
    if (mark) mark.innerHTML = wordmarkHTML(p);
  }

  _preload() {
    const first = this.products[0];
    const img = new Image();
    img.src = first.background;
    this._paintLayer(this.bgFront, first, { video: false });
    this._setAccent(first);
    this._bgId = first.id;
  }

  /* ---------------- static sections ---------------- */

  _buildStatic() {
    const wrap = $('#collectionCards');
    wrap.innerHTML = this.products
      .map(
        (p) => `
      <article class="pcard reveal" style="--pc-accent:${p.accent}" data-id="${p.id}">
        <div class="pcard__media" data-media="${p.id}" data-bg="${p.background}">
          <span class="pcard__stage">
            <span class="pcard__jacket" data-jacket="${p.id}"></span>
          </span>
          <span class="pcard__badge">${pad2(p.index)} / ${p.colorway}</span>
          <button class="pcard__view" data-view="${p.id}" aria-label="View ${p.name} in 3D"></button>
        </div>
        <div class="pcard__looks">
          ${(p.looks || [])
            .slice(0, 3)
            .map(
              (src, i) =>
                `<button type="button" class="pcard__look" data-look="${p.id}" data-src="${src}" aria-label="${p.name} look ${i + 1}"></button>`
            )
            .join('')}
        </div>
        <div class="pcard__body">
          <div class="pcard__name">${p.name}</div>
          <div class="pcard__gender">${p.colorway} · ${p.gender}</div>
          <div class="pcard__foot">
            <span class="pcard__price">${money(p.price)}</span>
            <button class="pcard__add" data-add="${p.id}">BUY</button>
          </div>
        </div>
      </article>`
      )
      .join('');

    $$('[data-add]', wrap).forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openShop(btn.dataset.add);
      })
    );
    $$('[data-view]', wrap).forEach((btn) =>
      btn.addEventListener('click', () => {
        const i = this.products.findIndex((p) => p.id === btn.dataset.view);
        if (this.scene) this.scene.goTo(i);
        this._scrollTo('#top');
      })
    );

    $$('.pcard', wrap).forEach((card) => {
      const product = this.products.find((p) => p.id === card.dataset.id);
      const stage = card.querySelector('.pcard__stage');
      card.addEventListener('pointerenter', () => this._preview(product));
      card.addEventListener('pointerleave', () => {
        this._preview(this.products[this.active]);
        if (stage) stage.style.transform = '';
      });
      card.addEventListener('pointermove', (e) => {
        if (card.classList.contains('has-gl')) return;
        const r = card.getBoundingClientRect();
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 38;
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -20;
        if (stage) stage.style.transform = `rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
      });
    });

    // look thumbs: hover swaps the card media to the still, leave restores the 3D jacket
    const showLook = (thumb) => {
      const card = thumb.closest('.pcard');
      const jacket = card.querySelector('.pcard__jacket');
      const media = card.querySelector('.pcard__media');
      $$('.pcard__look', card).forEach((t) => t.classList.toggle('is-on', t === thumb));
      card.classList.add('is-stitch');
      if (jacket) jacket.style.opacity = '0';
      media.style.backgroundImage = `url(${thumb.dataset.src})`;
      media.style.backgroundSize = 'cover';
      media.style.backgroundPosition = 'center 18%';
      if (this.scene) this.scene.setCardStitch(card.dataset.id, true);
    };
    const restoreCard = (card) => {
      const jacket = card.querySelector('.pcard__jacket');
      const media = card.querySelector('.pcard__media');
      card.classList.remove('is-stitch');
      if (jacket) jacket.style.opacity = card.classList.contains('has-gl') ? '0' : '1';
      media.style.backgroundImage = `url(${media.dataset.bg})`;
      media.style.backgroundPosition = '';
      $$('.pcard__look', card).forEach((t) => t.classList.remove('is-on'));
      if (this.scene) this.scene.setCardStitch(card.dataset.id, false);
    };
    $$('[data-look]', wrap).forEach((thumb) => {
      thumb.addEventListener('pointerenter', (e) => {
        e.stopPropagation();
        showLook(thumb);
      });
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (thumb.classList.contains('is-on')) restoreCard(thumb.closest('.pcard'));
        else showLook(thumb);
      });
    });
    $$('.pcard__looks', wrap).forEach((row) => {
      row.addEventListener('pointerleave', () => restoreCard(row.closest('.pcard')));
    });
  }

  /* ---------------- theming + background ---------------- */

  _setAccent(p) {
    const root = document.documentElement.style;
    root.setProperty('--accent', p.accent);
    root.setProperty('--accent-soft', p.accentSoft);
    root.setProperty('--glow', p.glow);
    const washes = {
      lime: 'rgba(182,240,0,0.12)',
      blue: 'rgba(47,143,255,0.16)',
      pink: 'rgba(255,46,134,0.18)',
    };
    root.setProperty('--wash', washes[p.id] || washes.lime);
    document.documentElement.dataset.theme = p.id;
  }

  _paintLayer(layer, p, { video = true } = {}) {
    if (!layer || !p) return;
    layer.style.backgroundImage = `url(${p.background})`;
    const el = layer.querySelector('video');
    if (el && video !== false) {
      if (p.loop) {
        if (el.dataset.src !== p.loop) {
          el.dataset.src = p.loop;
          el.preload = 'metadata';
          el.src = p.loop;
        }
        el.muted = true;
        const start = () => el.play().catch(() => {});
        if (el.readyState >= 2) start();
        else el.addEventListener('canplay', start, { once: true });
      } else {
        el.pause();
        el.removeAttribute('src');
        el.load();
      }
    }
  }

  _swapBackground(p) {
    if (!p || this._bgId === p.id) return;
    this._bgId = p.id;
    this._paintLayer(this.bgBack, p);
    this.bgBack.classList.add('is-active');
    this.bgFront.classList.remove('is-active');
    const oldVideo = this.bgFront.querySelector('video');
    const old = this.bgFront;
    this.bgFront = this.bgBack;
    this.bgBack = old;
    setTimeout(() => {
      if (oldVideo && this.bgBack.contains(oldVideo)) oldVideo.pause();
    }, 480);
  }

  /* ---------------- loader + active state ---------------- */

  setProgress(t) {
    const pct = Math.round(Math.max(0, Math.min(1, t)) * 100);
    $('#loaderFill').style.width = pct + '%';
    $('#loaderPct').textContent = pct;
  }

  onReady(product) {
    const loader = $('#loader');
    loader.classList.add('is-done');
    setTimeout(() => (loader.style.display = 'none'), 950);
    this._applyActive(product, 0);
    $$('.hero .reveal').forEach((el, i) => setTimeout(() => el.classList.add('is-in'), 120 + i * 90));
    const paint = () => this._paintLayer(this.bgFront, this.products[this.active]);
    if ('requestIdleCallback' in window) requestIdleCallback(paint, { timeout: 1400 });
    else setTimeout(paint, 480);
  }

  onActiveChange(product, index) {
    this._applyActive(product, index);
  }

  _applyActive(p, index) {
    this.active = index;
    this._setAccent(p);
    this._swapBackground(p);
    $('#labelIdx').textContent = pad2(p.index);
    $('#labelName').textContent = p.name;
    $('#labelGender').textContent = `${p.colorway} · ${p.gender}`;
    const price = $('#labelPrice');
    if (price) price.textContent = money(p.price);
    const mark = $('#heroMark');
    if (mark) mark.innerHTML = wordmarkHTML(p);
    $$('#picker [data-pick]').forEach((btn) => btn.classList.toggle('is-on', +btn.dataset.pick === index));
    $$('.dash').forEach((d, i) => d.classList.toggle('is-active', i === index));
    this._renderSidecards();
  }

  _renderSidecards() {
    const wrap = $('#sidecards');
    const others = this.products.filter((_, i) => i !== this.active);
    wrap.innerHTML = others
      .map(
        (p) => `
      <button class="sidecard" data-go="${p.id}">
        <span class="sidecard__thumb" style="background-image:url(${this.thumbs[p.id] || p.poster})"></span>
        <span class="sidecard__meta">
          <span class="sidecard__name">${p.name}</span>
          <span class="sidecard__color">${p.colorway}</span>
        </span>
      </button>`
      )
      .join('');
    $$('.sidecard', wrap).forEach((card) => {
      const i = this.products.findIndex((p) => p.id === card.dataset.go);
      card.addEventListener('pointerenter', () => this._preview(this.products[i]));
      card.addEventListener('pointerleave', () => this._preview(this.products[this.active]));
      card.addEventListener('click', () => {
        if (this.scene) this.scene.goTo(i);
      });
    });
  }

  setThumbs(thumbs) {
    this.thumbs = thumbs || {};
    this._renderSidecards();
    this.products.forEach((p) => {
      const el = $(`[data-jacket="${p.id}"]`);
      if (el && this.thumbs[p.id]) el.style.backgroundImage = `url(${this.thumbs[p.id]})`;
    });
  }

  hideDragHint() {}

  setParallax() {}

  /* ---------------- shop navigation ---------------- */

  openShop(id) {
    const p = this.products.find((x) => x.id === id) || this.products[this.active];
    window.location.href = `./buy.html?id=${encodeURIComponent(p.id)}&w=2`;
  }

  closeShop() {
    $('#buySheet').classList.remove('is-open');
    $('#buySheet').setAttribute('aria-hidden', 'true');
    $('#sheetScrim').classList.remove('is-open');
    document.body.classList.remove('is-locked');
  }

  /* ---------------- cart ---------------- */

  addToCart(id) {
    const p = this.products.find((x) => x.id === id);
    if (!p) return;
    const existing = this.cart.find((x) => x.id === id);
    const qty = this.qty || 1;
    if (existing) existing.qty += qty;
    else this.cart.push({ id, qty, size: this.size });
    saveBag(this.cart);
    this._renderCart();
    this._bumpBadge();
    this.toast(`${p.name} added to bag`);
    this.openCart();
  }

  _bumpBadge() {
    const count = this.cart.reduce((n, x) => n + x.qty, 0);
    const badge = $('#cartCount');
    badge.textContent = count;
    badge.classList.toggle('is-on', count > 0);
  }

  _renderCart() {
    const items = $('#cartItems');
    const empty = $('#cartEmpty');
    if (this.cart.length) {
      empty.classList.add('is-hidden');
      items.innerHTML = this.cart
        .map((row) => {
          const p = this.products.find((x) => x.id === row.id);
          return `
        <div class="cart__item">
          <span class="cart__item-thumb" style="background-image:url(${this.thumbs[p.id] || p.background})"></span>
          <div class="cart__item-meta">
            <div class="cart__item-name">${p.name}</div>
            <div class="cart__item-gender">${p.gender}</div>
            <div class="cart__qty">
              <button data-dec="${p.id}">-</button><span>${row.qty}</span><button data-inc="${p.id}">+</button>
            </div>
            <button class="cart__item-rm" data-rm="${p.id}">Remove</button>
          </div>
          <div class="cart__item-price">${money(p.price * row.qty)}</div>
        </div>`;
        })
        .join('');
      $$('[data-inc]', items).forEach((b) => b.addEventListener('click', () => this._qty(b.dataset.inc, 1)));
      $$('[data-dec]', items).forEach((b) => b.addEventListener('click', () => this._qty(b.dataset.dec, -1)));
      $$('[data-rm]', items).forEach((b) => b.addEventListener('click', () => this._remove(b.dataset.rm)));
    } else {
      items.innerHTML = '';
      empty.classList.remove('is-hidden');
    }
    const total = this.cart.reduce((sum, row) => {
      const p = this.products.find((x) => x.id === row.id);
      return sum + p.price * row.qty;
    }, 0);
    $('#cartTotal').textContent = money(total);
    $('#payAmount').textContent = money(total);
  }

  _qty(id, delta) {
    const row = this.cart.find((x) => x.id === id);
    if (!row) return;
    row.qty += delta;
    if (row.qty <= 0) this.cart = this.cart.filter((x) => x.id !== id);
    saveBag(this.cart);
    this._renderCart();
    this._bumpBadge();
  }

  _remove(id) {
    this.cart = this.cart.filter((x) => x.id !== id);
    saveBag(this.cart);
    this._renderCart();
    this._bumpBadge();
  }

  openCart() {
    $('#cart').classList.add('is-open');
    $('#scrim').classList.add('is-open');
  }

  closeCart() {
    $('#cart').classList.remove('is-open');
    $('#scrim').classList.remove('is-open');
  }

  openModal(sel) {
    $(sel).classList.add('is-open');
  }

  closeModal(sel) {
    $(sel).classList.remove('is-open');
  }

  toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('is-on'), 2400);
  }

  /* ---------------- page chrome ---------------- */

  _bindChrome() {
    $$('.nav__bg-btn').forEach((btn) =>
      btn.classList.toggle('is-on', btn.dataset.bg === (BG_MODE === 'pass' ? 'mountain' : 'frame'))
    );
    const burger = $('#navBurger');
    const links = $('#navLinks');
    burger?.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('#navLinks a').forEach((a) =>
      a.addEventListener('click', () => {
        links.classList.remove('is-open');
        burger?.setAttribute('aria-expanded', 'false');
      })
    );
    $('#navCart').addEventListener('click', () => this.openCart());
    $('#cartClose').addEventListener('click', () => this.closeCart());
    $('#scrim').addEventListener('click', () => this.closeCart());
    $('#sheetScrim')?.addEventListener('click', () => this.closeShop());
    $('#navUser').addEventListener('click', () => this.openModal('#waitModal'));
    $('#navSearch').addEventListener('click', () => this.toast('Search is coming soon'));
    $('#checkoutBtn').addEventListener('click', () => {
      if (!this.cart.length) {
        this.toast('Your bag is empty');
        return;
      }
      this.closeCart();
      this.openModal('#checkoutModal');
    });
    $('#checkoutClose').addEventListener('click', () => this.closeModal('#checkoutModal'));
    $('#waitClose').addEventListener('click', () => this.closeModal('#waitModal'));
    $('#checkoutForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.closeModal('#checkoutModal');
      this.cart = [];
      saveBag(this.cart);
      this._renderCart();
      this._bumpBadge();
      this.toast('Order placed — this is a demo, no payment was taken');
      e.target.reset();
    });
    $('#waitForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.closeModal('#waitModal');
      this.toast("You're on the list");
      e.target.reset();
    });
    $$('[data-scroll]').forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this._scrollTo(a.getAttribute('href'));
      })
    );
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeShop();
        this.closeCart();
        this.closeModal('#checkoutModal');
        this.closeModal('#waitModal');
      }
    });
    const nav = $('.nav');
    const stuck = () => nav.classList.toggle('is-stuck', window.scrollY > 40);
    window.addEventListener('scroll', stuck, { passive: true });
    stuck();
  }

  _scrollTo(sel) {
    const el = $(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  _observe() {
    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            revealIO.unobserve(en.target);
          }
        });
      },
      { threshold: 0.16 }
    );
    $$('.reveal').forEach((el) => {
      if (!el.closest('.hero')) revealIO.observe(el);
    });

    const runningTick = () => {
      if (document.hidden) {
        if (this.scene) this.scene.setRunning(false);
        return;
      }
      const heroVisible = this._heroVisible();
      if (this.scene) this.scene.setRunning(heroVisible || this.shopOpen);
      $('#scene').classList.toggle('is-hidden', !heroVisible && !this.shopOpen);
    };
    const runningIO = new IntersectionObserver(() => runningTick(), { threshold: 0.02 });
    runningIO.observe($('#hero'));
    const shop = $('#shop');
    if (shop) {
      runningIO.observe(shop);
      const cardIO = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            $$('.pcard__media[data-bg]').forEach((el) => {
              if (el.dataset.bg) el.style.backgroundImage = `url(${el.dataset.bg})`;
            });
            $$('.pcard__look[data-src]').forEach((el) => {
              if (!el.style.backgroundImage) el.style.backgroundImage = `url(${el.dataset.src})`;
            });
            if (this.scene && this.scene.mountCardPreviews) this.scene.mountCardPreviews();
            cardIO.disconnect();
          }
        },
        { rootMargin: '240px' }
      );
      cardIO.observe(shop);
    }
    const freedom = $('#freedom');
    if (freedom && freedom.dataset.bg) {
      const freeIO = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            freedom.style.backgroundImage = `linear-gradient(180deg,rgba(5,6,10,.55),rgba(5,6,10,.72)),url('${freedom.dataset.bg}')`;
            freeIO.disconnect();
          }
        },
        { rootMargin: '160px' }
      );
      freeIO.observe(freedom);
    }
    document.addEventListener('visibilitychange', runningTick);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const videos = $$('.bg__layer video');
    if (reduced) {
      videos.forEach((v) => {
        v.pause();
        v.removeAttribute('autoplay');
      });
    } else {
      const videoIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.target instanceof HTMLVideoElement) {
              if (en.isIntersecting) en.target.play().catch(() => {});
              else en.target.pause();
            }
          });
        },
        { threshold: 0.05 }
      );
      videos.forEach((v) => videoIO.observe(v));
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) $$('video').forEach((v) => v.pause());
      else if (!reduced) $$('.bg__layer.is-active video').forEach((v) => v.play().catch(() => {}));
    });
  }

  _heroVisible() {
    const r = $('#hero').getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
}
