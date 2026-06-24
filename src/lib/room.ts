// src/lib/room.ts
import { ref, get, set } from 'firebase/database';
import { database } from './firebase';
import { ADJECTIVES, NOUNS, OBJECTS } from './wordlist';

export const ROSTER_LIMIT = 15;

const ROOM_STORAGE_KEY = 'plinko-roomId';

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const generateRoomCode = (): string =>
  `${pick(ADJECTIVES)}-${pick(NOUNS)}-${pick(OBJECTS)}`;

export const roomCodeExists = async (code: string): Promise<boolean> => {
  const roomRef = ref(database, `rooms/${code}`);
  const snapshot = await get(roomRef);
  return snapshot.exists();
};

export interface SquadSetup {
  squadName: string;
  members: string[];
}

export const getSquadSetup = async (code: string): Promise<SquadSetup | null> => {
  const setupRef = ref(database, `rooms/${code}/setup`);
  const snapshot = await get(setupRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  const raw = Array.isArray(data.members)
    ? data.members
    : Object.values(data.members ?? {});
  const members: string[] = raw.filter((m): m is string => typeof m === 'string');
  return { squadName: data.squadName ?? '', members };
};

export const saveSquadSetup = async (code: string, setup: SquadSetup): Promise<void> => {
  const setupRef = ref(database, `rooms/${code}/setup`);
  await set(setupRef, setup);
};

export const getRoomId = (): string => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('room');
  if (fromUrl) {
    localStorage.setItem(ROOM_STORAGE_KEY, fromUrl);
    return fromUrl;
  }
  const fromStorage = localStorage.getItem(ROOM_STORAGE_KEY);
  if (fromStorage) {
    const url = new URL(window.location.href);
    url.searchParams.set('room', fromStorage);
    window.history.replaceState({}, '', url.toString());
    return fromStorage;
  }
  // Should never reach here — hasRoom() gates the app until a room is set via onboarding
  return '';
};

export const getRoomRef = (path: string) => {
  return ref(database, `rooms/${getRoomId()}/${path}`);
};

export const getShareUrl = (): string => {
  const url = new URL(window.location.href);
  url.searchParams.set('room', getRoomId());
  return url.toString();
};

export const hasRoom = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return !!(params.get('room') || localStorage.getItem(ROOM_STORAGE_KEY));
};

export const setRoom = (code: string): void => {
  if (!code) return;
  localStorage.setItem(ROOM_STORAGE_KEY, code);
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
  window.history.replaceState({}, '', url.toString());
};
