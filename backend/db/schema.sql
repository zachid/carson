CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  status     TEXT DEFAULT 'active',
  stage      INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stages (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  stage_num  INTEGER NOT NULL,
  status     TEXT DEFAULT 'pending',
  output     TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS design_direction (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL,
  design_system   TEXT,
  reference_urls  TEXT,
  reference_notes TEXT,
  brand_assets    TEXT,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
