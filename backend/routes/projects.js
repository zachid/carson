import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/db.js';

const router = Router();

// GET /api/projects
router.get('/', (req, res) => {
  const projects = db.prepare(`
    SELECT * FROM projects ORDER BY updated_at DESC
  `).all();
  res.json(projects);
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });

  const id = uuid();
  db.prepare(`
    INSERT INTO projects (id, name, url) VALUES (?, ?, ?)
  `).run(id, name, url);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });

  const stages = db.prepare('SELECT * FROM stages WHERE project_id = ? ORDER BY stage_num').all(req.params.id);
  const direction = db.prepare('SELECT * FROM design_direction WHERE project_id = ?').get(req.params.id);

  res.json({ ...project, stages, direction });
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM stages WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM design_direction WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/projects/:id/direction
router.post('/:id/direction', (req, res) => {
  const { design_system, reference_urls, reference_notes, brand_assets } = req.body;
  const projectId = req.params.id;

  const existing = db.prepare('SELECT id FROM design_direction WHERE project_id = ?').get(projectId);

  if (existing) {
    db.prepare(`
      UPDATE design_direction
      SET design_system = ?, reference_urls = ?, reference_notes = ?, brand_assets = ?, updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
    `).run(design_system, reference_urls, reference_notes, brand_assets, projectId);
  } else {
    db.prepare(`
      INSERT INTO design_direction (id, project_id, design_system, reference_urls, reference_notes, brand_assets)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuid(), projectId, design_system, reference_urls, reference_notes, brand_assets);
  }

  // Advance project stage to 5 (design)
  db.prepare('UPDATE projects SET stage = 5, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

  res.json({ ok: true });
});

export default router;
