import { useEffect, useState } from 'react';

interface LeaderboardProps {
  names: string[];
  lifetimeWins: Record<string, number>;
  latestWinner: string | null;
}

export const Leaderboard = ({ names, lifetimeWins, latestWinner }: LeaderboardProps) => {
  const [animatingName, setAnimatingName] = useState<string | null>(null);

  useEffect(() => {
    if (latestWinner) {
      setAnimatingName(latestWinner);
      const timer = setTimeout(() => setAnimatingName(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [latestWinner]);

  const sortedLeaderboard = [...names]
    .map(name => ({ name, wins: lifetimeWins[name] || 0 }))
    .sort((a, b) => b.wins - a.wins);

  return (
    <div className="parchment-bg rounded-xl p-4 rope-border min-w-[250px]">
      <h2 className="font-pirate text-2xl text-wood-dark text-center mb-4 flex items-center justify-center gap-2">
        <span>🏆</span> Lifetime Leaderboard <span>🏆</span>
      </h2>
      <div className="space-y-2">
        {sortedLeaderboard.map(({ name, wins }, index) => (
          <div 
            key={name}
            className={`flex justify-between items-center px-3 py-2 rounded-lg transition-all duration-300 ${
              animatingName === name 
                ? 'bg-gold/50 border-2 border-gold animate-shake scale-105' 
                : index === 0 && wins > 0 
                  ? 'bg-gold/30 border-2 border-gold' 
                  : 'bg-wood-dark/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {index === 0 && wins > 0 ? '👑' : index === 1 && wins > 0 ? '🥈' : index === 2 && wins > 0 ? '🥉' : '⚓'}
              </span>
              <span className="font-semibold text-wood-dark">{name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-pirate text-xl text-wood-dark">{wins}</span>
              <span className="text-sm">🏅</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-wood-dark/60 text-center mt-3 font-pirate">
        Total victories recorded
      </p>
    </div>
  );
};
