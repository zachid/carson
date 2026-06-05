import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/db.js';
import { runStage } from '../services/claude.js';
import { scrapeUrl } from '../services/scraper.js';

const router = Router({ mergeParams: true });

// GET /api/projects/:id/stages/:num
router.get('/:num', (req, res) => {
  const stage = db.prepare(`
    SELECT * FROM stages WHERE project_id = ? AND stage_num = ?
  `).get(req.params.id, parseInt(req.params.num));
  res.json(stage || { status: 'pending', output: null });
});

// POST /api/projects/:id/run/:stage
router.post('/run/:stageNum', async (req, res) => {
  const projectId = req.params.id;
  const stageNum = parseInt(req.params.stageNum);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Mark stage as running
  upsertStage(projectId, stageNum, 'running', null);

  // Build context from previous stages
  const context = await buildContext(projectId, stageNum, project);

  // SSE headers set inside runStage
  try {
    let fullText = '';

    // Intercept the stream to capture full text for DB save
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = function(chunk) {
      try {
        const str = chunk.toString();
        const match = str.match(/^data: (.+)\n\n$/);
        if (match) {
          const evt = JSON.parse(match[1]);
          if (evt.type === 'done') fullText = evt.fullText;
        }
      } catch {}
      return origWrite(chunk);
    };

    res.end = function(...args) {
      // Save to DB
      upsertStage(projectId, stageNum, 'done', fullText);
      // Advance project current stage if needed
      if (stageNum >= project.stage) {
        const nextStage = stageNum === 4 ? 4.5 : stageNum + 1;
        db.prepare('UPDATE projects SET stage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(stageNum + 1, projectId);
      }
      return origEnd(...args);
    };

    await runStage(stageNum, context, res);
  } catch (err) {
    upsertStage(projectId, stageNum, 'error', null);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

function upsertStage(projectId, stageNum, status, output) {
  const existing = db.prepare(`
    SELECT id FROM stages WHERE project_id = ? AND stage_num = ?
  `).get(projectId, stageNum);

  if (existing) {
    db.prepare(`
      UPDATE stages SET status = ?, output = ?, updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ? AND stage_num = ?
    `).run(status, output, projectId, stageNum);
  } else {
    db.prepare(`
      INSERT INTO stages (id, project_id, stage_num, status, output)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuid(), projectId, stageNum, status, output);
  }
}

async function buildContext(projectId, stageNum, project) {
  const getStageOutput = (num) => {
    const s = db.prepare('SELECT output FROM stages WHERE project_id = ? AND stage_num = ?').get(projectId, num);
    return s?.output || '';
  };

  const direction = db.prepare('SELECT * FROM design_direction WHERE project_id = ?').get(projectId);

  switch (stageNum) {
    case 1: {
      const scrapedContent = await scrapeUrl(project.url);
      return { url: project.url, scrapedContent };
    }
    case 2:
      return { stage01Output: getStageOutput(1) };
    case 3:
      return { stage01Output: getStageOutput(1) };
    case 4:
      return { stage02Output: getStageOutput(2), stage03Output: getStageOutput(3) };
    case 5:
      return {
        designSystem: direction?.design_system,
        referenceNotes: direction?.reference_notes,
        stage04Output: getStageOutput(4),
      };
    default:
      return {};
  }
}

export default router;
