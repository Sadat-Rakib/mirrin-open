// MIRRIN — 3D engine. Open-coat puffer: the front halves peel from the side seams
// (barn doors, never a zipper-axis spin), breathe on a wind field, and follow a
// spring-damped pointer. Two exports: Scene3D (campaign hero) and JacketInspect (PDP).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const { damp, clamp } = THREE.MathUtils;

/* ------------------------------------------------------------------ */
/* Shared wind / open-coat vertex snippet (injected after begin_vertex) */
/* ------------------------------------------------------------------ */

const WIND_GLSL = /* glsl */ `
  float _minY = uSwayBounds.x;
  float _maxY = uSwayBounds.y;
  float _h = clamp((transformed.y - _minY) / max(0.0001, (_maxY - _minY)), 0.0, 1.0);
  float _w = pow(1.0 - _h, 1.55);
  float _t = uTime;
  float _side = sign(transformed.x + 1e-4);

  // Front torso only. Sleeves, back, and collar stay put so the silhouette
  // doesn't pancake when you orbit to the side.
  float _torso = 1.0 - smoothstep(0.28, 0.52, abs(transformed.x));
  float _front = smoothstep(0.06, 0.20, transformed.z);
  float _notCollar = 1.0 - smoothstep(0.58, 0.84, _h);
  float _flap = _torso * _front * _notCollar;

  // Hinge on the side seam. Weight 1 at the zipper, 0 at the hinge.
  float _hinge = 0.40 * _side;
  float _along = clamp((_hinge - transformed.x) / (_hinge + 1e-4), 0.0, 1.0);
  float _mask = _flap * _along * uActive;

  float _ang = _side * uOpen * _mask;
  vec3 _q = transformed;
  _q.x -= _hinge;
  float _ca = cos(_ang);
  float _sa = sin(_ang);
  float _nx = _q.x * _ca + _q.z * _sa;
  float _nz = -_q.x * _sa + _q.z * _ca;
  transformed.x = _nx + _hinge;
  transformed.z = _nz;

  // Live flutter on the peeled flaps — outward, not inward
  float _live = sin(_t * 2.4 + transformed.y * 4.6 + _side * 1.8);
  float _live2 = sin(_t * 3.1 + transformed.y * 2.2);
  transformed.x += _side * abs(_live) * uFlap * _mask * 0.055;
  transformed.z += _live2 * uFlap * _mask * 0.044;

  // Hem / sleeve breeze (does not open the coat)
  float _f1 = sin(transformed.y * 3.0 + _t * 1.7 + transformed.x * 2.2);
  float _f2 = sin(transformed.x * 4.6 - _t * 2.15) * 0.6;
  float _f3 = sin(transformed.z * 5.2 + _t * 1.35) * 0.5;
  vec3 _disp = vec3(0.0);
  float _f4 = sin(transformed.y * 6.1 + _t * 2.35 + _side);
  _disp.x += (_f1 + _f2 + _f4 * 0.45) * uAmp * _w;
  _disp.z += (_f3 + _f4 * 0.3) * uAmp * 0.7 * _w;
  float _gust = uWindStrength;
  _disp.x += uWindDir.x * _gust * uAmp * 3.4 * (0.35 + _w);
  _disp.z += uWindDir.y * _gust * uAmp * 3.4 * (0.35 + _w);
  _disp.y += sin(transformed.x * 3.0 + _t * 2.0) * _gust * uAmp * 1.3 * _w;
  transformed += _disp * max(uActive, 0.35);
`;

const WIND_UNIFORM_DECL = /* glsl */ `
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform vec2 uSwayBounds;
uniform float uAmp;
uniform float uActive;
uniform float uOpen;
uniform float uFlap;
`;

const FRAGMENT_BOOST = /* glsl */ `
#include <map_fragment>
  float _luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = mix(vec3(_luma), diffuseColor.rgb, 1.48);
  diffuseColor.rgb = pow(max(diffuseColor.rgb, 0.0), vec3(1.1));
`;

function attachWind(material, uniforms, { fragmentBoost = true, cacheKey } = {}) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      WIND_UNIFORM_DECL +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_GLSL);
    if (fragmentBoost) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', FRAGMENT_BOOST);
    }
  };
  material.customProgramCacheKey = () => cacheKey;
  material.needsUpdate = true;
}

function makeWindUniforms(boundsY, { active = 1, reduced = false } = {}) {
  return {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(0, 0) },
    uWindStrength: { value: 0 },
    uSwayBounds: { value: new THREE.Vector2(-boundsY / 2, boundsY / 2) },
    uAmp: { value: reduced ? 0 : 0.044 },
    uActive: { value: active },
    uOpen: { value: reduced ? 0.35 : 0.72 },
    uFlap: { value: reduced ? 0 : 1 },
  };
}

/* ------------------------------------------------------------------ */
/* Gyro (device orientation) — same spring target as the pointer       */
/* ------------------------------------------------------------------ */

