// src/components/RoomShare.tsx
import { useState } from 'react';
import { getShareUrl, getRoomId } from '@/lib/room';

export const RoomShare = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs text-wood-mid">
      <span className="font-mono opacity-60">#{getRoomId()}</span>
      <button
        onClick={handleCopy}
        className="px-2 py-1 rounded bg-wood-dark/20 hover:bg-wood-dark/30 text-wood-dark font-pirate transition-colors"
      >
        {copied ? '✓ Copied!' : '⚓ Share'}
      </button>
    </div>
  );
};
