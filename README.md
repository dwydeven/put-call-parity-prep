# Parity Prep

Parity Prep is a lightweight, local speed-drill game for practicing put-call parity and related options-market-making arithmetic. It is a static React application: it has no accounts, backend, database, or external market-data dependency.

## Current state

The app currently includes:

- A Zetamac-inspired setup screen with selectable Put-Call, Combo, Straddle, and B/W and P+S drills.
- Timed rounds of 30, 60, 120, 300, or 600 seconds.
- Immediate advance and scoring when a correct decimal answer is entered. Both `.27` and `0.27` are accepted.
- An optional “Show Formula” aid and a “Show Answer” control that advances without awarding a point.
- A results screen showing correct answers and answers revealed.
- Docker/Nginx deployment on port `1080`.

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
```

The test suite covers Black–Scholes benchmark pricing, parity preservation, strike and carry bounds, question selection, and decimal-answer parsing. Docker builds run the same test suite before producing the Nginx image.
