import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/db.js';

const router = Router();

// GET /api/projects
router.get('/', async (req, res) => {
  const { data, error } = await db.from('projects').select('*').order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/projects
router.post('/', async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });

  const { data, error } = await db.from('projects')
    .insert({ id: uuid(), name, url })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  const { data: project, error } = await db.from('projects').select('*').eq('id', req.params.id).single();
  if (error || !project) return res.status(404).json({ error: 'Not found' });

  const { data: stages } = await db.from('stages').select('*').eq('project_id', req.params.id).order('stage_num');
  const { data: direction } = await db.from('design_direction').select('*').eq('project_id', req.params.id).maybeSingle();

  res.json({ ...project, stages: stages || [], direction: direction || null });
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  // FK cascade handles stages + design_direction
  const { error } = await db.from('projects').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// POST /api/projects/:id/direction
router.post('/:id/direction', async (req, res) => {
  const { design_system, reference_urls, reference_notes, brand_assets } = req.body;
  const projectId = req.params.id;

  const { data: existing } = await db.from('design_direction').select('id').eq('project_id', projectId).maybeSingle();

  const payload = { design_system, reference_urls, reference_notes, brand_assets, updated_at: new Date().toISOString() };

  if (existing) {
    await db.from('design_direction').update(payload).eq('project_id', projectId);
  } else {
    await db.from('design_direction').insert({ id: uuid(), project_id: projectId, ...payload });
  }

  await db.from('projects').update({ stage: 5, updated_at: new Date().toISOString() }).eq('id', projectId);
  res.json({ ok: true });
});

export default router;
