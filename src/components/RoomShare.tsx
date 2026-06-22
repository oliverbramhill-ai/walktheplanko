import { useState, useRef } from 'react';
import { getShareUrl, getRoomId } from '@/lib/room';

export const RoomShare = () => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="flex items-center gap-2 text-xs text-wood-mid">
      <span className="font-mono opacity-60 tracking-wide">{getRoomId()}</span>
      <button
        onClick={handleCopy}
        className="px-2 py-1 rounded bg-wood-dark/20 hover:bg-wood-dark/30 text-wood-dark font-pirate transition-colors"
      >
        {copied ? '✓ Copied!' : '⚓ Share'}
      </button>
    </div>
  );
};
