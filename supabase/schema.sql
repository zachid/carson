-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

create table if not exists projects (
  id          text primary key,
  name        text not null,
  url         text not null,
  status      text default 'active',
  stage       integer default 1,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists stages (
  id          text primary key,
  project_id  text not null references projects(id) on delete cascade,
  stage_num   integer not null,
  status      text default 'pending',
  output      text,
  updated_at  timestamptz default now()
);

create table if not exists design_direction (
  id              text primary key,
  project_id      text not null references projects(id) on delete cascade,
  design_system   text,
  reference_urls  text,
  reference_notes text,
  brand_assets    text,
  updated_at      timestamptz default now()
);

-- Disable RLS (backend uses service role key which bypasses it anyway,
-- but this makes the dashboard easier to use)
alter table projects        disable row level security;
alter table stages          disable row level security;
alter table design_direction disable row level security;
