-- Supabase Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: dealer_accounts
CREATE TABLE IF NOT EXISTS dealer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  odoo_customer_id TEXT,
  odoo_contract_id TEXT,
  monthly_price_per_seat NUMERIC NOT NULL DEFAULT 149.00,
  license_count INT NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('trial', 'active', 'expired', 'suspended')) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID REFERENCES dealer_accounts(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('dealer_admin', 'user')) NOT NULL,
  temp_password TEXT,
  password_reset_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: licenses
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID REFERENCES dealer_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: account_rules
CREATE TABLE IF NOT EXISTS account_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID REFERENCES dealer_accounts(id) ON DELETE CASCADE,
  customer_number TEXT, -- NULL represents the default rule for all customers
  customer_name TEXT,
  franchise TEXT,
  min_profit_percent NUMERIC NOT NULL DEFAULT 10,
  min_profit_dollars NUMERIC NOT NULL DEFAULT 0,
  priority TEXT CHECK (priority IN ('percent', 'dollars')) DEFAULT 'percent',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: price_results
CREATE TABLE IF NOT EXISTS price_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID REFERENCES dealer_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  part_number TEXT NOT NULL,
  customer_number TEXT,
  customer_name TEXT,
  franchise TEXT,
  original_price NUMERIC,
  optimized_price NUMERIC,
  reimb_amount NUMERIC,
  cost NUMERIC,
  margin_achieved NUMERIC,
  optimization_type TEXT CHECK (optimization_type IN ('optimize', 'maintain_profit')) DEFAULT 'optimize',
  created_at TIMESTAMPTZ DEFAULT now()
);


-- Table: extension_sessions
CREATE TABLE IF NOT EXISTS extension_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  dealer_account_id UUID REFERENCES dealer_accounts(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now()
);

-- Table: pending_approvals (Signup request approval queue)
CREATE TABLE IF NOT EXISTS pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  dealer_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('dealer_admin', 'user')) DEFAULT 'dealer_admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: invoices (Odoo synchronization)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID REFERENCES dealer_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  seat_count INT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: algorithm_settings (Stores dynamic javascript algorithms)
CREATE TABLE IF NOT EXISTS algorithm_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  optimize_code TEXT NOT NULL,
  maintain_profit_code TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default pricing algorithms
INSERT INTO algorithm_settings (id, optimize_code, maintain_profit_code)
VALUES (
  'default',
  'function optimize(listPrice, cost, reimbursementRate, minProfit) {
  let low = cost * 0.5;
  let high = listPrice;
  let bestPrice = listPrice;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    const reimbursement = mid * reimbursementRate;
    const netProfit = mid + reimbursement - cost;
    if (netProfit >= minProfit) {
      bestPrice = mid;
      high = mid;
    } else {
      low = mid;
    }
  }
  return Number(Math.min(listPrice, Math.max(cost * 0.5, bestPrice)).toFixed(2));
}',
  'function maintainProfit(listPrice, cost, reimbursementRate) {
  const minProfit = listPrice - cost;
  let low = cost * 0.5;
  let high = listPrice;
  let bestPrice = listPrice;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    const reimbursement = mid * reimbursementRate;
    const netProfit = mid + reimbursement - cost;
    if (netProfit >= minProfit) {
      bestPrice = mid;
      high = mid;
    } else {
      low = mid;
    }
  }
  return Number(Math.min(listPrice, Math.max(cost * 0.5, bestPrice)).toFixed(2));
}'
)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS) Configuration
ALTER TABLE dealer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE algorithm_settings ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for testing and development
-- dealer_accounts
DROP POLICY IF EXISTS "dealer_accounts_permissive" ON dealer_accounts;
CREATE POLICY "dealer_accounts_permissive" ON dealer_accounts FOR ALL TO public USING (true) WITH CHECK (true);

-- users
DROP POLICY IF EXISTS "users_permissive" ON users;
CREATE POLICY "users_permissive" ON users FOR ALL TO public USING (true) WITH CHECK (true);

-- licenses
DROP POLICY IF EXISTS "licenses_permissive" ON licenses;
CREATE POLICY "licenses_permissive" ON licenses FOR ALL TO public USING (true) WITH CHECK (true);

-- sessions
DROP POLICY IF EXISTS "sessions_permissive" ON sessions;
CREATE POLICY "sessions_permissive" ON sessions FOR ALL TO public USING (true) WITH CHECK (true);

-- account_rules
DROP POLICY IF EXISTS "account_rules_permissive" ON account_rules;
CREATE POLICY "account_rules_permissive" ON account_rules FOR ALL TO public USING (true) WITH CHECK (true);

-- price_results
DROP POLICY IF EXISTS "price_results_permissive" ON price_results;
CREATE POLICY "price_results_permissive" ON price_results FOR ALL TO public USING (true) WITH CHECK (true);

-- extension_sessions
DROP POLICY IF EXISTS "extension_sessions_permissive" ON extension_sessions;
CREATE POLICY "extension_sessions_permissive" ON extension_sessions FOR ALL TO public USING (true) WITH CHECK (true);

-- invoices
DROP POLICY IF EXISTS "invoices_permissive" ON invoices;
CREATE POLICY "invoices_permissive" ON invoices FOR ALL TO public USING (true) WITH CHECK (true);

-- pending_approvals
DROP POLICY IF EXISTS "pending_approvals_permissive" ON pending_approvals;
CREATE POLICY "pending_approvals_permissive" ON pending_approvals FOR ALL TO public USING (true) WITH CHECK (true);

-- algorithm_settings
DROP POLICY IF EXISTS "algorithm_settings_permissive" ON algorithm_settings;
CREATE POLICY "algorithm_settings_permissive" ON algorithm_settings FOR ALL TO public USING (true) WITH CHECK (true);

