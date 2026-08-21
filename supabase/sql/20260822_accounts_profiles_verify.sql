-- Run after 20260822_accounts_profiles_apply.sql in the Supabase SQL Editor.

select * from (
  select 'budget accounts table' as check_name, case when to_regclass('public.budget_accounts') is not null then 'PASS' else 'FAIL' end as status
  union all select 'user profiles table', case when to_regclass('public.user_profiles') is not null then 'PASS' else 'FAIL' end
  union all select 'recurring schedules table', case when to_regclass('public.recurring_schedules') is not null then 'PASS' else 'FAIL' end
  union all select 'profile photo bucket', case when exists(select 1 from storage.buckets where id = 'profile-photos' and not public and file_size_limit = 5242880) then 'PASS' else 'FAIL' end
  union all select 'budget accounts RLS', case when exists(select 1 from pg_class where oid = 'public.budget_accounts'::regclass and relrowsecurity) then 'PASS' else 'FAIL' end
  union all select 'user profiles RLS', case when exists(select 1 from pg_class where oid = 'public.user_profiles'::regclass and relrowsecurity) then 'PASS' else 'FAIL' end
  union all select 'recurring schedules RLS', case when exists(select 1 from pg_class where oid = 'public.recurring_schedules'::regclass and relrowsecurity) then 'PASS' else 'FAIL' end
  union all select 'existing transactions preserved', case when (select count(*) from public.transactions) >= 3 then 'PASS' else 'CHECK' end
  union all select 'existing loans preserved', case when (select count(*) from public.loans) >= 1 then 'PASS' else 'CHECK' end
  union all select 'existing credit cards preserved', case when (select count(*) from public.credit_cards) >= 1 then 'PASS' else 'CHECK' end
) checks order by check_name;

select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in ('budget_accounts','user_profiles','recurring_schedules')
order by table_name, privilege_type;
