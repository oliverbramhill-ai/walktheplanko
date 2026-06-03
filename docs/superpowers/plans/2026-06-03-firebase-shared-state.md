# Firebase Shared State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-device localStorage with Firebase Realtime Database scoped by room ID, so each team has their own persistent shared names and stats history accessible via a shareable URL.

**Architecture:** Each room is identified by a nanoid stored in `?room=<id>` in the URL. All Firebase data lives under `/rooms/<roomId>/`. The existing `stats.ts` API (`loadStats`, `recordResult`, `clearHistory`) is reimplemented against Firebase — callers (`PlinkoGame`, `StatsPanel`) need only minor updates. Personal preferences (singleBallMode, lucky/unlucky sailor) stay in localStorage.

**Tech Stack:** Firebase Realtime Database, `firebase` npm package, `nanoid`, React, TypeScript, Vite, GitHub Actions

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/firebase.ts` | **Create** | Firebase app init, exports `database` |
| `src/lib/room.ts` | **Create** | Room ID read/write, Firebase ref scoping |
| `src/lib/stats.ts` | **Rewrite** | Same API, Firebase-backed |
| `src/components/RoomShare.tsx` | **Create** | Share button + room ID display |
| `src/components/PlinkoGame.tsx` | **Modify** | Swap names/scores localStorage → Firebase |
| `src/components/StatsPanel.tsx` | **Modify** | Use real-time subscription |
| `.github/workflows/deploy.yml` | **Modify** | Inject Firebase env vars at build |
| `scripts/migrate-stats.ts` | **Create** | One-off: seed stats-data.json into Firebase |
| `.env.local` | **Create** (local only) | Firebase config for local dev |
| `package.json` | **Modify** | Add `firebase`, `nanoid` |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install firebase and nanoid**

```bash
cd /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO
npm install firebase nanoid
```

Expected: both appear in `package.json` dependencies, no errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add firebase and nanoid dependencies"
```

---

## Task 2: Create Firebase initialisation

**Files:**
- Create: `src/lib/firebase.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
```

- [ ] **Step 2: Create local env file**

Create `.env.local` in the project root (this file is gitignored):

```
VITE_FIREBASE_API_KEY=paste-your-value-here
VITE_FIREBASE_AUTH_DOMAIN=paste-your-value-here
VITE_FIREBASE_DATABASE_URL=paste-your-value-here
VITE_FIREBASE_PROJECT_ID=paste-your-value-here
VITE_FIREBASE_APP_ID=paste-your-value-here
```

Fill in values from Firebase Console → Project Settings → Your apps → Web app config.

- [ ] **Step 3: Verify .env.local is gitignored**

```bash
cat /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO/.gitignore | grep env
```

Expected output includes `.env.local`. If missing, add it:

```bash
echo ".env.local" >> /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO/.gitignore
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase.ts .gitignore
git commit -m "feat: initialise Firebase app"
```

---

## Task 3: Create room ID management

**Files:**
- Create: `src/lib/room.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/room.ts
import { nanoid } from 'nanoid';
import { ref } from 'firebase/database';
import { database } from './firebase';

const ROOM_STORAGE_KEY = 'plinko-roomId';

export const getRoomId = (): string => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('room');
  if (fromUrl) {
    localStorage.setItem(ROOM_STORAGE_KEY, fromUrl);
    return fromUrl;
  }
  const fromStorage = localStorage.getItem(ROOM_STORAGE_KEY);
  if (fromStorage) {
    const url = new URL(window.location.href);
    url.searchParams.set('room', fromStorage);
    window.history.replaceState({}, '', url.toString());
    return fromStorage;
  }
  const newId = nanoid(10);
  localStorage.setItem(ROOM_STORAGE_KEY, newId);
  const url = new URL(window.location.href);
  url.searchParams.set('room', newId);
  window.history.replaceState({}, '', url.toString());
  return newId;
};

export const getRoomRef = (path: string) => {
  return ref(database, `rooms/${getRoomId()}/${path}`);
};

export const getShareUrl = (): string => {
  const url = new URL(window.location.href);
  url.searchParams.set('room', getRoomId());
  return url.toString();
};
```

