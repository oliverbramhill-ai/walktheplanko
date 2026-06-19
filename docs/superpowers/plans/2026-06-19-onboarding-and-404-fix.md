# Onboarding Flow & 404 Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix GitHub Pages SPA routing (404 on hard refresh) and add a first-time onboarding modal that lets users create a named room or join an existing one using a human-readable three-word pirate code.

**Architecture:** The 404 fix uses the standard GitHub Pages SPA shim (404.html redirect + index.html decode). Onboarding is a full-screen modal rendered in `Index.tsx` that only shows when no room is detected; it writes squad name and members to `rooms/{code}/setup` in Firebase before landing the user in the game. Room codes are generated from three pirate/nautical word arrays in a new `wordlist.ts` file.

**Tech Stack:** React 18 + TypeScript + Vite 5, Firebase Realtime Database, react-router-dom v6, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `public/404.html` | Create | GitHub Pages SPA redirect shim |
| `index.html` | Modify | Decode redirected path before React boots |
| `src/App.tsx` | Modify | Add `basename` to BrowserRouter |
| `src/lib/wordlist.ts` | Create | Three arrays of pirate/nautical words |
| `src/lib/room.ts` | Modify | Add `generateRoomCode`, `roomCodeExists`, `getSquadSetup` |
| `src/components/OnboardingModal.tsx` | Create | Full create/join onboarding flow |
| `src/pages/Index.tsx` | Modify | Render `OnboardingModal` when no room detected |
| `src/components/RoomShare.tsx` | Modify | Display friendly word code instead of nanoid |

---

## Task 1: Fix the GitHub Pages 404

**Files:**
- Create: `public/404.html`
- Modify: `index.html`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `public/404.html`**

