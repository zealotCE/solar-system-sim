[中文](README.md) | [English](README.en.md)

# Solar System Simulator

An interactive 3D Solar System with a future-observatory aesthetic: eight planets and Pluto, 26 natural satellites, 9 featured minor bodies/comets, 19 notable spacecraft, the main asteroid and Kuiper belts, ephemeris-driven positions, and a 1950–2050 time machine. It supports strict true scale and Chinese, bilingual, or English interfaces. Positions and time use bundled public JPL / NASA data plus clearly disclosed representative orbits for visualization; they are not live measurements.

## Gallery

![Textured Sun with preserved surface and corona detail](shots/v1.3-sun-texture.png)

<p align="center">
  <img src="shots/v1.3-halley-perihelion.png" width="49%" alt="Smooth Halley orbit at the 1986-02-09 perihelion" />
  <img src="shots/v1.3-europa-clipper-trail.png" width="49%" alt="Smooth semantic Europa Clipper trail on 2030-04-11" />
</p>

<p align="center">
  <img src="shots/v1.3-true-scale-craft.png" width="49%" alt="Bounded selected-craft proxy and fixed reticle in true scale" />
  <img src="shots/v1.3-trajectory-legend.png" width="49%" alt="Legend for actual, predicted, model-time, and osculating trajectories" />
</p>

<p align="center"><sub>Textured Sun · smooth Halley orbit · Europa Clipper semantic trail · true-scale spacecraft · bilingual trajectory legend</sub></p>

## Features

