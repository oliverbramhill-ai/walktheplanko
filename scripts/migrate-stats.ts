// scripts/migrate-stats.ts
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import statsData from '../stats-data.json' assert { type: 'json' };

const roomId = process.argv[2];
if (!roomId) {
  console.error('Usage: npx tsx scripts/migrate-stats.ts <roomId>');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const statsRef = ref(db, `rooms/${roomId}/stats`);
await set(statsRef, statsData);
console.log(`✓ Migrated ${statsData.history.length} games to room: ${roomId}`);
process.exit(0);
