// Spinners are rendered via Matter.js canvas
// This component is a placeholder for potential future React-based spinner controls

interface SpinnersProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const Spinners = ({ enabled, onToggle }: SpinnersProps) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-4 h-4"
      />
      <span className="text-wood-dark font-semibold">🌀 Enable Spinners</span>
    </label>
  );
};
