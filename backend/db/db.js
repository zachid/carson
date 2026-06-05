import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _db = null;

function init() {
  if (_db) return _db;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  let serviceAccount;
  if (raw.trim().startsWith('{')) {
    serviceAccount = JSON.parse(raw);
  } else {
    const saPath = path.resolve(path.join(__dirname, '../..'), raw);
    serviceAccount = JSON.parse(readFileSync(saPath, 'utf-8'));
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  _db = admin.firestore();
  return _db;
}

// Lazy proxy — first access triggers init
export const db = new Proxy({}, {
  get(_, prop) {
    return init()[prop];
  }
});

// Convert Firestore doc snapshot → plain JS object (timestamps → ISO strings)
export function toDoc(snap) {
  if (!snap.exists) return null;
  const data = snap.data();
  const out = { id: snap.id };
  for (const [k, v] of Object.entries(data)) {
    out[k] = v?.toDate ? v.toDate().toISOString() : v;
  }
  return out;
}

export function toDocs(snap) {
  return snap.docs.map(toDoc);
}