- [ ] **Step 2: Verify the app still builds**

```bash
cd /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO && npm run build 2>&1 | tail -5
```

Expected: build completes without TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/room.ts
git commit -m "feat: add room ID management with URL param and localStorage fallback"
```

---

## Task 4: Rewrite stats.ts to use Firebase

**Files:**
- Modify: `src/lib/stats.ts`

The existing exported function signatures (`loadStats`, `recordResult`, `clearHistory`) must stay identical — `StatsPanel` and `PlinkoGame` call them directly. Add a new `subscribeStats` export for real-time updates.

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/lib/stats.ts`:

```typescript
import { get, set, push, onValue, off } from 'firebase/database';
import { getRoomRef } from './room';

export interface GameResult {
  name: string;
  timestamp: string;
  attendees: string[];
}

export interface PlayerStats {
  name: string;
  totalWalks: number;
  daysAttended: number;
  pctAttendedWalked: string;
  pctWorkDaysWalked: string;
  expectedWalks: number;
  luckStatus: string;
  luckStatusEmoji: string;
  daysSinceLastWalk: number;
  luckPct: number;
}

export interface StatsData {
  history: GameResult[];
  noGameDays: number;
}

const EMPTY_STATS: StatsData = { history: [], noGameDays: 0 };

export const loadStats = async (): Promise<StatsData> => {
  try {
    const snapshot = await get(getRoomRef('stats'));
    if (!snapshot.exists()) return EMPTY_STATS;
    const data = snapshot.val();
    // Firebase stores arrays as objects when they have gaps — normalise
    const rawHistory = data.history ?? {};
    const history: GameResult[] = Array.isArray(rawHistory)
      ? rawHistory
      : Object.values(rawHistory);
    return { history, noGameDays: data.noGameDays ?? 0 };
  } catch {
    return EMPTY_STATS;
  }
};

export const recordResult = async (name: string, attendees: string[]): Promise<void> => {
  const entry: GameResult = { name, timestamp: new Date().toISOString(), attendees };
  await push(getRoomRef('stats/history'), entry);
};

export const clearHistory = async (): Promise<void> => {
  await set(getRoomRef('stats'), EMPTY_STATS);
};

export const subscribeStats = (callback: (data: StatsData) => void): (() => void) => {
  const statsRef = getRoomRef('stats');
  const handler = onValue(statsRef, (snapshot) => {
    if (!snapshot.exists()) { callback(EMPTY_STATS); return; }
    const data = snapshot.val();
    const rawHistory = data.history ?? {};
    const history: GameResult[] = Array.isArray(rawHistory)
      ? rawHistory
      : Object.values(rawHistory);
    callback({ history, noGameDays: data.noGameDays ?? 0 });
  });
  return () => off(statsRef, 'value', handler);
};

export const getTotalWorkDays = (historyLength: number, noGameDays: number): number => {
  return historyLength + noGameDays;
};

export const getCounts = (history: GameResult[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const result of history) {
    counts[result.name] = (counts[result.name] || 0) + 1;
  }
  return counts;
};

const getLuckStatus = (pct: number): { status: string; emoji: string } => {
  if (pct < -70)  return { status: 'BLESSED',           emoji: '😇' };
  if (pct < -50)  return { status: 'Extremely Lucky',   emoji: '🍀' };
  if (pct < -30)  return { status: 'Very Lucky',        emoji: '☘️' };
  if (pct < -15)  return { status: 'Lucky',             emoji: '🌟' };
  if (pct <= 15)  return { status: 'Expected',          emoji: '⚖️' };
  if (pct <= 30)  return { status: 'Unlucky',           emoji: '😬' };
  if (pct <= 50)  return { status: 'Very Unlucky',      emoji: '😰' };
  if (pct <= 70)  return { status: 'CURSED',            emoji: '💀' };
  if (pct <= 90)  return { status: 'FORSAKEN',          emoji: '☠️' };
  if (pct <= 110) return { status: 'DOOMED!',           emoji: '😱' };
  if (pct <= 150) return { status: 'IRREDEEMABLE',      emoji: '🔥' };
  if (pct <= 200) return { status: 'APOCALYPTIC',       emoji: '💥' };
  if (pct < 240)  return { status: 'HOPE IS LOST',      emoji: '🌑' };
  return                 { status: 'BEYOND SALVATION',  emoji: '👹' };
};

export const computePlayerStats = (history: GameResult[], noGameDays: number): PlayerStats[] => {
  if (history.length === 0) return [];
  const totalWorkDays = getTotalWorkDays(history.length, noGameDays);
  const allNames = new Set<string>();
  history.forEach(r => { allNames.add(r.name); r.attendees.forEach(n => allNames.add(n)); });
  const numPlayers = allNames.size;
  return Array.from(allNames).map(name => {
    const walksHistory = history.filter(r => r.name === name);
    const totalWalks = walksHistory.length;
    const daysAttended = history.filter(r => r.attendees.includes(name)).length;
    const pctAttended = daysAttended > 0 ? (totalWalks / daysAttended) * 100 : 0;
    const pctWorkDays = totalWorkDays > 0 ? (totalWalks / totalWorkDays) * 100 : 0;
    const expectedWalks = daysAttended / numPlayers;
    const luckPct = expectedWalks > 0
      ? ((totalWalks - expectedWalks) / expectedWalks) * 100
      : totalWalks === 0 ? -100 : 100;
    const { status: luckStatus, emoji: luckStatusEmoji } = getLuckStatus(luckPct);
    const lastWalk = walksHistory.length > 0 ? walksHistory[walksHistory.length - 1] : null;
    const daysSinceLastWalk = lastWalk
      ? Math.floor((Date.now() - new Date(lastWalk.timestamp).getTime()) / (1000 * 60 * 60 * 24))
      : -1;
    return {
      name, totalWalks, daysAttended,
      pctAttendedWalked: pctAttended.toFixed(1) + '%',
      pctWorkDaysWalked: pctWorkDays.toFixed(1) + '%',
      expectedWalks: Math.round(expectedWalks * 10) / 10,
      luckStatus, luckStatusEmoji, daysSinceLastWalk,
      luckPct: Math.round(luckPct * 10) / 10,
    };
  });
};
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO && npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stats.ts
git commit -m "feat: rewrite stats.ts to use Firebase Realtime Database"
```

