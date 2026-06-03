# Firebase Shared State Design

**Date:** 2026-06-03  
**Repo:** oliverbramgill-ai/warlktheplanko  
**Deployed at:** https://oliverbramgill-ai.github.io/warlktheplanko/

---

## Goal

Make the app usable by any team via GitHub Pages. Each team has their own isolated game with their own player names and stats history. Teams do not see each other's data. Historical data from `stats-data.json` (75+ games, Jan–May 2026) is preserved for the original team.

---

## Architecture

GitHub Pages serves the static build. Firebase Realtime Database stores all mutable state, scoped by room ID so each team is fully isolated.

```
Firebase RTDB
└── /rooms
    └── /<roomId>
        ├── /names        → string[]
        ├── /scores       → { [name]: number }
        └── /stats        → { history: GameResult[], noGameDays: number }
```

### Room Identity

- On first visit (no `?room=` in URL), the app generates a new unique room ID (e.g. `nanoid()`), saves it to `localStorage`, and updates the URL to `?room=<id>`
- On subsequent visits, the room ID is read from the URL query param first, then falls back to `localStorage`
- To share a room with teammates, share the full URL — anyone opening that URL joins the same room and sees the same names and stats
- Each room is independent — different teams never see each other's data

### UI for Room Management

A small "Share" button in the header copies the current URL to clipboard. A "New game" option lets a user start a fresh room (generates new ID, clears localStorage room key).

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

### 1. Install dependencies
```
npm install firebase nanoid
```

### 2. New file: `src/lib/firebase.ts`
Initialises the Firebase app and exports the `database` instance.

### 3. New file: `src/lib/room.ts`
- `getRoomId()` — reads `?room=` from URL, falls back to localStorage, or generates a new nanoid, saves to localStorage and pushes to URL history
- `getRoomRef(path)` — returns a Firebase ref scoped to `/rooms/<roomId>/<path>`

### 4. Rewrite `src/lib/stats.ts`
- `loadStats()` → reads from `getRoomRef('stats')`
- `recordResult()` → pushes to room's stats history
- `clearHistory()` → resets room's stats
- `subscribeStats(callback)` → real-time listener on room's stats node

### 5. Update `src/components/PlinkoGame.tsx`
- On mount: read names and scores from `getRoomRef('names')` and `getRoomRef('scores')`
- On names change: write to room's names node
- On score change: write to room's scores node
- Remove localStorage reads/writes for names and scores

### 6. New component: `src/components/RoomShare.tsx`
Small header element with a "Share" button that copies `window.location.href` to clipboard. Shows the current room ID for reference.

### 7. Data migration script: `scripts/migrate-stats.ts`
- Accepts a `--room` argument for the target room ID
- Reads `stats-data.json`
- Writes to `/rooms/<roomId>/stats` in RTDB
- Run once: `npx tsx scripts/migrate-stats.ts --room <your-team-room-id>`

---

## What Stays in localStorage

Personal preferences, not shared state — remain in localStorage (not scoped to room):
- `plinko-singleBallMode`
- `plinko-luckySailor` / `plinko-luckySailorEnabled`
- `plinko-unluckySailor` / `plinko-unluckySailorEnabled`

Room ID is stored in localStorage under `plinko-roomId` as the fallback when no `?room=` param is in the URL.

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

- A new visitor with no URL param gets a fresh room with no names or history
- Two people sharing the same `?room=` URL see the same names and stats in real time
- A different team visiting the base URL (no param) gets their own isolated room
- Oliver's team historical data (Jan–May 2026) is visible after running the migration script with their room ID
- App does not crash when Firebase is temporarily unreachable
