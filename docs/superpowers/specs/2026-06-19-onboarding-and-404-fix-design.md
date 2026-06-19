# Onboarding Flow & 404 Fix — Design Spec

**Date:** 2026-06-19
**Status:** Approved

---

## Problem

1. The app 404s on hard refresh or direct URL visit because GitHub Pages doesn't support SPA routing and `BrowserRouter` has no `basename`.
2. New users opening the plain URL silently get a randomly-generated room ID with no guidance — they're stranded in an empty room with no way to find their team's room.

---

## Goals

- Fix the 404 so any URL into the app works correctly on GitHub Pages.
- Give new users a clear first-time experience: create a new room or join an existing one.
- Room codes should be human-readable and pirate-themed so they're easy to share verbally or in Slack.

---

## Non-Goals

- Authentication or access control on rooms.
- Editing squad name or removing members after creation (future enhancement).
- Multiple rooms per team.

---

## Architecture

### 404 Fix

Two changes:

1. `src/App.tsx` — add `basename="/walktheplanko"` to `BrowserRouter`.
2. `public/404.html` — GitHub Pages serves this on any unknown path. It reads `window.location.pathname`, encodes it as a query param, and redirects to `index.html?p=/the/path`. A small script in `index.html` decodes the param and calls `window.history.replaceState` before React boots, so the router sees the correct path.

### Three-Word Room Codes

File: `src/lib/wordlist.ts`

Three arrays — adjectives, nouns (things), verbs/nouns (actions/objects) — each with ~30 pirate/nautical words. Format: `{adj}-{noun}-{noun2}`, e.g. `jolly-anchor-kraken`. Generates ~27,000 unique combos.

`src/lib/room.ts` gets two new functions:
- `generateRoomCode(): string` — picks one word from each array at random, joins with `-`.
- `roomCodeExists(code: string): Promise<boolean>` — checks Firebase for an existing room at that key.

Existing `getRoomId()` and `getRoomRef()` continue to work identically — the code is just a friendlier string as the key.

### Onboarding Modal

File: `src/components/OnboardingModal.tsx`

Renders as a full-screen overlay. Shown when: no `?room=` param in the URL AND no room ID in localStorage.

**State machine:**
```
idle → create_room | join_room
create_room: squad name → add members → submit → in game
join_room: enter code → validate → see/add members → submit → in game
```

**Create Room flow:**
1. Enter squad name (required, max 40 chars).
2. Add member names one at a time (same pattern as existing name input in `PlinkoGame`). Minimum 1 name required.
3. "Set Sail" button — generates a room code, writes `{ squadName, members }` to Firebase under `rooms/{code}/setup`, stores code in localStorage, sets `?room=code` in URL, closes modal.

**Join Room flow:**
1. Enter 3-word code (formatted input, lowercase, hyphen-separated).
2. Validate against Firebase — show error if not found.
3. Show existing member names (read from `rooms/{code}/setup/members`).
4. Option to add more names before joining.
5. "Board Ship" button — writes any new members to Firebase, stores code in localStorage, sets `?room=code` in URL, closes modal.

### RoomShare Update

`src/components/RoomShare.tsx` — display the 3-word code as the room identifier instead of the raw nanoid. No logic change, cosmetic only.

### Firebase Data Shape Addition

Existing `rooms/{roomId}/stats` path unchanged. New path added during room creation:

```json
{
  "rooms": {
    "jolly-anchor-kraken": {
      "setup": {
        "squadName": "The Kraken Crew",
        "members": ["Alice", "Bob", "Charlie"]
      },
      "stats": { ... }
    }
  }
}
```

Firebase rules need one addition to validate the `setup` path shape (non-breaking addition).

---

## Components Touched

| File | Change |
|------|--------|
| `src/App.tsx` | Add `basename` to BrowserRouter |
| `public/404.html` | New — SPA redirect shim |
| `index.html` | Add path-decode script before React boots |
| `src/lib/wordlist.ts` | New — pirate word arrays |
| `src/lib/room.ts` | Add `generateRoomCode`, `roomCodeExists` |
| `src/components/OnboardingModal.tsx` | New — full onboarding flow |
| `src/components/RoomShare.tsx` | Show friendly code instead of nanoid |
| `src/pages/Index.tsx` | Render `OnboardingModal` conditionally |

---

## What Doesn't Change

- `PlinkoGame.tsx`, `StatsPanel.tsx` — untouched.
- Firebase `rooms/{id}/stats` data structure — untouched.
- `stats.ts` — untouched.

---

## Self-Review

- No TBDs or placeholders.
- 404 fix and onboarding are independent — either could be shipped alone.
- Word list of 30×30×30 = 27,000 codes is well above the 1,000-room target.
- Joining a room with an invalid code fails gracefully with an inline error.
- Existing rooms created with nanoid IDs continue to work — this adds new behaviour for rooms without a `setup` node (they skip the modal if a room param is present).
