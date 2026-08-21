-- Pinoy Pocket Budget debt-accounting migration preflight
-- Read-only: this script does not create, update, or delete anything.

select check_name, status, detail
from (
  select 'Required table: transactions' check_name,
    case when to_regclass('public.transactions') is not null then 'PASS' else 'BLOCKED' end status,
    coalesce(to_regclass('public.transactions')::text, 'missing') detail
  union all
  select 'Required table: loans',
    case when to_regclass('public.loans') is not null then 'PASS' else 'BLOCKED' end,
    coalesce(to_regclass('public.loans')::text, 'missing')
  union all
  select 'Required table: credit_cards',
    case when to_regclass('public.credit_cards') is not null then 'PASS' else 'BLOCKED' end,
    coalesce(to_regclass('public.credit_cards')::text, 'missing')
  union all
  select 'Existing debt_adjustments object',
    case when to_regclass('public.debt_adjustments') is null then 'PASS' else 'REVIEW' end,
    coalesce(to_regclass('public.debt_adjustments')::text, 'not present')
  union all
  select 'Existing debt_payments object',
    case when to_regclass('public.debt_payments') is null then 'PASS' else 'REVIEW' end,
    coalesce(to_regclass('public.debt_payments')::text, 'not present')
  union all
  select 'Existing payment_allocations object',
    case when to_regclass('public.payment_allocations') is null then 'PASS' else 'REVIEW' end,
    coalesce(to_regclass('public.payment_allocations')::text, 'not present')
  union all
  select 'Existing atomic adjustment procedure',
    case when to_regprocedure('public.record_debt_adjustment(uuid,text,bigint,text,numeric,date,date,text,bigint,text,text,bigint)') is null then 'PASS' else 'REVIEW' end,
    coalesce(to_regprocedure('public.record_debt_adjustment(uuid,text,bigint,text,numeric,date,date,text,bigint,text,text,bigint)')::text, 'not present')
  union all
  select 'Existing atomic payment procedure',
    case when to_regprocedure('public.record_debt_payment(uuid,text,bigint,numeric,date,date,text,bigint,text,text,date)') is null then 'PASS' else 'REVIEW' end,
    coalesce(to_regprocedure('public.record_debt_payment(uuid,text,bigint,numeric,date,date,text,bigint,text,text,date)')::text, 'not present')
) checks
order by check_name;

select 'transactions' table_name, count(*) row_count from public.transactions
union all select 'loans', count(*) from public.loans
union all select 'credit_cards', count(*) from public.credit_cards
order by table_name;

select issue, affected_rows
from (
  select 'Loans with invalid negative balances' issue,
    count(*) affected_rows from public.loans where balance < 0
  union all
  select 'Credit cards with invalid negative balances',
    count(*) from public.credit_cards where current_balance < 0 or statement_balance < 0
  union all
  select 'Transactions with invalid non-positive amounts',
    count(*) from public.transactions where amount <= 0
  union all
  select 'Legacy structured charge markers available for compatibility',
    count(*) from public.transactions where note like '%' || chr(10) || '[[PPB_DEBT_CHARGE:%'
  union all
  select 'Legacy debt-payment markers available for compatibility',
    count(*) from public.transactions where note like '%' || chr(10) || '[[PPB_DUE_PAID:%'
) findings
order by issue;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('transactions', 'loans', 'credit_cards')
  and column_name in (
    'id', 'user_id', 'amount', 'date', 'note',
    'balance', 'monthly', 'due',
    'current_balance', 'statement_balance', 'due_day'
  )
order by table_name, ordinal_position;
