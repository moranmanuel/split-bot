-- USERS (global identity)
create table users (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text unique,
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- GROUPS
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- GROUP MEMBERS (identity within a group)
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid references users(id),
  name text not null,
  phone_e164 text, -- normalized E.164 format
  phone_verified_at timestamptz,
  status text not null default 'active', -- 'active' | 'pending'
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (group_id, phone_e164) -- avoid duplicates per group
);

-- EXPENSES
create table expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  created_by_member_id uuid not null references group_members(id),
  paid_by_member_id uuid not null references group_members(id),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'ARS',
  expense_date timestamptz not null default now(),
  split_method text not null, -- 'equal' | 'percentage' | 'fixed' | 'custom'
  split_metadata jsonb, -- optional raw config used to compute splits
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- EXPENSE SPLITS (final owed amounts per member)
create table expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid not null references group_members(id),
  owed_amount numeric(12,2) not null check (owed_amount >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, member_id) -- one row per participant
);

-- INDEXES (common query patterns)
create index idx_group_members_group_id on group_members(group_id);
create index idx_group_members_user_id on group_members(user_id);
create index idx_expenses_group_id on expenses(group_id);
create index idx_expenses_paid_by on expenses(paid_by_member_id);
create index idx_expense_splits_expense_id on expense_splits(expense_id);
create index idx_expense_splits_member_id on expense_splits(member_id);


