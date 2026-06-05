import { Router } from 'express';
import fs from 'fs';
import db from '../db/db.js';
import { exportProject, getExportPaths } from '../services/exporter.js';

const router = Router({ mergeParams: true });

// POST /api/projects/:id/export
router.post('/', async (req, res) => {
  const projectId = req.params.id;

  const stage5 = db.prepare('SELECT output FROM stages WHERE project_id = ? AND stage_num = 5').get(projectId);
  if (!stage5?.output) return res.status(400).json({ error: 'Stage 5 not complete' });

  try {
    await exportProject(projectId, stage5.output);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/export/html
router.get('/html', (req, res) => {
  const { html } = getExportPaths(req.params.id);
  if (!fs.existsSync(html)) return res.status(404).json({ error: 'Not exported yet' });
  res.download(html, 'site.html');
});

// GET /api/projects/:id/export/pdf
router.get('/pdf', (req, res) => {
  const { pdf } = getExportPaths(req.params.id);
  if (!fs.existsSync(pdf)) return res.status(404).json({ error: 'Not exported yet' });
  res.download(pdf, 'site.pdf');
});

export default router;
