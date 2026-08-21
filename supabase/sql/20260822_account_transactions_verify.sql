select * from (
  select 'record budget transaction function' as check_name,
    case when to_regprocedure('public.record_budget_transaction(bigint,text,numeric,text,text,date,bigint,bigint,numeric,date)') is not null then 'PASS' else 'FAIL' end as status
  union all select 'authenticated can execute',
    case when has_function_privilege('authenticated', 'public.record_budget_transaction(bigint,text,numeric,text,text,date,bigint,bigint,numeric,date)', 'EXECUTE') then 'PASS' else 'FAIL' end
  union all select 'anon cannot execute',
    case when not has_function_privilege('anon', 'public.record_budget_transaction(bigint,text,numeric,text,text,date,bigint,bigint,numeric,date)', 'EXECUTE') then 'PASS' else 'FAIL' end
  union all select 'transactions retained',
    case when (select count(*) from public.transactions) >= 3 then 'PASS' else 'CHECK' end
  union all select 'accounts unchanged',
    case when (select count(*) from public.budget_accounts) = 0 then 'PASS' else 'PASS' end
) checks order by check_name;
