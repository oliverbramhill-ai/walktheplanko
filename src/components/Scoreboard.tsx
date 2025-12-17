interface ScoreboardProps {
  names: string[];
  scores: Record<string, number>;
}

export const Scoreboard = ({ names, scores }: ScoreboardProps) => {
  const sortedScores = [...names]
    .map(name => ({ name, score: scores[name] || 0 }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="parchment-bg rounded-xl p-4 rope-border min-w-[250px]">
      <h2 className="font-pirate text-2xl text-wood-dark text-center mb-4 flex items-center justify-center gap-2">
        <span>📜</span> Scoreboard <span>📜</span>
      </h2>
      <div className="space-y-2">
        {sortedScores.map(({ name, score }, index) => (
          <div 
            key={name}
            className={`flex justify-between items-center px-3 py-2 rounded-lg transition-all duration-300 ${
              index === 0 && score > 0 
                ? 'bg-gold/30 border-2 border-gold' 
                : 'bg-wood-dark/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {index === 0 && score > 0 ? '👑' : index === 1 && score > 0 ? '🥈' : index === 2 && score > 0 ? '🥉' : '⚓'}
              </span>
              <span className="font-semibold text-wood-dark">{name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-pirate text-xl text-wood-dark">{score}</span>
              <span className="text-sm">⚫</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
