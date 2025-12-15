interface NameSlotsProps {
  names: string[];
  scores: Record<string, number>;
  slotWidths: number[];
  acePilot?: string | null;
}

export const NameSlots = ({ names, scores, slotWidths, acePilot }: NameSlotsProps) => {
  return (
    <div className="absolute bottom-0 left-2 right-2 overflow-hidden">
      <div className="flex animate-sway">
        {names.map((name, index) => (
          <div 
            key={index}
            className={`flex flex-col items-center justify-end pb-1 transition-all duration-300 ${
              name === acePilot ? 'bg-cyan-glow/20 rounded-t-lg ring-2 ring-cyan-glow/50 animate-pulse-glow' : ''
            }`}
            style={{ width: `${slotWidths[index]}%` }}
          >
            {name === acePilot && (
              <div className="text-xs text-cyan-glow animate-twinkle mb-0.5">🎯</div>
            )}
            <div className="text-cyan-glow font-bold text-lg drop-shadow-[0_0_10px_hsl(180,100%,50%)]">
              {scores[name] || 0}
            </div>
            <div 
              className="text-star-white text-xs font-semibold truncate w-full text-center px-1 drop-shadow-md"
              title={name}
            >
              {name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};