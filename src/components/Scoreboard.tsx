interface ScoreboardProps {
  names: string[];
  scores: Record<string, number>;
}

export const Scoreboard = ({ names, scores }: ScoreboardProps) => {
  const sortedScores = [...names]
    .map(name => ({ name, score: scores[name] || 0 }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="hologram-bg rounded-xl p-4 neon-border min-w-[250px]">
      <h2 className="font-space text-2xl text-cyan-glow text-center mb-4 flex items-center justify-center gap-2">
        <span>📡</span> MISSION CONTROL <span>📡</span>
      </h2>
      <div className="space-y-2">
        {sortedScores.map(({ name, score }, index) => (
          <div 
            key={name}
            className={`flex justify-between items-center px-3 py-2 rounded-lg transition-all duration-300 ${
              index === 0 && score > 0 
                ? 'bg-cyan-glow/20 border-2 border-cyan-glow animate-pulse-glow' 
                : 'bg-space-deep/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {index === 0 && score > 0 ? '👑' : index === 1 && score > 0 ? '🥈' : index === 2 && score > 0 ? '🥉' : '🌟'}
              </span>
              <span className="font-semibold text-star-white">{name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-space text-xl text-cyan-glow">{score}</span>
              <span className="text-sm">☄️</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};