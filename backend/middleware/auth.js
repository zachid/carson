import admin from 'firebase-admin';

/**
 * Express middleware — verifies the Firebase ID token in the
 * Authorization: Bearer <token> header.
 *
 * On success: attaches req.user (decoded token) and calls next().
 * On failure: returns 401.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // { uid, email, name, picture, ... }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired auth token' });
  }
}
