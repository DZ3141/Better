'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/dataService';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dealers, setDealers] = useState<any[]>([]);
  const [activeDealer, setActiveDealer] = useState<any>(null);

  // Layout Tab State
  const [activeTab, setActiveTab] = useState('dealer-overview');

  // Modal / Sandbox State
  const [mailSandboxOpen, setMailSandboxOpen] = useState(false);
  const [sentEmails, setSentEmails] = useState<any[]>([]);
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
        loadInitialData(u);
      } catch (e) {
        router.push('/login');
      }
    }
  }, [router]);

  const loadInitialData = async (currentUser: any) => {
    const allDealers = await dataService.getDealers();
    setDealers(allDealers);

    // Set active dealer (Dealer Admins are locked to their own account)
    const targetDealerId = currentUser.dealer_account_id || allDealers[0]?.id;
    const dealer = allDealers.find(d => d.id === targetDealerId);
    setActiveDealer(dealer);

    if (dealer) {
      refreshDealerData(dealer.id);
    }
  };

  const refreshDealerData = async (dealerId: string) => {
    // Users
    const users = await dataService.getUsers(dealerId);
    setUsersList(users);

    // Licenses
    const licenses = await dataService.getLicenses(dealerId);
    setLicensesList(licenses);

    // Sessions
    const sessions = await dataService.getSessions(dealerId);
    setSessionsList(sessions);

    // Customers
    const customers = await dataService.getCustomers(dealerId);
    setCustomersList(customers);

    // Markup Rules
    const markupSettings = await dataService.getMarkupSettings(dealerId);
    setMasterMarkup(markupSettings.master);
    setFranchiseMarkups(markupSettings.franchise || {});

    // Invoices
    const invoices = await dataService.getInvoices(dealerId);
    setInvoicesList(invoices);

    // Logs
    const logs = await dataService.getPriceResults(dealerId);
    setLogsList(logs);

    // Email Sandbox logs
    const emails = await dataService.getSentEmails();
    setSentEmails(emails);
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

    // Send Simulated Welcome email
    const welcomeSubject = "Welcome to My Part Pros OEC Price Optimizer - Your Login Credentials";
    const welcomeBody = `Hi,\n\nYour user profile has been created.\n\nYour login details are:\nEmail: ${newUserEmail}\nTemporary Password: ${tempPassword}\n\nOn your first login you will be prompted to change this password.`;
    await dataService.sendSimulatedEmail('notifications@mypartpros.com', newUserEmail, welcomeSubject, welcomeBody);

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
    await dataService.sendSimulatedEmail('notifications@mypartpros.com', email, subject, body);

    showToast(`Password reset. Passcode emailed to ${email}`);
    refreshDealerData(activeDealer.id);
  };

  // Delete User Action
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!activeDealer) return;
    // Disassociate users from active licenses
    const userLicenses = licensesList.filter(l => l.user_id === userId);
    for (let l of userLicenses) {
      await dataService.assignLicense(l.id, null);
    }
    // Delete session
    const userSession = sessionsList.find(s => {
      const lic = licensesList.find(l => l.id === s.license_id);
      return lic && lic.user_id === userId;
    });
    if (userSession) {
      await dataService.kickSession(userSession.license_id);
    }

    const state = (dataService as any); // Delete from mock
    const fs = state.getLocalStorageState();
    fs.users = fs.users.filter((u: any) => u.id !== userId);
    state.saveLocalStorageState(fs);

    showToast(`User ${email} deactivated.`);
    refreshDealerData(activeDealer.id);
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

    const fromEmail = "notifications@mypartpros.com";
    const toEmail = "david@mypartpros.com";
    const subject = `[Billing Update] Seat Change for ${activeDealer.name}`;
    const body = `Hi David,\n\n${activeDealer.name} has adjusted their active seat allocations in the Optimizer Console.\n\nDetails:\n- Original Seats: ${currentSeats} ($${oldCost.toFixed(2)}/mo)\n- New Seats: ${newSeats} ($${newCost.toFixed(2)}/mo)\n- Monthly Rate Card: $${rate.toFixed(2)}/seat\n- Cycle Adjustment: ${adjustment > 0 ? '+' : '-'}${Math.abs(adjustment)} seats\n- Prorated adjustment for ${daysRemaining} days remaining: $${prorationAmount.toFixed(2)}\n\nPlease update their contract record in Odoo accordingly.`;

    await dataService.sendSimulatedEmail(fromEmail, toEmail, subject, body);
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

  // Helpers
  const filteredCustomers = customersList.filter(c => 
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.account_number.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.franchise.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  const filteredLogs = logsList.filter(l => 
    l.part_number.includes(searchLog) ||
    (l.customer_number && l.customer_number.includes(searchLog))
  );

  const paginatedLogs = filteredLogs.slice(logPage * logsPerPage, (logPage + 1) * logsPerPage);

  const countTotalClicks = logsList.length;
  const countUniqueCustomers = new Set(logsList.map(l => l.customer_number)).size;
  const countAssignedSeats = licensesList.filter(l => l.user_id !== null).length;

  if (!user || !activeDealer) {
    return <div style={{ color: 'white', padding: '40px', fontFamily: 'sans-serif' }}>Loading dashboard session...</div>;
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
        <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '20px' }}>
          <img src="/extension/my-part-pros-lg.svg" alt="My Part Pros" style={{ height: '40px', width: 'auto' }} />
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-orange-primary)', letterSpacing: '0.1em', marginTop: '4px' }}>Price Optimizer</div>
        </div>

        <ul className="sidebar-menu">
          <div className="menu-section-label">Dealer Dashboard</div>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-overview' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-overview')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
              Overview
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-rules' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-rules')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
              Customer Markup
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-seats' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-seats')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Licenses & Seats
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-users' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-users')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Manage Users
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-sessions' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-sessions')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Active Sessions
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-results' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-results')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              Optimization Log
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'dealer-billing' ? 'active' : ''}`} onClick={() => setActiveTab('dealer-billing')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              Odoo & Billing
            </a>
          </li>
          
          <div style={{ marginTop: 'auto', padding: '10px 14px' }}>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%', gap: '8px' }}>
              🚪 Log Out
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

          <div className="header-actions">
            {/* Email Sandbox Drawer Button */}
            <button className="btn btn-secondary btn-sm" onClick={() => setMailSandboxOpen(true)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px', color: 'var(--color-orange-primary)' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Email Sandbox
              {sentEmails.length > 0 && (
                <span className="badge badge-warning" style={{ position: 'absolute', top: '-6px', right: '-6px', fontSize: '8px', padding: '2px 5px', borderRadius: '50%', background: 'var(--color-orange-primary)', color: 'black' }}>
                  {sentEmails.length}
                </span>
              )}
            </button>

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
              <div className="stat-card orange-accent">
                <div className="stat-card-label">Billing Status</div>
                <div className="stat-card-value" style={{ textTransform: 'capitalize' }}>{activeDealer.status}</div>
                <div className="stat-card-subtext">${activeDealer.monthly_price_per_seat} / seat / mo</div>
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
                      style={{ width: '120px', fontSize: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
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
                <div className="panel-header-actions">
                  <input 
                    type="text" 
                    placeholder="Search by name, account #, or brand..." 
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    style={{ width: '280px', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account Code</th>
                      <th>Shop Name</th>
                      <th>Brand</th>
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
                        <td><span className="badge badge-info">{c.franchise}</span></td>
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
                            style={{ width: '120px', padding: '6px 12px', fontSize: '13px', textAlign: 'center' }}
                          />
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No bodyshop customers found matching query.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: SEATS */}
        {/* ============================================== */}
        {activeTab === 'dealer-seats' && (
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
        )}

        {/* ============================================== */}
        {/* VIEW: USERS */}
        {/* ============================================== */}
        {activeTab === 'dealer-users' && (
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
        )}

        {/* ============================================== */}
        {/* VIEW: SESSIONS */}
        {/* ============================================== */}
        {activeTab === 'dealer-sessions' && (
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
      {/* EMAIL SANDBOX DRAWER */}
      {/* ============================================== */}
      <div className={`mail-sandbox-drawer ${mailSandboxOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>Simulated Email Sandbox</h3>
          <button className="drawer-close" onClick={() => setMailSandboxOpen(false)}>×</button>
        </div>
        <div className="drawer-body">
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            This panel captures all outbound system emails (Resend API mocks) generated in real time, such as license changes and admin welcome credentials.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {sentEmails.map((email, idx) => (
              <div key={idx} className="mail-item">
                <div className="mail-header-row">
                  <div><strong>From:</strong> {email.from}</div>
                  <div><strong>To:</strong> {email.to}</div>
                  <div style={{ fontSize: '10px', marginTop: '2px' }}>{new Date(email.date).toLocaleTimeString()}</div>
                </div>
                <div className="mail-subject">{email.subject}</div>
                <div className="mail-content">{email.body}</div>
              </div>
            ))}
            {sentEmails.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0' }}>
                No emails dispatched yet.
              </div>
            )}
          </div>
        </div>
      </div>

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
