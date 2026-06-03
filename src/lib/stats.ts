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
