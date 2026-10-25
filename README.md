# CheckHaze

Singapore air-quality companion, live at https://checkhaze.com.

## Run locally

Requires Node.js 22+ and Bash. No npm dependencies or API keys are required.

```sh
npm test
npm run build
npm run validate
npm run dev -- --port 3000
```

Open http://localhost:3000. Live feeds need outbound HTTPS access.

## Features

- NEA regional 1-hour PM2.5 and 24-hour PSI, location selection and optional phone geolocation.
- Hourly history, four-week comparisons, CSV export and agency publication references.
- Activity planning, browser-local saved plans, calendar rechecks and purifier sizing.
- Interactive Marina Bay geometry, animated water/haze, Singapore time and weather themes.
- Progressive loading, explicit stale/partial data, independent retries and accessible controls.

## Architecture

Vanilla HTML/CSS/JavaScript; a Cloudflare Worker serves the app and uses licensed NEA/MSS datasets through data.gov.sg APIs. Agency webpage text/images are not scraped. No server-side personal accounts. Preferences and plans stay in browser storage.

Edit `src/`. `scripts/compose.mjs` generates `worker/index.js`; the build packages `dist/server/index.js`. Generated bundles are reproducible from source. `.openai/hosting.json` identifies the existing ChatGPT Sites deployment.

This GitHub repository stores source and runs checks. Production remains hosted on ChatGPT Sites at checkhaze.com; pushing here alone does not publish to Sites. GitHub Pages cannot run this app's Worker API.

## Blender

Run `node scripts/export-scene.mjs` to generate the mesh JSON, then follow `assets/blender/README.md`. Blender was unavailable during development; the browser renderer and mesh are tested, the Blender import is syntax-checked only.

## Data use and privacy

See [data-use review](docs/DATA-USAGE-REVIEW.md) for licence attribution, removed webpage scrapers, privacy handling and remaining operator obligations. Agency datasets have their own licence; this repository does not grant rights to third-party material.

## Verification

See `tests/QA.md` for recorded manual and automated coverage. Official feeds can be temporarily unavailable; the UI labels this and provides source links/retries. Numeric multi-week haze forecasts are not invented.
