-- Update avatar range from 0-55 to 0-35 (9×4 grid = 36 avatars)
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (avatar >= 0 and avatar <= 35);
