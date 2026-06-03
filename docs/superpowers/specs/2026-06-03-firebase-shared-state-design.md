# Firebase Shared State Design

**Date:** 2026-06-03  
**Repo:** oliverbramgill-ai/warlktheplanko  
**Deployed at:** https://oliverbramgill-ai.github.io/warlktheplanko/

---

## Goal

Make the app usable by the whole team via GitHub Pages, with shared persistent state: everyone sees the same player names, scores, and stats history. Historical data from `stats-data.json` (75+ games, Jan–May 2026) must be preserved.

---

## Architecture

GitHub Pages serves the static build. Firebase Realtime Database is the single source of truth for all mutable state.

```
Firebase RTDB
├── /names        → string[]
├── /scores       → { [name]: number }
└── /stats        → { history: GameResult[], noGameDays: number }
```

The Firebase SDK runs entirely in the browser. No server required. Config values (API key, project ID, etc.) are injected at build time via environment variables.

---

## Firebase Setup (from scratch)

1. Go to https://console.firebase.google.com and create a new project named `walktheplanko`
2. Disable Google Analytics (not needed)
3. In the project, go to **Build → Realtime Database → Create database**
   - Choose a region (e.g. `europe-west1`)
   - Start in **test mode** (we'll tighten rules after)
4. Go to **Project Settings → Your apps → Add app → Web**
   - Register the app, copy the `firebaseConfig` object
5. Set database rules to allow public read/write (acceptable for an internal team tool):
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

---

## Environment Variables

Local (`.env.local`, gitignored):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

GitHub Actions secrets (must be added to repo settings):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

The GitHub Actions workflow `.github/workflows/deploy.yml` must pass these as `env:` in the Build step.

---

## Code Changes

### 1. Install Firebase SDK
```
npm install firebase
```

### 2. New file: `src/lib/firebase.ts`
Initialises the Firebase app and exports the `database` instance.

### 3. Rewrite `src/lib/stats.ts`
- `loadStats()` → reads `/stats` from RTDB
- `recordResult()` → pushes to `/stats/history`
- `clearHistory()` → resets `/stats`
- Add `subscribeStats(callback)` for real-time listener (used by StatsPanel)
- Offline fallback: Firebase SDK's built-in persistence handles queuing writes when offline

### 4. Update `src/components/PlinkoGame.tsx`
- On mount: read `/names` and `/scores` from RTDB instead of localStorage
- On names change: write `/names` to RTDB
- On score change: write `/scores` to RTDB
- Remove all `localStorage` reads/writes for names and scores (keep singleBallMode, luckySailor prefs as localStorage — these are personal settings)

### 5. Data migration script: `scripts/migrate-stats.ts`
- Reads `stats-data.json`
- Writes the full history to `/stats` in RTDB
- One-off script, run once locally with `npx tsx scripts/migrate-stats.ts`

---

## What Stays in localStorage

These are personal preferences, not shared state — they remain in localStorage:
- `plinko-singleBallMode`
- `plinko-luckySailor` / `plinko-luckySailorEnabled`
- `plinko-unluckySailor` / `plinko-unluckySailorEnabled`

---

## GitHub Actions Update

Add env vars to the Build step in `.github/workflows/deploy.yml`:
```yaml
- name: Build
  run: npm run build
  env:
    VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
    VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
    VITE_FIREBASE_DATABASE_URL: ${{ secrets.VITE_FIREBASE_DATABASE_URL }}
    VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
    VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
```

---

## Success Criteria

- Two different browsers/devices opening the app see the same names and stats
- Running a game on one device updates the scoreboard and stats for everyone
- Historical data (Jan–May 2026) is visible in the stats panel
- App does not crash when Firebase is temporarily unreachable
