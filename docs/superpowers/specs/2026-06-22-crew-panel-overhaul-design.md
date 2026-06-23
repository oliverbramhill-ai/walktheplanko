# Crew Panel Overhaul — Design Spec

**Date:** 2026-06-22
**Status:** Approved

---

## Problem

The current crew management UX has several friction points:
- Removing someone who's absent today permanently deletes them — they must be re-added manually
- The crew member limit is 10 (too small for many teams)
- Lucky Sailor is in Game Options; Unlucky Sailor floats above Game Options — inconsistent and separated from the crew they apply to
- Stats are only visible in the full StatsPanel — no at-a-glance view per crew member
- The "Edit Crew Names" panel mixes daily-use concerns (who's playing today) with roster management (adding/renaming members)

---

## Goals

- Crew cards replace the flat name-input grid: each card shows attendance, lucky/unlucky controls, and inline stats
- Absent crew members stay in the roster — they're just excluded from today's game
- Lucky and unlucky sailor are set directly on crew cards — no separate dropdowns
- Roster management (add, rename, remove) moves into a dedicated modal
- Crew limit raised from 10 to 15
- Game Options panel simplified to just Single Ball Mode

---

## Non-Goals

- Persisting daily attendance to Firebase (presence is ephemeral, reset on refresh)
- Changing the StatsPanel or the full stats view
- Changing the game physics or PlinkoGame core logic

---

## Data Model

### Roster (permanent, Firebase)
Stored at `rooms/{roomId}/setup/members` — the existing path from onboarding. Up to 15 names. Only written when the user opens the Roster Modal to add, rename, or remove a crew member.

### Presence (ephemeral, local state)
A `Set<string>` of names who are playing today. Managed in `CrewPanel`. Defaults to all roster members on load. Not persisted — resets on page refresh. This is intentional: every day starts with a full crew and you mark who's out.

### Lucky / Unlucky Sailor (local state, localStorage)
Unchanged from current implementation. `luckySailor` and `unluckySailor` are string | null stored in localStorage. If a crew member is toggled absent, their lucky/unlucky assignment is cleared.

### names (derived)
`roster.filter(m => present.has(m))` — the array passed to PlinkoGame's game engine. No change to how PlinkoGame uses it.

---

## Component Architecture

### New: `CrewPanel`
Owns: `present: Set<string>`, `luckySailor: string | null`, `unluckySailor: string | null`.

Reads roster from Firebase `rooms/{roomId}/setup/members` via `onValue` subscription.

Derives `names` (active game participants) and passes it up to PlinkoGame via an `onNamesChange` callback.

Renders:
- Grid of `CrewCard` components (3 columns)
- "Manage Roster" button at the bottom → opens `RosterModal`
- Footer: `{present.size} playing today · {roster.length} in roster`

### New: `CrewCard`
Props:
```typescript
interface CrewCardProps {
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
  disabled: boolean; // true while balls are dropping
}
```

Behaviour:
- Clicking anywhere on the card (except the 🍀/💀 buttons) calls `onTogglePresent`
- Absent cards are dimmed (opacity 0.45), name has strikethrough, 🍀/💀 buttons are non-interactive
- 🍀 highlighted (gold border + background) when `isLucky`, dimmed otherwise
- 💀 highlighted (red border + background) when `isUnlucky`, dimmed otherwise
- Stats line: `{totalWalks} walks · {luckStatusEmoji} {luckStatus}`

### New: `RosterModal`
Full-screen modal overlay (same pirate styling as `OnboardingModal`).

Reads/writes `rooms/{roomId}/setup/members` in Firebase.

Features:
- List of all roster members with editable name inputs
- Remove button per member (disabled if roster would drop below 2)
- "Add Crew Member" input at the bottom (disabled at 15)
- Save button writes the updated array to Firebase
- Cancel button discards changes

### Modified: `PlinkoGame`
Removed:
- `names` state (now owned by `CrewPanel` and passed in via prop)
- `luckySailor`, `luckySailorEnabled`, `unluckySailor`, `unluckySailorEnabled` state
- "Edit Crew Names" JSX section
- Lucky/Unlucky checkboxes and dropdowns from Game Options
- `addName`, `removeName` functions
- 10-member limit

Added:
- `names` prop (received from `CrewPanel` via callback)
- `luckySailor: string | null` prop
- `unluckySailor: string | null` prop
- Renders `<CrewPanel onNamesChange={...} onLuckyChange={...} onUnluckyChange={...} isDropping={isDropping} />`

Game Options panel retains only:
- 🎱 Single Ball Mode checkbox

---

## Inline Stats

`CrewPanel` calls `computePlayerStats` (from `stats.ts`) using the current Firebase stats subscription. Each `CrewCard` receives `totalWalks`, `luckStatus`, and `luckStatusEmoji` for its member. If a member has no history yet, shows `0 walks · ⚖️ Expected`.

The full `StatsPanel` is unchanged.

---

## Interaction Rules

- Only one lucky sailor allowed at a time. Clicking 🍀 on a second card clears the previous lucky assignment.
- Only one unlucky sailor allowed at a time. Same rule.
- Lucky/unlucky are cleared if the assigned member is toggled absent.
- All card interactions disabled while `isDropping` is true.

---

## Files Changed

| File | Action |
|------|--------|
| `src/components/CrewPanel.tsx` | Create |
| `src/components/CrewCard.tsx` | Create |
| `src/components/RosterModal.tsx` | Create |
| `src/components/PlinkoGame.tsx` | Modify — remove crew state/UI, accept names/lucky/unlucky as derived from CrewPanel |
| `src/lib/room.ts` | Modify — export `ROSTER_LIMIT = 15` constant |

---

## Self-Review

**Placeholder scan:** None.

**Internal consistency:** `names` flows from Firebase roster → CrewPanel (filter by presence) → PlinkoGame prop. Lucky/unlucky flow from CrewPanel state → PlinkoGame props. The game engine is unchanged. ✅

**Scope check:** Focused. No stats changes, no Firebase schema changes beyond what already exists, no routing changes. ✅

**Ambiguity check:**
- "Presence resets on refresh" is explicit — this is intentional UX, not a bug.
- "Disabled while dropping" applies to all card interactions (toggle present, toggle lucky/unlucky, open roster modal).
- RosterModal saves on explicit "Save" click, not auto-save, to avoid mid-edit Firebase writes.
