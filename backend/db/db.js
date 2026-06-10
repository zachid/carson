import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _db = null;

function init() {
  if (_db) return _db;
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is empty');

  let serviceAccount;
  if (raw.startsWith('{')) {
    // Inline JSON
    serviceAccount = JSON.parse(raw);
  } else if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && !raw.includes('.json')) {
    // Base64-encoded JSON
    serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
  } else {
    // File path (local dev)
    const saPath = path.resolve(path.join(__dirname, '../..'), raw);
    serviceAccount = JSON.parse(readFileSync(saPath, 'utf-8'));
  }

  // Firebase service-account private keys often arrive with escaped newlines
  // (\n) when passed through env vars — normalise them to real newlines.
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  console.log('[db] init for project:', serviceAccount.project_id);

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  _db = admin.firestore();
  return _db;
}

// Ensure Firebase Admin app is initialized (safe to call repeatedly).
// Needed by the auth middleware, which uses admin.auth() before any
// route touches the db proxy.
export function ensureFirebase() {
  init();
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
