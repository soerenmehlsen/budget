-- Enable Row Level Security on all user-owned tables and add policies
-- so users can only read/write their own rows. Service role bypasses RLS.

-- profiles (PK: id = auth.uid())
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- expense_items (user_id)
alter table public.expense_items enable row level security;

drop policy if exists "expense_items_select_own" on public.expense_items;
create policy "expense_items_select_own" on public.expense_items
  for select using (auth.uid() = user_id);

drop policy if exists "expense_items_insert_own" on public.expense_items;
create policy "expense_items_insert_own" on public.expense_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "expense_items_update_own" on public.expense_items;
create policy "expense_items_update_own" on public.expense_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expense_items_delete_own" on public.expense_items;
create policy "expense_items_delete_own" on public.expense_items
  for delete using (auth.uid() = user_id);

-- income_sources (user_id)
alter table public.income_sources enable row level security;

drop policy if exists "income_sources_select_own" on public.income_sources;
create policy "income_sources_select_own" on public.income_sources
  for select using (auth.uid() = user_id);

drop policy if exists "income_sources_insert_own" on public.income_sources;
create policy "income_sources_insert_own" on public.income_sources
  for insert with check (auth.uid() = user_id);

drop policy if exists "income_sources_update_own" on public.income_sources;
create policy "income_sources_update_own" on public.income_sources
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "income_sources_delete_own" on public.income_sources;
create policy "income_sources_delete_own" on public.income_sources
  for delete using (auth.uid() = user_id);

-- bank_accounts (user_id)
alter table public.bank_accounts enable row level security;

drop policy if exists "bank_accounts_select_own" on public.bank_accounts;
create policy "bank_accounts_select_own" on public.bank_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "bank_accounts_insert_own" on public.bank_accounts;
create policy "bank_accounts_insert_own" on public.bank_accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists "bank_accounts_update_own" on public.bank_accounts;
create policy "bank_accounts_update_own" on public.bank_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bank_accounts_delete_own" on public.bank_accounts;
create policy "bank_accounts_delete_own" on public.bank_accounts
  for delete using (auth.uid() = user_id);

-- feedback (user_id) — only inserts; reads restricted to service role.
alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);
