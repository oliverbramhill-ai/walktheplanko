# Single-Ball "Chosen One" Rework — Design

**Date:** 2026-07-08
**Status:** Approved by Oliver

## Background

Walk the Plank-o currently has two modes: multi-ball (15 balls per player, scored per slot) and single-ball. Multi-ball has persistent trust problems — the same ball can be counted for multiple people — caused by (a) a Firebase echo loop on the `scores` sync and (b) slot attribution estimated from the ball's x-coordinate at floor contact. Single ball can also escape the board through the top corners, requiring a restart.

Decision: **multi-ball is removed entirely.** The game becomes single-ball only. One ball drops with the existing chaotic physics, and whoever's slot it lands in is chosen for the day. There are no scores and no scoreboard.

## Game flow

1. Crew is set up as today (CrewPanel, up to 15 names, optional lucky/unlucky sailors adjusting slot widths).
2. One drop button. A single gold ball drops from the board centre with the current single-ball physics: `timeScale` 0.25 slow-motion, peg restitution 1.5, ball restitution 0.98, trail effect. The chaos is intentional and stays.
3. The ball settles in a slot. That sailor is **chosen** — WinnerBanner, confetti, winner sounds, and the pick recorded to stats history via `recordResult`.
4. Reset clears the board for the next drop.

## Changes

### Removals (in `src/components/PlinkoGame.tsx` and related)

- Multi-ball drop path: `dropWave`, per-player `dropCounts`, wave timing.
- `singleBallMode` state, its localStorage persistence, and the Game Options checkbox — single ball is the only mode.
- Ball-count tracking (`ballCountRef`, `activeBalls`, "Balls in play" UI) and the timeScale ramp-down for the last few balls.
- `DropZones` component usage (drop position is always board centre).
- `Scoreboard` component and all `scores` / `scoresRef` state.
- Firebase `scores` sync (`onValue` subscription + `set` write-back effect). This deletes the echo-loop bug at the root. Firebase room sharing for the crew list is unaffected.
- Max-velocity cap and stationary-ball bump interval are retained (they serve single ball).

### Fixes

1. **Sensor-based slot detection.** Replace floor-contact + x-coordinate estimation with one invisible static sensor body (`isSensor: true`) per slot, positioned inside the slot below the divider tops. The first ball/sensor `collisionStart` determines the chosen sailor. `hasLanded` remains as a guard against duplicate events. Sensors are rebuilt whenever names or lucky/unlucky slot widths change (same effect that rebuilds walls today).
2. **Top-corner escape.** Side walls currently span y = 0–600, leaving open space above the canvas; a high ricochet near a corner can exit before the delayed top boundary activates. Extend both side walls ~200px above the canvas top. The delayed-activation top boundary stays as-is.

### Retained

- Pirate UI, sounds, crew management, lucky/unlucky slot-width logic, `NameSlots`, Firebase room sharing, `StatsPanel` / `recordResult` (now a history of daily picks), trail effect.

## Testing

Headless Node simulation script (Matter.js runs without a DOM) mirroring the board setup:

- Over many drops (≥500): exactly one sensor fires per drop (one sailor chosen, never zero, never two).
- The ball's position never leaves the board bounds at any step.
- The chosen slot matches the ball's final resting x-position (sanity check on sensor placement).

Manual check in the browser: drop repeatedly with 2, 8, and 15 crew; verify banner matches the visibly landed slot, including balls that settle against a divider.

## Out of scope

- Any change to the chaotic physics feel (restitution, slow-mo, trail).
- Peg-grid redesign or binomial-distribution tuning — irrelevant with no scoring.
- Firebase schema changes beyond deleting the `scores` sync.