This file is served by GitHub Pages whenever a path doesn't match a file. It encodes the path into a query param and redirects to `index.html` so React Router can handle it.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Walk the Plank-o!</title>
    <script>
      // GitHub Pages SPA redirect shim.
      // Encodes the requested path into a query param and redirects to index.html.
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + 1).join('/') + '/?p=/' +
        l.pathname.slice(1).split('/').slice(1).join('/').replace(/&/g, '~and~') +
        (l.search ? '&q=' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
</html>
```

- [ ] **Step 2: Add path-decode script to `index.html`**

Add this script block inside `<head>` immediately before the closing `</head>` tag in `index.html`:

```html
    <script>
      // Decode the path redirect from 404.html before React boots.
      (function() {
        var redirect = sessionStorage.redirect;
        delete sessionStorage.redirect;
        if (redirect && redirect !== location.href) {
          history.replaceState(null, null, redirect);
        }
        // Also handle the ?p= query param from the 404 shim
        var search = window.location.search;
        if (search.slice(1, 3) === 'p=') {
          var decoded = search.slice(1).split('&').map(function(s) {
            return s.replace(/~and~/g, '&');
          });
          window.history.replaceState(
            null, null,
            window.location.pathname.split('/').slice(0, -1).join('/') + '/' +
            decoded[0].slice(2) +
            (decoded[1] ? '?' + decoded[1].slice(2) : '') +
            window.location.hash
          );
        }
      })();
    </script>
```

- [ ] **Step 3: Add `basename` to `BrowserRouter` in `src/App.tsx`**

Change line 16 from:
```tsx
      <BrowserRouter>
```
to:
```tsx
      <BrowserRouter basename="/walktheplanko">
```

- [ ] **Step 4: Verify locally**

Run: `npm run build && npm run preview`

Open `http://localhost:4173/walktheplanko/` — game should load.

Navigate to `http://localhost:4173/walktheplanko/?room=test` — game should load with `test` as room ID (check localStorage and URL bar).

- [ ] **Step 5: Commit**

```bash
git add public/404.html index.html src/App.tsx
git commit -m "fix: add GitHub Pages SPA routing shim and BrowserRouter basename"
```

---

## Task 2: Pirate Word List

**Files:**
- Create: `src/lib/wordlist.ts`

- [ ] **Step 1: Create `src/lib/wordlist.ts`**

```typescript
export const ADJECTIVES = [
  'jolly', 'cursed', 'salty', 'black', 'crimson', 'ancient', 'fearless',
  'sunken', 'stormy', 'golden', 'silent', 'roaring', 'ghostly', 'iron',
  'wild', 'brave', 'dead', 'silver', 'dread', 'mighty', 'wicked', 'lost',
  'royal', 'raging', 'hollow', 'broken', 'dark', 'blazing', 'frozen', 'swift',
];

export const NOUNS = [
  'anchor', 'kraken', 'cannon', 'compass', 'cutlass', 'galleon', 'lantern',
  'plank', 'reef', 'skull', 'tide', 'voyage', 'barnacle', 'bilge', 'cove',
  'davey', 'flagship', 'hull', 'jollyroger', 'mast', 'mariner', 'orca',
  'porthole', 'quarterdeck', 'rigging', 'serpent', 'starboard', 'squall',
  'tempest', 'whirlpool',
];

export const OBJECTS = [
  'atlas', 'beacon', 'brig', 'buccaneer', 'chart', 'chest', 'crow',
  'cutlass', 'dagger', 'doubloon', 'flint', 'grog', 'helm', 'horizon',
  'isle', 'knot', 'loot', 'mainsail', 'mizzen', 'parrot', 'pearl',
  'pistol', 'powder', 'prize', 'rum', 'sextant', 'shackle', 'siren',
  'spyglass', 'trident',
];
```

- [ ] **Step 2: Verify word counts**

Each array has exactly 30 words = 30 × 30 × 30 = 27,000 possible codes. Manually count each array in the file to confirm 30 entries.

- [ ] **Step 3: Commit**

```bash
git add src/lib/wordlist.ts
git commit -m "feat: add pirate/nautical word list for room code generation"
```

---

## Task 3: Room Code Generation

**Files:**
- Modify: `src/lib/room.ts`

- [ ] **Step 1: Add imports to `src/lib/room.ts`**

Add to the top of the file after existing imports:
```typescript
import { ADJECTIVES, NOUNS, OBJECTS } from './wordlist';
import { child, get } from 'firebase/database';
import { ref as dbRef } from 'firebase/database';
```

Note: `ref` is already imported as a named import from `firebase/database` in this file — add `child` and `get` to the same import statement. The existing import line is:
```typescript
import { ref } from 'firebase/database';
```
Change it to:
```typescript
import { ref, child, get } from 'firebase/database';
```

- [ ] **Step 2: Add `generateRoomCode` function**

Add after the existing `ROOM_STORAGE_KEY` constant:

```typescript
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const generateRoomCode = (): string =>
  `${pick(ADJECTIVES)}-${pick(NOUNS)}-${pick(OBJECTS)}`;
```

- [ ] **Step 3: Add `roomCodeExists` function**

```typescript
export const roomCodeExists = async (code: string): Promise<boolean> => {
  const roomRef = dbRef(database, `rooms/${code}`);
  const snapshot = await get(roomRef);
  return snapshot.exists();
};
```

- [ ] **Step 4: Add `getSquadSetup` function**

```typescript
export interface SquadSetup {
  squadName: string;
  members: string[];
}

export const getSquadSetup = async (code: string): Promise<SquadSetup | null> => {
  const setupRef = dbRef(database, `rooms/${code}/setup`);
  const snapshot = await get(setupRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  const members: string[] = Array.isArray(data.members)
    ? data.members
    : Object.values(data.members ?? {});
  return { squadName: data.squadName ?? '', members };
};
```

- [ ] **Step 5: Add `saveSquadSetup` function**

```typescript
export const saveSquadSetup = async (code: string, setup: SquadSetup): Promise<void> => {
  const setupRef = dbRef(database, `rooms/${code}/setup`);
  await set(setupRef, setup);
};
```

Note: `set` is already imported in this file via `firebase/database` — if not, add it to the existing import statement.

- [ ] **Step 6: Verify the existing `getRoomId` still works**

Read `src/lib/room.ts` and confirm `getRoomId()` and `getRoomRef()` are unchanged. No modifications to those functions.

- [ ] **Step 7: Commit**

```bash
git add src/lib/room.ts
git commit -m "feat: add room code generation and squad setup read/write to room.ts"
```

---

## Task 4: Onboarding Modal

**Files:**
- Create: `src/components/OnboardingModal.tsx`

This component handles the full create/join flow. It is shown full-screen over the game. It is self-contained — all Firebase calls go through `room.ts` functions.

- [ ] **Step 1: Create `src/components/OnboardingModal.tsx`**

```tsx
import { useState } from 'react';
import { generateRoomCode, roomCodeExists, getSquadSetup, saveSquadSetup } from '@/lib/room';
import { set } from 'firebase/database';

type Screen = 'choice' | 'create' | 'join' | 'join_members';

interface OnboardingModalProps {
  onComplete: (roomCode: string) => void;
}

export const OnboardingModal = ({ onComplete }: OnboardingModalProps) => {
  const [screen, setScreen] = useState<Screen>('choice');
  const [squadName, setSquadName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [joinedCode, setJoinedCode] = useState('');
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addMember = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || members.includes(trimmed)) return;
    setMembers(prev => [...prev, trimmed]);
    setNameInput('');
  };

  const removeMember = (name: string) => {
    setMembers(prev => prev.filter(m => m !== name));
  };

  const handleCreateSubmit = async () => {
    if (!squadName.trim()) { setError('Enter a squad name'); return; }
    if (members.length < 1) { setError('Add at least one crew member'); return; }
    setLoading(true);
    setError('');
    try {
      const code = generateRoomCode();
      await saveSquadSetup(code, { squadName: squadName.trim(), members });
      onComplete(code);
    } catch {
      setError('Failed to create room. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLookup = async () => {
    const code = codeInput.trim().toLowerCase();
    if (!code) { setError('Enter a room code'); return; }
    setLoading(true);
    setError('');
    try {
      const exists = await roomCodeExists(code);
      if (!exists) { setError('Room not found. Check the code and try again.'); setLoading(false); return; }
      const setup = await getSquadSetup(code);
      setJoinedCode(code);
      setExistingMembers(setup?.members ?? []);
      setMembers([]);
      setScreen('join_members');
    } catch {
      setError('Failed to look up room. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (members.length > 0) {
        const setup = await getSquadSetup(joinedCode);
        const merged = [...(setup?.members ?? []), ...members];
        await saveSquadSetup(joinedCode, {
          squadName: setup?.squadName ?? '',
          members: merged,
        });
      }
      onComplete(joinedCode);
    } catch {
      setError('Failed to join room. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-wood-dark rounded-2xl border-2 border-gold/40 p-8 shadow-2xl">

        {screen === 'choice' && (
          <div className="text-center space-y-6">
            <h1 className="font-pirate text-4xl text-gold drop-shadow">Walk the Plank-o!</h1>
            <p className="text-parchment/80 text-sm">Gather yer crew. One room per ship.</p>
            <div className="space-y-3">
              <button
                onClick={() => setScreen('create')}
                className="w-full py-3 px-6 bg-gold text-wood-dark font-pirate text-xl rounded-xl hover:bg-gold/90 transition-colors"
              >
                ⚓ Create a New Room
              </button>
              <button
                onClick={() => setScreen('join')}
                className="w-full py-3 px-6 border border-gold/50 text-gold font-pirate text-xl rounded-xl hover:bg-gold/10 transition-colors"
              >
                🗺️ Join an Existing Room
              </button>
            </div>
          </div>
        )}

        {screen === 'create' && (
          <div className="space-y-5">
            <h2 className="font-pirate text-3xl text-gold text-center">Name Yer Ship</h2>
            <div>
              <label className="text-parchment/70 text-xs uppercase tracking-widest mb-1 block">Squad Name</label>
              <input
                type="text"
                maxLength={40}
                value={squadName}
                onChange={e => setSquadName(e.target.value)}
                placeholder="e.g. The Kraken Crew"
                className="w-full bg-wood-mid/30 border border-gold/30 rounded-lg px-3 py-2 text-parchment placeholder-parchment/30 focus:outline-none focus:border-gold/60"
              />
            </div>
            <div>
              <label className="text-parchment/70 text-xs uppercase tracking-widest mb-1 block">Crew Members</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                  placeholder="Enter a name"
                  className="flex-1 bg-wood-mid/30 border border-gold/30 rounded-lg px-3 py-2 text-parchment placeholder-parchment/30 focus:outline-none focus:border-gold/60"
                />
                <button onClick={addMember} className="px-4 py-2 bg-gold/20 hover:bg-gold/30 text-gold rounded-lg border border-gold/30 transition-colors">
                  Add
                </button>
              </div>
              {members.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {members.map(m => (
                    <span key={m} className="flex items-center gap-1 px-2 py-1 bg-wood-mid/40 border border-gold/20 rounded-full text-parchment text-sm">
                      {m}
                      <button onClick={() => removeMember(m)} className="text-parchment/40 hover:text-red-400 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setScreen('choice')} className="flex-1 py-2 border border-gold/30 text-parchment/60 rounded-xl hover:text-parchment transition-colors">
                Back
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={loading}
                className="flex-1 py-2 bg-gold text-wood-dark font-pirate text-lg rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Setting sail...' : 'Set Sail! 🏴‍☠️'}
              </button>
            </div>
          </div>
        )}

        {screen === 'join' && (
          <div className="space-y-5">
            <h2 className="font-pirate text-3xl text-gold text-center">Join a Room</h2>
            <div>
              <label className="text-parchment/70 text-xs uppercase tracking-widest mb-1 block">Room Code</label>
              <input
                type="text"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoinLookup()}
                placeholder="e.g. jolly-anchor-kraken"
                className="w-full bg-wood-mid/30 border border-gold/30 rounded-lg px-3 py-2 text-parchment font-mono placeholder-parchment/30 focus:outline-none focus:border-gold/60"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setScreen('choice')} className="flex-1 py-2 border border-gold/30 text-parchment/60 rounded-xl hover:text-parchment transition-colors">
                Back
              </button>
              <button
                onClick={handleJoinLookup}
                disabled={loading}
                className="flex-1 py-2 bg-gold text-wood-dark font-pirate text-lg rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Searching...' : 'Find Room 🗺️'}
              </button>
            </div>
          </div>
        )}

        {screen === 'join_members' && (
          <div className="space-y-5">
            <h2 className="font-pirate text-3xl text-gold text-center">Board the Ship</h2>
            <div>
              <p className="text-parchment/70 text-xs uppercase tracking-widest mb-2">Current Crew</p>
              <div className="flex flex-wrap gap-2">
                {existingMembers.map(m => (
                  <span key={m} className="px-2 py-1 bg-wood-mid/40 border border-gold/20 rounded-full text-parchment text-sm">{m}</span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-parchment/70 text-xs uppercase tracking-widest mb-1 block">Add New Crew Members (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                  placeholder="Enter a name"
                  className="flex-1 bg-wood-mid/30 border border-gold/30 rounded-lg px-3 py-2 text-parchment placeholder-parchment/30 focus:outline-none focus:border-gold/60"
                />
                <button onClick={addMember} className="px-4 py-2 bg-gold/20 hover:bg-gold/30 text-gold rounded-lg border border-gold/30 transition-colors">
                  Add
                </button>
              </div>
              {members.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {members.map(m => (
                    <span key={m} className="flex items-center gap-1 px-2 py-1 bg-gold/10 border border-gold/30 rounded-full text-parchment text-sm">
                      {m}
                      <button onClick={() => removeMember(m)} className="text-parchment/40 hover:text-red-400 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleJoinSubmit}
              disabled={loading}
              className="w-full py-3 bg-gold text-wood-dark font-pirate text-xl rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Boarding...' : 'Board Ship! ⚓'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors. (The component won't render yet — wired up in the next task.)

- [ ] **Step 3: Commit**

```bash
git add src/components/OnboardingModal.tsx
git commit -m "feat: add OnboardingModal with create and join room flows"
```

---

## Task 5: Wire Up Onboarding in Index

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/lib/room.ts` (export `ROOM_STORAGE_KEY` or add a `hasRoom()` helper)

- [ ] **Step 1: Add `hasRoom` helper to `src/lib/room.ts`**

Add this function at the end of `src/lib/room.ts`:

```typescript
export const hasRoom = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return !!(params.get('room') || localStorage.getItem(ROOM_STORAGE_KEY));
};

export const setRoom = (code: string): void => {
  localStorage.setItem(ROOM_STORAGE_KEY, code);
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
  window.history.replaceState({}, '', url.toString());
};
```

- [ ] **Step 2: Rewrite `src/pages/Index.tsx`**

```tsx
import { useState } from 'react';
import { PlinkoGame } from '@/components/PlinkoGame';
import { OnboardingModal } from '@/components/OnboardingModal';
import { hasRoom, setRoom } from '@/lib/room';

const Index = () => {
  const [roomReady, setRoomReady] = useState(hasRoom());

  const handleOnboardingComplete = (code: string) => {
    setRoom(code);
    setRoomReady(true);
  };

  return (
    <main className="min-h-screen ocean-gradient py-6">
      {!roomReady && <OnboardingModal onComplete={handleOnboardingComplete} />}
      <PlinkoGame />
    </main>
  );
};

export default Index;
```

Note: `PlinkoGame` renders behind the modal when `!roomReady`. The modal is `fixed` + `z-50` so it sits on top. Once `roomReady` becomes true the modal unmounts and the game is fully interactive.

- [ ] **Step 3: Verify locally**

Run: `npm run dev`

Open `http://localhost:8080` — modal should appear with "Create a New Room" and "Join an Existing Room" options.

Test the Create path: enter squad name, add 2+ names, click "Set Sail". Confirm modal closes, game loads, URL now has `?room=jolly-xxx-yyy`, localStorage has `plinko-roomId`.

Clear localStorage (`plinko-roomId`) and remove `?room=` from URL, reload — modal should reappear.

Test the Join path: use the room code from the previous step. Confirm it finds the room, shows existing members, and lands in game.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Index.tsx src/lib/room.ts
git commit -m "feat: show OnboardingModal on first visit, wire up room creation and joining"
```

---

## Task 6: Update RoomShare to Show Friendly Code

**Files:**
- Modify: `src/components/RoomShare.tsx`

The room ID stored in localStorage and the URL is now the friendly three-word code (e.g. `jolly-anchor-kraken`). `getRoomId()` already returns it. The display just needs a label tweak.

- [ ] **Step 1: Update `src/components/RoomShare.tsx`**

Replace the entire file:

```tsx
import { useState, useRef } from 'react';
import { getShareUrl, getRoomId } from '@/lib/room';

export const RoomShare = () => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="flex items-center gap-2 text-xs text-wood-mid">
      <span className="font-mono opacity-60 tracking-wide">{getRoomId()}</span>
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

- [ ] **Step 2: Verify locally**

Run: `npm run dev`

With a room active (from Task 5 testing), confirm the room code shown in the header is the human-readable three-word code, not a nanoid string.

Click "⚓ Share" — confirm the copied URL contains `?room=jolly-xxx-yyy`.

- [ ] **Step 3: Commit**

```bash
git add src/components/RoomShare.tsx
git commit -m "fix: display human-readable room code in RoomShare header"
```

---

## Task 7: Push and Verify Live Deploy

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Watch the Actions run**

```bash
gh run list --limit 3
```

Wait for status `completed` + conclusion `success`. If it fails, run:
```bash
gh run view $(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --log-failed
```

- [ ] **Step 3: Smoke test the live site**

Open `https://oliverbramhill-ai.github.io/walktheplanko/`

Verify:
- Onboarding modal appears on first visit
- Create a room: enter squad name + names, click Set Sail — game loads with friendly code in header
- Share button copies URL with `?room=` code
- Open the copied URL in an incognito tab — Join flow appears, existing names shown, can add more
- Hard-refresh the live URL — game loads (no 404)
- Navigate to `https://oliverbramhill-ai.github.io/walktheplanko/?room=some-unknown-code` — onboarding modal appears with join screen pre-filled (or create option visible)

---

## Self-Review

**Spec coverage:**
- ✅ 404 fix — Task 1
- ✅ `basename` for BrowserRouter — Task 1
- ✅ Three-word pirate codes — Task 2
- ✅ 27,000+ combinations (30³) — Task 2, word count verified in step
- ✅ `generateRoomCode` / `roomCodeExists` / `getSquadSetup` — Task 3
- ✅ Onboarding modal with create/join — Task 4
- ✅ Squad name on create — Task 4
- ✅ Add members on create — Task 4
- ✅ Join by code, see existing members, add more — Task 4
- ✅ Wire up modal to Index — Task 5
- ✅ `hasRoom` so modal only shows when needed — Task 5
- ✅ RoomShare shows friendly code — Task 6
- ✅ Deploy and smoke test — Task 7

**Placeholder scan:** None found.

**Type consistency:**
- `SquadSetup` defined in Task 3 (`room.ts`), imported in Task 4 (`OnboardingModal.tsx`) via `saveSquadSetup` / `getSquadSetup` — consistent.
- `hasRoom` and `setRoom` defined in Task 5 step 1, imported in Task 5 step 2 — consistent.
- `generateRoomCode`, `roomCodeExists`, `getSquadSetup`, `saveSquadSetup` all defined in Task 3, imported in Task 4 — consistent.
