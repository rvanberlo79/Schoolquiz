-- Language: en (English) or nl (Nederlands/Dutch)
alter table public.profiles
  add column if not exists language text not null default 'en'
  check (language in ('en', 'nl'));