function isTouchLike() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if ((navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window) return true;
  return window.matchMedia('(pointer: coarse)').matches;
}

function orientationAngle() {
  if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
  return typeof window.orientation === 'number' ? window.orientation : 0;
}

function tiltNeedsPermission() {
  const doe = window.DeviceOrientationEvent;
  const dme = window.DeviceMotionEvent;
  return !!((doe && typeof doe.requestPermission === 'function') || (dme && typeof dme.requestPermission === 'function'));
}

function hideTiltButtons() {
  document.querySelectorAll('[data-tilt-enable]').forEach((btn) => {
    btn.hidden = true;
    btn.setAttribute('aria-hidden', 'true');
  });
}

export function makeTilt(onTilt) {
  const state = {
    live: false,
    listening: false,
    pending: false,
    orientLive: false,
    baseB: null,
    baseG: null,
    request: () => {},
  };
  if (!isTouchLike() || (typeof window.DeviceOrientationEvent === 'undefined' && typeof window.DeviceMotionEvent === 'undefined')) {
    hideTiltButtons();
    return state;
  }
  const RANGE = 8;
  const goLive = () => {
    if (!state.live) {
      state.live = true;
      hideTiltButtons();
    }
  };
  const onOrient = (e) => {
    if (e.beta == null || e.gamma == null) return;
    if (state.baseB == null) {
      state.baseB = e.beta;
      state.baseG = e.gamma;
    }
    let x = clamp((e.gamma - state.baseG) / RANGE, -1, 1);
    let y = clamp((e.beta - state.baseB) / RANGE, -1, 1);
    const angle = (orientationAngle() % 360 + 360) % 360;
    if (angle === 90) {
      const t = x;
      x = y;
      y = -t;
    } else if (angle === 180) {
      x = -x;
      y = -y;
    } else if (angle === 270) {
      const t = x;
      x = -y;
      y = t;
    }
    state.orientLive = true;
    goLive();
    onTilt(x, y);
  };
  const onMotion = (e) => {
    if (state.orientLive) return;
    const g = e.accelerationIncludingGravity;
    if (!g || g.x == null || g.y == null) return;
    const angle = (orientationAngle() % 360 + 360) % 360;
    let x = clamp(g.x / 4.5, -1, 1);
    let y = clamp(-g.y / 4.5, -1, 1);
    if (angle === 90) {
      const t = x;
      x = y;
      y = -t;
    } else if (angle === 180) {
      x = -x;
      y = -y;
    } else if (angle === 270) {
      const t = x;
      x = -y;
      y = t;
    }
    goLive();
    onTilt(x, y);
  };
  const recalibrate = () => {
    state.baseB = null;
    state.baseG = null;
  };
  window.addEventListener('orientationchange', recalibrate, { passive: true });
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', recalibrate);
  }
  const listen = () => {
    if (state.listening) return;
    state.listening = true;
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    window.addEventListener('deviceorientationabsolute', onOrient, { passive: true });
    window.addEventListener('devicemotion', onMotion, { passive: true });
  };
  const request = () => {
    if (state.listening || state.pending) return;
    const doe = window.DeviceOrientationEvent;
    const dme = window.DeviceMotionEvent;
    const needOrient = !!(doe && typeof doe.requestPermission === 'function');
    const needMotion = !!(dme && typeof dme.requestPermission === 'function');
    if (needOrient || needMotion) {
      state.pending = true;
      let pOrient;
      let pMotion;
      try {
        if (needOrient) pOrient = doe.requestPermission();
        if (needMotion) pMotion = dme.requestPermission();
      } catch {
        state.pending = false;
        return;
      }
      Promise.all([pOrient || Promise.resolve('granted'), pMotion || Promise.resolve('granted')])
        .then((results) => {
          state.pending = false;
          if (results.some((r) => r === 'granted')) listen();
        })
        .catch(() => {
          state.pending = false;
        });
      return;
    }
    listen();
  };
  state.request = request;
  const bindClick = (el) => {
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      request();
    });
  };
  document.querySelectorAll('[data-tilt-enable]').forEach((btn) => {
    btn.hidden = false;
    btn.removeAttribute('aria-hidden');
    bindClick(btn);
  });
  bindClick(document.getElementById('heroOrbit'));
  bindClick(document.getElementById('inspect3d'));
  if (!tiltNeedsPermission()) request();
  return state;
}

/* ------------------------------------------------------------------ */
/* Podium                                                              */
/* ------------------------------------------------------------------ */

function makePodium(themeColor) {
  const group = new THREE.Group();
  const emissive = new THREE.Color(themeColor);
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: 0x05060a,
    emissive,
    emissiveIntensity: 1.8,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 0.85,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.016, 12, 96), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.42;
  group.add(ring);
  const ring2Mat = ringMat.clone();
  ring2Mat.emissiveIntensity = 1.6;
  ring2Mat.opacity = 0.55;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.006, 8, 80), ring2Mat);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = -1.46;
  group.add(ring2);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.18, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      roughness: 0.7,
      metalness: 0.05,
      transparent: true,
      opacity: 0.22,
      envMapIntensity: 0.2,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -1.44;
  group.add(disc);
  return { group, ringMat, ring2Mat };
}

