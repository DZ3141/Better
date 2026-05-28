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
  pricing_version TEXT NOT NULL DEFAULT 'stable' CHECK (pricing_version IN ('stable', 'beta')),
  max_reimb_mode TEXT DEFAULT 'highest_price' CHECK (max_reimb_mode IN ('highest_price', 'match_non_shop')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id UUID REFERENCES dealer_accounts(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('dealer_admin', 'user', 'superadmin')) NOT NULL,
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
  optimization_type TEXT CHECK (optimization_type IN ('optimize', 'maintain_profit', 'max_reimbursement')) DEFAULT 'optimize',
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
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  role TEXT CHECK (role IN ('dealer_admin', 'user')) DEFAULT 'dealer_admin',
  warehouse_pickers INTEGER DEFAULT NULL,
  drivers INTEGER DEFAULT NULL,
  collisionlink_users INTEGER DEFAULT NULL,
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
  invoice_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: algorithm_settings (Stores dynamic javascript algorithms)
CREATE TABLE IF NOT EXISTS algorithm_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  optimize_code TEXT NOT NULL,
  maintain_profit_code TEXT NOT NULL,
  optimize_code_beta TEXT,
  maintain_profit_code_beta TEXT,
  max_reimb_code TEXT,
  max_reimb_code_beta TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default pricing algorithms
INSERT INTO algorithm_settings (id, optimize_code, maintain_profit_code, optimize_code_beta, maintain_profit_code_beta, max_reimb_code, max_reimb_code_beta)
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
}',
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
}',
  'function maxReimbursement(listPrice, cost, reimbursementRate, maxReimbMode) {
  if (maxReimbMode === ''match_non_shop'') {
    return Number((listPrice * 0.95).toFixed(2));
  }
  return Number(listPrice.toFixed(2));
}',
  'function maxReimbursement(listPrice, cost, reimbursementRate, maxReimbMode) {
  if (maxReimbMode === ''match_non_shop'') {
    return Number((listPrice * 0.95).toFixed(2));
  }
  return Number(listPrice.toFixed(2));
}'
)
ON CONFLICT (id) DO NOTHING;

-- Helper Functions to Bypass RLS Recursion (executed as SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_dealer_account_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT dealer_account_id FROM public.users WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

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

-- Secure RLS Policies

-- 1. dealer_accounts policies
DROP POLICY IF EXISTS "dealer_accounts_permissive" ON dealer_accounts;
DROP POLICY IF EXISTS "dealer_accounts_select_auth" ON dealer_accounts;
DROP POLICY IF EXISTS "dealer_accounts_select_anon" ON dealer_accounts;
DROP POLICY IF EXISTS "dealer_accounts_insert" ON dealer_accounts;
DROP POLICY IF EXISTS "dealer_accounts_update" ON dealer_accounts;
DROP POLICY IF EXISTS "dealer_accounts_delete" ON dealer_accounts;

CREATE POLICY "dealer_accounts_select_auth" ON dealer_accounts FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = id);
CREATE POLICY "dealer_accounts_select_anon" ON dealer_accounts FOR SELECT TO anon
  USING (true);
CREATE POLICY "dealer_accounts_insert" ON dealer_accounts FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "dealer_accounts_update" ON dealer_accounts FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = id))
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = id));
CREATE POLICY "dealer_accounts_delete" ON dealer_accounts FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin');

-- 2. users policies
DROP POLICY IF EXISTS "users_permissive" ON users;
DROP POLICY IF EXISTS "users_select_auth" ON users;
DROP POLICY IF EXISTS "users_select_anon" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;

CREATE POLICY "users_select_auth" ON users FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = dealer_account_id OR auth.uid() = id);
CREATE POLICY "users_select_anon" ON users FOR SELECT TO anon
  USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id));
CREATE POLICY "users_update" ON users FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id) OR auth.uid() = id)
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id) OR auth.uid() = id);
CREATE POLICY "users_delete" ON users FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id));

-- 3. licenses policies
DROP POLICY IF EXISTS "licenses_permissive" ON licenses;
DROP POLICY IF EXISTS "licenses_select_auth" ON licenses;
DROP POLICY IF EXISTS "licenses_select_anon" ON licenses;
DROP POLICY IF EXISTS "licenses_insert" ON licenses;
DROP POLICY IF EXISTS "licenses_update" ON licenses;
DROP POLICY IF EXISTS "licenses_delete" ON licenses;

CREATE POLICY "licenses_select_auth" ON licenses FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = dealer_account_id);
CREATE POLICY "licenses_select_anon" ON licenses FOR SELECT TO anon
  USING (true);
CREATE POLICY "licenses_insert" ON licenses FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "licenses_update" ON licenses FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id))
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id));
CREATE POLICY "licenses_delete" ON licenses FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin');

-- 4. sessions policies
DROP POLICY IF EXISTS "sessions_permissive" ON sessions;
DROP POLICY IF EXISTS "sessions_select_auth" ON sessions;
DROP POLICY IF EXISTS "sessions_select_anon" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_anon" ON sessions;
DROP POLICY IF EXISTS "sessions_update_anon" ON sessions;
DROP POLICY IF EXISTS "sessions_delete_anon" ON sessions;
DROP POLICY IF EXISTS "sessions_delete_auth" ON sessions;