- **Planetary ephemerides:** angular positions use JPL’s “Approximate Positions of the Major Planets” Keplerian elements and century rates throughout the simulation (valid 1800–2050, with error well below a screen pixel). Stylized mode compresses only radial distance, so planetary directions remain consistent with the real sky
- **Strict true-scale mode:** radii and orbits share one km-to-scene mapping with no physical volume magnification (the Sun’s radius is about 1/215 of Earth’s orbital radius), and spacecraft use their published deployed spans. The translucent distant locator analyses GLB surface-area distribution and targets a 64–84 px readable core instead of sizing the craft by its longest thin antenna or magnetometer boom; all appendages remain capped at 156 px. It converges continuously as the physical core grows from 18–40 px, then hands off with 34–40 px hysteresis; loading failures retain a procedural fallback. A deep near plane, core-anchored labels, and target-centred local path arcs support continuous travel from the system overview to spacecraft-surface scale
- **1950–2050 time machine:** reverse time, choose days/months/years in a custom calendar, scrub quickly across all 36,890 UTC dates, jump to today, and launch ten mission stories from the story or spacecraft archive. Replays pause, enable true scale, and follow the event’s spacecraft while retaining the encounter body as scene context
- **Roman launch update:** the Nancy Grace Roman Space Telescope enters the time machine on NASA’s confirmed 30 August 2026 launch date. It is absent from the physical scene before launch, then moves away from Earth along a clearly disclosed representative 90-day Sun–Earth L2 transfer rather than pretending to provide live navigation. The stylized Earth–Moon system now uses the Moon’s km-to-local-unit mapping, placing steady-state L2 at about 3.9 lunar-orbit radii; newly launched Roman correctly remains inside the Moon’s distance until its outbound transfer crosses it. Its archive covers the roughly nine-month schedule gain, 2.4-metre mirror, Hubble-class resolution with a roughly 100-times-wider field, and coronagraph demonstration, with NASA’s high-fidelity completed-observatory model
- **Twelve Horizons missions:** Voyager 1/2, Pioneer 10, New Horizons, Cassini, Galileo, Dawn, Rosetta, OSIRIS-REx/APEX, Lucy, Psyche, and Europa Clipper use bundled JPL Horizons state vectors. Cruise spans use 30-day samples, event windows use 1-day samples, and critical flybys use 6-hour samples, reconstructed with position-and-velocity Hermite curves
- **Content-hashed lazy ephemerides:** the startup bundle contains only a lightweight registry. Each mission has a content-hashed JSON asset; selections, stories, and deep links load first, while other launched missions queue serially during browser idle time. Rendering reads a synchronous cache, and no monolithic trajectory payload enters the main JavaScript
- **Semantic, decluttered trails:** unselected Horizons craft show only the latest 365.25 model-time days with a restrained fade, while simplified local craft show the latest 20% of one period; selection expands the complete semantic path. The path before playback is bright and solid, later history already known today uses short dashes, and genuinely predicted/propagated data uses dimmer sparse dashes. Planetary orbiters such as Cassini and Galileo naturally form continuous waves in the Sun-centered frame because local loops ride along the planet’s solar motion. Ended missions can still load their historical trail without resurrecting the physical model
- **Distance-graded near-Earth missions:** system overview collapses Hubble, ISS, Tiangong, Webb, and Roman once launched into one stable cluster offset from Earth’s click target, without mounting their fast entities or local trails. The cluster adapts its columns to Chinese or English content and switches to one column on very narrow viewports. Detail appears when the representative LEO radius reaches 32 px, with a 22 px exit threshold. At the default 1× rate, unresolved roughly 90-minute orbits are compressed to at most 0.16 visible revolution per second instead of freezing; pausing or 0.01× uses the exact model phase
- **Three label levels and an overview performance budget:** the label button cycles Off → Primary → All. Primary retains distance grading and the near-Earth cluster; All expands every named natural/artificial target that physically exists on the selected date. A distant label’s HTML wrapper remains click-through while its native-button chip accepts clicks; projected spacecraft labels are separated at a low cadence, keeping targets such as Voyager 2 selectable without a large container masking Earth. Idle labels refresh current-frame target/camera matrices and move on a 1/8 px sub-pixel grid with 0.1 px hysteresis; selected labels use exact continuous projection. Each chip moves as one compositor layer so its text baseline remains stable. Distant views unmount hidden DOM, entities, local orbits, and unselected mission trails. A center-facing system overview caps DPR at 1.2, disables composer MSAA, reduces Bloom, and culls minor-body orbits
- **Orbit hierarchy and screen-space LOD:** the eight major-planet orbits form a brighter, wider visual skeleton, while Pluto, Arrokoth, other dwarf/minor bodies, and moons retain finer dimmer osculating lines. Closed orbits range from 128 to 16,384 vertices by projected sagitta and Horizons trails use overview/medium/focus adaptive subdivision. At extreme true-scale focus, the selected path switches to a 256-segment local arc sampled by camera distance and local velocity; Earth/Jupiter orbiters remain sampled in their parent-local frame, so the whole-orbit polygon cannot expose corners or change screen inclination during the hand-off. Entering a close planetary-system view such as Pluto hides unrelated heliocentric orbits, restoring them with hysteresis after zooming out. The Kuiper belt uses 1,800 deterministic statistical points from 30–50 AU, reduced to 900 in the system overview
- **Authoritative and project-authored 3D shape models:** spacecraft, Ceres, Vesta, and Bennu use NASA resources; 67P, Apophis, and Arrokoth use mapped ESA Rosetta / NASA PDS shape data. Roman’s 29.66 MB NASA completed-observatory source is reduced to about 3.79 MB while retaining its materials, normal maps, and deployed structure; the 34.05 MiB Europa Clipper source is reduced to about 2.6 MiB. Since no redistributable official Tiangong engineering mesh was found, the project bundles an approximately 122 KiB reconstruction of the 2026 three-module T configuration from CMSA/CNSA dimensions and imagery, including Wentian/Mengtian’s four large flexible arrays, Tianzhou-10, and Shenzhou-23. Its archive provides Auto/Current/Planned modes: Auto displays the approximately 130 KiB cross configuration as a planning scenario from 2028-01-01, explicitly not as an official launch date
- **Minor bodies and comets:** Ceres, Vesta, Bennu, 67P, Halley, Eurybates, Psyche, Apophis, and Arrokoth use offline JPL SBDB orbital elements with 3D orientation, orbits, search, live light-time, and extended science archives
- **Target search:** fuzzy Chinese/English search; press `/` on desktop
- **Live readouts:** archive panels compute model-time Sun/Earth distance (AU + km) and one-way light time in an NASA Eyes-style presentation
- **Indexable archive paths and deep links:** the build emits an independent `/objects/<id>` or `/missions/<id>` HTML page for all 65 targets, with a title, summary, canonical URL, Open Graph, JSON-LD, and a no-script archive body. The path chooses the target while the fragment continues to combine date, scale, and language, for example `/objects/earth#date=2028-04-15` or `/missions/newhorizons#date=2028-04-15`. Existing `#target=jupiter&date=1986-01-24&scale=true&lang=en` links remain fully compatible
- Survey-derived 2K planet textures, Earth clouds, and photographic Saturn rings; procedural fallbacks are used offline
- A 4K ESO Milky Way panorama at its real galactic-plane inclination plus procedural stars; depth occlusion prevents the sky from drawing through bodies
- The Sun, eight planets, Pluto, and 26 natural satellites: Moon; Phobos/Deimos; Io/Europa/Ganymede/Callisto/Amalthea; Mimas/Enceladus/Tethys/Dione/Rhea/Titan/Iapetus; Miranda/Ariel/Umbriel/Titania/Oberon; retrograde Triton/Nereid; Charon/Styx/Nix/Kerberos/Hydra
- Roughly 2,600 instanced asteroids between Mars and Jupiter plus a 1,800-point statistical Kuiper belt spanning 30–50 AU with cold/hot vertical populations; neither is an object-by-object catalog
- A bottom console plus independent Targets / Archive / Stories / Parameters panels
- Click-to-follow targets with a smooth Star Walk-style camera flight
- The default rate is 1× (about one Earth day per real second), adjustable from 0.01× to 1000×. Shortcuts: Space pauses, R resets the camera, `/` searches, and Esc closes a panel
- Photographic textures can be replaced with lightweight procedural textures for lower-power devices
- Cinematic, Observatory, and Minimal scene presets, plus an ecliptic grid with dense line-only inclination drop guides, spacecraft, and auto-cruise controls; physical sliders lock to 1× in true scale
- Responsive desktop observatory and mobile drawers; Chinese, bilingual, and English preferences persist in the browser

