import { supabase, isSupabaseConfigured } from './supabase';

export interface Dealer {
  id: string;
  name: string;
  odoo_customer_id: string;
  odoo_contract_id: string;
  monthly_price_per_seat: number;
  license_count: number;
  status: string;
  trial_ends_at: string | null;
  expires_at: string | null;
  franchises: string[];
  created_at: string;
}

export interface User {
  id: string;
  dealer_account_id: string | null;
  email: string;
  role: string;
  temp_password: string | null;
  password_reset_required: boolean;
  created_at: string;
}

export interface License {
  id: string;
  dealer_account_id: string;
  user_id: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  license_id: string;
  device_fingerprint: string;
  last_seen: string;
  created_at: string;
}

export interface Customer {
  id: string;
  dealer_account_id: string;
  account_number: string;
  name: string;
  franchise: string;
  min_markup: number | null;
  quote_count: number;
  last_quote: string;
}

export interface PriceResult {
  id: string;
  dealer_account_id: string;
  user_id: string;
  part_number: string;
  customer_number: string;
  customer_name: string;
  original_price: number;
  optimized_price: number;
  reimb_amount: number;
  cost: number;
  margin_achieved: number;
  optimization_type: string;
  created_at: string;
}

export interface PendingApproval {
  id: string;
  email: string;
  dealer_name: string;
  role: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  dealer_account_id: string;
  date: string;
  seat_count: number;
  amount: number;
  status: string;
}

export interface SuperadminSettings {
  from_email: string;
  to_email: string;
  extension_url: string;
}

export interface SentEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
}

export interface AppState {
  dealers: Dealer[];
  users: User[];
  licenses: License[];
  sessions: Session[];
  default_markups: Record<string, { master: number; franchise: Record<string, number> }>;
  customers: Customer[];
  price_results: PriceResult[];
  pending_approvals: PendingApproval[];
  invoices: Invoice[];
  superadmin_settings: SuperadminSettings;
  sent_emails: SentEmail[];
}

