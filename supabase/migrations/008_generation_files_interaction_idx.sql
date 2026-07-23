-- Faster ownership lookups for edit-video on Edge (no in-memory map).
create index if not exists generation_files_interaction_id_idx
  on public.generation_files (interaction_id)
  where interaction_id is not null;
