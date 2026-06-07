import { Router } from 'express';
import { db, toDoc } from '../db/db.js';
import admin from 'firebase-admin';
import { runStage } from '../services/claude.js';
import { scrapeUrl } from '../services/scraper.js';

const router = Router({ mergeParams: true });
const now = () => admin.firestore.FieldValue.serverTimestamp();

// GET /api/projects/:id/stages/:num
router.get('/:num', async (req, res) => {
  try {
    const doc = await db.collection('projects').doc(req.params.id)
      .collection('stages').doc(req.params.num).get();
    res.json(toDoc(doc) || { status: 'pending', output: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/run/:stageNum
router.post('/run/:stageNum', async (req, res) => {
  const projectId = req.params.id;
  const stageNum = parseInt(req.params.stageNum);

  try {
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return res.status(404).json({ error: 'Project not found' });
    const project = { id: projectDoc.id, ...projectDoc.data() };

    await upsertStage(projectId, stageNum, 'running', null);

    const context = await buildContext(projectId, stageNum, project, req.body || {});

    // Intercept res.write/end to capture completed text for Firestore
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    let fullText = '';

    res.write = function(chunk) {
      try {
        const str = typeof chunk === 'string' ? chunk : chunk.toString();
        for (const line of str.split('\n\n')) {
          if (!line.startsWith('data: ')) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === 'done') fullText = evt.fullText;
        }
      } catch {}
      return origWrite(chunk);
    };

    res.end = function(...args) {
      const ret = origEnd(...args);
      upsertStage(projectId, stageNum, 'done', fullText).catch(console.error);
      if (stageNum >= (project.stage || 1)) {
        db.collection('projects').doc(projectId)
          .update({ stage: stageNum + 1, updated_at: now() })
          .catch(console.error);
      }
      return ret;
    };

    await runStage(stageNum, context, res);
  } catch (err) {
    await upsertStage(projectId, stageNum, 'error', null).catch(() => {});
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

async function upsertStage(projectId, stageNum, status, output) {
  await db.collection('projects').doc(projectId)
    .collection('stages').doc(String(stageNum))
    .set({ stage_num: stageNum, status, output, updated_at: now() }, { merge: true });
}

async function buildContext(projectId, stageNum, project, body = {}) {
  const getOutput = async (num) => {
    const doc = await db.collection('projects').doc(projectId)
      .collection('stages').doc(String(num)).get();
    return doc.exists ? doc.data().output || '' : '';
  };

  const dirDoc = await db.collection('projects').doc(projectId)
    .collection('direction').doc('main').get();
  const direction = dirDoc.exists ? dirDoc.data() : null;

  switch (stageNum) {
    case 1: {
      const scrapedContent = await scrapeUrl(project.url);
      return { url: project.url, scrapedContent };
    }
    case 2: return { stage01Output: await getOutput(1) };
    case 3: return { stage01Output: await getOutput(1) };
    case 4: return { stage02Output: await getOutput(2), stage03Output: await getOutput(3), siteContent: body.siteContent || '' };
    case 5: return {
      designSystem:   direction?.design_system,
      referenceNotes: direction?.reference_notes,
      colorMode:      direction?.color_mode || 'match',
      stage04Output:  await getOutput(4),
    };
    default: return {};
  }
}

export default router;
