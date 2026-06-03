// src/lib/room.ts
import { nanoid } from 'nanoid';
import { ref } from 'firebase/database';
import { database } from './firebase';

const ROOM_STORAGE_KEY = 'plinko-roomId';

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
  const newId = nanoid(10);
  localStorage.setItem(ROOM_STORAGE_KEY, newId);
  const url = new URL(window.location.href);
  url.searchParams.set('room', newId);
  window.history.replaceState({}, '', url.toString());
  return newId;
};

export const getRoomRef = (path: string) => {
  return ref(database, `rooms/${getRoomId()}/${path}`);
};

export const getShareUrl = (): string => {
  const url = new URL(window.location.href);
  url.searchParams.set('room', getRoomId());
  return url.toString();
};
