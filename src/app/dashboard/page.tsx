'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/dataService';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dealers, setDealers] = useState<any[]>([]);
  const [activeDealer, setActiveDealer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Layout Tab State
  const [activeTab, setActiveTab] = useState('dealer-overview');

  // Modal State
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  // Dynamic Data Lists
  const [usersList, setUsersList] = useState<any[]>([]);
  const [licensesList, setLicensesList] = useState<any[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [logsList, setLogsList] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  
  // Rules Settings State
  const [masterMarkup, setMasterMarkup] = useState(10.0);
  const [franchiseMarkups, setFranchiseMarkups] = useState<Record<string, number>>({});
  const [searchCustomer, setSearchCustomer] = useState('');
  
  // Log Pagination & Search
  const [searchLog, setSearchLog] = useState('');
  const [logPage, setLogPage] = useState(0);
  const logsPerPage = 5;

  // New User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'dealer_admin' | 'user'>('user');

  // Load Session and Seed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = sessionStorage.getItem('mpp_active_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }
      try {
        const u = JSON.parse(storedUser);
        if (u.role === 'superadmin') {
          router.push('/superadmin');
          return;
        }
        setUser(u);
        loadInitialData(u).finally(() => setIsLoading(false));
      } catch (e) {
        router.push('/login');
      }
    }
  }, [router]);

  const loadInitialData = async (currentUser: any) => {
    try {
      let allDealers = await dataService.getDealers();
      
      // Fallback if Supabase is connected but empty, to prevent hanging
      if (!allDealers || allDealers.length === 0) {
        const mockState = typeof window !== 'undefined' ? localStorage.getItem('mpp_dashboard_state') : null;
        if (mockState) {
          try {
            allDealers = JSON.parse(mockState).dealers;
          } catch(e) {}
        }
      }
      
      setDealers(allDealers || []);

      // Set active dealer (Dealer Admins are locked to their own account)
      const targetDealerId = currentUser.dealer_account_id || (allDealers && allDealers[0]?.id);
      let dealer = allDealers ? allDealers.find(d => d.id === targetDealerId) : null;
      
      // Fallback if dealer is not found in the list
      if (!dealer && allDealers && allDealers.length > 0) {
        dealer = allDealers[0];
      }
      
      setActiveDealer(dealer);

      if (dealer) {
        await refreshDealerData(dealer.id);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  const refreshDealerData = async (dealerId: string) => {
    // Fetch all dealer-related data in parallel to maximize load speed and avoid flickering
    const [allDealers, users, licenses, sessions, customers, markupSettings, invoices, logs] = await Promise.all([
      dataService.getDealers(),
      dataService.getUsers(dealerId),
      dataService.getLicenses(dealerId),
      dataService.getSessions(dealerId),
      dataService.getCustomers(dealerId),
      dataService.getMarkupSettings(dealerId),
      dataService.getInvoices(dealerId),
      dataService.getPriceResults(dealerId)
    ]);

    let resolvedDealers = allDealers;
    if (!resolvedDealers || resolvedDealers.length === 0) {
      const mockState = typeof window !== 'undefined' ? localStorage.getItem('mpp_dashboard_state') : null;
      if (mockState) {
        try {
          resolvedDealers = JSON.parse(mockState).dealers;
        } catch(e) {}
      }
    }

    const updatedDealer = resolvedDealers ? resolvedDealers.find(d => d.id === dealerId) : null;
    if (updatedDealer) {
      setActiveDealer(updatedDealer);
    }

    setUsersList(users);
    setLicensesList(licenses);
    setSessionsList(sessions);
    setCustomersList(customers);
    setMasterMarkup(markupSettings.master);
    setFranchiseMarkups(markupSettings.franchise || {});
    setInvoicesList(invoices);
    setLogsList(logs);
  };

  const showToast = (msg: string, type: string = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMsg('');
    }, 3000);
  };

  // --- CONTROLLER ACTIONS ---

  // Update default markup rules
  const handleSaveDefaultMarkup = async () => {
    if (!activeDealer) return;
    const updatedRules = {
      master: Number(masterMarkup),
      franchise: franchiseMarkups
    };
    await dataService.saveMarkupSettings(activeDealer.id, updatedRules);
    showToast('Master default markup rule updated!');
    refreshDealerData(activeDealer.id);
  };

  const handleSaveFranchiseMarkup = (franchise: string, val: number) => {
    setFranchiseMarkups(prev => ({
      ...prev,
      [franchise]: Number(val)
    }));
  };

  // Edit custom markup override for customer
  const handleSaveCustomerMarkup = async (accountNumber: string, value: string) => {
    if (!activeDealer) return;
    const cleanVal = value === '' ? null : Number(value);
    await dataService.updateCustomerMarkup(activeDealer.id, accountNumber, cleanVal);
    showToast(`Updated markup override for shop ${accountNumber}`);
    refreshDealerData(activeDealer.id);
  };

  // Assign user to license seat
  const handleAssignLicense = async (licenseId: string, userId: string) => {
    if (!activeDealer) return;
    const targetUserId = userId === 'unassigned' ? null : userId;
    await dataService.assignLicense(licenseId, targetUserId);
    showToast(targetUserId ? 'License seat assigned successfully.' : 'License seat unassigned.');
    refreshDealerData(activeDealer.id);
  };

  // Create User Action
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDealer || !newUserEmail) return;

    // Check email block domains
    const BLOCKED_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'protonmail.com', 'oeconnection.com'];
    const domain = newUserEmail.split('@')[1]?.toLowerCase();
    if (BLOCKED_DOMAINS.includes(domain)) {
      showToast('Error: Free or generic email domains are not allowed.', 'error');
      return;
    }

    const tempPassword = "Temp#" + Math.floor(1000 + Math.random() * 9000);
    await dataService.createUser(activeDealer.id, newUserEmail, newUserRole, tempPassword);

    // Send Welcome email
    const welcomeSubject = "Welcome to My Part Pros OEC Price Optimizer - Your Login Credentials";
    const welcomeBody = `Hi,\n\nYour user profile has been created.\n\nYour login details are:\nEmail: ${newUserEmail}\nTemporary Password: ${tempPassword}\n\nOn your first login you will be prompted to change this password.`;
    await dataService.sendEmail(newUserEmail, welcomeSubject, welcomeBody);

    setUserModalOpen(false);
    setNewUserEmail('');
    showToast(`User created. Welcome passcode email dispatched to ${newUserEmail}`);
    refreshDealerData(activeDealer.id);
  };

  // Reset user password passcode
  const handleResetUserPassword = async (userId: string, email: string) => {
    if (!activeDealer) return;
    const tempPassword = "Temp#" + Math.floor(1000 + Math.random() * 9000);
    await dataService.updateUser(userId, { temp_password: tempPassword, password_reset_required: true });

    // Send password reset email
    const subject = "My Part Pros OEC Price Optimizer - Password Reset Credentials";
    const body = `Hi,\n\nYour account password has been reset. Your temporary password is:\n\n${tempPassword}\n\nYou will be required to set a new password on your next login.`;
    await dataService.sendEmail(email, subject, body);

    showToast(`Password reset. Passcode emailed to ${email}`);
    refreshDealerData(activeDealer.id);
  };

  // Delete User Action
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!activeDealer) return;
    const success = await dataService.deleteUser(userId);
    if (success) {
      showToast(`User ${email} deactivated.`);
      refreshDealerData(activeDealer.id);
    } else {
      showToast(`Failed to deactivate user ${email}.`, 'error');
    }
  };

  // Kick Session
  const handleKickSession = async (licenseId: string, email: string) => {
    if (!activeDealer) return;
    await dataService.kickSession(licenseId);
    showToast(`Active session kicked for license assigned to ${email}`);
    refreshDealerData(activeDealer.id);
  };

  // Odoo seat updates billing email simulated dispatcher
  const adjustBillingSeats = async (adjustment: number) => {
    if (!activeDealer) return;
    const currentSeats = activeDealer.license_count;
    const newSeats = Math.max(1, currentSeats + adjustment);
    if (newSeats === currentSeats) return;

    await dataService.updateDealer(activeDealer.id, { license_count: newSeats });
    
    // Send alert email to Shane (notifications)
    const rate = activeDealer.monthly_price_per_seat;
    const oldCost = currentSeats * rate;
    const newCost = newSeats * rate;
    
    // Proration math
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const daysRemaining = daysInMonth - now.getDate();
    
    const seatCostPerDay = rate / daysInMonth;
    const prorationAmount = adjustment * daysRemaining * seatCostPerDay;

    const toEmail = "david@mypartpros.com";
    const subject = `[Billing Update] Seat Change for ${activeDealer.name}`;
    const body = `Hi David,\n\n${activeDealer.name} has adjusted their active seat allocations in the Optimizer Console.\n\nDetails:\n- Original Seats: ${currentSeats} ($${oldCost.toFixed(2)}/mo)\n- New Seats: ${newSeats} ($${newCost.toFixed(2)}/mo)\n- Monthly Rate Card: $${rate.toFixed(2)}/seat\n- Cycle Adjustment: ${adjustment > 0 ? '+' : '-'}${Math.abs(adjustment)} seats\n- Prorated adjustment for ${daysRemaining} days remaining: $${prorationAmount.toFixed(2)}\n\nPlease update their contract record in Odoo accordingly.`;

    await dataService.sendEmail(toEmail, subject, body);
    showToast(`Subscription seats updated to ${newSeats}. Notification sent to billing.`);
    refreshDealerData(activeDealer.id);
  };

  // CSV Export for Optimization logs
  const exportLogsToCSV = () => {
    if (logsList.length === 0) {
      showToast('No logs available to export.', 'error');
      return;
    }
    const headers = ['Timestamp', 'Part Number', 'Customer Code', 'Cost', 'Original Price', 'Final Sell Price', 'Reimbursement', 'Margin Achieved', 'Action Type'];
    const rows = logsList.map(l => [
      new Date(l.created_at).toLocaleString(),
      l.part_number,
      l.customer_number || 'Default',
      `$${Number(l.cost).toFixed(2)}`,
      `$${Number(l.original_price).toFixed(2)}`,
      `$${Number(l.optimized_price).toFixed(2)}`,
      `$${Number(l.reimb_amount).toFixed(2)}`,
      `${l.margin_achieved}%`,
      l.optimization_type || 'optimize'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mpp_optimization_log_${activeDealer?.id || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Optimization logs exported as CSV.');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mpp_active_user');
    router.push('/login');
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const csvContent = [
      'Shop Name,Customer Number,Minimum Margin',
      'Example Shop A,BS-10023,12.5',
      'Example Shop B,BS-20045,8.0'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mpp_customer_overrides_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeDealer) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt === 'xlsx' || fileExt === 'xls') {
      showToast('Excel format (.xlsx) not supported. Please save as CSV (Comma Delimited) and upload.', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result;
      if (typeof text !== 'string') return;

      try {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          showToast('CSV file is empty or missing headers.', 'error');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const shopNameIdx = headers.findIndex(h => h.includes('shop name') || h.includes('name'));
        const customerNumIdx = headers.findIndex(h => h.includes('customer number') || h.includes('customer #') || h.includes('account number') || h.includes('account #'));
        const minMarginIdx = headers.findIndex(h => h.includes('minimum margin') || h.includes('margin') || h.includes('markup'));

        if (shopNameIdx === -1 || customerNumIdx === -1 || minMarginIdx === -1) {
          showToast('Required headers not found. Ensure CSV has: "Shop Name", "Customer Number", "Minimum Margin"', 'error');
          return;
        }

        const parsedRecords: { shopName: string; customerNumber: string; minMargin: number }[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              cols.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          cols.push(current.trim());

          const shopName = cols[shopNameIdx];
          const customerNumber = cols[customerNumIdx];
          const minMarginStr = cols[minMarginIdx];

          if (!customerNumber) continue;

          const cleanShopName = shopName ? shopName.replace(/^"|"$/g, '').trim() : 'Shop ' + customerNumber;
          const cleanMarginStr = minMarginStr ? minMarginStr.replace(/%/g, '').trim() : '10';
          const minMargin = parseFloat(cleanMarginStr);

          if (isNaN(minMargin)) {
            showToast(`Invalid margin value on row ${i + 1}: ${minMarginStr}`, 'error');
            return;
          }

          parsedRecords.push({
            shopName: cleanShopName,
            customerNumber,
            minMargin
          });
        }

        if (parsedRecords.length === 0) {
          showToast('No valid records found to import.', 'error');
          return;
        }

        const success = await dataService.importCustomerOverrides(activeDealer.id, parsedRecords);
        if (success) {
          showToast(`Successfully imported ${parsedRecords.length} customer overrides!`);
          await refreshDealerData(activeDealer.id);
        } else {
          showToast('Failed to save imported customer overrides.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error parsing CSV file.', 'error');
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Helpers
  const filteredCustomers = customersList.filter(c => 
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.account_number.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  const calculateDaysLeft = (endsAtStr: string | null) => {
    if (!endsAtStr) return 0;
    const endsAt = new Date(endsAtStr);
    const now = new Date();
    const diffTime = endsAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const filteredLogs = logsList.filter(l => 
    l.part_number.includes(searchLog) ||
    (l.customer_number && l.customer_number.includes(searchLog))
  );

  const paginatedLogs = filteredLogs.slice(logPage * logsPerPage, (logPage + 1) * logsPerPage);

  const countTotalClicks = logsList.length;
  const countUniqueCustomers = new Set(logsList.map(l => l.customer_number)).size;
  const countAssignedSeats = licensesList.filter(l => l.user_id !== null).length;

  if (!user || isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0b0b0a', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '24px',
        fontFamily: 'Outfit, sans-serif'
      }}>
        {/* Animated spinner */}
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(246, 178, 58, 0.15)',
          borderTop: '3px solid #f6b23a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ color: '#f6b23a', fontSize: '15px', fontWeight: 600, letterSpacing: '0.05em' }}>Loading Dashboard</div>
        <div style={{ color: '#666', fontSize: '12px' }}>Fetching dealer data…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!activeDealer) {
    return (
      <div style={{ color: 'white', padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#0b0b0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <h2>No Active Dealer Account</h2>
        <p style={{ color: '#9ca3af', maxWidth: '500px', textAlign: 'center', lineHeight: '1.5' }}>
          Your user account is not associated with any active dealer account, or your database is empty. 
          Please log out and log in to a different account, or make sure your database has seed records.
        </p>
        <button onClick={handleLogout} style={{ padding: '10px 20px', backgroundColor: '#f6b23a', border: 'none', borderRadius: '6px', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>Log Out</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* Toast popup alerts */}
      {toastMsg && (
        <div className={`toast show ${toastType === 'error' ? 'error' : ''}`}>
          {toastMsg}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">M</div>
          <div>
            <div className="brand-name">My Part Pros</div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-orange-primary)', letterSpacing: '0.1em', marginTop: '2px' }}>Price Optimizer</div>
          </div>
        </div>

        <ul className="sidebar-menu">
          <div className="menu-section-label">Dealer Dashboard</div>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-overview' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-overview')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
              <span>Overview</span>
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-rules' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-rules')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
              <span>Customer Markup</span>
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-users' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-users')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Users & Licenses</span>
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-results' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-results')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <span>Optimization Log</span>
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-billing' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-billing')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              <span>Odoo & Billing</span>
            </a>
          </li>
          
          <div style={{ marginTop: 'auto', padding: '10px 14px' }}>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%', gap: '8px' }}>
              <span>Log Out</span>
            </button>
          </div>
        </ul>

        {/* Profile Footer */}
        <div className="sidebar-footer">
          <div className="profile-card">
            <div className="profile-avatar">{user.email.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <div className="profile-name">{user.email}</div>
              <div className="profile-role">Dealer Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-content">
        
        {/* Header Bar */}
        <div className="header-bar">
          <div className="header-title-section">
            <h1 style={{ textTransform: 'capitalize' }}>
              {activeTab.replace('dealer-', '').replace('-', ' ')}
            </h1>
            <p>Dealership Account: <strong>{activeDealer.name}</strong></p>
          </div>

          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {activeDealer.status === 'trial' && activeDealer.trial_ends_at && (
              <>
                <style>{`
                  @keyframes pulse {
                    0% { transform: scale(0.9); opacity: 0.6; }
                    100% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 12px #f6b23a; }
                  }
                `}</style>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    background: 'linear-gradient(135deg, rgba(246, 178, 58, 0.15) 0%, rgba(246, 178, 58, 0.05) 100%)', 
                    border: '1px solid rgba(246, 178, 58, 0.3)',
                    color: '#f6b23a',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(246, 178, 58, 0.05)'
                  }}
                >
                  <span 
                    style={{ 
                      display: 'inline-block', 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: '#f6b23a', 
                      boxShadow: '0 0 8px #f6b23a',
                      animation: 'pulse 1s infinite alternate' 
                    }} 
                  />
                  <span>Trial Active: {calculateDaysLeft(activeDealer.trial_ends_at)} days remaining</span>
                </div>
              </>
            )}
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
              System Status: <span className="badge badge-success">Online</span>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* VIEW: OVERVIEW */}
        {/* ============================================== */}
        {activeTab === 'dealer-overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="stats-grid">
              <div className="stat-card green-accent">
                <div className="stat-card-label">Active Licenses</div>
                <div className="stat-card-value">{countAssignedSeats} / {activeDealer.license_count}</div>
                <div className="stat-card-subtext">Assigned seats / total purchased</div>
              </div>
              <div className="stat-card orange-accent">
                <div className="stat-card-label">Quote Optimizations</div>
                <div className="stat-card-value">{countTotalClicks}</div>
                <div className="stat-card-subtext">Total quote attempts processed</div>
              </div>
              <div className="stat-card green-accent">
                <div className="stat-card-label">Unique Customers Quoted</div>
                <div className="stat-card-value">{countUniqueCustomers}</div>
                <div className="stat-card-subtext">Active bodyshop connections</div>
              </div>
            </div>

            {/* Pricing Engine Stable vs Beta Toggle card */}
            <div className="content-panel">
              <div className="panel-header" style={{ borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
                <div className="panel-header-titles">
                  <h2>Pricing Engine optimization mode</h2>
                  <p>Toggle between standard Stable and experimental Beta calculation algorithm instances.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div 
                  onClick={async () => {
                    await dataService.updateDealer(activeDealer.id, { pricing_version: 'stable' });
                    showToast('Pricing engine switched to Stable mode.');
                    refreshDealerData(activeDealer.id);
                  }}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: activeDealer.pricing_version !== 'beta' ? 'rgba(246, 178, 58, 0.05)' : 'var(--bg-surface-elevated)', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: activeDealer.pricing_version !== 'beta' ? '1px solid var(--color-orange-primary)' : '1px solid var(--border-dim)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Stable Engine</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tried-and-tested production calculations.</div>
                  </div>
                  <input 
                    type="radio" 
                    name="pricing_version" 
                    value="stable"
                    checked={activeDealer.pricing_version !== 'beta'}
                    readOnly
                    style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--color-orange-primary)' }}
                  />
                </div>

                <div 
                  onClick={async () => {
                    await dataService.updateDealer(activeDealer.id, { pricing_version: 'beta' });
                    showToast('Pricing engine switched to Beta mode.');
                    refreshDealerData(activeDealer.id);
                  }}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: activeDealer.pricing_version === 'beta' ? 'rgba(246, 178, 58, 0.05)' : 'var(--bg-surface-elevated)', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: activeDealer.pricing_version === 'beta' ? '1px solid var(--color-orange-primary)' : '1px solid var(--border-dim)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Beta Engine</div>
                      <span className="badge badge-warning" style={{ fontSize: '9px', padding: '2px 6px', fontWeight: 700 }}>BETA</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Try our newest logic iterations.</div>
                  </div>
                  <input 
                    type="radio" 
                    name="pricing_version" 
                    value="beta"
                    checked={activeDealer.pricing_version === 'beta'}
                    readOnly
                    style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--color-orange-primary)' }}
                  />
                </div>
              </div>
            </div>

            {/* Maximum Reimbursement Configuration Card */}
            <div className="content-panel">
              <div className="panel-header" style={{ borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
                <div className="panel-header-titles">
                  <h2>Maximum Reimbursement Mode</h2>
                  <p>Configure extension behavior when the Max Reimb button is clicked.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div 
                  onClick={async () => {
                    await dataService.updateDealer(activeDealer.id, { max_reimb_mode: 'highest_price' });
                    showToast('Max Reimbursement set to Highest Price mode.');
                    refreshDealerData(activeDealer.id);
                  }}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: activeDealer.max_reimb_mode !== 'match_non_shop' ? 'rgba(246, 178, 58, 0.05)' : 'var(--bg-surface-elevated)', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: activeDealer.max_reimb_mode !== 'match_non_shop' ? '1px solid var(--color-orange-primary)' : '1px solid var(--border-dim)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Highest Price with Max Reimb</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Yields maximum reimbursement with the highest possible sales price.</div>
                  </div>
                  <input 
                    type="radio" 
                    name="max_reimb_mode" 
                    value="highest_price"
                    checked={activeDealer.max_reimb_mode !== 'match_non_shop'}
                    readOnly
                    style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--color-orange-primary)' }}
                  />
                </div>

                <div 
                  onClick={async () => {
                    await dataService.updateDealer(activeDealer.id, { max_reimb_mode: 'match_non_shop' });
                    showToast('Max Reimbursement set to Match Non-Shop OE mode.');
                    refreshDealerData(activeDealer.id);
                  }}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: activeDealer.max_reimb_mode === 'match_non_shop' ? 'rgba(246, 178, 58, 0.05)' : 'var(--bg-surface-elevated)', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: activeDealer.max_reimb_mode === 'match_non_shop' ? '1px solid var(--color-orange-primary)' : '1px solid var(--border-dim)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Max Reimb & Match Non-Shop OE</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Optimizes for maximum reimbursement and matches non-shop OE price.</div>
                  </div>
                  <input 
                    type="radio" 
                    name="max_reimb_mode" 
                    value="match_non_shop"
                    checked={activeDealer.max_reimb_mode === 'match_non_shop'}
                    readOnly
                    style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--color-orange-primary)' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid-2col">
              {/* Recent Quote Activity */}
              <div className="content-panel">
                <div className="panel-header">
                  <div className="panel-header-titles">
                    <h2>Recent Quote Activity</h2>
                    <p>Latest pricing records logged by the algorithm.</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('dealer-results')}>View All</button>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Part Number</th>
                        <th>Customer</th>
                        <th>Original</th>
                        <th>Optimized</th>
                        <th>Type</th>
                        <th>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsList.slice(0, 5).map(l => (
                        <tr key={l.id}>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{l.part_number}</td>
                          <td>{l.customer_name || l.customer_number || 'Default'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>${Number(l.original_price).toFixed(2)}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-green-primary)' }}>${Number(l.optimized_price).toFixed(2)}</td>
                          <td>
                            <span className={`badge ${l.optimization_type === 'maintain_profit' ? 'badge-success' : 'badge-info'}`}>
                              {l.optimization_type === 'maintain_profit' ? 'Maintain Profit' : 'Optimize'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-green-primary)' }}>+{l.margin_achieved}%</td>
                        </tr>
                      ))}
                      {logsList.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No quote logs recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Markup Summary */}
              <div className="content-panel">
                <div className="panel-header">
                  <div className="panel-header-titles">
                    <h2>Customer Markup Summary</h2>
                    <p>Fallback markup configurations.</p>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('dealer-rules')}>Manage Rules</button>
                </div>

                <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-dim)' }}>
                    <span className="badge badge-success" style={{ marginBottom: '8px' }}>Default Settings</span>
                    <div className="margin-item">
                      <span>Master Fallback Markup</span>
                      <span>{masterMarkup}%</span>
                    </div>
                    <div className="margin-item">
                      <span>Bodyshops Quoted</span>
                      <span>{customersList.length}</span>
                    </div>
                    <div className="margin-item">
                      <span>Custom Overrides Defined</span>
                      <span>{customersList.filter(c => c.min_markup !== null).length}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <strong>Engine Details:</strong> When CollisionLink injects quote pricing requests, they default to the **Master Fallback Markup %** unless specific overrides are defined for the manufacturer or customer account number.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: RULES */}
        {/* ============================================== */}
        {activeTab === 'dealer-rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="grid-2col">
              {/* Master default markup */}
              <div className="content-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="panel-header" style={{ borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
                    <div className="panel-header-titles">
                      <h2>Master Fallback Minimum Margin</h2>
                      <p>Global fallback markup if no specific manufacturer or bodyshop overrides are set.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '24px 0' }}>
                    <input 
                      type="number" 
                      value={masterMarkup} 
                      onChange={(e) => setMasterMarkup(Number(e.target.value))}
                      className="margin-input"
                      style={{ width: '120px', fontSize: '24px', textAlign: 'center', fontWeight: 700, padding: '8px' }}
                    />
                    <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-muted)' }}>%</span>
                  </div>
                </div>
                <button className="btn btn-success" onClick={handleSaveDefaultMarkup} style={{ width: '100%' }}>
                  Save Master Fallback
                </button>
              </div>

              {/* Franchise-specific overrides */}
              <div className="content-panel">
                <div className="panel-header" style={{ borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
                  <div className="panel-header-titles">
                    <h2>Franchise Minimum Margins</h2>
                    <p>Markup rules per manufacturer brand. Empty values fall back to the Master Fallback.</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px', maxHeight: '180px', overflowY: 'auto' }}>
                  {activeDealer.franchises?.map((f: string) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{f}</span>
                      <input 
                        type="number" 
                        value={franchiseMarkups[f] !== undefined ? franchiseMarkups[f] : ''} 
                        placeholder={`${masterMarkup}%`}
                        onChange={(e) => handleSaveFranchiseMarkup(f, Number(e.target.value))}
                        className="margin-input"
                        style={{ width: '80px', padding: '6px', textAlign: 'center', fontSize: '12px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Bodyshop Overrides */}
            <div className="content-panel">
              <div className="panel-header">
                <div className="panel-header-titles">
                  <h2>Bodyshop Customer Overrides</h2>
                  <p>Define custom markup rates for specific bodyshop accounts. Overrides default and franchise settings.</p>
                </div>
                <div className="panel-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="Search by name or account #..." 
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    style={{ width: '240px', padding: '8px 12px', fontSize: '13px' }}
                  />
                  <button 
                    onClick={handleDownloadTemplate} 
                    className="btn btn-secondary btn-sm" 
                    title="Download example CSV file with headers"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Template</span>
                  </button>
                  <button 
                    onClick={handleTriggerFileInput} 
                    className="btn btn-primary btn-sm" 
                    title="Import customer overrides list from CSV"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Import</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportCSV} 
                    accept=".csv" 
                    style={{ display: 'none' }} 
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account Code</th>
                      <th>Shop Name</th>
                      <th>Total Quotes</th>
                      <th>Last Quote Date</th>
                      <th>Min Markup Override %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{c.account_number}</td>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.quote_count}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {c.last_quote ? new Date(c.last_quote).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <input 
                            type="number" 
                            defaultValue={c.min_markup !== null ? c.min_markup : ''} 
                            placeholder="Default Fallback"
                            onBlur={(e) => handleSaveCustomerMarkup(c.account_number, e.target.value)}
                            className="margin-input"
                            style={{ width: '120px', padding: '6px 12px', fontSize: '13px', textAlign: 'center' }}
                          />
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No bodyshop customers found matching query.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: USERS & LICENSES (UNIFIED) */}
        {/* ============================================== */}
        {activeTab === 'dealer-users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Panel 1: User Directory */}
            <div className="content-panel">
              <div className="panel-header">
                <div className="panel-header-titles">
                  <h2>User Directory</h2>
                  <p>Add staff accounts, set temp passcodes, and monitor reset states.</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setUserModalOpen(true)}>+ Add User</button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Temporary Password</th>
                      <th>Forced Reset Flag</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'dealer_admin' ? 'badge-info' : 'badge-warning'}`}>
                            {u.role === 'dealer_admin' ? 'Admin' : 'Extension User'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: u.temp_password ? '#f6b23a' : 'var(--text-muted)' }}>
                          {u.temp_password || 'Cleared (Active)'}
                        </td>
                        <td>
                          <span className={`badge ${u.password_reset_required ? 'badge-danger' : 'badge-success'}`}>
                            {u.password_reset_required ? 'Reset Required' : 'OK'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleResetUserPassword(u.id, u.email)}>
                            Reset Passcode
                          </button>
                          {u.email !== user.email && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id, u.email)}>
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel 2: Active Seats & Licenses */}
            <div className="content-panel">
              <div className="panel-header">
                <div className="panel-header-titles">
                  <h2>Active Seats & Licenses</h2>
                  <p>Map license seat keys to authorized users. Unassigned licenses do not allow extension login.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Seats Used: <strong className="text-orange">{countAssignedSeats} / {activeDealer.license_count}</strong>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('dealer-billing')}>Purchase Seats</button>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>License Key (Seat ID)</th>
                      <th>Assigned Staff User</th>
                      <th>License Status</th>
                      <th>Next Invoice Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licensesList.map(l => {
                      const nextBillingDate = new Date();
                      nextBillingDate.setDate(new Date().getDate() + 14); // Mock billing date
                      
                      return (
                        <tr key={l.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{l.id}</td>
                          <td>
                            <select 
                              value={l.user_id || 'unassigned'}
                              onChange={(e) => handleAssignLicense(l.id, e.target.value)}
                              style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-dim)', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px' }}
                            >
                              <option value="unassigned">Unassigned (Vacant Seat)</option>
                              {usersList.map(u => (
                                <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={`badge ${l.user_id ? 'badge-success' : 'badge-warning'}`}>
                              {l.user_id ? 'Active Seat' : 'Unassigned'}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {activeDealer.status === 'trial' ? 'Trial Period' : 'End of Month'}
                          </td>
                          <td>
                            {l.user_id && (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleAssignLicense(l.id, 'unassigned')}>
                                Remove User
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {licensesList.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No seats purchased. Go to billing to add seats.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel 3: Active Device Sessions */}
            <div className="content-panel">
              <div className="panel-header">
                <div className="panel-header-titles">
                  <h2>Active Device Sessions</h2>
                  <p>One active hardware session is permitted per seat license. Terminate sessions below to resolve conflict alerts.</p>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>License ID</th>
                      <th>User Account</th>
                      <th>Device Fingerprint</th>
                      <th>Last Active Sync</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsList.map(s => {
                      const lic = licensesList.find(l => l.id === s.license_id);
                      const usr = usersList.find(u => u.id === lic?.user_id);
                      
                      return (
                        <tr key={s.id}>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{s.license_id}</td>
                          <td style={{ fontWeight: 600 }}>{usr ? usr.email : 'Unassigned License'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{s.device_fingerprint}</td>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {new Date(s.last_seen).toLocaleString()}
                          </td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => handleKickSession(s.license_id, usr?.email || 'Unknown')}>
                              Kick Session
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {sessionsList.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No active chrome extension sessions connected.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: LOGS */}
        {/* ============================================== */}
        {activeTab === 'dealer-results' && (
          <div className="content-panel">
            <div className="panel-header">
              <div className="panel-header-titles">
                <h2>Optimization Execution Logs</h2>
                <p>Audits of all pricing quotes matched through your default fallback and customer-specific rule trees.</p>
              </div>
              <div className="panel-header-actions">
                <input 
                  type="text" 
                  placeholder="Search Part Number..." 
                  value={searchLog}
                  onChange={(e) => { setSearchLog(e.target.value); setLogPage(0); }}
                  style={{ width: '240px', padding: '6px 12px', fontSize: '13px' }}
                />
                <button className="btn btn-secondary btn-sm" onClick={exportLogsToCSV}>Export CSV</button>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Part Number</th>
                    <th>Customer</th>
                    <th>Cost</th>
                    <th>Original OEC</th>
                    <th>Optimized Price</th>
                    <th>Reimbursement</th>
                    <th>Action</th>
                    <th>Margin Achieved</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{l.part_number}</td>
                      <td>{l.customer_name || l.customer_number || 'Default'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>${Number(l.cost).toFixed(2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>${Number(l.original_price).toFixed(2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-green-primary)' }}>
                        ${Number(l.optimized_price).toFixed(2)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-green-primary)' }}>
                        ${Number(l.reimb_amount).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${l.optimization_type === 'maintain_profit' ? 'badge-success' : 'badge-info'}`}>
                          {l.optimization_type === 'maintain_profit' ? 'Maintain Profit' : 'Optimize'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-green-primary)' }}>
                        +{l.margin_achieved}%
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No logs found matching query.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {filteredLogs.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-dim)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Showing {logPage * logsPerPage + 1}-{Math.min((logPage + 1) * logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" disabled={logPage === 0} onClick={() => setLogPage(p => p - 1)}>Previous</button>
                  <button className="btn btn-secondary btn-sm" disabled={(logPage + 1) * logsPerPage >= filteredLogs.length} onClick={() => setLogPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: BILLING */}
        {/* ============================================== */}
        {activeTab === 'dealer-billing' && (
          <div className="grid-2col">
            {/* Odoo subscription management */}
            <div className="content-panel">
              <div className="panel-header">
                <div className="panel-header-titles">
                  <h2>Odoo Subscription billing</h2>
                  <p>Invoices are managed via manual ACH invoicing matching your Odoo CRM profile contracts.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-dim)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Billing Contract Status</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginTop: '4px' }}>Odoo ACH Plan</div>

                  <div className="margin-item" style={{ marginTop: '16px' }}>
                    <span>Monthly Rate Per License Seat</span>
                    <span>${activeDealer.monthly_price_per_seat.toFixed(2)}</span>
                  </div>
                  <div className="margin-item">
                    <span>Purchased Seat Count</span>
                    <span>{activeDealer.license_count} seats</span>
                  </div>
                  <div className="margin-item">
                    <span>Current Recurring Cost</span>
                    <strong className="text-orange">${(activeDealer.license_count * activeDealer.monthly_price_per_seat).toFixed(2)} / month</strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(246, 178, 58, 0.03)', border: '1px solid rgba(246, 178, 58, 0.15)', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-orange-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💡 Dynamic Seat Billing & Proration policy
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    Adjusting your purchased licenses will instantly trigger an automated email notice to accounting support to update your contract records. Changes made mid-cycle are **prorated** based on the remaining days of the current month.
                  </p>
                </div>

                {/* Simulate seats adjustment */}
                <div style={{ border: '1px dashed var(--border-dim)', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Simulate License Seat Adjustments</h4>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => adjustBillingSeats(-1)}>- Remove Seat</button>
                    <button className="btn btn-primary btn-sm" onClick={() => adjustBillingSeats(1)}>+ Add Seat</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice records */}
            <div className="content-panel">
              <div className="panel-header">
                <div className="panel-header-titles">
                  <h2>Invoice Log History</h2>
                  <p>Invoices processed via Odoo.</p>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Invoice Date</th>
                      <th>Billing Seats</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesList.map(i => (
                      <tr key={i.id}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{i.id}</td>
                        <td>{i.date}</td>
                        <td>{i.seat_count} seats</td>
                        <td style={{ fontWeight: 600 }}>${Number(i.amount).toFixed(2)}</td>
                        <td><span className="badge badge-success">{i.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>



      {/* ============================================== */}
      {/* MODAL: ADD USER */}
      {/* ============================================== */}
      {userModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Dealership Staff Member</h3>
              <button className="modal-close" onClick={() => setUserModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="user-email">User Email Address</label>
                  <input 
                    type="email" 
                    id="user-email" 
                    required 
                    placeholder="name@dealership.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Generic email domains (Gmail/Yahoo/Outlook) are blocked.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="user-role">System Access Level</label>
                  <select 
                    id="user-role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                  >
                    <option value="user">Chrome Extension Seat User</option>
                    <option value="dealer_admin">Dealership Admin</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" type="button" onClick={() => setUserModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">Provision User</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