---

## Task 5: Update StatsPanel to use real-time subscription

**Files:**
- Modify: `src/components/StatsPanel.tsx`

Replace the `useEffect` that calls `loadStats()` once with a real-time subscription via `subscribeStats`. Remove the `refreshKey` prop — it's no longer needed because Firebase pushes updates automatically.

- [ ] **Step 1: Update StatsPanel.tsx**

Replace the imports at the top:

```typescript
import { useState, useEffect } from 'react';
import { subscribeStats, clearHistory, computePlayerStats, type GameResult, type PlayerStats } from '@/lib/stats';
```

Replace the `useEffect` block (currently around line 37–43):

```typescript
useEffect(() => {
  const unsubscribe = subscribeStats(data => {
    setHistory(data.history);
    setNoGameDays(data.noGameDays);
  });
  return unsubscribe;
}, []);
```

Remove the `refreshKey` from the props interface and parameter:

```typescript
// Before:
interface StatsPanelProps {
  refreshKey?: number;
}
export const StatsPanel = ({ refreshKey = 0 }: StatsPanelProps) => {

// After:
export const StatsPanel = () => {
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO && npm run build 2>&1 | tail -10
```

Expected: no errors. Note: PlinkoGame still passes `refreshKey` to StatsPanel — if there's a TypeScript error about unknown prop, that's fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/components/StatsPanel.tsx
git commit -m "feat: StatsPanel subscribes to Firebase real-time stats updates"
```

---

## Task 6: Update PlinkoGame to use Firebase for names and scores

**Files:**
- Modify: `src/components/PlinkoGame.tsx`

Replace localStorage reads/writes for `names` and `scores` with Firebase. Remove the `statsRefreshKey` state and the `refreshKey` prop passed to `StatsPanel`. Keep all other localStorage (singleBallMode, lucky/unlucky sailor).

- [ ] **Step 1: Add Firebase imports at top of PlinkoGame.tsx**

After the existing imports, add:

```typescript
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { getRoomRef, getRoomId } from '@/lib/room';
```

- [ ] **Step 2: Replace names and scores initial state**

Replace these two `useState` initialisers (around lines 50–54):

```typescript
// Before:
const [names, setNames] = useState<string[]>(() => {
  try { const v = localStorage.getItem('plinko-names'); return v ? JSON.parse(v) : DEFAULT_NAMES; } catch { return DEFAULT_NAMES; }
});
const [scores, setScores] = useState<Record<string, number>>(() => {
  try { const v = localStorage.getItem('plinko-scores'); return v ? JSON.parse(v) : {}; } catch { return {}; }
});

