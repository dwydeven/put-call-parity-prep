# Parity Prep

Parity Prep is a lightweight speed-drill game for practicing put-call parity and related options-market-making arithmetic. It is a static React application: it has no accounts, backend, database, analytics, or external market-data dependency.

## Current state

The app currently includes:

- A Zetamac-inspired setup screen with selectable Put-Call, Combo, Straddle, and B/W and P+S drills.
- Timed rounds of 30, 60, 120, 300, or 600 seconds, or fixed rounds of 5, 10, 20, or 100 questions.
- Immediate advance and scoring when a correct decimal answer is entered. Both `.27` and `0.27` are accepted.
- An optional “Show Formula” aid and a “Show Answer” control that advances without awarding a point.
- A results screen showing correct answers and answers revealed. Revealed answers count toward a fixed question total without awarding a point.
- An installable iPhone web app that works offline after its first online load.
- Docker/Nginx deployment on port `1080`.

## Install on iPhone

The hosted app is available at [https://dwydeven.github.io/put-call-parity-prep/](https://dwydeven.github.io/put-call-parity-prep/). The site is public, but all questions, answers, and scores remain on the device and are never transmitted.

1. While online, open the hosted app in Safari.
2. Tap **Share**, then **Add to Home Screen**.
3. Turn on **Open as Web App**, then tap **Add**.
4. Wait until the install panel says **Ready for offline use**.
5. Launch Parity Prep from its Home Screen icon. It will now work without Wi-Fi or cellular service.

When the app is opened online, it checks for a newer deployment. Updates are applied from the setup screen so an active timed round is never interrupted. If the app or its Safari website data is deleted, repeat the online installation steps to restore offline access.

### Enable GitHub Pages once

Repository administrators must select **Settings → Pages → Build and deployment → Source → GitHub Actions**. After that, every successful push to `master` runs the tests and publishes the production build. The deployment can also be started manually from the **Actions** tab.

## Mathematical model

Questions are generated locally with integer-cent arithmetic so every displayed parity calculation reconciles exactly.

1. Stock price and a strike on a $0.25 grid are generated within $50 of each other.
2. Interest rate (1%–10%), volatility (10%–80%), and time to expiration (30–365 days) are generated.
3. Put and call premiums are calculated using the non-dividend Black–Scholes model, then rounded to cents.
4. The reversal/conversion residual is derived after rounding:

   ```text
   r/c = C − P − S + K
   ```

   This preserves the displayed identity exactly:

   ```text
   C − P = S − K + r/c
   ```

5. The generator rejects samples unless put/call values are positive, strike remains on the $0.25 grid, and `r/c` is positive and no more than $5.00.

The game also drills these identities:

```text
Combo    = C − P
Straddle = C + P
B/W      = S − C − K
P+S      = P + S − K
```

## Run with Docker (recommended)

Requirements: [Docker](https://docs.docker.com/get-docker/) with Docker Compose.

```bash
docker compose up --build
```

Open [http://localhost:1080](http://localhost:1080).

To stop the application:

```bash
docker compose down
```

## Run locally with Node.js

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Vite will print the local development URL, normally `http://localhost:5173`.

## Test and build

```bash
npm test
npm run build
npm run verify:build
```

The test suite covers Black–Scholes benchmark pricing, parity preservation, strike and carry bounds, question selection, and decimal-answer parsing. The build verifier confirms that the install manifest, icon, service worker, offline precache, and GitHub Pages-safe asset paths were generated correctly. Docker and GitHub Pages builds run both checks before producing a deployable artifact.

To test offline behavior manually, serve the production `dist` directory over localhost or HTTPS, load it once while online, wait for the offline-ready status, switch the browser to offline mode, then reload and complete a round.

## Security model

- The hosted app contains only static files and has no server-side application surface.
- It requests no device permissions and sends no usage data anywhere.
- Production dependencies and deployment Actions are pinned; automated builds use the committed lockfile.
- A restrictive content-security policy limits the app to its own scripts, styles, images, manifest, and service worker.
- GitHub Pages is public hosting, not an authentication boundary. Do not add secrets or private data to the frontend bundle.
