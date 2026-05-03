alter table public.expense_items
  add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null;

create index if not exists expense_items_bank_account_id_idx
  on public.expense_items (bank_account_id);