## Requirements

- Node.js 22 (matching Docker and Cloudflare Pages)
- npm

## Install and Run

```bash
npm install
npm run dev
```

The development server uses port **4317**:

[http://localhost:4317](http://localhost:4317)

Production build:

```bash
npm run build
npm run preview
```

## Docker Deployment

With Docker and the Compose plugin installed:

```bash
docker compose up -d --build
```

Open [http://localhost:4317](http://localhost:4317) after the build. The two-stage image uses Node 22 for compilation and Nginx for static hosting, with gzip, asset caching, a health check, and `restart: unless-stopped`.

Equivalent commands without Compose:

```bash
docker build -t solar-system-sim .
docker run -d --name solar-system-sim -p 4317:80 --restart unless-stopped solar-system-sim
```

To change the port, replace `4317:80` in `docker-compose.yml` with `<your-port>:80`.

## Cloudflare Pages

This is a static Vite application with Pages configuration, cache rules, a 25 MiB per-file limit, and a 3 MiB startup budget for the main JavaScript:

```bash
npm ci
npm run build:pages
```

Cloudflare Pages Git integration:

- Production branch: `main`
- Framework preset: `None` (do not select VitePress)
- Build command: `npm run build:pages`
- Build output directory: `dist`
- Root directory: empty
- Node.js: repository `.node-version` pins `22`

Cloudflare reads `pages_build_output_dir: "./dist"` from `wrangler.jsonc`. If the log says `/bin/sh: pm: not found`, the leading `n` is missing from the build command; restore `npm run build:pages`. `public/_headers` gives hashed Vite assets and `/ephemerides/<mission>-<hash>.json` a one-year immutable cache; models and textures use separate revalidation periods, and HTML always revalidates. The build emits all 65 concrete archive paths; the optional `PUBLIC_SITE_URL=https://your-domain.example` environment variable (set it in the Cloudflare Pages project settings) writes absolute canonical URLs and `og:url` and emits `sitemap.xml`; without it, `robots.txt` is emitted with no sitemap. Validation checks every page and discovery link while confirming that all 12 ephemeris assets remain external and the main JS contains no trajectory sample fingerprint. Every known route has real HTML, so no global SPA fallback is needed and a missing GLB is never replaced with `index.html`. Normal releases use Pages Git integration and require no manual deployment.

## Controls

| Control | Action |
| --- | --- |
| Drag | Rotate view |
| Wheel / pinch | Zoom |
| Click a planet / moon / spacecraft | Open its archive and lock follow |
| Bottom Targets / Archive / Parameters buttons | Toggle the matching secondary panel |
| Immersive button | Hide the interface; Esc or the lower-right button exits |
| Previous / Next or Left / Right in Archive | Browse all targets |
| True-scale switch in Parameters | Toggle stylized and strict true-scale layouts |
| Time slider | 0.01×–1000×; 1× advances about one Earth day per second; reverse rewinds |
| Date button | Pick any 1950–2050 date, return to today, or jump to the 2026 start |
| Space / R / `/` / Esc | Pause / reset camera / search / close panel |
| URL path / hash | `/objects/<id>` or `/missions/<id>` selects a target; `#date=<YYYY-MM-DD>&scale=true&lang=en` combines state. Legacy `#target=<id>` remains supported |
| Language button | Cycle bilingual, Chinese, and English |
| Follow | Lock the camera target |
| Reset camera | Return to overview and release follow |

## Stack

Vite, React, TypeScript, @react-three/fiber, @react-three/drei, @react-three/postprocessing, Tailwind CSS, and shadcn/ui-style components.

## Validation and Development

Run the complete local gate—oxlint, TypeScript/Pages build, Cloudflare budgets, all trajectory and numeric validators, and the three Playwright/SwiftShader visual scenes:

```bash
npm run verify
```

Individual commands:

```bash
npm run lint
npm run build:pages
npm run validate:data
npm run test:visual
```

Visual regression fixes DPR=1, UTC, random seed, model date, and animation state. It keeps MSAA and Bloom, compares only the WebGL canvas, and covers the textured Sun, Halley at perihelion on 1986-02-09, and Europa Clipper on 2030-04-11. Inspect all three images before updating baselines:

```bash
npm run test:visual:update
```

`.github/workflows/visual.yml` runs on pull requests and pushes to `main` with Node 22, pinned Playwright Chromium, and SwiftShader. It runs lint, all data validators, and `build:pages` before comparing the three baselines; failures upload actual/diff images, traces, and the HTML report.

Full-interface headless capture using the current Playwright Chromium (start dev or preview first):

```bash
node scripts/capture.mjs out.png "click:Targets" "wait:2000"
CAPTURE_URL='http://localhost:4317/#target=earth&scale=true' node scripts/capture.mjs truescale.png wait:4000
```

### Planetary Ephemeris (JPL Approximate Positions)

`src/data/ephemeris.ts` embeds the nine element/rate sets from Table 1 of JPL’s “Keplerian Elements for Approximate Positions of the Major Planets” (E.M. Standish, valid 1800–2050). Runtime Kepler solutions produce J2000 ecliptic heliocentric coordinates. Worst-case longitude error is well below one arcminute for the classical planets and about 0.1° for Pluto—below one pixel at every scale in this simulator. Source: <https://ssd.jpl.nasa.gov/planets/approx_pos.html>.

### Offline JPL Horizons Trajectories

The browser never queries Horizons directly. The startup bundle contains only `src/data/horizonsTrajectoryIndex.ts`; each mission’s Sun-centered, geometric (`VEC_CORR=NONE`), ICRF, TDB, AU/AU·day⁻¹ VECTORS data loads on demand from `public/ephemerides/<mission>-<hash>.json` and enters a synchronous cache:

| Spacecraft | COMMAND | Coverage (TDB) |
| --- | --- | --- |
| Voyager 1 | `-31` | 1977-09-08 to 2051-01-13 |
| Voyager 2 | `-32` | 1977-08-21 to 2051-01-11 |
| Pioneer 10 | `-23` | 1972-03-04 to 2049-12-24 |
| New Horizons | `-98` | 2006-01-20 to 2049-12-30 |
| Cassini | `-82` | 1997-10-16 to 2017-09 |
| Galileo | `-77` | 1989-10-20 to 2003-09 |
| Dawn | `-203` | 2007-09-28 to 2043-10, including post-mission Ceres-orbit prediction |
| Rosetta | `-226` | 2004-03-03 to 2016-09 |
| OSIRIS-REx/APEX | `-64` | 2016-09-09 to 2030-03 |
| Lucy | `-49` | 2021-10-17 to 2033-04 |
| Psyche | `-255` | 2023-10-14 to 2029-02, the current JPL reference-trajectory limit |
| Europa Clipper | `-159` | 2024-10-15 to 2034-09 |

Exact API queries, source response SHA-256 values, sample windows, actual-data cutoff, and prediction start are recorded in `src/data/horizons-provenance.json`.

The scene uses position-and-velocity cubic Hermite interpolation between 30-day cruise, 1-day event, and 6-hour critical-flyby samples, then recursively subdivides by mapped curvature, chord error, and endpoint tangent. Stylized mode compresses radial distance only; true scale maps all AU directly and has no hard deep-space cap that could introduce kinks. Provenance fixes the actual/predicted boundary, while model time moves an independent cursor. Dates outside coverage clamp to the nearest endpoint and never silently extrapolate. These reconstructed state vectors are for visualization only—not navigation, real-time operations, or scientific computation.

Regenerate (network required), check offline integrity, and run all data validators:

```bash
node scripts/fetch-horizons-trajectories.mjs
npm run validate:data
```

## Asset Sources and Attribution

- Spacecraft plus Ceres, Vesta, and Bennu: [NASA 3D Resources](https://science.nasa.gov/3d-resources/); 67P: [ESA / Rosetta Shape Models v2.0](https://doi.org/10.26007/34vg-8s07); Apophis: [NASA PDS / JPL Radar Shape Model v1.0](https://sbnarchive.psi.edu/pds4/non_mission/gbo.ast-apophis.jpl.radar.shape_model_v1.0/); Arrokoth: [NASA PDS / Porter 2024](https://doi.org/10.26007/97r3-1e19). Per-target archives show attribution and source pages. Web GLBs are format-converted or optimized derivatives of the source science meshes. This project is not affiliated with or endorsed by NASA or ESA
- Planetary ephemerides: [JPL Approximate Positions of the Major Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html); minor-body orbits and physical parameters: [NASA/JPL Small-Body Database](https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html); deep-space trajectories: [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/); the Kuiper belt’s 30–50 AU statistical extent and cold/hot population structure reference [NASA Solar System Exploration · Kuiper Belt](https://science.nasa.gov/solar-system/kuiper-belt/)
- Sun, Mercury, Venus, Earth/clouds, Mars, and Jupiter textures: [Solar System Scope Textures](https://www.solarsystemscope.com/textures/) (CC BY 4.0, based on NASA survey data)
- Saturn, Uranus, Neptune, Pluto, and Saturn-ring textures: threex.planets, originating from Planet Pixel Emporium
- Moon texture: official three.js example asset
- Milky Way panorama: [ESO / S. Brunier — The Milky Way panorama](https://www.eso.org/public/images/eso0932a/) (CC BY 4.0)
- Textures are bundled under `public/textures/`; failed loads fall back to procedural textures

## Commercialization readiness

The project can technically support sponsorships or advertising, but NASA/JPL/PDS data, institutional marks, CC material, and third-party derivative textures cannot all be relicensed under one project license. A commercial launch requires a file-level asset ledger and replacement or explicit permission for sources with incomplete provenance or unclear use restrictions. See [Commercialization and asset compliance](docs/commercialization-and-asset-compliance.md) for the full risk register, advertising gates, and non-endorsement requirements. The per-file asset ledger is [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md), and third-party attributions plus the non-endorsement statement are in [NOTICE](NOTICE).

The project retains flexible `#target=...&date=...` state links and now adds real content pages such as `/objects/earth#date=...` and `/missions/newhorizons#date=...`. Paths provide independent HTML, canonical metadata, Open Graph, and structured data, while fragments continue to carry dynamic date, scale, and language state.

Education and professional tiers are deferred to a later phase and are not promised by the current release.
