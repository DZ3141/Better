'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/dataService';

export default function SuperadminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('super-overview');

  // Lists
  const [dealers, setDealers] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [licensesList, setLicensesList] = useState<any[]>([]);
  const [approvalsList, setApprovalsList] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Modals & Forms
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  // Create Dealer Account Modal
  const [dealerModalOpen, setDealerModalOpen] = useState(false);
  const [newDealerName, setNewDealerName] = useState('');
  const [newDealerRate, setNewDealerRate] = useState(149.0);
  const [newDealerSeats, setNewDealerSeats] = useState(5);
  const [newDealerStatus, setNewDealerStatus] = useState<'trial' | 'active'>('trial');
  const [newDealerTrialDays, setNewDealerTrialDays] = useState(14);

  // Extend Trial Modal
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [trialEndDate, setTrialEndDate] = useState('');
  const [hardExpiryDate, setHardExpiryDate] = useState('');

  // Password reset search
  const [searchUserEmail, setSearchUserEmail] = useState('');

  // Settings form
  const [fromEmail, setFromEmail] = useState('notifications@mypartpros.com');
  const [toEmail, setToEmail] = useState('david@mypartpros.com');
  const [extensionUrl, setExtensionUrl] = useState('');

  // Algorithm code editor states
  const [optimizeCode, setOptimizeCode] = useState('');
  const [maintainProfitCode, setMaintainProfitCode] = useState('');
  const [optimizeCodeBeta, setOptimizeCodeBeta] = useState('');
  const [maintainProfitCodeBeta, setMaintainProfitCodeBeta] = useState('');
  const [maxReimbCode, setMaxReimbCode] = useState('');
  const [maxReimbCodeBeta, setMaxReimbCodeBeta] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = sessionStorage.getItem('mpp_active_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }
      try {
        const u = JSON.parse(storedUser);
        if (u.role !== 'superadmin') {
          router.push('/dashboard');
          return;
        }
        setUser(u);
        loadSuperData().finally(() => setIsLoading(false));
      } catch (e) {
        router.push('/login');
      }
    }
  }, [router]);

  const loadSuperData = async () => {
    let dList = await dataService.getDealers();
    
    // Fallback if empty to show mock data
    if (!dList || dList.length === 0) {
      const mockState = typeof window !== 'undefined' ? localStorage.getItem('mpp_dashboard_state') : null;
      if (mockState) {
        try {
          dList = JSON.parse(mockState).dealers;
        } catch(e) {}
      }
    }
    setDealers(dList || []);

    let uList = await dataService.getUsers(null);
    if (!uList || uList.length === 0) {
      const mockState = typeof window !== 'undefined' ? localStorage.getItem('mpp_dashboard_state') : null;
      if (mockState) {
        try {
          uList = JSON.parse(mockState).users;
        } catch(e) {}
      }
    }
    setUsersList(uList || []);

    // Collect all licenses from dealers
    let lList: any[] = [];
    const activeDealers = dList || [];
    for (let d of activeDealers) {
      const dLics = await dataService.getLicenses(d.id);
      lList = [...lList, ...dLics];
    }
    if (lList.length === 0) {
      const mockState = typeof window !== 'undefined' ? localStorage.getItem('mpp_dashboard_state') : null;
      if (mockState) {
        try {
          lList = JSON.parse(mockState).licenses;
        } catch(e) {}
      }
    }
    setLicensesList(lList);

    const appList = await dataService.getPendingApprovals();
    setApprovalsList(appList);

    const invList = await dataService.getInvoices(null);
    setInvoicesList(invList);

    const settings = await dataService.getSuperadminSettings();
    setFromEmail(settings.from_email);
    setToEmail(settings.to_email);
    setExtensionUrl(settings.extension_url);

    // Fetch algorithm settings
    const algo = await dataService.getAlgorithmSettings();
    setOptimizeCode(algo.optimize_code);
    setMaintainProfitCode(algo.maintain_profit_code);
    setOptimizeCodeBeta(algo.optimize_code_beta);
    setMaintainProfitCodeBeta(algo.maintain_profit_code_beta);
    setMaxReimbCode(algo.max_reimb_code);
    setMaxReimbCodeBeta(algo.max_reimb_code_beta);
  };

  const handleSaveAlgorithms = async () => {
    try {
      new Function('listPrice', 'cost', 'reimbursementRate', 'minProfit', `
        const testFn = ${optimizeCode};
      `);
      new Function('listPrice', 'cost', 'reimbursementRate', `
        const testFn = ${maintainProfitCode};
      `);
      new Function('listPrice', 'cost', 'reimbursementRate', 'minProfit', `
        const testFn = ${optimizeCodeBeta};
      `);
      new Function('listPrice', 'cost', 'reimbursementRate', `
        const testFn = ${maintainProfitCodeBeta};
      `);
      new Function('listPrice', 'cost', 'reimbursementRate', 'maxReimbMode', `
        const testFn = ${maxReimbCode};
      `);
      new Function('listPrice', 'cost', 'reimbursementRate', 'maxReimbMode', `
        const testFn = ${maxReimbCodeBeta};
      `);
    } catch (err: any) {
      showToast(`Syntax Error in JavaScript code: ${err.message}`, 'error');
      return;
    }

    const success = await dataService.saveAlgorithmSettings(
      optimizeCode, 
      maintainProfitCode, 
      optimizeCodeBeta, 
      maintainProfitCodeBeta,
      maxReimbCode,
      maxReimbCodeBeta
    );
    if (success) {
      showToast('Pricing algorithms updated successfully!');
      loadSuperData();
    } else {
      showToast('Failed to save algorithm settings.', 'error');
    }
  };

  const showToast = (msg: string, type: string = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMsg('');
    }, 3000);
  };

  const handleSaveSettings = async () => {
    await dataService.saveSuperadminSettings({
      from_email: fromEmail,
      to_email: toEmail,
      extension_url: extensionUrl
    });
    showToast('Superadmin notification settings saved!');
    loadSuperData();
  };

  // Provision new dealer account from scratch
  const handleCreateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealerName) return;

    const newD = await dataService.createDealer(
      newDealerName,
      Number(newDealerRate),
      Number(newDealerSeats),
      newDealerStatus,
      newDealerTrialDays
    );

    // Auto provision administrator user profile
    const defaultAdminEmail = `admin@${newDealerName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const tempPassword = "Welcome#" + Math.floor(1000 + Math.random() * 9000);
    await dataService.createUser(newD.id, defaultAdminEmail, 'dealer_admin', tempPassword);

    // Send Welcome Email
    const welcomeSubject = "Welcome to My Part Pros OEC Price Optimizer - Your Login Credentials";
    const welcomeBody = `Hi,\n\nYour dealer account "${newDealerName}" has been provisioned.\n\nYour administrator login credentials are:\nEmail: ${defaultAdminEmail}\nTemporary Password: ${tempPassword}\n\nOn your first login you will be required to change this password.`;
    await dataService.sendEmail(defaultAdminEmail, welcomeSubject, welcomeBody);

    setDealerModalOpen(false);
    setNewDealerName('');
    showToast(`Account provisioned. Admin passcode email dispatched to ${defaultAdminEmail}`);
    loadSuperData();
  };

  // Extend trial / set hard expiration dates
  const handleOpenExtendTrial = (dealerId: string) => {
    setSelectedDealerId(dealerId);
    const dealer = dealers.find(d => d.id === dealerId);
    if (dealer) {
      if (dealer.trial_ends_at) {
        setTrialEndDate(new Date(dealer.trial_ends_at).toISOString().split('T')[0]);
      } else {
        setTrialEndDate('');
      }
      if (dealer.expires_at) {
        setHardExpiryDate(new Date(dealer.expires_at).toISOString().split('T')[0]);
      } else {
        setHardExpiryDate('');
      }
    }
    setTrialModalOpen(true);
  };

  const handleSaveTrialExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    const dealer = dealers.find(d => d.id === selectedDealerId);
    if (!dealer) return;

    const updates: any = {};
    if (dealer.status === 'trial') {
      updates.trial_ends_at = trialEndDate ? new Date(trialEndDate).toISOString() : null;
    }
    updates.expires_at = hardExpiryDate ? new Date(hardExpiryDate).toISOString() : null;

    await dataService.updateDealer(selectedDealerId, updates);
    setTrialModalOpen(false);
    setTrialEndDate('');
    setHardExpiryDate('');
    showToast('Dealer license updates applied.');
    loadSuperData();
  };

  // Toggle account status
  const handleToggleDealerStatus = async (dealerId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    await dataService.updateDealer(dealerId, { status: nextStatus });
    showToast(`Account status updated to ${nextStatus}.`);
    loadSuperData();
  };

  // Change monthly pricing seats counts
  const handleUpdateDealerSeats = async (dealerId: string, value: string) => {
    const seats = Number(value);
    if (isNaN(seats) || seats < 1) return;
    await dataService.updateDealer(dealerId, { license_count: seats });
    showToast('Seats allocations modified.');
    loadSuperData();
  };

  const handleUpdateDealerRate = async (dealerId: string, value: string) => {
    const rate = Number(value);
    if (isNaN(rate) || rate < 0) return;
    await dataService.updateDealer(dealerId, { monthly_price_per_seat: rate });
    showToast('Pricing rate updated.');
    loadSuperData();
  };

  const handleDeleteDealer = async (dealerId: string, dealerName: string) => {
    const confirmed = window.confirm(`Are you sure you want to completely delete "${dealerName}"? This will permanently delete all associated users, licenses, active sessions, invoices, and pricing optimization logs.`);
    if (!confirmed) return;
    const success = await dataService.deleteDealer(dealerId);
    if (success) {
      showToast(`Dealer "${dealerName}" successfully deleted.`);
      loadSuperData();
    } else {
      showToast(`Failed to delete "${dealerName}".`, 'error');
    }
  };

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    const success = await dataService.markInvoicePaid(invoiceId);
    if (success) {
      showToast('Invoice marked as Paid successfully.');
      loadSuperData();
    } else {
      showToast('Failed to mark invoice as Paid.', 'error');
    }
  };

  // Domain Approvals Queue Controls
  const handleApproveSignup = async (appId: string, email: string) => {
    const tempPassword = "Welcome#" + Math.floor(1000 + Math.random() * 9000);
    await dataService.approvePendingApproval(appId, tempPassword);
    
    // Send welcome email
    const subject = "Welcome to My Part Pros OEC Price Optimizer - Your Login Credentials";
    const body = `Hi,\n\nYour registration request has been approved.\n\nYour login details are:\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nOn your first login you will be prompted to change this password.`;
    await dataService.sendEmail(email, subject, body);

    showToast(`Signup request approved. Welcome email sent to ${email}`);
    loadSuperData();
  };

  const handleRejectSignup = async (appId: string) => {
    await dataService.rejectPendingApproval(appId);
    showToast('Signup request rejected and removed.');
    loadSuperData();
  };

  // Password Reset Generator
  const handleSuperadminPasswordReset = async (userId: string, email: string) => {
    const tempPassword = "Temp#" + Math.floor(1000 + Math.random() * 9000);
    await dataService.updateUser(userId, { temp_password: tempPassword, password_reset_required: true });

    // Send reset email notice
    const subject = "My Part Pros OEC Price Optimizer - Password Reset Credentials";
    const body = `Hi,\n\nYour account password has been reset by administrative support. Your new temporary password is:\n\n${tempPassword}\n\nYou will be required to set a new password on your next login.`;
    await dataService.sendEmail(email, subject, body);

    showToast(`Password reset. Passcode emailed to ${email}`);
    loadSuperData();
  };

  // Math Calculations
  const calculateTotalMRR = dealers.reduce((acc, d) => {
    if (d.status === 'active') {
      return acc + (d.license_count * d.monthly_price_per_seat);
    }
    return acc;
  }, 0);

  const countTotalSeats = licensesList.length;

  const filteredResetUsers = usersList.filter(u => 
    u.email.toLowerCase().includes(searchUserEmail.toLowerCase())
  );

  const handleLogout = () => {
    sessionStorage.removeItem('mpp_active_user');
    router.push('/login');
  };

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
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(246, 178, 58, 0.15)',
          borderTop: '3px solid #f6b23a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ color: '#f6b23a', fontSize: '15px', fontWeight: 600, letterSpacing: '0.05em' }}>Loading Superadmin</div>
        <div style={{ color: '#666', fontSize: '12px' }}>Initializing control panel…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-orange-primary)', letterSpacing: '0.1em', marginTop: '2px' }}>Superadmin</div>
          </div>
        </div>

        <ul className="sidebar-menu">
          <div className="menu-section-label">Superadmin Core</div>
          <li>
            <a className={`menu-item ${activeTab === 'super-overview' ? 'active' : ''}`} onClick={() => setActiveTab('super-overview')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              <span>Global Overview</span>
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'super-accounts' ? 'active' : ''}`} onClick={() => setActiveTab('super-accounts')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <span>Dealer Accounts</span>
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'super-approvals' ? 'active' : ''}`} onClick={() => setActiveTab('super-approvals')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>Domain Approvals</span>
              {approvalsList.length > 0 && (
                <span className="badge badge-warning" style={{ marginLeft: 'auto', padding: '2px 6px', fontSize: '9px', background: 'var(--color-orange-primary)', color: 'black' }}>
                  {approvalsList.length}
                </span>
              )}
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'super-resets' ? 'active' : ''}`} onClick={() => setActiveTab('super-resets')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Password Resets</span>
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'super-invoices' ? 'active' : ''}`} onClick={() => setActiveTab('super-invoices')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              <span>Invoices & Billing</span>
            </a>
          </li>
          <li>
            <a className={`menu-item ${activeTab === 'super-algorithm' ? 'active' : ''}`} onClick={() => setActiveTab('super-algorithm')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              <span>System Algorithm</span>
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
            <div className="profile-avatar">D</div>
            <div className="profile-info">
              <div className="profile-name">david@mypartpros.com</div>
              <div className="profile-role">Super Admin</div>
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
              {activeTab.replace('super-', 'System ')}
            </h1>
            <p>System Controller Panel</p>
          </div>

          <div className="header-actions">
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
              Supabase Status: <span className="badge badge-success">Online</span>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* VIEW: OVERVIEW */}
        {/* ============================================== */}
        {activeTab === 'super-overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="stats-grid">
              <div className="stat-card green-accent">
                <div className="stat-card-label">Monthly Recurring Revenue</div>
                <div className="stat-card-value">${calculateTotalMRR.toFixed(2)}</div>
                <div className="stat-card-subtext">Active billing subscriptions</div>
              </div>
              <div className="stat-card orange-accent">
                <div className="stat-card-label">Dealer Accounts</div>
                <div className="stat-card-value">{dealers.length}</div>
                <div className="stat-card-subtext">Total provisioned organizations</div>
              </div>
              <div className="stat-card green-accent">
                <div className="stat-card-label">Total System Seats</div>
                <div className="stat-card-value">{countTotalSeats}</div>
                <div className="stat-card-subtext">Sum of purchased licenses</div>
              </div>
              <div className="stat-card orange-accent">
                <div className="stat-card-label">Email Approvals Queue</div>
                <div className="stat-card-value">{approvalsList.length}</div>
                <div className="stat-card-subtext">Pending domain registrations</div>
              </div>
            </div>

            <div className="grid-2col">
              {/* Dealers accounts preview */}
              <div className="content-panel">
                <div className="panel-header">
                  <div className="panel-header-titles">
                    <h2>Dealers Accounts Summary</h2>
                    <p>Subscribed dealerships and pricing cards.</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('super-accounts')}>Manage</button>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Dealer Name</th>
                        <th>Seats</th>
                        <th>Rate Card</th>
                        <th>Status</th>
                        <th>MRR Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dealers.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.name}</td>
                          <td>{d.license_count} seats</td>
                          <td>${d.monthly_price_per_seat.toFixed(2)}/seat</td>
                          <td>
                            <span className={`badge ${d.status === 'active' ? 'badge-success' : d.status === 'trial' ? 'badge-info' : 'badge-warning'}`}>
                              {d.status}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            ${d.status === 'active' ? (d.license_count * d.monthly_price_per_seat).toFixed(2) : '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending approvals queue */}
              <div className="content-panel">
                <div className="panel-header">
                  <div className="panel-header-titles">
                    <h2>Pending Signups Approvals</h2>
                    <p>Registrations from generic/free providers flagged for approval.</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('super-approvals')}>View All</button>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Dealer Name</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalsList.map(app => (
                        <tr key={app.id}>
                          <td style={{ fontWeight: 600 }}>{app.email}</td>
                          <td>{app.dealer_name}</td>
                          <td style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-success btn-sm" onClick={() => handleApproveSignup(app.id, app.email)}>Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleRejectSignup(app.id)}>Reject</button>
                          </td>
                        </tr>
                      ))}
                      {approvalsList.length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Approval queue is empty.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* System Sender Config */}
            <div className="content-panel">
              <div className="panel-header" style={{ borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
                <div className="panel-header-titles">
                  <h2>Superadmin System Email Configuration</h2>
                  <p>Define the sender email headers for simulated and live Resend credential delivery.</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>From Email:</label>
                  <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} style={{ width: '240px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>To Email (David):</label>
                  <input type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} style={{ width: '240px', fontSize: '13px' }} />
                </div>
                <button className="btn btn-success btn-sm" onClick={handleSaveSettings}>Save Email Config</button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: ACCOUNTS */}
        {/* ============================================== */}
        {activeTab === 'super-accounts' && (
          <div className="content-panel">
            <div className="panel-header">
              <div className="panel-header-titles">
                <h2>Dealer Accounts Directory</h2>
                <p>Modify Monthly seat rates, adjust license totals, manage account states, and extend trial periods.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setDealerModalOpen(true)}>+ Provision Account</button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dealer Name</th>
                    <th>Odoo Customer ID</th>
                    <th>License Status</th>
                    <th>Seats Allocated</th>
                    <th>Custom Seat Rate Override</th>
                    <th>Trial End Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dealers.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{d.odoo_customer_id}</td>
                      <td>
                        <span className={`badge ${d.status === 'active' ? 'badge-success' : d.status === 'trial' ? 'badge-info' : d.status === 'suspended' ? 'badge-danger' : 'badge-warning'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          defaultValue={d.license_count}
                          onBlur={(e) => handleUpdateDealerSeats(d.id, e.target.value)}
                          style={{ width: '80px', padding: '6px', fontSize: '13px', textAlign: 'center' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          defaultValue={d.monthly_price_per_seat}
                          onBlur={(e) => handleUpdateDealerRate(d.id, e.target.value)}
                          style={{ width: '100px', padding: '6px', fontSize: '13px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {d.trial_ends_at ? new Date(d.trial_ends_at).toLocaleDateString() : 'Active/No Trial'}
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenExtendTrial(d.id)}>
                          Adjust Expiry
                        </button>
                        <button className={`btn btn-sm ${d.status === 'suspended' ? 'btn-success' : 'btn-danger'}`} onClick={() => handleToggleDealerStatus(d.id, d.status)}>
                          {d.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDealer(d.id, d.name)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: APPROVALS */}
        {/* ============================================== */}
        {activeTab === 'super-approvals' && (
          <div className="content-panel">
            <div className="panel-header">
              <div className="panel-header-titles">
                <h2>Pending Signup approvals Queue</h2>
                <p>Verify registration attempts from personal email services (GMail/Outlook) before provisioning contracts.</p>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email Address</th>
                    <th>Requested Dealer Name</th>
                    <th>Phone</th>
                    <th>Location</th>
                    <th>Pickers</th>
                    <th>Drivers</th>
                    <th>Registration Date</th>
                    <th>Action Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalsList.map(app => (
                    <tr key={app.id}>
                      <td style={{ fontWeight: 600 }}>{app.email}</td>
                      <td>{app.dealer_name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{app.phone || '-'}</td>
                      <td>{app.city && app.state ? `${app.city}, ${app.state}` : app.city || app.state || '-'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                        {app.warehouse_pickers !== null && app.warehouse_pickers !== undefined ? app.warehouse_pickers : '-'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                        {app.drivers !== null && app.drivers !== undefined ? app.drivers : '-'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(app.created_at).toLocaleString()}
                      </td>
                      <td style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleApproveSignup(app.id, app.email)}>Approve & Create Account</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRejectSignup(app.id)}>Reject & Delete</button>
                      </td>
                    </tr>
                  ))}
                  {approvalsList.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No signups are currently pending approval.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: RESETS */}
        {/* ============================================== */}
        {activeTab === 'super-resets' && (
          <div className="content-panel">
            <div className="panel-header">
              <div className="panel-header-titles">
                <h2>User Password Passcode Resets</h2>
                <p>Generate fresh temporary passcodes for any user or administrator in the system. Dispatches email credentials instantly.</p>
              </div>
              <div className="panel-header-actions">
                <input 
                  type="text" 
                  placeholder="Search user email..." 
                  value={searchUserEmail}
                  onChange={(e) => setSearchUserEmail(e.target.value)}
                  style={{ width: '280px', padding: '6px 12px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email Address</th>
                    <th>Access Level</th>
                    <th>Dealer Account</th>
                    <th>Reset Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResetUsers.map(u => {
                    const d = dealers.find(x => x.id === u.dealer_account_id);
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'superadmin' ? 'badge-danger' : u.role === 'dealer_admin' ? 'badge-info' : 'badge-warning'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>{d ? d.name : 'System/Superadmin'}</td>
                        <td>
                          <span className={`badge ${u.password_reset_required ? 'badge-danger' : 'badge-success'}`}>
                            {u.password_reset_required ? 'Reset Required' : 'Active'}
                          </span>
                        </td>
                        <td>
                          {u.role !== 'superadmin' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleSuperadminPasswordReset(u.id, u.email)}>
                              🔄 Force Reset & Email
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredResetUsers.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users match search query.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: INVOICES */}
        {/* ============================================== */}
        {activeTab === 'super-invoices' && (
          <div className="content-panel">
            <div className="panel-header">
              <div className="panel-header-titles">
                <h2>Dealer Subscription Invoices</h2>
                <p>Monitor status and manually mark Odoo invoices as Paid.</p>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Dealer Name</th>
                    <th>Billing Date</th>
                    <th>Seats Billing</th>
                    <th>Amount Due</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesList.map(inv => {
                    const dl = dealers.find(d => d.id === inv.dealer_account_id);
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.id}</td>
                        <td style={{ fontWeight: 600 }}>{dl ? dl.name : 'Unknown Dealer'}</td>
                        <td>{inv.date}</td>
                        <td>{inv.seat_count} seats</td>
                        <td style={{ fontWeight: 600 }}>${Number(inv.amount).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          {inv.status !== 'Paid' ? (
                            <button className="btn btn-success btn-sm" onClick={() => handleMarkInvoicePaid(inv.id)}>
                              ✓ Mark Paid
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Paid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {invoicesList.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* VIEW: ALGORITHM */}
        {/* ============================================== */}
        {activeTab === 'super-algorithm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="content-panel">
              <div className="panel-header" style={{ borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
                <div className="panel-header-titles">
                  <h2>Pricing Algorithm Control Center</h2>
                  <p>Paste and update the JavaScript function logic executed server-side. Deals toggled to "Beta" run the Beta versions.</p>
                </div>
                <button className="btn btn-primary" onClick={handleSaveAlgorithms}>
                  Save Algorithms
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                
                {/* Column 1: Stable Engines */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', borderBottom: '1px solid var(--border-dim)', paddingBottom: '8px' }}>Stable Engines (Standard)</h3>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-orange-primary)', marginBottom: '8px', display: 'block' }}>
                      1. Stable Optimize Code
                    </label>
                    <textarea
                      rows={12}
                      value={optimizeCode}
                      onChange={(e) => setOptimizeCode(e.target.value)}
                      style={{
                        width: '100%',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-dim)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        lineHeight: '1.5'
                      }}
                      placeholder="function optimize(...) { ... }"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-orange-primary)', marginBottom: '8px', display: 'block' }}>
                      2. Stable Maintain Profit Code
                    </label>
                    <textarea
                      rows={12}
                      value={maintainProfitCode}
                      onChange={(e) => setMaintainProfitCode(e.target.value)}
                      style={{
                        width: '100%',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-dim)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        lineHeight: '1.5'
                      }}
                      placeholder="function maintainProfit(...) { ... }"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-orange-primary)', marginBottom: '8px', display: 'block' }}>
                      3. Stable Max Reimbursement Code
                    </label>
                    <textarea
                      rows={12}
                      value={maxReimbCode}
                      onChange={(e) => setMaxReimbCode(e.target.value)}
                      style={{
                        width: '100%',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-dim)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        lineHeight: '1.5'
                      }}
                      placeholder="function maxReimbursement(...) { ... }"
                    />
                  </div>
                </div>

                {/* Column 2: Beta Engines */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-orange-primary)', borderBottom: '1px solid var(--border-dim)', paddingBottom: '8px' }}>Beta Engines (Experimental)</h3>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-orange-primary)', marginBottom: '8px', display: 'block' }}>
                      4. Beta Optimize Code
                    </label>
                    <textarea
                      rows={12}
                      value={optimizeCodeBeta}
                      onChange={(e) => setOptimizeCodeBeta(e.target.value)}
                      style={{
                        width: '100%',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-dim)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        lineHeight: '1.5'
                      }}
                      placeholder="function optimize(...) { ... }"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-orange-primary)', marginBottom: '8px', display: 'block' }}>
                      5. Beta Maintain Profit Code
                    </label>
                    <textarea
                      rows={12}
                      value={maintainProfitCodeBeta}
                      onChange={(e) => setMaintainProfitCodeBeta(e.target.value)}
                      style={{
                        width: '100%',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-dim)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        lineHeight: '1.5'
                      }}
                      placeholder="function maintainProfit(...) { ... }"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-orange-primary)', marginBottom: '8px', display: 'block' }}>
                      6. Beta Max Reimbursement Code
                    </label>
                    <textarea
                      rows={12}
                      value={maxReimbCodeBeta}
                      onChange={(e) => setMaxReimbCodeBeta(e.target.value)}
                      style={{
                        width: '100%',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-dim)',
                        color: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        lineHeight: '1.5'
                      }}
                      placeholder="function maxReimbursement(...) { ... }"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>



      {/* ============================================== */}
      {/* MODAL: PROVISION DEALER */}
      {/* ============================================== */}
      {dealerModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Provision Dealer Contract Account</h3>
              <button className="modal-close" onClick={() => setDealerModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateDealer}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="dealer-name">Dealer Account Name</label>
                  <input 
                    type="text" 
                    id="dealer-name" 
                    required 
                    placeholder="Hendrick Honda Charlotte"
                    value={newDealerName}
                    onChange={(e) => setNewDealerName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dealer-seats">Purchased Seat Licenses</label>
                    <input 
                      type="number" 
                      id="dealer-seats" 
                      required 
                      min="1"
                      value={newDealerSeats}
                      onChange={(e) => setNewDealerSeats(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dealer-rate">Monthly Price Per Seat</label>
                    <input 
                      type="number" 
                      id="dealer-rate" 
                      required 
                      min="0"
                      step="0.01"
                      value={newDealerRate}
                      onChange={(e) => setNewDealerRate(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dealer-status">Account Stage</label>
                    <select 
                      id="dealer-status"
                      value={newDealerStatus}
                      onChange={(e) => setNewDealerStatus(e.target.value as any)}
                    >
                      <option value="trial">Trial Period</option>
                      <option value="active">Active Subscription</option>
                    </select>
                  </div>
                  {newDealerStatus === 'trial' && (
                    <div className="form-group">
                      <label htmlFor="dealer-trial-days">Trial Length (Days)</label>
                      <input 
                        type="number" 
                        id="dealer-trial-days" 
                        required 
                        min="1"
                        value={newDealerTrialDays}
                        onChange={(e) => setNewDealerTrialDays(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" type="button" onClick={() => setDealerModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">Deploy Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* MODAL: EXPIRE / ADJUST EXPIRE */}
      {/* ============================================== */}
      {trialModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Adjust License Expiration Parameters</h3>
              <button className="modal-close" onClick={() => setTrialModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveTrialExtension}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="trial-end-date">Trial Expiration Date</label>
                  <input 
                    type="date" 
                    id="trial-end-date" 
                    value={trialEndDate}
                    onChange={(e) => setTrialEndDate(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Only applies if dealer is in a trial status stage. Leave blank to clear.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="hard-expiry">Set Hard Expiration Override</label>
                  <input 
                    type="date" 
                    id="hard-expiry" 
                    value={hardExpiryDate}
                    onChange={(e) => setHardExpiryDate(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hard date at which account access is fully blocked. Leaves blank to clear.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" type="button" onClick={() => setTrialModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">Apply Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
