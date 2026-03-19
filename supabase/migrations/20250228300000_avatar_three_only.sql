-- Restrict avatar to 3 options only (0, 1, 2)
update public.profiles set avatar = 0 where avatar > 2;
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (avatar >= 0 and avatar <= 2);
