-- Hosted Supabase default privileges grant EXECUTE directly to anon as well as
-- PUBLIC. Revoking PUBLIC alone (M1) therefore did not remove anonymous access.
-- Keep the authenticated, auth.uid()-scoped RLS/bootstrap functions available.
revoke all on function public.ensure_household(),public.in_household(uuid),public.owns_learner(uuid) from public,anon;
grant execute on function public.ensure_household(),public.in_household(uuid),public.owns_learner(uuid) to authenticated,service_role;
