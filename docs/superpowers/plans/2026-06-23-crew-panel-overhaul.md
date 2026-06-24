# Crew Panel Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat crew name editor with a card-based crew panel where presence is toggled per session, lucky/unlucky are assigned directly on cards, and roster management lives in a dedicated modal.

**Architecture:** `CrewPanel` owns presence + lucky/unlucky state, reads roster from Firebase, derives `names` (present members only), and renders `CrewCard` components. `PlinkoGame` becomes a pure game engine — it accepts `names`, `luckySailor`, and `unluckySailor` as props rendered into it by `CrewPanel`. Roster edits (add/rename/remove) happen in `RosterModal` which writes `rooms/{roomId}/setup/members`.

**Tech Stack:** React 18 + TypeScript, Firebase Realtime Database (`onValue`), localStorage for lucky/unlucky + singleBallMode, Tailwind CSS with existing pirate theme classes (`parchment-bg`, `rope-border`, `font-pirate`, `text-wood-dark`, `text-parchment`, `pirate-button`).

---

### Task 1: Export `ROSTER_LIMIT` and create `CrewCard`

**Files:**
- Modify: `src/lib/room.ts`
- Create: `src/components/CrewCard.tsx`

- [ ] **Step 1: Add `ROSTER_LIMIT` export to `room.ts`**

Open `src/lib/room.ts` and add after the imports (line 5):

```typescript
export const ROSTER_LIMIT = 15;
```

No other changes to this file.

- [ ] **Step 2: Run TypeScript check to confirm no breakage**

```bash
cd /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Create `src/components/CrewCard.tsx`**

```tsx
import type { FC } from 'react';

export interface CrewCardProps {
  name: string;
  present: boolean;
  isLucky: boolean;
  isUnlucky: boolean;
  totalWalks: number;
  luckStatus: string;
  luckStatusEmoji: string;
  onTogglePresent: () => void;
  onToggleLucky: () => void;
  onToggleUnlucky: () => void;
  disabled: boolean;
}

