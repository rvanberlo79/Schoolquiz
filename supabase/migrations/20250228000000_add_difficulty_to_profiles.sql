-- Add difficulty_level to existing profiles table (for installs that already ran the first migration)
alter table public.profiles
  add column if not exists difficulty_level text not null default 'beginner'
  check (difficulty_level in ('beginner', 'experienced', 'professional'));
