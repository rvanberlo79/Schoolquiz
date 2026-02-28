-- Addition game scores: one row per completed game (10 questions, score 0-10)
create table if not exists public.addition_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score >= 0 and score <= 10),
  total_questions integer not null default 10 check (total_questions > 0),
  created_at timestamptz not null default now()
);

alter table public.addition_scores enable row level security;

create policy "Addition scores are viewable by authenticated users"
  on public.addition_scores for select to authenticated using (true);

create policy "Users can insert own addition score"
  on public.addition_scores for insert to authenticated with check (auth.uid() = user_id);
