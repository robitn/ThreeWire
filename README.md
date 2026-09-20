# Thread Wire Calculator

Thread Wire Calculator is a mobile-friendly Vue 3 application for measuring and calculating thread geometry with the three-wire method. It is intended for machinists, toolmakers, and workshop users checking thread pitch diameter or determining the required measurement over wires.

## Features

- Find pitch diameter from a known measurement over wires.
- Find the measurement over wires from a known pitch diameter.
- Select a thread standard, then select a fastener size from that standard.
- Automatically populate the selected pitch, the size the thread should be cut to, and a
  best wire size, so a freshly picked thread already shows what it should measure.
- Work to a class of fit: ASME B1.1 Class 2A and 3A on inch threads, ISO 965 6g and 4h on
  metric ones. Each gives pitch diameter limits, the matching measurement over wires range
  for the wires in use, and a reading of whether the thread in hand falls inside the class.
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
5. Select a fastener size, and a class of fit where the standard has one. The measurement field
   fills with the size to cut to -- the class maximum, or the basic pitch diameter when no
   class is chosen -- and is tagged with where that number came from.
6. Type your own reading over it. The field is then tagged **Measured**, and the button
   below puts the target back. Selecting a different thread also clears the reading, since
   a measurement belongs to the thread it was taken on; changing class does not, because
   the thread has not changed -- only the limits it is judged against.

With a class selected, the calculator shows the permitted range under the input and beside
the result, so both the pitch diameter limits and the measurement over wires they
correspond to are on screen, and it labels the result **Within**, **Under** or **Over**
the class.

Selecting a catalog entry sets its pitch and calculates the best wire size, the one that
touches each flank at the pitch line:

```text
W = P / (2 * cos(thread angle / 2))
```

Its nominal pitch diameter comes from the nominal diameter and the pitch. Both thread forms
in the catalog put the pitch line a fixed fraction of the sharp-V height below the crest, so
the offset is a constant times the pitch:

```text
Pitch diameter = nominal diameter - factor * P
factor = 0.649519 for the 60 degree forms (metric ISO, UN)
factor = 0.640327 for the 55 degree Whitworth form (BSP)
```

The result calculation uses the three-wire relationship implemented in `src/App.vue`:

```text
b = thread angle / 2
Measurement over wires = pitch diameter + W * (1 + 1 / sin b) - (P / 2) * cot b
Pitch diameter = measurement over wires - W * (1 + 1 / sin b) + (P / 2) * cot b
```

Both coefficients depend on the thread angle. At 60 degrees they reduce to the familiar
`3W - 0.86603P`, but a 55 degree BSP thread needs `3.16568W - 0.96049P`, so neither is
hardcoded.

All trigonometric calculations use degrees for the thread angle. Values are stored in millimeters, even when the interface displays inches.

## Classes Of Fit

The class control offers whichever system the selected standard uses: **ASME B1.1** for the
inch series, with Class 2A and Class 3A, and **ISO 965** for metric, with 6g and 4h. BSP
gets no class control, because its system is not implemented and offering one from another
standard would be inventing a number.

Both systems work the same way. A tolerance *position* fixes where the band sits relative to
the basic pitch diameter, and a tolerance *grade* fixes how wide it is. Each limit is then
carried through the three-wire relationship using the wire size actually in use, which is
what turns a class into a pair of micrometer readings.

Both sets of limits are transcribed from the published tables rather than computed. The
standards derive their tables from formulas and then round, and in both systems recomputing
does not always land back on the printed number -- so where the standard prints a value,
that value is used.

### ASME B1.1, inch series

Class 2A carries a clearance allowance that puts its maximum pitch diameter below the basic
size; Class 3A has no allowance, so its maximum is the basic size itself. For 5/8-11 UNC,
whose basic pitch diameter is 0.5660 in:

| Class | Min | Max |
| --- | --- | --- |
| 2A | 0.5589 in | 0.5644 in |
| 3A | 0.5619 in | 0.5660 in |

The table lives in `src/data/unifiedClassLimits.js`. The Appendix B tolerance formula

```text
LE = lesser of the basic major diameter and nine pitches
Class 2A pitch diameter tolerance = 0.0015 * D^(1/3) + 0.0015 * LE^(1/2) + 0.015 * P^(2/3)
Class 3A pitch diameter tolerance = 0.75 * the Class 2A tolerance
Allowance (Classes 1A and 2A) = 0.30 * the Class 2A tolerance
```

