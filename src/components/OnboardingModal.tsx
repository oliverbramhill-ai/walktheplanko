import { useState } from 'react';
import { generateRoomCode, roomCodeExists, getSquadSetup, saveSquadSetup, SquadSetup } from '@/lib/room';

type Screen = 'choice' | 'create' | 'join' | 'join_members';

interface OnboardingModalProps {
  onComplete: (roomCode: string) => void;
}

export const OnboardingModal = ({ onComplete }: OnboardingModalProps) => {
  const [screen, setScreen] = useState<Screen>('choice');
  const [squadName, setSquadName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [createNameInput, setCreateNameInput] = useState('');
  const [joinNameInput, setJoinNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [joinedCode, setJoinedCode] = useState('');
  const [joinedSetup, setJoinedSetup] = useState<SquadSetup | null>(null);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addCreateMember = () => {
    const trimmed = createNameInput.trim();
    if (!trimmed || members.includes(trimmed)) return;
    setMembers(prev => [...prev, trimmed]);
    setCreateNameInput('');
  };

  const addJoinMember = () => {
    const trimmed = joinNameInput.trim();
    if (!trimmed || members.includes(trimmed) || existingMembers.includes(trimmed)) return;
    setMembers(prev => [...prev, trimmed]);
    setJoinNameInput('');
  };

  const removeMember = (name: string) => {
    setMembers(prev => prev.filter(m => m !== name));
  };

  const handleCreateSubmit = async () => {
    if (!squadName.trim()) { setError('Enter a squad name'); return; }
    if (members.length < 1) { setError('Add at least one crew member'); return; }
    setLoading(true);
    setError('');
    try {
      const code = generateRoomCode();
      await saveSquadSetup(code, { squadName: squadName.trim(), members });
      onComplete(code);
    } catch {
      setError('Failed to create room. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLookup = async () => {
    const code = codeInput.trim().toLowerCase();
    if (!code) { setError('Enter a room code'); return; }
    setLoading(true);
    setError('');
    try {
      const exists = await roomCodeExists(code);
      if (!exists) { setError('Room not found. Check the code and try again.'); setLoading(false); return; }
      const setup = await getSquadSetup(code);
      setJoinedCode(code);
      setJoinedSetup(setup);
      setExistingMembers(setup?.members ?? []);
      setMembers([]);
      setScreen('join_members');
    } catch {
      setError('Failed to look up room. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (members.length > 0) {
        if (!joinedSetup) { setError('Room data lost. Go back and try again.'); return; }
        const merged = [...joinedSetup.members, ...members];
        await saveSquadSetup(joinedCode, { squadName: joinedSetup.squadName, members: merged });
      }
      onComplete(joinedCode);
    } catch {
      setError('Failed to join room. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-wood-dark rounded-2xl border-2 border-gold/40 p-8 shadow-2xl">

        {screen === 'choice' && (
          <div className="text-center space-y-6">
            <h1 className="font-pirate text-4xl text-gold drop-shadow">Walk the Plank-o!</h1>
            <p className="text-parchment/80 text-sm">Gather yer crew. One room per ship.</p>
            <div className="space-y-3">
              <button
                onClick={() => setScreen('create')}
                className="w-full py-3 px-6 bg-gold text-wood-dark font-pirate text-xl rounded-xl hover:bg-gold/90 transition-colors"
              >
                ⚓ Create a New Room
              </button>
              <button
                onClick={() => setScreen('join')}
                className="w-full py-3 px-6 border border-gold/50 text-gold font-pirate text-xl rounded-xl hover:bg-gold/10 transition-colors"
              >
                🗺️ Join an Existing Room
              </button>
            </div>
          </div>
        )}

        {screen === 'create' && (
          <div className="space-y-5">
            <h2 className="font-pirate text-3xl text-gold text-center">Name Yer Ship</h2>
            <div>
              <label className="text-parchment/70 text-xs uppercase tracking-widest mb-1 block">Squad Name</label>
              <input
                type="text"
                maxLength={40}
                value={squadName}
                onChange={e => setSquadName(e.target.value)}
                placeholder="e.g. The Kraken Crew"
                className="w-full bg-wood-mid/30 border border-gold/30 rounded-lg px-3 py-2 text-parchment placeholder-parchment/30 focus:outline-none focus:border-gold/60"
              />
            </div>
            <div>
              <label className="text-parchment/70 text-xs uppercase tracking-widest mb-1 block">Crew Members</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={createNameInput}
                  onChange={e => setCreateNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCreateMember()}
                  placeholder="Enter a name"
                  className="flex-1 bg-wood-mid/30 border border-gold/30 rounded-lg px-3 py-2 text-parchment placeholder-parchment/30 focus:outline-none focus:border-gold/60"
                />
                <button onClick={addCreateMember} className="px-4 py-2 bg-gold/20 hover:bg-gold/30 text-gold rounded-lg border border-gold/30 transition-colors">
                  Add
                </button>
              </div>
              {members.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {members.map(m => (
                    <span key={m} className="flex items-center gap-1 px-2 py-1 bg-wood-mid/40 border border-gold/20 rounded-full text-parchment text-sm">
                      {m}
                      <button onClick={() => removeMember(m)} className="text-parchment/40 hover:text-red-400 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setScreen('choice')} className="flex-1 py-2 border border-gold/30 text-parchment/60 rounded-xl hover:text-parchment transition-colors">
                Back
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={loading}
                className="flex-1 py-2 bg-gold text-wood-dark font-pirate text-lg rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Setting sail...' : 'Set Sail! 🏴‍☠️'}
              </button>
            </div>
          </div>
        )}

        {screen === 'join' && (
          <div className="space-y-5">
            <h2 className="font-pirate text-3xl text-gold text-center">Join a Room</h2>
            <div>
              <label className="text-parchment/70 text-xs uppercase tracking-widest mb-1 block">Room Code</label>
              <input
                type="text"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoinLookup()}
                placeholder="e.g. jolly-anchor-kraken"
                className="w-full bg-wood-mid/30 border border-gold/30 rounded-lg px-3 py-2 text-parchment font-mono placeholder-parchment/30 focus:outline-none focus:border-gold/60"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setScreen('choice')} className="flex-1 py-2 border border-gold/30 text-parchment/60 rounded-xl hover:text-parchment transition-colors">
                Back
              </button>
              <button
                onClick={handleJoinLookup}
                disabled={loading}
                className="flex-1 py-2 bg-gold text-wood-dark font-pirate text-lg rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Searching...' : 'Find Room 🗺️'}
              </button>
            </div>
          </div>
        )}

        {screen === 'join_members' && (
          <div className="space-y-5">
            <h2 className="font-pirate text-3xl text-gold text-center">Board the Ship</h2>
            <div>
              <p className="text-parchment/70 text-xs uppercase tracking-widest mb-2">Current Crew</p>
              <div className="flex flex-wrap gap-2">
                {existingMembers.map(m => (
                  <span key={m} className="px-2 py-1 bg-wood-mid/40 border border-gold/20 rounded-full text-parchment text-sm">{m}</span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-parchment/70 text-xs uppercase tracking-widest mb-1 block">Add New Crew Members (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinNameInput}
                  onChange={e => setJoinNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addJoinMember()}
                  placeholder="Enter a name"
                  className="flex-1 bg-wood-mid/30 border border-gold/30 rounded-lg px-3 py-2 text-parchment placeholder-parchment/30 focus:outline-none focus:border-gold/60"
                />
                <button onClick={addJoinMember} className="px-4 py-2 bg-gold/20 hover:bg-gold/30 text-gold rounded-lg border border-gold/30 transition-colors">
                  Add
                </button>
              </div>
              {members.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {members.map(m => (
                    <span key={m} className="flex items-center gap-1 px-2 py-1 bg-gold/10 border border-gold/30 rounded-full text-parchment text-sm">
                      {m}
                      <button onClick={() => removeMember(m)} className="text-parchment/40 hover:text-red-400 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setScreen('join'); setJoinedCode(''); setJoinedSetup(null); setExistingMembers([]); setMembers([]); setJoinNameInput(''); setError(''); }}
                className="flex-1 py-2 border border-gold/30 text-parchment/60 rounded-xl hover:text-parchment transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleJoinSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-gold text-wood-dark font-pirate text-xl rounded-xl hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Boarding...' : 'Board Ship! ⚓'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
