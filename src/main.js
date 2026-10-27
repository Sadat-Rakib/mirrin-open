// MIRRIN — campaign bootstrap. The 3D scene is dynamically imported so first
// paint (loader, wordmark, loop poster) never waits on the WebGL bundle.

import { PRODUCTS } from './products.js';
import { App } from './ui.js';

const canvas = document.getElementById('scene');
const app = new App(PRODUCTS);

async function boot() {
  try {
    const { Scene3D } = await import('./scene3d.js');
    const scene = new Scene3D(canvas, PRODUCTS, {
      onProgress: (t) => app.setProgress(t),
      onReady: (p) => app.onReady(p),
      onActiveChange: (p, i) => app.onActiveChange(p, i),
      onThumbs: (t) => app.setThumbs(t),
      onFirstInteract: () => app.hideDragHint(),
      onPointer: (x, y) => app.setParallax(x, y),
    });
    app.bindScene(scene);
  } catch (err) {
    console.error('3D unavailable, falling back to flat hero', err);
    canvas.style.display = 'none';
    app.onReady(PRODUCTS[0]);
    app.toast('3D not supported on this device — showing the flat experience');
  }
}

boot();