CREATE POLICY "sessions_select_auth" ON sessions FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR EXISTS (SELECT 1 FROM public.licenses WHERE licenses.id = sessions.license_id AND licenses.dealer_account_id = get_user_dealer_account_id(auth.uid())));
CREATE POLICY "sessions_select_anon" ON sessions FOR SELECT TO anon
  USING (true);
CREATE POLICY "sessions_insert_anon" ON sessions FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "sessions_update_anon" ON sessions FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
CREATE POLICY "sessions_delete_anon" ON sessions FOR DELETE TO anon
  USING (true);
CREATE POLICY "sessions_delete_auth" ON sessions FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR EXISTS (SELECT 1 FROM public.licenses WHERE licenses.id = sessions.license_id AND licenses.dealer_account_id = get_user_dealer_account_id(auth.uid())));

-- 5. account_rules policies
DROP POLICY IF EXISTS "account_rules_permissive" ON account_rules;
DROP POLICY IF EXISTS "account_rules_select_auth" ON account_rules;
DROP POLICY IF EXISTS "account_rules_select_anon" ON account_rules;
DROP POLICY IF EXISTS "account_rules_insert" ON account_rules;
DROP POLICY IF EXISTS "account_rules_update" ON account_rules;
DROP POLICY IF EXISTS "account_rules_delete" ON account_rules;

CREATE POLICY "account_rules_select_auth" ON account_rules FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = dealer_account_id);
CREATE POLICY "account_rules_select_anon" ON account_rules FOR SELECT TO anon
  USING (true);
CREATE POLICY "account_rules_insert" ON account_rules FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id));
CREATE POLICY "account_rules_update" ON account_rules FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id))
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id));
CREATE POLICY "account_rules_delete" ON account_rules FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR (get_user_role(auth.uid()) = 'dealer_admin' AND get_user_dealer_account_id(auth.uid()) = dealer_account_id));

-- 6. price_results policies
DROP POLICY IF EXISTS "price_results_permissive" ON price_results;
DROP POLICY IF EXISTS "price_results_select_auth" ON price_results;
DROP POLICY IF EXISTS "price_results_insert_anon" ON price_results;
DROP POLICY IF EXISTS "price_results_insert_auth" ON price_results;
DROP POLICY IF EXISTS "price_results_delete_auth" ON price_results;

CREATE POLICY "price_results_select_auth" ON price_results FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = dealer_account_id);
CREATE POLICY "price_results_insert_anon" ON price_results FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "price_results_insert_auth" ON price_results FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = dealer_account_id);
CREATE POLICY "price_results_delete_auth" ON price_results FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = dealer_account_id);

-- 7. extension_sessions policies
DROP POLICY IF EXISTS "extension_sessions_permissive" ON extension_sessions;
DROP POLICY IF EXISTS "extension_sessions_select_auth" ON extension_sessions;
DROP POLICY IF EXISTS "extension_sessions_insert_anon" ON extension_sessions;
DROP POLICY IF EXISTS "extension_sessions_delete_auth" ON extension_sessions;

CREATE POLICY "extension_sessions_select_auth" ON extension_sessions FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = dealer_account_id);
CREATE POLICY "extension_sessions_insert_anon" ON extension_sessions FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "extension_sessions_delete_auth" ON extension_sessions FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = dealer_account_id);

-- 8. invoices policies
DROP POLICY IF EXISTS "invoices_permissive" ON invoices;
DROP POLICY IF EXISTS "invoices_select_auth" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

CREATE POLICY "invoices_select_auth" ON invoices FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin' OR get_user_dealer_account_id(auth.uid()) = dealer_account_id);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin');

-- 9. pending_approvals policies
DROP POLICY IF EXISTS "pending_approvals_permissive" ON pending_approvals;
DROP POLICY IF EXISTS "pending_approvals_select_auth" ON pending_approvals;
DROP POLICY IF EXISTS "pending_approvals_insert_anon" ON pending_approvals;
DROP POLICY IF EXISTS "pending_approvals_insert_auth" ON pending_approvals;
DROP POLICY IF EXISTS "pending_approvals_delete_auth" ON pending_approvals;

CREATE POLICY "pending_approvals_select_auth" ON pending_approvals FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "pending_approvals_insert_anon" ON pending_approvals FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "pending_approvals_insert_auth" ON pending_approvals FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "pending_approvals_delete_auth" ON pending_approvals FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin');

-- 10. algorithm_settings policies
DROP POLICY IF EXISTS "algorithm_settings_permissive" ON algorithm_settings;
DROP POLICY IF EXISTS "algorithm_settings_select_auth" ON algorithm_settings;
DROP POLICY IF EXISTS "algorithm_settings_select_anon" ON algorithm_settings;
DROP POLICY IF EXISTS "algorithm_settings_all_superadmin" ON algorithm_settings;

CREATE POLICY "algorithm_settings_select_auth" ON algorithm_settings FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "algorithm_settings_select_anon" ON algorithm_settings FOR SELECT TO anon
  USING (true);
CREATE POLICY "algorithm_settings_all_superadmin" ON algorithm_settings FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin');

