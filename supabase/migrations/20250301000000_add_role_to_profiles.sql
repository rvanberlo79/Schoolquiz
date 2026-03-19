-- Add role column: maintainer, host, or participant (default participant)
alter table public.profiles
  add column if not exists role text not null default 'participant'
  check (role in ('maintainer', 'host', 'participant'));

-- Set specific users: one maintainer, one participant (before trigger exists)
update public.profiles set role = 'maintainer' where id = '7798cec0-e10b-4070-a25c-700413173e9c';
update public.profiles set role = 'participant' where id = 'dafa8084-714b-45e6-b2da-829fd1e15255';

-- Only maintainers may change the role of any user.
create or replace function public.check_role_update_by_maintainer()
returns trigger as $$
declare
  updater_role text;
begin
  if new.role is distinct from old.role then
    select role into updater_role from public.profiles where id = auth.uid();
    if updater_role is null or updater_role <> 'maintainer' then
      raise exception 'Only a maintainer can change user role.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_role_update_maintainer_only on public.profiles;
create trigger profiles_role_update_maintainer_only
  before update on public.profiles
  for each row execute function public.check_role_update_by_maintainer();