reproduces only about half of the tabulated sizes exactly and is off by as much as 0.0007 in
on the rest. Sizes outside the built-in table -- the constant-pitch UN series and the larger
diameters -- fall back to it and say so on screen, because a computed limit is not a
substitute for the printed one when the part has to pass a gage.

### ISO 965, metric

The class is a grade followed by a position: 6g is grade 6 at position g, 4h grade 4 at
position h. Position h has zero fundamental deviation, so 4h opens at the basic pitch
diameter, while g sits an allowance below it. Grade 4 is the tighter band. For M6 x 1, whose
basic pitch diameter is 5.350 mm:

| Class | Min | Max |
| --- | --- | --- |
| 6g | 5.212 mm | 5.324 mm |
| 4h | 5.279 mm | 5.350 mm |

`src/data/isoClassLimits.js` holds the two tables this needs: the fundamental deviations by
pitch and position, and the pitch diameter tolerance Td2 by diameter range, pitch and grade.
Two shortcuts that circulate for these do not survive contact with the tables, which is why
neither is used: `es = -(15 + 11P)` gives -37 um at P = 2 where the standard says -38, and
`Td2(6) = 90 * P^0.4 * d^0.1` rounded to the R40 series gives 80 um for M3 x 0.5 where the
standard tabulates 75.

ISO 965-1 starts at 0.99 mm and tabulates set diameter and pitch combinations, so about one
metric thread in five in the catalog -- the sub-millimetre sizes, and fine pitches on large
diameters such as M12 x 0.75 -- has no class limits. Those say so on screen and fall back to
the basic pitch diameter.

## Thread Catalog

The catalog is generated from the external-thread entries in threadlib's OpenSCAD `THREAD_TABLE.scad`. The generated data includes pitch, thread angle, nominal diameter, source designator, rotation radius, support diameter, and derived thread metadata. A `G` designation names a pipe bore rather than a thread size, so BSP nominal diameters come from an ISO 228-1 table held in the converter instead of from the designator. Internal-thread profile point arrays are not imported because the calculator currently needs pitch and thread-form geometry rather than OpenSCAD rendering profiles.

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

The service worker precaches the whole app, so an install keeps working with no signal.

Updates are offered rather than applied. When a new version has been deployed and its worker
is installed and waiting, `src/components/ReloadPrompt.vue` raises a toast at the bottom of
the screen with **Update** and **Close**. Update tells the waiting worker to take over and
reloads onto the new assets; Close leaves the running version alone until next launch. The
alternative, `registerType: 'autoUpdate'`, reloads the page on its own, which is no way to
treat someone halfway through entering a measurement.

A worker registered on an earlier visit raises no registration event and is re-checked on a
schedule of the browser's choosing, so the component also calls `registration.update()` on
mount to check for a new version at launch.

The Workbox config sets `clientsClaim: true`. `autoUpdate` implies it; `prompt` does not,
and without it a first-time worker installs but controls nothing until the next navigation,
which is enough for Chrome to withhold the install option on a first visit. It is safe
alongside `prompt` because `skipWaiting` stays off: an updated worker still waits to be
asked.

The foot of the result panel carries the build it is running: the version from
`package.json` and the commit it was built from, both baked in by `vite.config.js`. The
version alone would not settle whether an installed copy has picked up a deploy, since a
fix need not bump it; the commit always changes. It is also the thing to quote in a bug
report.

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

## Project Structure

```text
src/
  App.vue              the one screen: state wiring and layout
  components/          FieldRow, SegmentedControl, StatusBadge, ReloadPrompt
  lib/                 the domain, with no Vue in it
    units.js           millimetre and inch conversion, display rounding
    threadGeometry.js  pitch diameter, best wire size, the three-wire relation
    threadLimits.js    ASME B1.1 and ISO 965 classes of fit
    threadCatalog.js   queries over the generated catalog
    settingsStorage.js reading and writing the stored setup
  data/                reference tables, not logic
    threadDatabase.js  generated from threadlib; do not edit by hand
    unifiedClassLimits.js  ASME B1.1 tables, transcribed
    isoClassLimits.js      ISO 965-1 tables, transcribed
  __tests__/           one spec per module, plus App.spec.js end to end
```

Everything under `lib/` is plain functions over millimetres and degrees, so the arithmetic
can be checked against published tables directly rather than through the interface. That is
where the standards live and where most of the tests point. `App.vue` holds the reactive
state that ties them to the controls, and keeps the calculation in millimetres throughout,
converting only at the display edge.

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