/* ------------------------------------------------------------------ */
/* Scene3D — campaign hero                                             */
/* ------------------------------------------------------------------ */

export class Scene3D {
  constructor(canvas, products, cb = {}) {
    this.canvas = canvas;
    this.products = products;
    this.cb = cb;
    this.active = 0;
    this.entries = [];
    this.running = true;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerTarget = new THREE.Vector2(0, 0);
    this.pointerVel = new THREE.Vector2(0, 0);
    this.dragging = false;
    this.lastX = 0;
    this.spinVel = 0;
    this.spinTarget = 0;
    this.spin = 0;
    this.idleTime = 0;
    this.windDir = new THREE.Vector2(0, 0);
    this.windStrength = 0;
    this.hasInteracted = false;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.camBaseX = 0;
    this.camBaseY = 0.22;
    this._init();
  }

  _init() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.25 : 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
    this._applyFrame();
    this.camera.lookAt(0, 0.12, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.08);
    this.scene.environment = envRT.texture;
    this.scene.environmentIntensity = 0.32;
    pmrem.dispose();

    const podium = makePodium(0x05060a);
    this.podium = podium.group;
    this.podiumRingMat = podium.ringMat;
    this.podiumRingMat2 = podium.ring2Mat;
    this.scene.add(this.podium);

    this.ambient = new THREE.AmbientLight(0x1a1c22, 0.12);
    this.scene.add(this.ambient);
    this.key = new THREE.DirectionalLight(0xfff4e8, 1.15);
    this.key.position.set(2.5, 4, 5);
    this.scene.add(this.key);
    this.fill = new THREE.DirectionalLight(0x6a7388, 0.18);
    this.fill.position.set(-4, 1, 2);
    this.scene.add(this.fill);
    this.rimL = new THREE.PointLight(0xffffff, 22, 40, 2);
    this.rimL.position.set(-4.5, 1.5, -2.5);
    this.scene.add(this.rimL);
    this.rimR = new THREE.PointLight(0xffffff, 22, 40, 2);
    this.rimR.position.set(4.5, 2, -2);
    this.scene.add(this.rimR);
    this.spec = new THREE.PointLight(0xffffff, 10, 16, 2);
    this.spec.position.set(0.8, 2.4, 3.2);
    this.scene.add(this.spec);
    this.under = new THREE.PointLight(0xffffff, 5, 18, 2);
    this.under.position.set(0, -2.2, 1.5);
    this.scene.add(this.under);
    this.rimBaseL = this.rimL.position.clone();
    this.rimBaseR = this.rimR.position.clone();
    this.keyBase = this.key.position.clone();

    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this._inflight = {};

