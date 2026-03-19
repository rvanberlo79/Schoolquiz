-- Add avatar (0-35, 36 options) to existing profiles table
alter table public.profiles
  add column if not exists avatar smallint not null default 0 check (avatar >= 0 and avatar <= 35);
