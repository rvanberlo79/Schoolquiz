-- Allow maintainers to update any profile (e.g. to change user roles)
create policy "Maintainers can update any profile"
  on public.profiles for update to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'maintainer'
  );
