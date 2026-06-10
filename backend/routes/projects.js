import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db, toDoc, toDocs } from '../db/db.js';
import admin from 'firebase-admin';

const router = Router();
const now = () => admin.firestore.FieldValue.serverTimestamp();

// GET /api/projects — returns only the calling user's projects.
// First-time owner sign-in: claims all legacy projects (no userId) automatically.
router.get('/', async (req, res) => {
  const uid        = req.user.uid;
  const ownerEmail = process.env.OWNER_EMAIL;
  const isOwner    = ownerEmail && req.user.email === ownerEmail;

  try {
    if (isOwner) {
      // Fetch everything (no orderBy — sort in JS to avoid index requirements),
      // then claim any unowned (legacy) projects.
      const snap = await db.collection('projects').get();
      const unowned = snap.docs.filter(d => !d.data().userId);
      if (unowned.length > 0) {
        const batch = db.batch();
        unowned.forEach(d => batch.update(d.ref, { userId: uid }));
        await batch.commit();
      }
      const docs = toDocs(snap).sort((a, b) => {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
      });
      res.json(docs);
    } else {
      // Regular user — only their own projects.
      // No orderBy here to avoid requiring a composite Firestore index; sort in JS.
      const snap = await db.collection('projects')
        .where('userId', '==', uid)
        .get();
      const docs = toDocs(snap).sort((a, b) => {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
      });
      res.json(docs);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });
  try {
    const id   = uuid();
    const data = {
      id, name, url,
      userId:     req.user.uid,         // ← stamp owner
      userEmail:  req.user.email || '',  // ← helpful for debugging
      status: 'active', stage: 1,
      created_at: now(), updated_at: now(),
    };
    await db.collection('projects').doc(id).set(data);
    const doc = await db.collection('projects').doc(id).get();
    res.status(201).json(toDoc(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('projects').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const stagesSnap = await db.collection('projects').doc(req.params.id)
      .collection('stages').orderBy('stage_num').get();
    const dirDoc = await db.collection('projects').doc(req.params.id)
      .collection('direction').doc('main').get();

    res.json({
      ...toDoc(doc),
      stages:    toDocs(stagesSnap),
      direction: toDoc(dirDoc),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/projects/:id
router.patch('/:id', async (req, res) => {
  const { url, name } = req.body;
  const updates = { updated_at: now() };
  if (url)  updates.url  = url;
  if (name) updates.name = name;
  try {
    await db.collection('projects').doc(req.params.id).update(updates);
    const doc = await db.collection('projects').doc(req.params.id).get();
    res.json(toDoc(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const projectRef = db.collection('projects').doc(req.params.id);
    const [stagesSnap, dirSnap] = await Promise.all([
      projectRef.collection('stages').get(),
      projectRef.collection('direction').get(),
    ]);
    const batch = db.batch();
    stagesSnap.docs.forEach(d => batch.delete(d.ref));
    dirSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(projectRef);
    await batch.commit();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/direction
router.post('/:id/direction', async (req, res) => {
  const { design_system, reference_urls, reference_notes, brand_assets, color_mode, tokens } = req.body;
  const projectId = req.params.id;
  try {
    await db.collection('projects').doc(projectId)
      .collection('direction').doc('main')
      .set({ design_system, reference_urls, reference_notes, brand_assets, color_mode, tokens, updated_at: now() }, { merge: true });
    await db.collection('projects').doc(projectId)
      .update({ stage: 5, updated_at: now() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
