-- Atomic account/card-linked transaction recording for Pinoy Pocket Budget.

begin;

alter table public.transactions
  drop constraint if exists transactions_single_funding_source;
alter table public.transactions
  add constraint transactions_single_funding_source
  check (account_id is null or credit_card_id is null) not valid;
alter table public.transactions validate constraint transactions_single_funding_source;

create or replace function public.record_budget_transaction(
  p_transaction_id bigint,
  p_kind text,
  p_amount numeric,
  p_category text,
  p_note text,
  p_transaction_date date,
  p_account_id bigint default null,
  p_credit_card_id bigint default null,
  p_savings_amount numeric default 0,
  p_due_date date default null
) returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_balance numeric;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_kind not in ('income','expense') then raise exception 'Invalid transaction kind'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if coalesce(p_savings_amount, 0) < 0 or coalesce(p_savings_amount, 0) > p_amount then raise exception 'Invalid savings allocation'; end if;
  if p_account_id is not null and p_credit_card_id is not null then raise exception 'Choose one funding source'; end if;
  if p_kind = 'income' and p_account_id is null then raise exception 'Income requires a destination account'; end if;
  if p_kind = 'income' and p_credit_card_id is not null then raise exception 'Income cannot be deposited to a credit card'; end if;

  if p_account_id is not null then
    select available_balance into v_balance
    from public.budget_accounts
    where id = p_account_id and user_id = v_user_id
    for update;
    if not found then raise exception 'Account not found'; end if;
    if p_kind = 'expense' and v_balance < p_amount then raise exception 'Insufficient available balance'; end if;

    update public.budget_accounts
    set available_balance = available_balance + case when p_kind = 'income' then p_amount else -p_amount end,
        savings_balance = savings_balance + case when p_kind = 'income' then coalesce(p_savings_amount,0) else 0 end,
        updated_at = now()
    where id = p_account_id and user_id = v_user_id;
  elsif p_credit_card_id is not null then
    if p_kind <> 'expense' then raise exception 'Only expenses can be charged to a credit card'; end if;
    update public.credit_cards
    set current_balance = current_balance + p_amount
    where id = p_credit_card_id and user_id = v_user_id;
    if not found then raise exception 'Credit card not found'; end if;
  else
    raise exception 'Select an account or credit card';
  end if;

  insert into public.transactions (
    id, user_id, kind, amount, category, note, date,
    account_id, credit_card_id, savings_amount, due_date
  ) values (
    p_transaction_id, v_user_id, p_kind, p_amount, btrim(p_category), coalesce(p_note,''), p_transaction_date,
    p_account_id, p_credit_card_id, coalesce(p_savings_amount,0), p_due_date
  );

  return p_transaction_id;
end;
$$;

revoke all on function public.record_budget_transaction(bigint,text,numeric,text,text,date,bigint,bigint,numeric,date) from public, anon;
grant execute on function public.record_budget_transaction(bigint,text,numeric,text,text,date,bigint,bigint,numeric,date) to authenticated;

commit;
