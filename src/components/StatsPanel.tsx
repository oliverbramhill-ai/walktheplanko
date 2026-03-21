import { useState, useEffect } from 'react';
import { loadStats, clearHistory, computePlayerStats, type GameResult, type PlayerStats } from '@/lib/stats';

const luckColor = (status: string): string => {
  switch (status) {
    case 'BLESSED':        return 'bg-emerald-200 text-emerald-900';
    case 'Extremely Lucky': return 'bg-green-200 text-green-900';
    case 'Very Lucky':     return 'bg-lime-200 text-lime-900';
    case 'Expected':       return 'bg-stone-200 text-stone-700';
    case 'Unlucky':        return 'bg-yellow-200 text-yellow-900';
    case 'Very Unlucky':   return 'bg-orange-200 text-orange-900';
    case 'CURSED':         return 'bg-red-300 text-red-900';
    case 'FORSAKEN':       return 'bg-red-500 text-white';
    case 'IRREDEEMABLE':   return 'bg-red-700 text-white';
    case 'APOCALYPTIC':    return 'bg-black text-white';
    default:               return 'bg-stone-200 text-stone-700';
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface StatsPanelProps {
  refreshKey?: number;
}

export const StatsPanel = ({ refreshKey = 0 }: StatsPanelProps) => {
  const [history, setHistory] = useState<GameResult[]>([]);
  const [noGameDays, setNoGameDays] = useState(0);
  const [tab, setTab] = useState<'table' | 'history'>('table');

  useEffect(() => {
    loadStats().then(data => {
      setHistory(data.history);
      setNoGameDays(data.noGameDays);
    });
  }, [refreshKey]);

  const stats: PlayerStats[] = computePlayerStats(history, noGameDays)
    .sort((a, b) => b.totalWalks - a.totalWalks);

  const handleClear = async () => {
    if (confirm('Clear ALL stats history (including historical data)? This cannot be undone.')) {
      await clearHistory();
      setHistory([]);
      setNoGameDays(0);
    }
  };

  return (
    <div className="parchment-bg rounded-xl p-4 rope-border min-w-[320px] max-w-[680px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-pirate text-2xl text-wood-dark flex items-center gap-2">
          <span>📊</span> Plank Stats
        </h2>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs px-2 py-1 rounded bg-red-700 text-parchment font-pirate hover:bg-red-600 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setTab('table')}
          className={`text-xs px-3 py-1 rounded font-pirate transition-colors ${tab === 'table' ? 'bg-wood-dark text-parchment' : 'bg-wood-dark/20 text-wood-dark hover:bg-wood-dark/30'}`}
        >
          ⚓ Standings
        </button>
        <button
          onClick={() => setTab('history')}
          className={`text-xs px-3 py-1 rounded font-pirate transition-colors ${tab === 'history' ? 'bg-wood-dark text-parchment' : 'bg-wood-dark/20 text-wood-dark hover:bg-wood-dark/30'}`}
        >
          📜 History
        </button>
      </div>

      {history.length === 0 ? (
        <p className="text-wood-mid text-sm text-center py-4">No games played yet. Drop the cannonballs!</p>
      ) : tab === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-wood-dark font-pirate text-left border-b-2 border-wood-dark/30">
                <th className="pb-1 pr-2">Crew</th>
                <th className="pb-1 px-1 text-center" title="Times walked the plank">Walks</th>
                <th className="pb-1 px-1 text-center" title="Expected walks based on attendance">Exp</th>
                <th className="pb-1 px-1 text-center" title="Calendar days since last walk">Since</th>
                <th className="pb-1 pl-1" title="Luck status">Fate</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.name} className={`border-b border-wood-dark/10 ${i === 0 ? 'bg-gold/20' : ''}`}>
                  <td className="py-1 pr-2 font-semibold text-wood-dark whitespace-nowrap">
                    {i === 0 ? '👑 ' : ''}
                    {s.name}
                  </td>
                  <td className="py-1 px-1 text-center font-pirate text-wood-dark">{s.totalWalks}</td>
                  <td className="py-1 px-1 text-center text-wood-mid">{s.expectedWalks}</td>
                  <td className="py-1 px-1 text-center text-wood-mid">
                    {s.daysSinceLastWalk === -1 ? '—' : s.daysSinceLastWalk === 0 ? 'TODAY' : `${s.daysSinceLastWalk}d`}
                  </td>
                  <td className="py-1 pl-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${luckColor(s.luckStatus)}`}>
                      {s.luckStatusEmoji} {s.luckStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-wood-mid text-[10px] mt-2 text-right">
            {history.length} games · {history.length + noGameDays} total work days
          </p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {[...history].reverse().map((result, i) => (
            <div key={i} className="flex justify-between items-center text-sm bg-wood-dark/10 rounded px-2 py-1">
              <span className="font-semibold text-wood-dark">🦈 {result.name}</span>
              <span className="text-wood-mid text-xs">{formatDate(result.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