    window.addEventListener('resize', () => this._resize());
    this._bindPointer();
    this._gyro = makeTilt((x, y) => {
      if (!this.dragging) {
        this.pointerTarget.set(x, y);
        this._gust(x * 0.07, 0);
      }
    });
    this._loadAll();
    renderer.setAnimationLoop(() => this._frame());
  }

  _viewFit() {
    const w = window.innerWidth;
    const portrait = window.innerHeight >= w;
    if (w < 720) {
      return portrait
        ? { fov: 38, z: 9.15, y: -0.12, lookY: 0, centerScale: 0.64, side: 8.5, flankScale: 0.01, flankY: -0.4, flankZ: -4, showFlank: false }
        : { fov: 34, z: 7.6, y: 0.28, lookY: 0, centerScale: 0.9, side: 8.5, flankScale: 0.01, flankY: -0.4, flankZ: -4, showFlank: false };
    }
    if (w < 1100) {
      return { fov: 34, z: 6.7, y: 0.32, lookY: 0.18, centerScale: 1, side: 2.4, flankScale: 0.32, flankY: -0.22, flankZ: -0.9, showFlank: true };
    }
    return { fov: 34, z: 6.4, y: 0.35, lookY: 0.18, centerScale: 1, side: 3.05, flankScale: 0.38, flankY: -0.28, flankZ: -1.2, showFlank: true };
  }

  _applyFrame() {
    const fit = this._viewFit();
    this.camFrame = fit;
    this.camera.fov = fit.fov;
    this.camera.position.set(this.camBaseX, fit.y, fit.z);
    this.camBaseY = fit.y;
    this.camera.updateProjectionMatrix();
  }

  _layoutMetrics() {
    const fit = this.camFrame || this._viewFit();
    return { side: fit.side, scale: fit.flankScale, y: fit.flankY, z: fit.flankZ, show: fit.showFlank, centerScale: fit.centerScale };
  }

  _slotFor(index) {
    const dist = (index - this.active + 3) % 3;
    const m = this._layoutMetrics();
    if (dist === 0) return { x: 0, y: 0, scale: m.centerScale, z: 0, prom: 1, show: true };
    if (dist === 1) return { x: m.side, y: m.y, scale: m.scale, z: m.z, prom: 0, show: m.show };
    return { x: -m.side, y: m.y, scale: m.scale, z: m.z, prom: 0, show: m.show };
  }

  _applyLayout(snap) {
    this.entries.forEach((entry) => {
      if (!entry) return;
      const slot = this._slotFor(entry.index);
      entry.targetX = slot.x;
      entry.targetY = slot.y;
      entry.targetZ = slot.z;
      entry.targetScale = entry.baseScale * slot.scale;
      entry.prominence = slot.prom;
      entry.uniforms.uActive.value = slot.prom === 1 ? 1 : 0.4;
      entry.uniforms.uOpen.value = slot.prom === 1 ? (this.reduceMotion ? 0.35 : 0.72) : 0.28;
      entry.uniforms.uFlap.value = this.reduceMotion ? 0 : slot.prom === 1 ? 1 : 0.4;
      entry.holder.visible = slot.show;
      if (snap) {
        entry.curX = entry.targetX;
        entry.curY = entry.targetY;
        entry.curScale = entry.targetScale;
        entry.curProm = entry.prominence;
        entry.holder.position.set(entry.curX, entry.curY, slot.z);
        entry.holder.scale.setScalar(entry.curScale);
      }
    });
  }

  _sortDepth() {
    this.entries.forEach((entry) => {
      if (entry) entry.holder.renderOrder = entry.prominence === 1 ? 2 : 1;
    });
  }

  _ensure(index, onProgress) {
    if (this.entries[index]) return Promise.resolve(this.entries[index]);
    if (!this._inflight[index]) {
      this._inflight[index] = this._loadOne(this.products[index], index, onProgress).catch((err) => {
        delete this._inflight[index];
        throw err;
      });
    }
    return this._inflight[index];
  }

  async _loadAll() {
    try {
      await this._ensure(this.active, (t) => this.cb.onProgress && this.cb.onProgress(t * 0.9));
    } catch (err) {
      console.error('Model load failed', this.products[this.active].id, err);
    }
    this._applyLayout(true);
    this._themeFor(this.active);
    this._sortDepth();
    if (this.cb.onProgress) this.cb.onProgress(1);
    if (this.cb.onReady) this.cb.onReady(this.products[this.active]);
    [(this.active + 1) % 3, (this.active + 2) % 3].forEach((i) => {
      this._ensure(i)
        .then(() => {
          this._applyLayout(false);
          if (this._wantCards) this.mountCardPreviews();
        })
        .catch((err) => console.error('Model load failed', this.products[i].id, err));
    });
  }

  _loadOne(product, index, onProgress) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        product.model,
        (gltf) => {
          const root = gltf.scene;
          const box = new THREE.Box3().setFromObject(root);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          root.position.sub(center);
          const baseScale = 2.75 / (size.y || 1);
          const uniforms = makeWindUniforms(size.y, { active: index === this.active ? 1 : 0.45, reduced: this.reduceMotion });
          root.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = false;
              node.receiveShadow = false;
              node.material = this._upgradeMaterial(node.material, uniforms, product);
              node.frustumCulled = false;
            }
          });
          const spinner = new THREE.Group();
          spinner.add(root);
          const holder = new THREE.Group();
          holder.scale.setScalar(baseScale);
          holder.add(spinner);
          this.scene.add(holder);
          const entry = {
            product,
            index,
            holder,
            spinner,
            uniforms,
            baseScale,
            targetX: 0,
            targetY: 0,
            targetScale: baseScale,
            prominence: 0,
            curX: 0,
            curY: 0,
            curScale: baseScale,
            curProm: 0,
            bob: Math.random() * Math.PI * 2,
          };
          this.entries[index] = entry;
          resolve(entry);
        },
        (ev) => {
          if (ev.total && onProgress) onProgress(ev.loaded / ev.total);
        },
        (err) => reject(err)
      );
    });
  }

  _upgradeMaterial(src, uniforms, product) {
    const accent = new THREE.Color(product.accent);
    const albedo = src.color ? src.color.clone() : new THREE.Color(0xffffff);
    albedo.lerp(accent, 0.08);
    const mat = new THREE.MeshPhysicalMaterial({
      map: src.map || null,
      normalMap: src.normalMap || null,
      roughnessMap: src.roughnessMap || null,
      metalnessMap: null,
      color: albedo,
      roughness: 0.42,
      metalness: 0.0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      sheen: 0.35,
      sheenRoughness: 0.4,
      sheenColor: accent,
      iridescence: 0.0,
      envMapIntensity: 0.55,
      specularIntensity: 0.85,
      side: THREE.FrontSide,
    });
    if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    if (mat.normalMap) mat.normalScale = new THREE.Vector2(0.85, 0.85);
    attachWind(mat, uniforms, { cacheKey: 'mirrin-nylon-open-out-v3' });
    return mat;
  }

  _themeFor(index) {
    const p = this.products[index];
    const light = new THREE.Color(p.light);
    const rim = new THREE.Color(p.rim);
    this._lightTarget = { rimL: rim, rimR: light, under: light, spec: light };
    if (this.podiumRingMat) {
      this.podiumRingMat.emissive.copy(rim);
      this.podiumRingMat2.emissive.copy(light);
    }
  }

  goTo(index) {
    const next = ((index % 3) + 3) % 3;
    if (next === this.active) return;
    this.active = next;
    this.spinTarget = 0;
    this._themeFor(next);
    if (this.cb.onActiveChange) this.cb.onActiveChange(this.products[next], next);
    if (this.entries[next]) {
      this._applyLayout(false);
      this._sortDepth();
      return;
    }
    this._ensure(next)
      .then(() => {
        if (this.active === next) {
          this._applyLayout(false);
          this._sortDepth();
          if (this._wantCards) this.mountCardPreviews();
        }
      })
      .catch((err) => console.error('Model load failed', err));
  }

  next() {
    this.goTo((this.active + 1) % 3);
  }

  prev() {
    this.goTo((this.active + 2) % 3);
  }

  /* ---------------- card previews (shop section) ---------------- */

  mountCardPreviews() {
    this._wantCards = true;
    if (!this.cardPreviews) this.cardPreviews = [];
    const existing = new Set(this.cardPreviews.map((c) => c.product.id));
    if (!this.cardRenderer) {
      const offscreen = document.createElement('canvas');
      offscreen.setAttribute('aria-hidden', 'true');
      offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
      document.body.appendChild(offscreen);
      const renderer = new THREE.WebGLRenderer({
        canvas: offscreen,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.88;
      this.cardRenderer = renderer;
      const pmrem = new THREE.PMREMGenerator(renderer);
      this.cardEnv = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;
      pmrem.dispose();
      this._cardIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            const preview = this.cardPreviews.find((c) => c.canvas === en.target);
            if (preview) preview.onScreen = en.isIntersecting;
          });
        },
        { threshold: 0.04, rootMargin: '120px' }
      );
    }
    this.entries.forEach((entry) => {
      if (!entry || existing.has(entry.product.id)) return;
      const jacketEl = document.querySelector(`[data-jacket="${entry.product.id}"]`);
      const stage = jacketEl && jacketEl.parentElement;
      const card = jacketEl && jacketEl.closest('.pcard');
      if (!stage || !card) return;
      const canvas = document.createElement('canvas');
      canvas.className = 'pcard__gl';
      canvas.setAttribute('aria-hidden', 'true');
      stage.insertBefore(canvas, jacketEl);
      card.classList.add('has-gl');
      const ctx = canvas.getContext('2d');
      const uniforms = makeWindUniforms(entry.uniforms.uSwayBounds.value.y * 2, { active: 1, reduced: this.reduceMotion });
      uniforms.uWindStrength.value = 0.22;
      const scene = new THREE.Scene();
      scene.environment = this.cardEnv;
      scene.environmentIntensity = 0.32;
      scene.add(new THREE.AmbientLight(0x1a1c22, 0.16));
      const key = new THREE.DirectionalLight(0xfff4e8, 1.15);
      key.position.set(2.5, 4, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x6a7388, 0.18);
      fill.position.set(-4, 1, 2);
      scene.add(fill);
      const rimL = new THREE.PointLight(entry.product.rim, 22, 40, 2);
      rimL.position.set(-4.5, 1.5, -2.5);
      scene.add(rimL);
      const rimR = new THREE.PointLight(entry.product.light, 22, 40, 2);
      rimR.position.set(4.5, 2, -2);
      scene.add(rimR);
      const spec = new THREE.PointLight(entry.product.light, 10, 16, 2);
      spec.position.set(0.8, 2.4, 3.2);
      scene.add(spec);
      const spinner = entry.spinner.clone(true);
      spinner.rotation.set(0, -0.28, 0);
      spinner.traverse((node) => {
        if (!node.isMesh || !node.material) return;
        const mat = node.material.clone();
        attachWind(mat, uniforms, { cacheKey: 'mirrin-nylon-open-out-v3-card' });
        node.material = mat;
        node.frustumCulled = false;
      });
      const holder = new THREE.Group();
      holder.add(spinner);
      holder.scale.setScalar(entry.baseScale * 0.96);
      holder.position.set(0, -0.12, 0);
      scene.add(holder);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
      camera.position.set(0, 0.1, 6.15);
      camera.lookAt(0, -0.04, 0);
      const preview = {
        canvas,
        ctx,
        scene,
        camera,
        holder,
        spinner,
        uniforms,
        product: entry.product,
        onScreen: false,
        stitch: false,
        pointerX: 0,
        pointerY: 0,
        pointerTX: 0,
        pointerTY: 0,
        spin: -0.28,
      };
      const r = canvas.getBoundingClientRect();
      preview.onScreen = r.bottom > 0 && r.top < window.innerHeight && r.width > 4;
      this.cardPreviews.push(preview);
      this._cardIO.observe(canvas);
      card.addEventListener('pointermove', (e) => {
        const cr = card.getBoundingClientRect();
        preview.pointerTX = ((e.clientX - cr.left) / cr.width - 0.5) * 2;
        preview.pointerTY = ((e.clientY - cr.top) / cr.height - 0.5) * 2;
      });
      card.addEventListener('pointerleave', () => {
        preview.pointerTX = 0;
        preview.pointerTY = 0;
      });
    });
  }

  setCardStitch(id, on) {
    const preview = this.cardPreviews && this.cardPreviews.find((c) => c.product.id === id);
    if (preview) preview.stitch = !!on;
  }

  _cardsNeedFrame() {
    return !!(this.cardPreviews && this.cardPreviews.some((c) => c.onScreen && !c.stitch));
  }

  _renderCardPreviews(time, dt) {
    if (!this.cardRenderer || !this.cardPreviews) return;
    const renderer = this.cardRenderer;
    this.cardPreviews.forEach((c) => {
      if (!c.onScreen || c.stitch) return;
      const w = c.canvas.clientWidth;
      const h = c.canvas.clientHeight;
      if (w < 4 || h < 4) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pw = Math.max(1, Math.round(w * dpr));
      const ph = Math.max(1, Math.round(h * dpr));
      if (c.canvas.width !== pw || c.canvas.height !== ph) {
        c.canvas.width = pw;
        c.canvas.height = ph;
      }
      c.pointerX = damp(c.pointerX, c.pointerTX, 6, dt);
      c.pointerY = damp(c.pointerY, c.pointerTY, 6, dt);
      c.spin += dt * (this.reduceMotion ? 0 : 0.32);
      c.spinner.rotation.y = c.spin + c.pointerX * 0.42;
      c.spinner.rotation.x = -c.pointerY * 0.22;
      c.holder.position.y = -0.12 + Math.sin(time * 0.8 + c.spin) * 0.04;
      c.uniforms.uTime.value = time;
      c.uniforms.uWindDir.value.set(this.windDir.x * 0.7 + c.pointerX * 0.35, this.windDir.y * 0.7 + c.pointerY * 0.2);
      c.uniforms.uWindStrength.value = this.reduceMotion ? 0 : Math.max(this.windStrength, 0.22);
      c.camera.aspect = w / h;
      c.camera.updateProjectionMatrix();
      renderer.setPixelRatio(1);
      renderer.setSize(pw, ph, false);
      renderer.render(c.scene, c.camera);
      c.ctx.clearRect(0, 0, pw, ph);
      c.ctx.drawImage(renderer.domElement, 0, 0, pw, ph);
    });
  }

  /* ---------------- pointer + wind ---------------- */

  _bindPointer() {
    const hitZone = document.getElementById('heroOrbit') || this.canvas;
    const down = (e) => {
      this.dragging = true;
      this.hasInteracted = true;
      this.idleTime = 0;
      this.lastX = e.touches ? e.touches[0].clientX : e.clientX;
      this.canvas.classList.add('is-grabbing');
      if (this.cb.onFirstInteract) this.cb.onFirstInteract();
      if (this._gyro && this._gyro.request) this._gyro.request();
    };
    const move = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      if (this._gyro && this._gyro.live && !this.dragging && e.touches) return;
      this.pointerTarget.x = (x / window.innerWidth) * 2 - 1;
      this.pointerTarget.y = (y / window.innerHeight) * 2 - 1;
      if (this.dragging) {
        const dx = x - this.lastX;
        this.lastX = x;
        this.spinTarget += dx * 0.007;
        this.spinVel = dx * 0.007;
        this.idleTime = 0;
        this._gust(dx * 0.02, 0);
      } else {
        this._gust(this.pointerTarget.x * 0.015 - this.windDir.x * 0.02, 0);
      }
    };
    const up = () => {
      this.dragging = false;
      this.canvas.classList.remove('is-grabbing');
    };
    hitZone.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    hitZone.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
  }

  _gust(dx, dy) {
    this.windDir.x = clamp(this.windDir.x + dx, -1, 1);
    this.windStrength = Math.min(1, this.windStrength + Math.abs(dx) * 1.6 + 0.04);
  }

  _frame() {
    const cardsNeed = this._cardsNeedFrame();
    if (!this.running && !cardsNeed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    const gyro = !!(this._gyro && this._gyro.live);
    const stiffness = gyro ? 26 : 14;
    const damping = gyro ? 6.2 : 7.2;
    const ax = (this.pointerTarget.x - this.pointer.x) * stiffness - this.pointerVel.x * damping;
    const ay = (this.pointerTarget.y - this.pointer.y) * stiffness - this.pointerVel.y * damping;
    this.pointerVel.x += ax * dt;
    this.pointerVel.y += ay * dt;
    this.pointer.x += this.pointerVel.x * dt;
    this.pointer.y += this.pointerVel.y * dt;

    const breeze = this.reduceMotion
      ? 0
      : 0.22 + Math.sin(time * 0.65) * 0.09 + Math.sin(time * 1.37) * 0.05 + Math.sin(time * 2.1) * 0.03;
    this.windStrength = damp(this.windStrength, breeze, 2.4, dt);
    this.windDir.x = damp(this.windDir.x, Math.sin(time * 0.35) * 0.25 + this.pointer.x * 0.15, 1.6, dt);
    this.windDir.y = damp(this.windDir.y, this.pointer.y * 0.12, 1.6, dt);
    if (this.cb.onPointer) this.cb.onPointer(this.pointer.x, this.pointer.y);

    this.idleTime += dt;
    if (!this.dragging) {
      this.spinVel = damp(this.spinVel, 0, 4, dt);
      this.spinTarget += this.spinVel;
      if (this.idleTime > 3.5) this.spinTarget += dt * 0.28;
    }
    this.spin = damp(this.spin, this.spinTarget, 8, dt);

    if (this._lightTarget) {
      this.rimL.color.lerp(this._lightTarget.rimL, 0.22);
      this.rimR.color.lerp(this._lightTarget.rimR, 0.22);
      this.under.color.lerp(this._lightTarget.under, 0.22);
      this.spec.color.lerp(this._lightTarget.spec, 0.28);
    }
    const boost = gyro ? 1.7 : 1;
    this.rimL.position.x = this.rimBaseL.x - this.pointer.x * 2.8 * boost;
    this.rimL.position.y = this.rimBaseL.y - this.pointer.y * 1.8 * boost;
    this.rimR.position.x = this.rimBaseR.x - this.pointer.x * 2.8 * boost;
    this.rimR.position.y = this.rimBaseR.y - this.pointer.y * 1.8 * boost;
    this.key.position.x = this.keyBase.x + this.pointer.x * 3.2 * boost;
    this.key.position.y = this.keyBase.y - this.pointer.y * 2.1 * boost;
    this.spec.position.x = 0.6 + this.pointer.x * 3.4 * boost;
    this.spec.position.y = 2.2 - this.pointer.y * 1.6 * boost;
    if (this.scene.environmentRotation) {
      this.scene.environmentRotation.y = this.pointer.x * (gyro ? 0.95 : 0.55);
      this.scene.environmentRotation.x = -this.pointer.y * (gyro ? 0.4 : 0.22);
    }
    if (this.podium) {
      this.podium.rotation.y = time * 0.12;
      this.podium.position.x = this.pointer.x * (gyro ? 0.32 : 0.18);
    }

    const lookY = (this.camFrame && this.camFrame.lookY) || 0.12;
    const camLagX = gyro ? 1.15 : 0.62;
    const camLagY = gyro ? 0.85 : 0.48;
    this.camera.position.x = damp(this.camera.position.x, this.camBaseX + this.pointer.x * camLagX, gyro ? 6 : 2.6, dt);
    this.camera.position.y = damp(this.camera.position.y, this.camBaseY - this.pointer.y * camLagY, gyro ? 6 : 2.6, dt);
    this.camera.lookAt(this.pointer.x * (gyro ? 0.28 : 0.15), lookY, 0);

    this.entries.forEach((entry) => {
      if (!entry) return;
      const isCenter = entry.prominence === 1;
      entry.holder.visible = this._layoutMetrics().show || isCenter;
      entry.curX = damp(entry.curX, entry.targetX, 10, dt);
      entry.curY = damp(entry.curY, entry.targetY, 10, dt);
      entry.curScale = damp(entry.curScale, entry.targetScale, 10, dt);
      const zTarget = isCenter ? 0 : entry.targetZ ?? -1.05;
      entry.holder.position.x = entry.curX;
      entry.holder.position.z = damp(entry.holder.position.z, zTarget, 10, dt);
      entry.bob += dt * (isCenter ? 0.8 : 0.6);
      const bobAmp = isCenter ? 0.06 : 0.09;
      entry.holder.position.y = entry.curY + Math.sin(entry.bob) * bobAmp;
      entry.holder.scale.setScalar(entry.curScale);
      if (isCenter) {
        const yaw = gyro ? 0.62 : 0.18;
        const pitch = gyro ? 0.48 : 0.18;
        const roll = gyro ? 0.16 : 0.06;
        entry.spinner.rotation.y = this.spin + this.pointer.x * yaw;
        entry.spinner.rotation.x = damp(entry.spinner.rotation.x, -this.pointer.y * pitch, gyro ? 12 : 3.2, dt);
        entry.spinner.rotation.z = damp(entry.spinner.rotation.z, this.pointer.x * roll, gyro ? 12 : 3.2, dt);
      } else {
        entry.spinner.rotation.y += dt * 0.18;
        entry.spinner.rotation.x = 0;
      }
      entry.uniforms.uTime.value = time;
      entry.uniforms.uWindDir.value.set(this.windDir.x, this.windDir.y);
      entry.uniforms.uWindStrength.value = isCenter ? this.windStrength : this.windStrength * 0.4;
    });

    if (this.running) this.renderer.render(this.scene, this.camera);
    if (cardsNeed) this._renderCardPreviews(time, dt);
  }

  setRunning(on) {
    if (on && !this.running) this.clock.getDelta();
    this.running = on;
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this._applyFrame();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this._applyLayout(true);
  }

  getActiveProduct() {
    return this.products[this.active];
  }
}

