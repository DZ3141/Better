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

-- Row Level Security (RLS) Configuration
ALTER TABLE dealer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Basic Policies (To be integrated with Supabase auth metadata)
-- For development / client integration, we will also bypass or write rules checking the user's dealer_account_id.