// After:
const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
const [scores, setScores] = useState<Record<string, number>>({});
```

- [ ] **Step 3: Remove statsRefreshKey state**

Remove:
```typescript
const [statsRefreshKey, setStatsRefreshKey] = useState(0);
```

- [ ] **Step 4: Add Firebase subscriptions in a useEffect**

Add this effect after the existing localStorage persist effects (after line 93):

```typescript
// Subscribe to names from Firebase
useEffect(() => {
  const namesRef = getRoomRef('names');
  const unsubscribe = onValue(namesRef, (snapshot) => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      setNames(Array.isArray(val) ? val : Object.values(val));
    }
  });
  return () => unsubscribe();
}, []);

// Subscribe to scores from Firebase
useEffect(() => {
  const scoresRef = getRoomRef('scores');
  const unsubscribe = onValue(scoresRef, (snapshot) => {
    if (snapshot.exists()) {
      setScores(snapshot.val() as Record<string, number>);
    }
  });
  return () => unsubscribe();
}, []);
```

- [ ] **Step 5: Replace localStorage persist effects for names and scores**

Remove these two lines (around lines 87–88):
```typescript
useEffect(() => { localStorage.setItem('plinko-names', JSON.stringify(names)); }, [names]);
useEffect(() => { localStorage.setItem('plinko-scores', JSON.stringify(scores)); }, [scores]);
```

Add Firebase write effects in their place:
```typescript
useEffect(() => {
  set(getRoomRef('names'), names).catch(() => {});
}, [names]);

useEffect(() => {
  set(getRoomRef('scores'), scores).catch(() => {});
}, [scores]);
```

- [ ] **Step 6: Remove refreshKey from StatsPanel usage**

Find where `<StatsPanel` is rendered and remove the `refreshKey` prop:

```typescript
// Before:
<StatsPanel refreshKey={statsRefreshKey} />

// After:
<StatsPanel />
```

Also remove any call to `setStatsRefreshKey` (search for it and delete those lines).

- [ ] **Step 7: Verify build**

```bash
cd /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO && npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 8: Commit**

```bash
git add src/components/PlinkoGame.tsx
git commit -m "feat: PlinkoGame reads/writes names and scores via Firebase"
```

---

## Task 7: Create RoomShare component

**Files:**
- Create: `src/components/RoomShare.tsx`

A small UI element showing the room ID and a copy-link button. Placed in the PlinkoGame header area.

- [ ] **Step 1: Create the component**

