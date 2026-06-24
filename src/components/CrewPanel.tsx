import { useEffect, useRef, useState } from 'react';
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
  const prevRosterRef = useRef<string[]>([]);

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
          // Present if was already present, initial load, or is a brand-new roster member
          if (prev.has(m) || !prev.size || !prevRosterRef.current.includes(m)) next.add(m);
        });
        return next;
      });
      // Update ref to current roster after computing presence
      prevRosterRef.current = members;
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

  const handleRosterSaved = (_members: string[]) => {
    // Firebase subscription will update roster state; just close modal
    setShowRosterModal(false);
  };

  const DEFAULT_STATS: PlayerStats = {
    name: '',
    totalWalks: 0,
    daysAttended: 0,
    pctAttendedWalked: '0%',
    pctWorkDaysWalked: '0%',
    expectedWalks: 0,
    daysSinceLastWalk: -1,
    luckStatus: 'Expected',
    luckStatusEmoji: '⚖️',
    luckPct: 0,
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
