-- Persist the state required for a focus block to act as a resumable timer.

alter table public.focus_blocks
  add column if not exists status text not null default 'scheduled'
  check (status in ('scheduled', 'active', 'paused', 'completed')),
  add column if not exists paused_at timestamptz,
  add column if not exists remaining_seconds integer
  check (remaining_seconds is null or remaining_seconds > 0),
  add column if not exists completed_at timestamptz;

create index if not exists idx_focus_blocks_status_starts_at
  on public.focus_blocks (status, starts_at);
