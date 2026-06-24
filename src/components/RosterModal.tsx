import { useState, useEffect, useRef } from 'react';
import { get, set } from 'firebase/database';
import { getRoomRef, ROSTER_LIMIT } from '@/lib/room';

interface RosterModalProps {
  onClose: () => void;
  onSaved: (members: string[]) => void;
}

export const RosterModal = ({ onClose, onSaved }: RosterModalProps) => {
  const [members, setMembers] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get(getRoomRef('setup/members')).then((snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const arr: string[] = Array.isArray(val) ? val : Object.values(val ?? {});
        setMembers(arr.filter((m): m is string => typeof m === 'string'));
      }
    });
  }, []);

  const handleRename = (index: number, value: string) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
    setError('');
  };

  const handleRemove = (index: number) => {
    if (members.length <= 2) return;
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (members.length >= ROSTER_LIMIT) {
      setError(`Crew is full (max ${ROSTER_LIMIT})`);
      return;
    }
    if (members.some(m => m.toLowerCase() === trimmed.toLowerCase())) {
      setError('That name is already in the crew');
      return;
    }
    setError('');
    setMembers([...members, trimmed]);
    setNewName('');
    inputRef.current?.focus();
  };

  const handleSave = async () => {
    // Validate: no blank names, no duplicates
    const trimmed = members.map(m => m.trim()).filter(Boolean);
    const unique = [...new Set(trimmed.map(m => m.toLowerCase()))];
    if (unique.length !== trimmed.length) {
      setError('Duplicate names found — each crew member must have a unique name');
      return;
    }
    if (trimmed.length < 2) {
      setError('Need at least 2 crew members');
      return;
    }
    setSaving(true);
    try {
      await set(getRoomRef('setup/members'), trimmed);
      onSaved(trimmed);
      onClose();
    } catch {
      setError('Failed to save — check your connection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="parchment-bg rope-border rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <h2 className="font-pirate text-2xl text-wood-dark mb-4">⚓ Manage Roster</h2>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
          {members.map((name, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={name}
                onChange={e => handleRename(i, e.target.value)}
                className="flex-1 px-2 py-1 rounded bg-wood-dark text-parchment text-sm border border-rope focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                onClick={() => handleRemove(i)}
                disabled={members.length <= 2}
                className="px-2 py-1 rounded bg-red-700 text-parchment text-xs hover:bg-red-600 disabled:opacity-30 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {members.length < ROSTER_LIMIT && (
          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="New crew member name…"
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-2 py-1 rounded bg-wood-dark text-parchment text-sm border border-rope focus:outline-none focus:ring-2 focus:ring-gold placeholder:text-parchment/40"
            />
            <button
              onClick={handleAdd}
              className="px-3 py-1 rounded bg-green-700 text-parchment text-sm font-pirate hover:bg-green-600 transition-colors"
            >
              + Add
            </button>
          </div>
        )}

        {members.length >= ROSTER_LIMIT && (
          <p className="text-xs text-wood-mid mb-3 text-center">Roster full ({ROSTER_LIMIT}/{ROSTER_LIMIT})</p>
        )}

        {error && (
          <p className="text-red-700 text-xs mb-3 text-center">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded border border-wood-dark text-wood-dark font-pirate hover:bg-wood-dark/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 pirate-button disabled:opacity-50"
          >
            {saving ? 'Saving…' : '⚓ Save Roster'}
          </button>
        </div>
      </div>
    </div>
  );
};
