export interface GameResult {
  name: string;
  timestamp: string;
  attendees: string[]; // who was in the pool for this game
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

// --- File-backed API ---

export const loadStats = async (): Promise<StatsData> => {
  const res = await fetch('/api/stats');
  return res.json();
};

export const recordResult = async (name: string, attendees: string[]): Promise<void> => {
  const data = await loadStats();
  data.history.push({ name, timestamp: new Date().toISOString(), attendees });
  await fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const clearHistory = async (): Promise<void> => {
  await fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history: [], noGameDays: 0 }),
  });
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

// --- Stats computation ---

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

  // Collect all unique player names
  const allNames = new Set<string>();
  history.forEach(r => {
    allNames.add(r.name);
    r.attendees.forEach(n => allNames.add(n));
  });

  const numPlayers = allNames.size;

  return Array.from(allNames).map(name => {
    const walksHistory = history.filter(r => r.name === name);
    const totalWalks = walksHistory.length;
    const daysAttended = history.filter(r => r.attendees.includes(name)).length;

    const pctAttended = daysAttended > 0 ? (totalWalks / daysAttended) * 100 : 0;
    const pctWorkDays = totalWorkDays > 0 ? (totalWalks / totalWorkDays) * 100 : 0;

    // Expected = days_attended / num_players  (matches spreadsheet formula)
    const expectedWalks = daysAttended / numPlayers;

    // Luck % = how far above/below expected (%)
    const luckPct =
      expectedWalks > 0
        ? ((totalWalks - expectedWalks) / expectedWalks) * 100
        : totalWalks === 0 ? -100 : 100;

    const { status: luckStatus, emoji: luckStatusEmoji } = getLuckStatus(luckPct);

    // Calendar days since last walk
    const lastWalk = walksHistory.length > 0 ? walksHistory[walksHistory.length - 1] : null;
    const daysSinceLastWalk = lastWalk
      ? Math.floor((Date.now() - new Date(lastWalk.timestamp).getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    return {
      name,
      totalWalks,
      daysAttended,
      pctAttendedWalked: pctAttended.toFixed(1) + '%',
      pctWorkDaysWalked: pctWorkDays.toFixed(1) + '%',
      expectedWalks: Math.round(expectedWalks * 10) / 10,
      luckStatus,
      luckStatusEmoji,
      daysSinceLastWalk,
      luckPct: Math.round(luckPct * 10) / 10,
    };
  });
};
