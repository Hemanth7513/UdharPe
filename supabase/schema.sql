-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  firm_name text not null,
  owner_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Secure Profiles
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- 2. Customers Table
create table customers (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references auth.users on delete cascade not null,
  name text not null,
  phone text,
  email text,
  total_outstanding numeric(12,2) default 0.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Secure Customers (Business owners only see their own customers)
alter table customers enable row level security;
create policy "Owners view own customers" on customers for select using (auth.uid() = business_id);
create policy "Owners insert own customers" on customers for insert with check (auth.uid() = business_id);
create policy "Owners update own customers" on customers for update using (auth.uid() = business_id);
create policy "Owners delete own customers" on customers for delete using (auth.uid() = business_id);

-- 3. Bills (Udhar Entries) Table
create table bills (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references auth.users on delete cascade not null,
  customer_id uuid references customers on delete cascade not null,
  amount numeric(12,2) not null,
  remaining_amount numeric(12,2) not null,
  due_date date not null,
  note text,
  status text check (status in ('pending', 'partial', 'paid')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Secure Bills
alter table bills enable row level security;
create policy "Owners view own bills" on bills for select using (auth.uid() = business_id);
create policy "Owners insert own bills" on bills for insert with check (auth.uid() = business_id);
create policy "Owners update own bills" on bills for update using (auth.uid() = business_id);
create policy "Owners delete own bills" on bills for delete using (auth.uid() = business_id);

-- 4. Settlements (Payments) Table
create table settlements (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references auth.users on delete cascade not null,
  customer_id uuid references customers on delete cascade not null,
  bill_id uuid references bills on delete set null,
  amount_paid numeric(12,2) not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Secure Settlements
alter table settlements enable row level security;
create policy "Owners view own settlements" on settlements for select using (auth.uid() = business_id);
create policy "Owners insert own settlements" on settlements for insert with check (auth.uid() = business_id);