/* ------------------------------------------------------------------ */
/* JacketInspect — white PDP 3D                                        */
/* ------------------------------------------------------------------ */

export class JacketInspect {
  constructor(canvas, product) {
    this.canvas = canvas;
    this.product = product;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.clock = new THREE.Clock();
    this.spin = -0.28;
    this.spinVel = 0;
    this.dragging = false;
    this.lastX = 0;
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerTarget = new THREE.Vector2(0, 0);
    this.running = true;
    this._init();
  }

  _init() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0xffffff, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.08);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.38;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    this.camera.position.set(0, 0.08, 6.55);
    this.camera.lookAt(0, -0.04, 0);

    this.scene.add(new THREE.AmbientLight(0xf2f3f6, 0.42));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.05);
    key.position.set(2.5, 4, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x6a7388, 0.22);
    fill.position.set(-4, 1, 2);
    this.scene.add(fill);
    const rimL = new THREE.PointLight(new THREE.Color(this.product.rim), 16, 40, 2);
    rimL.position.set(-4.5, 1.5, -2.5);
    this.scene.add(rimL);
    const rimR = new THREE.PointLight(new THREE.Color(this.product.light), 16, 40, 2);
    rimR.position.set(4.5, 2, -2);
    this.scene.add(rimR);

    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this._bind();
    this._gyro = makeTilt((x, y) => {
      if (!this.dragging) this.pointerTarget.set(x, y);
    });
    this._load();
    renderer.setAnimationLoop(() => this._frame());
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _load() {
    this.loader.load(
      this.product.model,
      (gltf) => {
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        root.position.sub(center);
        const uniforms = makeWindUniforms(size.y, { active: 1, reduced: this.reduceMotion });
        uniforms.uWindStrength.value = 0.18;
        const accent = new THREE.Color(this.product.accent);
        root.traverse((node) => {
          if (!node.isMesh) return;
          node.castShadow = false;
          node.receiveShadow = false;
          node.frustumCulled = false;
          const albedo = node.material.color ? node.material.color.clone() : new THREE.Color(0xffffff);
          albedo.lerp(accent, 0.08);
          const mat = new THREE.MeshPhysicalMaterial({
            map: node.material.map || null,
            normalMap: node.material.normalMap || null,
            roughnessMap: node.material.roughnessMap || null,
            color: albedo,
            roughness: 0.42,
            metalness: 0.0,
            clearcoat: 0.55,
            clearcoatRoughness: 0.18,
            sheen: 0.35,
            sheenRoughness: 0.4,
            sheenColor: accent,
            envMapIntensity: 0.55,
            specularIntensity: 0.85,
            side: THREE.FrontSide,
          });
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
          attachWind(mat, uniforms, { fragmentBoost: false, cacheKey: 'mirrin-nylon-open-out-v3-inspect' });
          node.material = mat;
        });
        const spinner = new THREE.Group();
        spinner.add(root);
        const holder = new THREE.Group();
        holder.add(spinner);
        holder.scale.setScalar((2.75 / (size.y || 1)) * 0.84);
        holder.position.set(0, -0.02, 0);
        this.scene.add(holder);
        this.spinner = spinner;
        this.uniforms = uniforms;
      },
      undefined,
      (err) => console.error('Inspect model load failed', err)
    );
  }

  _bind() {
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      if (this._gyro && this._gyro.request) this._gyro.request();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this._gyro && this._gyro.live && !this.dragging) return;
      const r = canvas.getBoundingClientRect();
      this.pointerTarget.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      this.pointerTarget.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      this.spin += dx * 0.008;
      this.spinVel = dx * 0.008;
    });
    const up = () => {
      this.dragging = false;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  _frame() {
    if (!this.running) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    const gyro = !!(this._gyro && this._gyro.live);
    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, gyro ? 16 : 8, dt);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, gyro ? 16 : 8, dt);
    if (!this.dragging) {
      this.spinVel *= 0.94;
      this.spin += this.spinVel + dt * (this.reduceMotion ? 0 : 0.22);
    }
    if (this.spinner) {
      this.spinner.rotation.y = this.spin + this.pointer.x * (gyro ? 0.75 : 0.42);
      this.spinner.rotation.x = this.pointer.y * (gyro ? -0.45 : -0.22);
    }
    if (this.uniforms) {
      this.uniforms.uTime.value = time;
      this.uniforms.uWindDir.value.set(this.pointer.x * (gyro ? 0.7 : 0.4), this.pointer.y * (gyro ? 0.4 : 0.2));
    }
    this.renderer.render(this.scene, this.camera);
  }

  setRunning(on) {
    this.running = on;
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w < 4 || h < 4) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