export const CrewCard: FC<CrewCardProps> = ({
  name,
  present,
  isLucky,
  isUnlucky,
  totalWalks,
  luckStatus,
  luckStatusEmoji,
  onTogglePresent,
  onToggleLucky,
  onToggleUnlucky,
  disabled,
}) => {
  const handleLucky = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!present || disabled) return;
    onToggleLucky();
  };

  const handleUnlucky = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!present || disabled) return;
    onToggleUnlucky();
  };

  return (
    <div
      onClick={() => !disabled && onTogglePresent()}
      className={`
        rounded-xl p-3 cursor-pointer select-none transition-all
        ${present
          ? 'bg-gold/15 border-2 border-gold/70'
          : 'bg-black/15 border-2 border-white/10 opacity-45'
        }
        ${disabled ? 'cursor-not-allowed' : ''}
      `}
    >
      <div
        className={`text-sm font-bold text-center mb-2 ${
          present ? 'text-parchment' : 'text-parchment/50 line-through'
        }`}
      >
        {name}
      </div>

      <div className="flex justify-center gap-2 mb-2">
        <button
          onClick={handleLucky}
          className={`text-2xl rounded-lg px-2 py-1 transition-all border-2 leading-none ${
            isLucky
              ? 'bg-gold/25 border-gold/80'
              : 'bg-transparent border-white/15 opacity-35'
          } ${!present || disabled ? 'pointer-events-none' : ''}`}
          tabIndex={-1}
        >
          🍀
        </button>
        <button
          onClick={handleUnlucky}
          className={`text-2xl rounded-lg px-2 py-1 transition-all border-2 leading-none ${
            isUnlucky
              ? 'bg-red-800/25 border-red-500/70'
              : 'bg-transparent border-white/15 opacity-35'
          } ${!present || disabled ? 'pointer-events-none' : ''}`}
          tabIndex={-1}
        >
          💀
        </button>
      </div>

      <div className="text-center text-[11px] text-parchment/55">
        {totalWalks} walk{totalWalks !== 1 ? 's' : ''} · {luckStatusEmoji} {luckStatus}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO
git add src/lib/room.ts src/components/CrewCard.tsx
git commit -m "feat: add ROSTER_LIMIT constant and CrewCard component"
```

---

### Task 2: Create `RosterModal`

**Files:**
- Create: `src/components/RosterModal.tsx`

`RosterModal` reads the current `rooms/{roomId}/setup/members` array from Firebase on open, lets the user add/rename/remove members, then saves on explicit "Save". Cancel discards.

- [ ] **Step 1: Create `src/components/RosterModal.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react';
import { get, set } from 'firebase/database';
import { getRoomRef, ROSTER_LIMIT } from '@/lib/room';

interface RosterModalProps {
  onClose: () => void;
  onSaved: (members: string[]) => void;
}

export const RosterModal = ({ onClose, onSaved }: RosterModalProps) => {
  const [members, setMembers] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get(getRoomRef('setup/members')).then((snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const arr: string[] = Array.isArray(val) ? val : Object.values(val ?? {});
        setMembers(arr.filter((m): m is string => typeof m === 'string'));
      }
    });
  }, []);

  const handleRename = (index: number, value: string) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  const handleRemove = (index: number) => {
    if (members.length <= 2) return;
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (members.length >= ROSTER_LIMIT) {
      setError(`Crew is full (max ${ROSTER_LIMIT})`);
      return;
    }
    if (members.some(m => m.toLowerCase() === trimmed.toLowerCase())) {
      setError('That name is already in the crew');
      return;
    }
    setError('');
    setMembers([...members, trimmed]);
    setNewName('');
    inputRef.current?.focus();
  };

  const handleSave = async () => {
    // Validate: no blank names, no duplicates
    const trimmed = members.map(m => m.trim()).filter(Boolean);
    const unique = [...new Set(trimmed.map(m => m.toLowerCase()))];
    if (unique.length !== trimmed.length) {
      setError('Duplicate names found — each crew member must have a unique name');
      return;
    }
    if (trimmed.length < 2) {
      setError('Need at least 2 crew members');
      return;
    }
    setSaving(true);
    try {
      await set(getRoomRef('setup/members'), trimmed);
      onSaved(trimmed);
      onClose();
    } catch {
      setError('Failed to save — check your connection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="parchment-bg rope-border rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <h2 className="font-pirate text-2xl text-wood-dark mb-4">⚓ Manage Roster</h2>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
          {members.map((name, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={name}
                onChange={e => handleRename(i, e.target.value)}
                className="flex-1 px-2 py-1 rounded bg-wood-dark text-parchment text-sm border border-rope focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                onClick={() => handleRemove(i)}
                disabled={members.length <= 2}
                className="px-2 py-1 rounded bg-red-700 text-parchment text-xs hover:bg-red-600 disabled:opacity-30 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {members.length < ROSTER_LIMIT && (
          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="New crew member name…"
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-2 py-1 rounded bg-wood-dark text-parchment text-sm border border-rope focus:outline-none focus:ring-2 focus:ring-gold placeholder:text-parchment/40"
            />
            <button
              onClick={handleAdd}
              className="px-3 py-1 rounded bg-green-700 text-parchment text-sm font-pirate hover:bg-green-600 transition-colors"
            >
              + Add
            </button>
          </div>
        )}

        {members.length >= ROSTER_LIMIT && (
          <p className="text-xs text-wood-mid mb-3 text-center">Roster full ({ROSTER_LIMIT}/{ROSTER_LIMIT})</p>
        )}

        {error && (
          <p className="text-red-700 text-xs mb-3 text-center">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded border border-wood-dark text-wood-dark font-pirate hover:bg-wood-dark/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 pirate-button disabled:opacity-50"
          >
            {saving ? 'Saving…' : '⚓ Save Roster'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/RosterModal.tsx
git commit -m "feat: add RosterModal for roster add/rename/remove"
```

---

### Task 3: Create `CrewPanel`

**Files:**
- Create: `src/components/CrewPanel.tsx`

`CrewPanel` is the heart of the overhaul. It owns presence, lucky/unlucky, subscribes to Firebase roster, subscribes to stats, and calls `onNamesChange` / `onLuckyChange` / `onUnluckyChange` whenever its derived state changes.

- [ ] **Step 1: Check the `computePlayerStats` signature in `stats.ts`**

```bash
grep -n "computePlayerStats\|PlayerStats\|GameResult" /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO/src/lib/stats.ts | head -20
```

Confirm the function signature and the fields on `PlayerStats` (especially `name`, `totalWalks`, `luckStatus`, `luckStatusEmoji`).

- [ ] **Step 2: Create `src/components/CrewPanel.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { onValue } from 'firebase/database';
import { getRoomRef } from '@/lib/room';
import { subscribeStats, computePlayerStats, type PlayerStats } from '@/lib/stats';
import { CrewCard } from './CrewCard';
import { RosterModal } from './RosterModal';

interface CrewPanelProps {
  onNamesChange: (names: string[]) => void;
  onLuckyChange: (name: string | null) => void;
  onUnluckyChange: (name: string | null) => void;
  isDropping: boolean;
}

const LS_LUCKY = 'plinko-luckySailor';
const LS_UNLUCKY = 'plinko-unluckySailor';

const readLS = (key: string): string | null => {
  try { return localStorage.getItem(key) || null; } catch { return null; }
};

const writeLS = (key: string, value: string | null) => {
  try { localStorage.setItem(key, value ?? ''); } catch { /* ignore */ }
};

export const CrewPanel = ({
  onNamesChange,
  onLuckyChange,
  onUnluckyChange,
  isDropping,
}: CrewPanelProps) => {
  const [roster, setRoster] = useState<string[]>([]);
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [luckySailor, setLuckySailorState] = useState<string | null>(readLS(LS_LUCKY));
  const [unluckySailor, setUnluckySailorState] = useState<string | null>(readLS(LS_UNLUCKY));
  const [statsMap, setStatsMap] = useState<Record<string, PlayerStats>>({});
  const [showRosterModal, setShowRosterModal] = useState(false);

  // Helpers that keep localStorage + callback in sync
  const setLucky = (name: string | null) => {
    writeLS(LS_LUCKY, name);
    setLuckySailorState(name);
    onLuckyChange(name);
  };
  const setUnlucky = (name: string | null) => {
    writeLS(LS_UNLUCKY, name);
    setUnluckySailorState(name);
    onUnluckyChange(name);
  };

  // Subscribe roster from Firebase
  useEffect(() => {
    const unsub = onValue(getRoomRef('setup/members'), (snap) => {
      if (!snap.exists()) return;
      const val = snap.val();
      const arr: string[] = Array.isArray(val)
        ? val
        : Object.values(val ?? {});
      const members = arr.filter((m): m is string => typeof m === 'string');
      setRoster(members);
      setPresent(prev => {
        // Keep existing presence for members still in roster; new members start present
        const next = new Set<string>();
        members.forEach(m => {
          if (prev.has(m) || !prev.size) next.add(m);
        });
        return next;
      });
    });
    return unsub;
  }, []);

  // Subscribe stats
  useEffect(() => {
    const unsub = subscribeStats((data) => {
      const all = computePlayerStats(data.history, data.noGameDays);
      const map: Record<string, PlayerStats> = {};
      all.forEach(p => { map[p.name] = p; });
      setStatsMap(map);
    });
    return unsub;
  }, []);

  // Notify parent whenever present set changes
  useEffect(() => {
    const activeNames = roster.filter(m => present.has(m));
    onNamesChange(activeNames);
  }, [present, roster]);

  // Notify parent of initial lucky/unlucky on mount
  useEffect(() => {
    onLuckyChange(luckySailor);
    onUnluckyChange(unluckySailor);
  }, []);

  const togglePresent = (name: string) => {
    setPresent(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        // Clear lucky/unlucky if this member goes absent
        if (luckySailor === name) setLucky(null);
        if (unluckySailor === name) setUnlucky(null);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleLucky = (name: string) => {
    setLucky(luckySailor === name ? null : name);
  };

  const toggleUnlucky = (name: string) => {
    setUnlucky(unluckySailor === name ? null : name);
  };

  const handleRosterSaved = (members: string[]) => {
    // Firebase subscription will update roster state; just close modal
    setShowRosterModal(false);
  };

  const DEFAULT_STATS: PlayerStats = {
    name: '',
    totalWalks: 0,
    expectedWalks: 0,
    daysSinceLastWalk: -1,
    luckStatus: 'Expected',
    luckStatusEmoji: '⚖️',
  };

  return (
    <div className="parchment-bg rounded-xl p-4 rope-border">
      <h3 className="font-pirate text-xl text-wood-dark mb-3">⚓ Crew</h3>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {roster.map(name => {
          const stats = statsMap[name] ?? { ...DEFAULT_STATS, name };
          return (
            <CrewCard
              key={name}
              name={name}
              present={present.has(name)}
              isLucky={luckySailor === name}
              isUnlucky={unluckySailor === name}
              totalWalks={stats.totalWalks}
              luckStatus={stats.luckStatus}
              luckStatusEmoji={stats.luckStatusEmoji}
              onTogglePresent={() => togglePresent(name)}
              onToggleLucky={() => toggleLucky(name)}
              onToggleUnlucky={() => toggleUnlucky(name)}
              disabled={isDropping}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-wood-mid">
        <span>{present.size} playing today · {roster.length} in roster</span>
        <button
          onClick={() => !isDropping && setShowRosterModal(true)}
          disabled={isDropping}
          className="px-2 py-1 rounded border border-wood-dark/30 text-wood-dark font-pirate hover:bg-wood-dark/10 transition-colors disabled:opacity-40 text-xs"
        >
          ✏️ Manage Roster
        </button>
      </div>

      {showRosterModal && (
        <RosterModal
          onClose={() => setShowRosterModal(false)}
          onSaved={handleRosterSaved}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If `PlayerStats` is missing a field (e.g. `luckStatusEmoji`), check `stats.ts` and adjust the `DEFAULT_STATS` accordingly.

- [ ] **Step 4: Commit**

```bash
git add src/components/CrewPanel.tsx
git commit -m "feat: add CrewPanel with presence toggle, lucky/unlucky, inline stats"
```

---

### Task 4: Modify `PlinkoGame` — accept props, remove crew UI

**Files:**
- Modify: `src/components/PlinkoGame.tsx`

This is the biggest change. The goal: `PlinkoGame` stops owning names/lucky/unlucky state and stops rendering any crew UI. It renders `<CrewPanel>` and receives derived values from it.

**What to remove:**
- `DEFAULT_NAMES` constant
- `names` state (line 52)
- `luckySailor` / `luckySailorEnabled` / `unluckySailor` / `unluckySailorEnabled` state (lines 64–75)
- Their localStorage persist `useEffect` calls (lines 85–89)
- The Firebase `names` subscription `useEffect` (lines 92–101) — names come from CrewPanel now
- The `set(getRoomRef('names'), names)` `useEffect` (lines 114–116) — roster lives in `setup/members`
- `addName` function (lines 673–677)
- `removeName` function (lines 679–690)
- The "Edit Crew Names" JSX block (lines 842–892)
- The Lucky/Unlucky checkbox + dropdown JSX (lines 770–793 and 815–838)

**What to add:**
- Three state variables driven by `CrewPanel` callbacks:
  - `const [names, setNames] = useState<string[]>([]);`
  - `const [luckySailor, setLuckySailor] = useState<string | null>(null);`
  - `const [unluckySailor, setUnluckySailor] = useState<string | null>(null);`
- Import and render `<CrewPanel>` in the sidebar
- Keep `luckySailorEnabled` and `unluckySailorEnabled` **as derived booleans** (not state): `const luckySailorEnabled = luckySailor !== null;` and `const unluckySailorEnabled = unluckySailor !== null;`

- [ ] **Step 1: Remove state and imports no longer needed**

In `src/components/PlinkoGame.tsx`:

Remove the `DEFAULT_NAMES` constant (lines 15–17).

Replace the `names` state line:
```typescript
// REMOVE:
const [names, setNames] = useState<string[]>(DEFAULT_NAMES);

// REPLACE WITH:
const [names, setNames] = useState<string[]>([]);
```

Replace the four lucky/unlucky state declarations (lines 64–75):
```typescript
// REMOVE all four useState calls for luckySailor/luckySailorEnabled/unluckySailor/unluckySailorEnabled

// REPLACE WITH:
const [luckySailor, setLuckySailor] = useState<string | null>(null);
const [unluckySailor, setUnluckySailor] = useState<string | null>(null);
const luckySailorEnabled = luckySailor !== null;
const unluckySailorEnabled = unluckySailor !== null;
```

- [ ] **Step 2: Remove localStorage persist effects**

Remove these five `useEffect` calls (lines 85–89 — the ones writing to `plinko-singleBallMode`, `plinko-luckySailor`, etc. for lucky/unlucky):
```typescript
// REMOVE:
useEffect(() => { localStorage.setItem('plinko-luckySailor', luckySailor || ''); }, [luckySailor]);
useEffect(() => { localStorage.setItem('plinko-luckySailorEnabled', String(luckySailorEnabled)); }, [luckySailorEnabled]);
useEffect(() => { localStorage.setItem('plinko-unluckySailor', unluckySailor || ''); }, [unluckySailor]);
useEffect(() => { localStorage.setItem('plinko-unluckySailorEnabled', String(unluckySailorEnabled)); }, [unluckySailorEnabled]);
```

Keep the `singleBallMode` localStorage persist — that one stays.

- [ ] **Step 3: Remove Firebase names subscription and write effects**

Remove the `useEffect` that subscribes `onValue` on `getRoomRef('names')` (lines 92–101).

Remove the `useEffect` that calls `set(getRoomRef('names'), names)` (lines 114–116).

Keep the scores Firebase subscription and write effects — those stay unchanged.

- [ ] **Step 4: Remove `addName`, `removeName`**

Delete functions `addName` and `removeName` entirely (lines 673–690).

- [ ] **Step 5: Remove crew UI JSX and Lucky/Unlucky controls**

In the return JSX, remove:
1. The standalone Lucky/Unlucky checkbox + select block that appears between the buttons and the "Game Options" panel (approximately lines 770–793).
2. Inside the "Game Options" `<div>`, remove the Lucky Sailor checkbox + select (approximately lines 815–838). Keep only the Single Ball Mode checkbox.
3. Remove the entire "Edit Crew Names" `<div>` block (approximately lines 842–892).

- [ ] **Step 6: Add `CrewPanel` import and render it**

Add to the imports at the top of the file:
```typescript
import { CrewPanel } from './CrewPanel';
```

In the sidebar (the right column `<div className="flex flex-col gap-4">`), add `<CrewPanel>` as the **first child** (before `<Scoreboard>`):

```tsx
<CrewPanel
  onNamesChange={setNames}
  onLuckyChange={setLuckySailor}
  onUnluckyChange={setUnluckySailor}
  isDropping={isDropping}
/>
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Fix any errors. Common issues:
- `luckySailorEnabled` and `unluckySailorEnabled` are now `const boolean` — if they're used in the `useEffect` dependency array at line 542, that's fine (they're derived from `luckySailor`/`unluckySailor` which are in the deps already).
- `addName` / `removeName` may be referenced in JSX that was removed — confirm they're fully gone.

- [ ] **Step 8: Commit**

```bash
git add src/components/PlinkoGame.tsx
git commit -m "feat: refactor PlinkoGame — crew panel extracted, names/lucky/unlucky via props"
```

---

### Task 5: Wire up, verify in browser, deploy

- [ ] **Step 1: Start dev server**

```bash
cd /Users/oliverbramhill/Desktop/Claude_projects/projects/WALKTHEPLANKO
npm run dev
```

- [ ] **Step 2: Verify the following in browser at http://localhost:5173**

Checklist:
- [ ] Crew cards render for all roster members
- [ ] Clicking a card (not a button) toggles present/absent — absent cards dim + strikethrough
- [ ] Clicking 🍀 on a present card sets that member as lucky (gold highlight); clicking again clears it
- [ ] Clicking 💀 on a present card sets that member as unlucky (red highlight); clicking again clears it
- [ ] Only one lucky + one unlucky at a time — assigning to a second card clears the first
- [ ] Making a member absent clears their lucky/unlucky assignment
- [ ] 🍀/💀 buttons on absent cards do nothing
- [ ] "Manage Roster" opens `RosterModal` — can add/rename/remove members, Save writes to Firebase, Cancel discards
- [ ] After saving roster, crew cards update to reflect new members
- [ ] Footer shows correct `X playing today · Y in roster` count
- [ ] "⚙️ Game Options" now shows only Single Ball Mode checkbox
- [ ] DROP THE CANNONBALLS works — only present members appear in drop zones and on the board
- [ ] Lucky sailor gets a smaller slot; unlucky sailor gets a larger slot
- [ ] Stats show on each card after a game is played
- [ ] Game with a full drop → winner banner → stats update on cards

- [ ] **Step 3: Deploy to GitHub Pages**

```bash
git push origin main
```

GitHub Actions will build and deploy. Confirm at https://oliverbramhill-ai.github.io/walktheplanko/ once the action completes (~2 min).

- [ ] **Step 4: Smoke test on live site**

Repeat the key interactions from Step 2 on the deployed URL to confirm nothing is broken by the `basename` routing or build differences.

---

## Self-Review

**Spec coverage:**
- ✅ Crew limit raised to 15 — `ROSTER_LIMIT = 15` in Task 1
- ✅ Present/absent toggle — `CrewPanel` presence Set in Task 3
- ✅ Lucky/unlucky as big per-card buttons — `CrewCard` in Task 1
- ✅ Inline stats on crew cards — `statsMap` + `DEFAULT_STATS` in Task 3
- ✅ Roster management in dedicated modal — `RosterModal` in Task 2
- ✅ Whole card click = toggle attendance — `onClick` on outer div in `CrewCard`
- ✅ Game Options simplified to Single Ball Mode — JSX removal in Task 4
- ✅ Absent crew cleared of lucky/unlucky — `togglePresent` guard in Task 3
- ✅ All interactions disabled while `isDropping` — `disabled` prop threaded throughout

**Placeholder scan:** None. All steps contain complete code.

**Type consistency:**
- `CrewCardProps` defined in Task 1, consumed in Task 3 — field names match.
- `PlayerStats` shape checked against `stats.ts` at Task 3 Step 1 before use.
- `luckySailorEnabled` / `unluckySailorEnabled` converted to derived booleans in Task 4; still used correctly in `getSlotWidths` closure.
- `onSaved` in `RosterModal` receives `string[]`; `handleRosterSaved` in `CrewPanel` accepts `string[]` — match.