// --- SEED DATA STRUCTURE ---
const SEED_DATA: AppState = {
  dealers: [
    { id: "h1", name: "Hendrick Automotive Group", odoo_customer_id: "odoo_Hndrk9823", odoo_contract_id: "contract_1", monthly_price_per_seat: 149.00, license_count: 5, status: "trial", trial_ends_at: "2026-06-15T00:00:00Z", expires_at: null, franchises: ["GM", "Ford", "Kia", "Toyota", "Honda", "Chrysler", "Nissan", "Hyundai"], created_at: "2026-01-10T08:00:00Z" },
    { id: "a1", name: "AutoNation Ford", odoo_customer_id: "odoo_AutoN4412", odoo_contract_id: "contract_2", monthly_price_per_seat: 129.00, license_count: 12, status: "active", trial_ends_at: null, expires_at: null, franchises: ["GM", "Ford", "Kia", "Toyota", "Honda", "Chrysler", "Nissan", "Hyundai"], created_at: "2026-02-15T09:30:00Z" },
    { id: "l1", name: "Lithia Chrysler Jeep", odoo_customer_id: "odoo_Lithia8823", odoo_contract_id: "contract_3", monthly_price_per_seat: 149.00, license_count: 3, status: "active", trial_ends_at: null, expires_at: null, franchises: ["GM", "Ford", "Kia", "Toyota", "Honda", "Chrysler", "Nissan", "Hyundai"], created_at: "2026-03-01T10:00:00Z" }
  ],
  users: [
    { id: "u1", dealer_account_id: "h1", email: "admin@hendrickauto.com", role: "dealer_admin", temp_password: null, password_reset_required: false, created_at: "2026-01-10T08:05:00Z" },
    { id: "u2", dealer_account_id: "h1", email: "parts1@hendrickauto.com", role: "user", temp_password: null, password_reset_required: false, created_at: "2026-01-11T09:00:00Z" },
    { id: "u3", dealer_account_id: "h1", email: "parts2@hendrickauto.com", role: "user", temp_password: "Welcome#hndrk2", password_reset_required: true, created_at: "2026-01-11T09:15:00Z" },
    { id: "u4", dealer_account_id: "a1", email: "manager@autonation.com", role: "dealer_admin", temp_password: null, password_reset_required: false, created_at: "2026-02-15T09:35:00Z" },
    { id: "u5", dealer_account_id: "a1", email: "counter1@autonation.com", role: "user", temp_password: null, password_reset_required: false, created_at: "2026-02-16T10:00:00Z" },
    { id: "u6", dealer_account_id: "a1", email: "counter2@autonation.com", role: "user", temp_password: null, password_reset_required: false, created_at: "2026-02-16T10:30:00Z" },
    { id: "u7", dealer_account_id: "l1", email: "parts_lead@lithia.com", role: "dealer_admin", temp_password: null, password_reset_required: false, created_at: "2026-03-01T10:05:00Z" },
    { id: "u-super", dealer_account_id: null, email: "david@mypartpros.com", role: "superadmin", temp_password: null, password_reset_required: false, created_at: "2026-01-01T00:00:00Z" }
  ],
  licenses: [
    { id: "lic-h1-1", dealer_account_id: "h1", user_id: "u2", created_at: "2026-01-10T08:00:00Z" },
    { id: "lic-h1-2", dealer_account_id: "h1", user_id: "u3", created_at: "2026-01-10T08:00:00Z" },
    { id: "lic-h1-3", dealer_account_id: "h1", user_id: null, created_at: "2026-01-10T08:00:00Z" },
    { id: "lic-h1-4", dealer_account_id: "h1", user_id: null, created_at: "2026-01-10T08:00:00Z" },
    { id: "lic-h1-5", dealer_account_id: "h1", user_id: null, created_at: "2026-01-10T08:00:00Z" },
    { id: "lic-a1-1", dealer_account_id: "a1", user_id: "u5", created_at: "2026-02-15T09:30:00Z" },
    { id: "lic-a1-2", dealer_account_id: "a1", user_id: "u6", created_at: "2026-02-15T09:30:00Z" },
    { id: "lic-a1-3", dealer_account_id: "a1", user_id: null, created_at: "2026-02-15T09:30:00Z" }
  ],
  sessions: [
    { id: "sess-1", license_id: "lic-h1-1", device_fingerprint: "win11-chrome-x86_64", last_seen: "2026-05-23T15:00:00Z", created_at: "2026-05-20T08:00:00Z" },
    { id: "sess-2", license_id: "lic-a1-1", device_fingerprint: "macos-safari-arm64", last_seen: "2026-05-23T14:45:00Z", created_at: "2026-05-21T09:00:00Z" }
  ],
  default_markups: {
    "h1": {
      master: 10.5,
      franchise: { "GM": 12.0, "Ford": 9.5, "Kia": 11.0, "Toyota": 10.0, "Honda": 10.5, "Chrysler": 11.5, "Nissan": 9.0, "Hyundai": 10.0 }
    },
    "a1": {
      master: 12.0,
      franchise: { "GM": 13.0, "Ford": 11.0, "Kia": 10.0, "Toyota": 12.5, "Honda": 12.0, "Chrysler": 12.0, "Nissan": 11.5, "Hyundai": 11.5 }
    },
    "l1": {
      master: 10.0,
      franchise: { "GM": 11.0, "Ford": 10.0, "Kia": 10.5, "Toyota": 10.0, "Honda": 9.5, "Chrysler": 9.0, "Nissan": 10.0, "Hyundai": 9.5 }
    }
  },
  customers: [
    { id: "cust-1", dealer_account_id: "h1", account_number: "BSH-44201", name: "Mike's Collision Center", franchise: "GM", min_markup: null, quote_count: 14, last_quote: "2026-05-23T14:30:00-05:00" },
    { id: "cust-2", dealer_account_id: "h1", account_number: "BSH-10892", name: "Caliber Collision - West Charlotte", franchise: "Toyota", min_markup: 15.0, quote_count: 42, last_quote: "2026-05-23T14:50:00-05:00" },
    { id: "cust-3", dealer_account_id: "h1", account_number: "BSH-33100", name: "ABRA Auto Body & Glass", franchise: "Ford", min_markup: null, quote_count: 7, last_quote: "2026-05-22T11:20:00-05:00" },
    { id: "cust-4", dealer_account_id: "h1", account_number: "BSH-20155", name: "Service King Collision - South Blvd", franchise: "Chrysler", min_markup: 8.0, quote_count: 31, last_quote: "2026-05-23T09:15:00-05:00" },
    { id: "cust-5", dealer_account_id: "h1", account_number: "BSH-55234", name: "Gerber Collision & Glass", franchise: "Honda", min_markup: null, quote_count: 19, last_quote: "2026-05-21T16:45:00-05:00" },
    { id: "cust-6", dealer_account_id: "h1", account_number: "BSH-78012", name: "Fix Auto - Lake Norman", franchise: "Nissan", min_markup: 12.0, quote_count: 5, last_quote: "2026-05-20T13:00:00-05:00" },
    { id: "cust-7", dealer_account_id: "h1", account_number: "BSH-60499", name: "Maaco Collision Repair", franchise: "Kia", min_markup: null, quote_count: 23, last_quote: "2026-05-23T12:10:00-05:00" },
    { id: "cust-8", dealer_account_id: "h1", account_number: "BSH-41888", name: "Cooks Body Shop", franchise: "GM", min_markup: null, quote_count: 2, last_quote: "2026-05-18T08:30:00-05:00" },
    { id: "cust-9", dealer_account_id: "h1", account_number: "BSH-92001", name: "Classic Collision - Pineville", franchise: "Toyota", min_markup: 18.0, quote_count: 9, last_quote: "2026-05-23T10:45:00-05:00" },
    { id: "cust-10", dealer_account_id: "h1", account_number: "BSH-11237", name: "Joe Hudson's Collision Center", franchise: "Ford", min_markup: null, quote_count: 11, last_quote: "2026-05-22T14:20:00-05:00" },
    { id: "cust-11", dealer_account_id: "h1", account_number: "BSH-30055", name: "Crash Champions - University", franchise: "Honda", min_markup: null, quote_count: 16, last_quote: "2026-05-23T15:00:00-05:00" },
    { id: "cust-12", dealer_account_id: "h1", account_number: "BSH-85600", name: "Boyd Autobody & Glass", franchise: "Nissan", min_markup: 9.5, quote_count: 4, last_quote: "2026-05-19T09:00:00-05:00" },
    { id: "cust-20", dealer_account_id: "a1", account_number: "BSH-70100", name: "CARSTAR Auto Body - Doral", franchise: "Ford", min_markup: null, quote_count: 22, last_quote: "2026-05-23T14:10:00-05:00" },
    { id: "cust-21", dealer_account_id: "a1", account_number: "BSH-70201", name: "Caliber Collision - Miami Lakes", franchise: "Toyota", min_markup: 14.0, quote_count: 38, last_quote: "2026-05-23T13:45:00-05:00" },
    { id: "cust-22", dealer_account_id: "a1", account_number: "BSH-70302", name: "Hendrick Collision Center East", franchise: "GM", min_markup: null, quote_count: 8, last_quote: "2026-05-22T10:30:00-05:00" },
    { id: "cust-23", dealer_account_id: "a1", account_number: "BSH-70450", name: "AutoNation Collision - Pembroke", franchise: "Ford", min_markup: null, quote_count: 55, last_quote: "2026-05-23T11:20:00-05:00" },
    { id: "cust-24", dealer_account_id: "a1", account_number: "BSH-70511", name: "Fix Auto - Hialeah", franchise: "Nissan", min_markup: 11.0, quote_count: 3, last_quote: "2026-05-20T15:00:00-05:00" }
  ],
  price_results: [
    { id: "res-1", dealer_account_id: "h1", user_id: "u2", part_number: "84218944", customer_number: "BSH-10892", customer_name: "Caliber Collision - West Charlotte", original_price: 245.00, optimized_price: 228.00, reimb_amount: 193.80, cost: 180.00, margin_achieved: 26.6, optimization_type: "optimize", created_at: "2026-05-23T14:50:00-05:00" },
    { id: "res-2", dealer_account_id: "h1", user_id: "u2", part_number: "12613245", customer_number: "BSH-10892", customer_name: "Caliber Collision - West Charlotte", original_price: 112.50, optimized_price: 105.00, reimb_amount: 89.25, cost: 72.00, margin_achieved: 23.9, optimization_type: "maintain_profit", created_at: "2026-05-23T14:32:00-05:00" },
    { id: "res-3", dealer_account_id: "h1", user_id: "u2", part_number: "22849921", customer_number: "BSH-44201", customer_name: "Mike's Collision Center", original_price: 45.00, optimized_price: 43.50, reimb_amount: 36.98, cost: 31.00, margin_achieved: 19.2, optimization_type: "optimize", created_at: "2026-05-23T14:45:00-05:00" },
    { id: "res-4", dealer_account_id: "h1", user_id: "u2", part_number: "98334188", customer_number: "BSH-20155", customer_name: "Service King Collision - South Blvd", original_price: 615.00, optimized_price: 595.00, reimb_amount: 505.75, cost: 480.00, margin_achieved: 23.9, optimization_type: "optimize", created_at: "2026-05-23T14:50:00-05:00" },
    { id: "res-5", dealer_account_id: "h1", user_id: "u2", part_number: "55102938", customer_number: "BSH-55234", customer_name: "Gerber Collision & Glass", original_price: 188.00, optimized_price: 175.50, reimb_amount: 149.18, cost: 140.00, margin_achieved: 25.4, optimization_type: "maintain_profit", created_at: "2026-05-21T16:45:00-05:00" }
  ],
  pending_approvals: [
    { id: "app-1", email: "johndoe@gmail.com", dealer_name: "John's Chevrolet Group", role: "dealer_admin", created_at: "2026-05-23T11:00:00Z" }
  ],
  invoices: [
    { id: "inv_1", dealer_account_id: "h1", date: "2026-05-31", seat_count: 5, amount: 745.00, status: "Paid" },
    { id: "inv_2", dealer_account_id: "h1", date: "2026-04-30", seat_count: 5, amount: 745.00, status: "Paid" },
    { id: "inv_3", dealer_account_id: "a1", date: "2026-05-31", seat_count: 3, amount: 387.00, status: "Paid" }
  ],
  superadmin_settings: {
    from_email: "notifications@mypartpros.com",
    to_email: "david@mypartpros.com",
    extension_url: "https://chromewebstore.google.com/detail/my-part-pros-oec-price-optimizer/placeholder-id"
  },
  sent_emails: [] as Array<{ from: string, to: string, subject: string, body: string, date: string }>
};

