import type { FC } from 'react';

export interface CrewCardProps {
  name: string;
  present: boolean;
  isLucky: boolean;
  isUnlucky: boolean;
  totalWalks: number;
  luckStatus: string;
  luckStatusEmoji: string;
  onTogglePresent: () => void;
  onToggleLucky: () => void;
  onToggleUnlucky: () => void;
  disabled: boolean;
}

export const CrewCard: FC<CrewCardProps> = ({
  name,
  present,
  isLucky,
  isUnlucky,
  totalWalks,
  luckStatus,
  luckStatusEmoji,
  onTogglePresent,
  onToggleLucky,
  onToggleUnlucky,
  disabled,
}) => {
  const handleLucky = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!present || disabled) return;
    onToggleLucky();
  };

  const handleUnlucky = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!present || disabled) return;
    onToggleUnlucky();
  };

  return (
    <div
      onClick={() => !disabled && onTogglePresent()}
      className={`
        rounded-xl p-3 cursor-pointer select-none transition-all
        ${present
          ? 'bg-gold/15 border-2 border-gold/70'
          : 'bg-black/15 border-2 border-white/10 opacity-45'
        }
        ${disabled ? 'cursor-not-allowed' : ''}
      `}
    >
      <div
        className={`text-sm font-bold text-center mb-2 ${
          present ? 'text-parchment' : 'text-parchment/50 line-through'
        }`}
      >
        {name}
      </div>

      <div className="flex justify-center gap-2 mb-2">
        <button
          onClick={handleLucky}
          className={`text-2xl rounded-lg px-2 py-1 transition-all border-2 leading-none ${
            isLucky
              ? 'bg-gold/25 border-gold/80'
              : 'bg-transparent border-white/15 opacity-35'
          } ${!present || disabled ? 'pointer-events-none' : ''}`}
          tabIndex={-1}
        >
          🍀
        </button>
        <button
          onClick={handleUnlucky}
          className={`text-2xl rounded-lg px-2 py-1 transition-all border-2 leading-none ${
            isUnlucky
              ? 'bg-red-800/25 border-red-500/70'
              : 'bg-transparent border-white/15 opacity-35'
          } ${!present || disabled ? 'pointer-events-none' : ''}`}
          tabIndex={-1}
        >
          💀
        </button>
      </div>

      <div className="text-center text-[11px] text-parchment/55">
        {totalWalks} walk{totalWalks !== 1 ? 's' : ''} · {luckStatusEmoji} {luckStatus}
      </div>
    </div>
  );
};
