# Thread Wire Calculator

Thread Wire Calculator is a mobile-friendly Vue 3 application for measuring and calculating thread geometry with the three-wire method. It is intended for machinists, toolmakers, and workshop users checking thread pitch diameter or determining the required measurement over wires.

## Features

- Find pitch diameter from a known measurement over wires.
- Find the measurement over wires from a known pitch diameter.
- Select a thread standard, then select a fastener size from that standard.
- Automatically populate the selected pitch and calculate a best wire size.
- Display and edit measurements in Metric millimeters or Imperial inches.
- Keep calculations in millimeters internally for consistent unit conversion.
- Update results immediately as pitch, wire size, measurement, or mode changes.
- Support common thread families from the catalog, including:
  - Metric ISO threads
  - UNC
  - UNF
  - UNEF
  - 4-UN, 6-UN, and 8-UN
  - BSP parallel (G) threads
- Provide keyboard-accessible controls with visible focus states and responsive layouts for small screens.

## Using The Calculator

1. Choose **Find pitch diameter** when the measured value is the measurement over wires.
2. Choose **Find measure over wires** when the measured value is the pitch diameter.
3. Choose Metric or Imperial display units.
4. Select a thread standard.
5. Select a fastener size.
6. Adjust the wire size or measurement as needed.

Selecting a catalog entry sets its pitch and calculates the best wire size using:

```text
W = P / (2 * cos(thread angle / 2))
```

The current result calculation uses the three-wire relationship implemented in `src/App.vue`:

```text
Pitch diameter = measurement over wires - 3W + P * cos(thread angle / 2)
Measurement over wires = pitch diameter + 3W - P * cos(thread angle / 2)
```

All trigonometric calculations use degrees for the thread angle. Values are stored in millimeters, even when the interface displays inches.

## Thread Catalog

The catalog is generated from the external-thread entries in threadlib's OpenSCAD `THREAD_TABLE.scad`. The generated data includes pitch, thread angle, source designator, rotation radius, support diameter, and derived thread metadata. Internal-thread profile point arrays are not imported because the calculator currently needs pitch and thread-form geometry rather than OpenSCAD rendering profiles.

The source table also contains profiles without a defined angle for this calculator, such as some packaging and RMS threads. Those entries remain represented in the generated data, but the UI only offers standards with a defined calculation angle.

To refresh the catalog from the upstream source:

```bash
npm run update:threadlib
```

The generated file is `src/data/threadDatabase.js`. Do not edit that generated file by hand. The converter and download workflow are in `scripts/convert-threadlib-table.mjs` and `scripts/update-threadlib-table.mjs`.

The upstream threadlib data is distributed under the BSD-3-Clause license. See `THIRD_PARTY_LICENSES.md` for attribution and licensing details.

## Installing As An App

The hosted build is a Progressive Web App, so it installs to the home screen and runs
offline once loaded -- useful at a bench with no signal.

- **iOS/iPadOS:** open the site in Safari, then Share -> Add to Home Screen.
- **Android:** open the site in Chrome, then the install prompt or Menu -> Install app.
- **Desktop:** use the install icon in the browser address bar.

The service worker precaches the whole app and updates itself in the background whenever a
new version is deployed.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and publishes
`dist` to GitHub Pages. The site is served from a project subpath, so `vite.config.js` sets
`base` to `/TwoWire/` for production builds; renaming the repository means changing that
value.

The app icons are drawn from geometry rather than checked in as binaries from a design
tool. To change the icon, edit the shapes in `scripts/generate-icons.mjs` (and mirror them
in `public/favicon.svg`), then regenerate:

```bash
npm run generate:icons
```

## Development

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Run the unit tests:

```bash
npm run test:unit -- --run
```

Preview the production build. Note that it is served from the `/TwoWire/` subpath, matching
GitHub Pages:

```bash
npm run preview
```

## Technology

- Vue 3 with Composition API and `<script setup>`
- Vite
- Tailwind CSS 4
- Pinia, available for shared application state
- Vitest and Vue Test Utils
- vite-plugin-pwa (Workbox) for the offline service worker and web app manifest