// LocalStorage State Manager
const getLocalStorageState = (): AppState => {
  if (typeof window === 'undefined') return SEED_DATA;
  const stored = localStorage.getItem('mpp_dashboard_state');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored state, using seed.", e);
    }
  }
  localStorage.setItem('mpp_dashboard_state', JSON.stringify(SEED_DATA));
  return SEED_DATA;
};

const saveLocalStorageState = (state: AppState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mpp_dashboard_state', JSON.stringify(state));
  }
};

// Async data access wrappers (with live query logic structure ready for Supabase conversion)
export const dataService = {
  // --- AUTH SERVICES ---
  async login(email: string, pass: string): Promise<{ success: boolean; user?: any; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) return { success: false, error: error.message };
      // Retrieve profile matching email
      const dbState = getLocalStorageState(); // fallback sync profile roles
      const profile = dbState.users.find(u => u.email === email);
      return { success: true, user: { ...data.user, role: profile?.role || 'user', dealer_account_id: profile?.dealer_account_id } };
    }

    const state = getLocalStorageState();
    const user = state.users.find(u => u.email === email);
    if (!user) return { success: false, error: "User credentials not found." };
    if (user.temp_password && user.temp_password !== pass) return { success: false, error: "Incorrect passcode." };
    // Simulate auth
    return { success: true, user };
  },

  async updatePassword(email: string, newPass: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) return false;
    }
    const state = getLocalStorageState();
    const userIndex = state.users.findIndex(u => u.email === email);
    if (userIndex !== -1) {
      state.users[userIndex].temp_password = null;
      state.users[userIndex].password_reset_required = false;
      saveLocalStorageState(state);
      return true;
    }
    return false;
  },

  // --- DEALER SERVICES ---
  async getDealers(): Promise<any[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('dealer_accounts').select('*');
      if (data) return data;
    }
    return getLocalStorageState().dealers;
  },

  async createDealer(name: string, monthlyRate: number, seatCount: number, status: string = 'trial', trialDays: number = 14): Promise<any> {
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + trialDays);

    const newDealer = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : "d-" + Math.random().toString(36).substring(4),
      name,
      odoo_customer_id: "odoo_" + Math.random().toString(36).substring(6),
      odoo_contract_id: "contract_" + Math.random().toString(36).substring(7),
      monthly_price_per_seat: Number(monthlyRate),
      license_count: Number(seatCount),
      status,
      trial_ends_at: status === 'trial' ? trialEnds.toISOString() : null,
      expires_at: null,
      franchises: ["GM", "Ford", "Kia", "Toyota", "Honda", "Chrysler", "Nissan", "Hyundai"],
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      // Omit 'franchises' as it is not a database column in dealer_accounts
      const dbDealer = { ...newDealer } as any;
      delete dbDealer.franchises;
      await supabase.from('dealer_accounts').insert(dbDealer);
    }

    const state = getLocalStorageState();
    state.dealers.push(newDealer);
    
    // Create empty license slots for this dealer
    for (let i = 0; i < seatCount; i++) {
      const newLicense = {
        id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `lic-${newDealer.id}-${i+1}`,
        dealer_account_id: newDealer.id,
        user_id: null,
        created_at: new Date().toISOString()
      };
      if (isSupabaseConfigured && supabase) {
        await supabase.from('licenses').insert(newLicense);
      }
      state.licenses.push(newLicense);
    }

    // Initialize blank markup rule
    state.default_markups[newDealer.id] = {
      master: 10.0,
      franchise: { "GM": 10.0, "Ford": 10.0, "Kia": 10.0, "Toyota": 10.0, "Honda": 10.0, "Chrysler": 10.0, "Nissan": 10.0, "Hyundai": 10.0 }
    };

    saveLocalStorageState(state);
    return newDealer;
  },

  async updateDealer(dealerId: string, updates: Partial<typeof SEED_DATA.dealers[0]>): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      // Omit franchises before updating Supabase
      const dbUpdates = { ...updates } as any;
      delete dbUpdates.franchises;
      await supabase.from('dealer_accounts').update(dbUpdates).eq('id', dealerId);
    }
    const state = getLocalStorageState();
    const index = state.dealers.findIndex(d => d.id === dealerId);
    if (index !== -1) {
      // If seat count changed, adjust license seats
      const oldSeatCount = state.dealers[index].license_count;
      const newSeatCount = updates.license_count !== undefined ? Number(updates.license_count) : oldSeatCount;
      
      state.dealers[index] = { ...state.dealers[index], ...updates };

      if (newSeatCount > oldSeatCount) {
        // Add seats
        for (let i = oldSeatCount; i < newSeatCount; i++) {
          const newLicense = {
            id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `lic-${dealerId}-${i+1}`,
            dealer_account_id: dealerId,
            user_id: null,
            created_at: new Date().toISOString()
          };
          if (isSupabaseConfigured && supabase) {
            await supabase.from('licenses').insert(newLicense);
          }
          state.licenses.push(newLicense);
        }
      } else if (newSeatCount < oldSeatCount) {
        // Remove seats (starting with unassigned ones)
        let removeCount = oldSeatCount - newSeatCount;
        const licensesForDealer = state.licenses.filter(l => l.dealer_account_id === dealerId);
        
        // Remove unassigned first
        const unassigned = licensesForDealer.filter(l => l.user_id === null);
        for (const l of unassigned) {
          if (removeCount <= 0) break;
          if (isSupabaseConfigured && supabase) {
            await supabase.from('licenses').delete().eq('id', l.id);
          }
          state.licenses = state.licenses.filter(x => x.id !== l.id);
          removeCount--;
        }
        // If still need to remove, remove assigned seats (releasing user associations)
        if (removeCount > 0) {
          const assigned = licensesForDealer.filter(l => l.user_id !== null);
          for (const l of assigned) {
            if (removeCount <= 0) break;
            if (isSupabaseConfigured && supabase) {
              await supabase.from('licenses').delete().eq('id', l.id);
            }
            state.licenses = state.licenses.filter(x => x.id !== l.id);
            removeCount--;
          }
        }
      }
      saveLocalStorageState(state);
      return true;
    }
    return false;
  },

  // --- USER SERVICES ---
  async getUsers(dealerId: string | null): Promise<any[]> {
    if (isSupabaseConfigured && supabase) {
      const query = supabase.from('users').select('*');
      if (dealerId) query.eq('dealer_account_id', dealerId);
      const { data } = await query;
      if (data) return data;
    }
    const state = getLocalStorageState();
    return dealerId ? state.users.filter(u => u.dealer_account_id === dealerId) : state.users;
  },

  async createUser(dealerId: string | null, email: string, role: 'dealer_admin' | 'user', tempPass: string): Promise<any> {
    const newUser = {
      id: "u-" + Math.random().toString(36).substring(4),
      dealer_account_id: dealerId,
      email,
      role,
      temp_password: tempPass,
      password_reset_required: true,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').insert(newUser);
    }
    const state = getLocalStorageState();
    state.users.push(newUser);
    saveLocalStorageState(state);
    return newUser;
  },

  async updateUser(userId: string, updates: Partial<typeof SEED_DATA.users[0]>): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').update(updates).eq('id', userId);
    }
    const state = getLocalStorageState();
    const index = state.users.findIndex(u => u.id === userId);
    if (index !== -1) {
      state.users[index] = { ...state.users[index], ...updates };
      saveLocalStorageState(state);
      return true;
    }
    return false;
  },

  // --- LICENSE & SEATS SERVICES ---
  async getLicenses(dealerId: string): Promise<any[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('licenses').select('*').eq('dealer_account_id', dealerId);
      if (data) return data;
    }
    return getLocalStorageState().licenses.filter(l => l.dealer_account_id === dealerId);
  },

  async assignLicense(licenseId: string, userId: string | null): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('licenses').update({ user_id: userId }).eq('id', licenseId);
    }
    const state = getLocalStorageState();
    const index = state.licenses.findIndex(l => l.id === licenseId);
    if (index !== -1) {
      // If user is already assigned to a different license, clear that one first (enforce 1 seat per user limit)
      if (userId) {
        state.licenses.forEach(l => {
          if (l.user_id === userId) l.user_id = null;
        });
      }
      state.licenses[index].user_id = userId;
      saveLocalStorageState(state);
      return true;
    }
    return false;
  },

  // --- DEVICE SESSIONS ---
  async getSessions(dealerId: string): Promise<any[]> {
    const state = getLocalStorageState();
    const dealerLicenses = state.licenses.filter(l => l.dealer_account_id === dealerId).map(l => l.id);
    return state.sessions.filter(s => dealerLicenses.includes(s.license_id));
  },

  async kickSession(licenseId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('sessions').delete().eq('license_id', licenseId);
    }
    const state = getLocalStorageState();
    const initialLen = state.sessions.length;
    state.sessions = state.sessions.filter(s => s.license_id !== licenseId);
    saveLocalStorageState(state);
    return state.sessions.length < initialLen;
  },

  // --- MARKUP RULES ---
  async getMarkupSettings(dealerId: string) {
    const state = getLocalStorageState();
    return state.default_markups[dealerId] || { master: 10.0, franchise: {} };
  },

  async saveMarkupSettings(dealerId: string, data: typeof SEED_DATA.default_markups[string]) {
    const state = getLocalStorageState();
    state.default_markups[dealerId] = data;
    saveLocalStorageState(state);
    return true;
  },

  async getCustomers(dealerId: string): Promise<any[]> {
    return getLocalStorageState().customers.filter(c => c.dealer_account_id === dealerId);
  },

  async updateCustomerMarkup(dealerId: string, accountNum: string, minMarkup: number | null): Promise<boolean> {
    const state = getLocalStorageState();
    const index = state.customers.findIndex(c => c.dealer_account_id === dealerId && c.account_number === accountNum);
    if (index !== -1) {
      state.customers[index].min_markup = minMarkup;
      saveLocalStorageState(state);
      return true;
    }
    return false;
  },

  // --- LOGS & RESULTS ---
  async getPriceResults(dealerId: string): Promise<any[]> {
    return getLocalStorageState().price_results.filter(r => r.dealer_account_id === dealerId);
  },

  async getAllPriceResults(): Promise<any[]> {
    return getLocalStorageState().price_results;
  },

  // --- APPROVALS QUEUE ---
  async getPendingApprovals(): Promise<any[]> {
    return getLocalStorageState().pending_approvals;
  },

  async approvePendingApproval(appId: string, tempPass: string): Promise<boolean> {
    const state = getLocalStorageState();
    const index = state.pending_approvals.findIndex(x => x.id === appId);
    if (index !== -1) {
      const app = state.pending_approvals[index];
      
      // Create new dealer account for admin signup
      const newDealer = await this.createDealer(app.dealer_name, 149.00, 5, 'trial', 14);
      
      // Create user
      await this.createUser(newDealer.id, app.email, app.role as 'dealer_admin' | 'user', tempPass);

      // Remove from pending
      state.pending_approvals = state.pending_approvals.filter(x => x.id !== appId);
      saveLocalStorageState(state);
      return true;
    }
    return false;
  },

  async rejectPendingApproval(appId: string): Promise<boolean> {
    const state = getLocalStorageState();
    const initialLen = state.pending_approvals.length;
    state.pending_approvals = state.pending_approvals.filter(x => x.id !== appId);
    saveLocalStorageState(state);
    return state.pending_approvals.length < initialLen;
  },

  // --- INVOICES ---
  async getInvoices(dealerId: string | null): Promise<any[]> {
    const state = getLocalStorageState();
    return dealerId ? state.invoices.filter(i => i.dealer_account_id === dealerId) : state.invoices;
  },

  // --- EMAIL SIMULATION LOGS ---
  async getSuperadminSettings() {
    return getLocalStorageState().superadmin_settings;
  },

  async saveSuperadminSettings(settings: typeof SEED_DATA.superadmin_settings) {
    const state = getLocalStorageState();
    state.superadmin_settings = settings;
    saveLocalStorageState(state);
    return true;
  },

  async getSentEmails() {
    return getLocalStorageState().sent_emails;
  },

  async sendSimulatedEmail(from: string, to: string, subject: string, body: string) {
    const state = getLocalStorageState();
    state.sent_emails.unshift({
      from,
      to,
      subject,
      body,
      date: new Date().toISOString()
    });
    saveLocalStorageState(state);
  }
};
