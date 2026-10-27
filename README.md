# MIRRIN — FW26 Puffer Campaign

Interactive 3D open-coat puffer campaign (dark atelier) + white PDP shop, rebranded from the VELOX one-shot build. Same layout, copy, motion system and colourways: **Cash Money Green**, **Deep Freeze Blue**, **Cherry Bomb Pink**.

## Run it

```bash
npm install
npm run dev        # live server → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build
```

## Pages

- `index.html` — campaign. Looping colourway video behind the WebGL coat, chrome wordmark behind the mesh, hover previews, sidecards, picker, prev/next.
- `buy.html?id=lime|blue|pink` — white retail PDP. 6 photos + 360° 3D inspect, swatches, sizes, demo bag (`localStorage['mirrin-bag']`).

## Structure

```
public/
  models/            green|blue|pink.glb (meshopt)
  backgrounds/       loop-*.mp4 posters + pass-*.jpg mountain plates
  campaign/          avatars, looks, details, picker
  brand/             MIRRIN lockups
src/
  products.js        catalogue + theming data
  scene3d.js         Scene3D (hero) + JacketInspect (PDP), open-coat wind shader, gyro
  ui.js              campaign chrome: loader, bg crossfade, sidecards, shop cards, cart
  main.js / buy.js   page bootstraps
```

Drag the coat — it spins with inertia and throws a fabric gust. The front halves peel from the side seams (barn doors, never a zipper-axis spin). On phones, tap once to enable gyro tilt.

Set the deployed canonical/og URL in `index.html` / `buy.html` before release (marked with comments).
