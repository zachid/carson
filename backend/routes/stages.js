import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/db.js';
import { runStage } from '../services/claude.js';
import { scrapeUrl } from '../services/scraper.js';

const router = Router({ mergeParams: true });

// GET /api/projects/:id/stages/:num
router.get('/:num', async (req, res) => {
  const { data } = await db.from('stages')
    .select('*')
    .eq('project_id', req.params.id)
    .eq('stage_num', parseInt(req.params.num))
    .maybeSingle();
  res.json(data || { status: 'pending', output: null });
});

// POST /api/projects/:id/run/:stageNum
router.post('/run/:stageNum', async (req, res) => {
  const projectId = req.params.id;
  const stageNum = parseInt(req.params.stageNum);

  const { data: project } = await db.from('projects').select('*').eq('id', projectId).single();
  if (!project) return res.status(404).json({ error: 'Project not found' });

  await upsertStage(projectId, stageNum, 'running', null);

  const context = await buildContext(projectId, stageNum, project);

  // Intercept res.write/end to capture full text for DB save after streaming
  const origEnd = res.end.bind(res);
  let fullText = '';

  const origWrite = res.write.bind(res);
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
    // Fire-and-forget DB persistence
    upsertStage(projectId, stageNum, 'done', fullText).catch(console.error);
    if (stageNum >= (project.stage || 1)) {
      db.from('projects')
        .update({ stage: stageNum + 1, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .then().catch(console.error);
    }
    return ret;
  };

  try {
    await runStage(stageNum, context, res);
  } catch (err) {
    await upsertStage(projectId, stageNum, 'error', null);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

async function upsertStage(projectId, stageNum, status, output) {
  const { data: existing } = await db.from('stages')
    .select('id').eq('project_id', projectId).eq('stage_num', stageNum).maybeSingle();

  const payload = { status, output, updated_at: new Date().toISOString() };

  if (existing) {
    await db.from('stages').update(payload).eq('project_id', projectId).eq('stage_num', stageNum);
  } else {
    await db.from('stages').insert({ id: uuid(), project_id: projectId, stage_num: stageNum, ...payload });
  }
}

async function buildContext(projectId, stageNum, project) {
  const getOutput = async (num) => {
    const { data } = await db.from('stages').select('output').eq('project_id', projectId).eq('stage_num', num).maybeSingle();
    return data?.output || '';
  };

  const { data: direction } = await db.from('design_direction').select('*').eq('project_id', projectId).maybeSingle();

  switch (stageNum) {
    case 1: {
      const scrapedContent = await scrapeUrl(project.url);
      return { url: project.url, scrapedContent };
    }
    case 2: return { stage01Output: await getOutput(1) };
    case 3: return { stage01Output: await getOutput(1) };
    case 4: return { stage02Output: await getOutput(2), stage03Output: await getOutput(3) };
    case 5: return {
      designSystem: direction?.design_system,
      referenceNotes: direction?.reference_notes,
      stage04Output: await getOutput(4),
    };
    default: return {};
  }
}

export default router;