```typescript
// src/components/RoomShare.tsx
import { useState } from 'react';
import { getShareUrl, getRoomId } from '@/lib/room';

export const RoomShare = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs text-wood-mid">
      <span className="font-mono opacity-60">#{getRoomId()}</span>
      <button
        onClick={handleCopy}
        className="px-2 py-1 rounded bg-wood-dark/20 hover:bg-wood-dark/30 text-wood-dark font-pirate transition-colors"
      >
        {copied ? '✓ Copied!' : '⚓ Share'}
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Add RoomShare to PlinkoGame**

In `src/components/PlinkoGame.tsx`, add the import:

```typescript
import { RoomShare } from './RoomShare';
```

Find the game header area (look for the `<h1>` or top section with the game title) and add `<RoomShare />` alongside it. The exact placement depends on the JSX structure — put it in the top bar near the title so it's visible but not intrusive.

- [ ] **Step 3: Verify in browser**

With `npm run dev` running at http://localhost:8080, check:
- Room ID appears in the URL (`?room=...`)
- Share button copies the URL to clipboard
- Opening the copied URL in a new tab shows the same room

- [ ] **Step 4: Commit**

```bash
git add src/components/RoomShare.tsx src/components/PlinkoGame.tsx
git commit -m "feat: add RoomShare component with copy-link button"
```

---

## Task 8: Update GitHub Actions to inject Firebase env vars

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Update the Build step**

Replace the existing Build step:

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

- [ ] **Step 2: Add GitHub Secrets**

In the GitHub repo (https://github.com/oliverbramgill-ai/warlktheplanko), go to:
Settings → Secrets and variables → Actions → New repository secret

Add each of these five secrets with values from your Firebase console:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: inject Firebase env vars into GitHub Pages build"
```

---

## Task 9: Write and run the historical data migration script

**Files:**
- Create: `scripts/migrate-stats.ts`

This is a one-off Node script. Run it once after Firebase is set up to seed your team's historical data.

- [ ] **Step 1: Create the script**

```typescript
// scripts/migrate-stats.ts
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import statsData from '../stats-data.json' assert { type: 'json' };

const roomId = process.argv[2];
if (!roomId) {
  console.error('Usage: npx tsx scripts/migrate-stats.ts <roomId>');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const statsRef = ref(db, `rooms/${roomId}/stats`);
await set(statsRef, statsData);
console.log(`✓ Migrated ${statsData.history.length} games to room: ${roomId}`);
process.exit(0);
```

- [ ] **Step 2: Run the migration**

First, copy your room ID from the browser URL (`?room=<id>`) after loading the app once locally. Then run:

```bash
cd /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO
source .env.local  # loads VITE_FIREBASE_* vars into shell
npx tsx scripts/migrate-stats.ts YOUR_ROOM_ID_HERE
```

Expected output:
```
✓ Migrated 75 games to room: YOUR_ROOM_ID_HERE
```

- [ ] **Step 3: Verify in browser**

Open http://localhost:8080 (with your room in the URL) → click Stats → confirm history shows games going back to January 2026.

- [ ] **Step 4: Commit the script**

```bash
git add scripts/migrate-stats.ts
git commit -m "chore: add one-off stats migration script for historical data"
```

---

## Task 10: Deploy and smoke test

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Monitor the Actions run**

Go to https://github.com/oliverbramgill-ai/warlktheplanko/actions and watch the deploy workflow complete. Expected: green checkmark.

- [ ] **Step 3: Smoke test on GitHub Pages**

Open https://oliverbramgill-ai.github.io/warlktheplanko/ in two different browsers or incognito windows.

Check:
1. First browser gets a `?room=` param in the URL
2. Copy the full URL and open it in the second browser
3. Edit names in browser 1 → verify browser 2 updates within ~1 second
4. Run a game in browser 1 → verify Stats panel in browser 2 shows the new result
5. Open the base URL (no `?room=` param) in a third window → verify it creates a fresh room with no history
