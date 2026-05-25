'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/dataService';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  // Auth & Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forced Reset States
  const [mustReset, setMustReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Registration States
  const [isRegistering, setIsRegistering] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regDealerName, setRegDealerName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');

  // Follow-up questionnaire step (shown after initial registration submit)
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpPickers, setFollowUpPickers] = useState('');
  const [followUpDrivers, setFollowUpDrivers] = useState('');
  const [followUpSubmitted, setFollowUpSubmitted] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState('');

  useEffect(() => {
    // Check if already logged in
    if (typeof window !== 'undefined') {
      const activeUser = sessionStorage.getItem('mpp_active_user');
      if (activeUser) {
        try {
          const user = JSON.parse(activeUser);
          if (user.role === 'superadmin') {
            router.push('/superadmin');
          } else {
            router.push('/dashboard');
          }
        } catch (e) {
          sessionStorage.removeItem('mpp_active_user');
        }
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await dataService.login(email, password);
      if (res.success && res.user) {
        if (res.user.password_reset_required) {
          setMustReset(true);
        } else {
          sessionStorage.setItem('mpp_active_user', JSON.stringify(res.user));
          if (res.user.role === 'superadmin') {
            router.push('/superadmin');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        setError(res.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess(false);

    if (!regEmail || !regDealerName || !regPhone || !regCity || !regState) {
      setRegError('Please fill in all fields.');
      return;
    }

    const BLOCKED_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'protonmail.com', 'oeconnection.com'];
    const domain = regEmail.split('@')[1]?.toLowerCase();
    if (BLOCKED_DOMAINS.includes(domain)) {
      setRegError('Error: Generic or personal email domains (Gmail/Outlook/Yahoo) are not allowed.');
      return;
    }

    setLoading(true);
    try {
      const approvalId = await dataService.createPendingApproval(regEmail, regDealerName, 'dealer_admin', {
        phone: regPhone,
        city: regCity,
        state: regState
      });
      if (approvalId) {
        setPendingApprovalId(approvalId);
        setShowFollowUp(true);
      } else {
        setRegError('Registration request failed. Please try again.');
      }
    } catch (err: any) {
      setRegError(err?.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!followUpPickers || !followUpDrivers) {
      setRegError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const success = await dataService.updatePendingApprovalQuestions(
        pendingApprovalId,
        Number(followUpPickers),
        Number(followUpDrivers)
      );
      if (success) {
        setRegSuccess(true);
        setRegEmail('');
        setRegDealerName('');
        setRegPhone('');
        setRegCity('');
        setRegState('');
        setFollowUpPickers('');
        setFollowUpDrivers('');
        setShowFollowUp(false);
      } else {
        setRegError('Failed to save questionnaire. Please try again.');
      }
    } catch (err: any) {
      setRegError(err?.message || 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const success = await dataService.updatePassword(email, newPassword);
      if (success) {
        setResetSuccess(true);
        // Automatically log in
        const res = await dataService.login(email, newPassword);
        if (res.success && res.user) {
          sessionStorage.setItem('mpp_active_user', JSON.stringify(res.user));
          setTimeout(() => {
            if (res.user.role === 'superadmin') {
              router.push('/superadmin');
            } else {
              router.push('/dashboard');
            }
          }, 1500);
        }
      } else {
        setResetError('Failed to update password. Please try again.');
      }
    } catch (err) {
      setResetError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#0b0b0a',
      color: '#ffffff',
      fontFamily: 'Outfit, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden'
    }}>
      <style>{`
        .hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 60px;
          align-items: center;
          padding: 80px 8%;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }
        .marketing-bullets {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin: 32px 0;
        }
        .bullet-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 15px;
          color: #9ca3af;
        }
        .bullet-icon {
          color: #f6b23a;
          font-weight: 900;
          font-size: 18px;
          line-height: 1;
        }
        .auth-card {
          width: 100%;
          background-color: #121211;
          border: 1px solid #262624;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 50px rgba(246, 178, 58, 0.04);
        }
        .auth-tabs {
          display: flex;
          border-bottom: 1px solid #262624;
          margin-bottom: 28px;
        }
        .auth-tab {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .auth-tab.active {
          color: #f6b23a;
          border-bottom: 2px solid #f6b23a;
        }
        @media (max-width: 992px) {
          .hero-grid {
            grid-template-columns: 1fr;
            padding: 40px 6%;
            gap: 40px;
          }
        }
      `}</style>

      {/* Header / Navbar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 8%',
        borderBottom: '1px solid #262624',
        backgroundColor: 'rgba(18, 18, 17, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/extension/my-part-pros-lg.svg" alt="My Part Pros Logo" style={{ height: '36px', width: 'auto' }} />
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#f6b23a', letterSpacing: '0.1em', marginTop: '2px' }}>
            Price Optimizer
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#features" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>Features</a>
          <a href="#how-it-works" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>How it Works</a>
        </nav>
      </header>

      {/* Hero Split Section */}
      <section style={{
        backgroundImage: 'radial-gradient(circle at top, #1a1a19 0%, #0b0b0a 100%)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minHeight: 'calc(100vh - 86px)'
      }}>
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          backgroundColor: 'rgba(246, 178, 58, 0.02)',
          filter: 'blur(100px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div className="hero-grid">
          {/* Left Side: Product marketing */}
          <div>
            <div style={{
              display: 'inline-block',
              backgroundColor: 'rgba(246, 178, 58, 0.1)',
              border: '1px solid rgba(246, 178, 58, 0.2)',
              color: '#f6b23a',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '24px'
            }}>
              ⚡ Better OEC by My Part Pros
            </div>

            <h1 style={{
              fontSize: '48px',
              fontWeight: 900,
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
              marginBottom: '20px',
              fontFamily: 'Outfit, sans-serif'
            }}>
              Improve Dealer Shop Pricing & <br />
              <span style={{ color: '#f6b23a' }}>Maximize OEM Reimbursements</span>
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#9ca3af',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              Win more conquest bids, accelerate CollisionLink order workflows, and automatically protect your dealership profit margins directly on OEConnection.
            </p>

            <div className="marketing-bullets">
              <div className="bullet-item">
                <span className="bullet-icon">✓</span>
                <div>
                  <strong>Automate Win-Rate Calculations:</strong> The server-side pricing algorithm applies binary search mechanisms to discover the lowest acceptable sales price for matching conquest bids.
                </div>
              </div>
              <div className="bullet-item">
                <span className="bullet-icon">✓</span>
                <div>
                  <strong>Protect Key Dealer Margins:</strong> Enforce master floor guidelines or custom markups based on the collision shop account and part brand franchise.
                </div>
              </div>
              <div className="bullet-item">
                <span className="bullet-icon">✓</span>
                <div>
                  <strong>Integrated Notification Loop:</strong> Dispatch license resets, user welcome credentials, and seat changes directly through a dedicated transactional backend email framework.
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Embedded login / register panel */}
          <div>
            <div className="auth-card">
              {/* Logo & Intro */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 800,
                  fontSize: '22px',
                  color: '#ffffff',
                  letterSpacing: '-0.01em'
                }}>
                  {mustReset 
                    ? 'Update Credentials' 
                    : isRegistering 
                      ? 'Register Account' 
                      : 'Console Account Login'}
                </h2>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '6px' }}>
                  {mustReset 
                    ? 'Set a permanent passcode for your wholesaling user session.'
                    : isRegistering
                      ? 'Provision a new dealership account with a 14-day free trial.'
                      : 'Access custom markups, seat provisioning, and price logging.'}
                </p>
              </div>

              {!mustReset && (
                <div className="auth-tabs">
                  <button 
                    className={`auth-tab ${!isRegistering ? 'active' : ''}`}
                    onClick={() => { setIsRegistering(false); setError(''); setRegError(''); }}
                  >
                    Sign In
                  </button>
                  <button 
                    className={`auth-tab ${isRegistering ? 'active' : ''}`}
                    onClick={() => { setIsRegistering(true); setError(''); setRegError(''); }}
                  >
                    Register Dealer
                  </button>
                </div>
              )}

              {/* Login / Register / Reset Forms */}
              {mustReset ? (
                /* PASSWORD RESET FORM */
                <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {resetError && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}>
                      {resetError}
                    </div>
                  )}

                  {resetSuccess && (
                    <div style={{
                      backgroundColor: 'rgba(246, 178, 58, 0.1)',
                      border: '1px solid rgba(246, 178, 58, 0.2)',
                      color: '#f6b23a',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}>
                      Password updated successfully! Redirecting...
                    </div>
                  )}
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="newPassword" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>New Password</label>
                    <input 
                      type="password" 
                      id="newPassword" 
                      required 
                      disabled={resetSuccess}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="confirmPassword" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Confirm New Password</label>
                    <input 
                      type="password" 
                      id="confirmPassword" 
                      required 
                      disabled={resetSuccess}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={loading || resetSuccess}
                    style={{ width: '100%', padding: '12px', marginTop: '8px' }}
                  >
                    {loading ? 'Saving...' : 'Update Password'}
                  </button>
                </form>
              ) : showFollowUp ? (
                /* FOLLOW-UP QUESTIONNAIRE FORM */
                <form onSubmit={handleFollowUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {regError && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}>
                      {regError}
                    </div>
                  )}

                  <div style={{
                    backgroundColor: 'rgba(246, 178, 58, 0.05)',
                    border: '1px solid rgba(246, 178, 58, 0.15)',
                    color: '#f6b23a',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    marginBottom: '8px'
                  }}>
                    <strong>Step 2: Tell us more about your team</strong><br />
                    Please help us customize your trial by answering a few quick questions.
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="pickers" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Warehouse Pickers Count</label>
                    <input 
                      type="number" 
                      id="pickers" 
                      required 
                      min="0"
                      value={followUpPickers}
                      onChange={(e) => setFollowUpPickers(e.target.value)}
                      placeholder="e.g. 5"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="drivers" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Drivers Count</label>
                    <input 
                      type="number" 
                      id="drivers" 
                      required 
                      min="0"
                      value={followUpDrivers}
                      onChange={(e) => setFollowUpDrivers(e.target.value)}
                      placeholder="e.g. 3"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={loading}
                    style={{ width: '100%', padding: '12px', marginTop: '8px' }}
                  >
                    {loading ? 'Submitting...' : 'Complete Trial Request'}
                  </button>
                </form>
              ) : isRegistering ? (
                /* REGISTRATION FORM */
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {regError && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}>
                      {regError}
                    </div>
                  )}

                  {regSuccess && (
                    <div style={{
                      backgroundColor: 'rgba(246, 178, 58, 0.1)',
                      border: '1px solid rgba(246, 178, 58, 0.2)',
                      color: '#f6b23a',
                      padding: '16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textAlign: 'center',
                      lineHeight: '1.4'
                    }}>
                      <strong>Trial request submitted!</strong><br />
                      Our support staff will review your corporate email and approve credentials shortly.
                    </div>
                  )}

                  {!regSuccess && (
                    <>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="reg-email" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Business Email</label>
                        <input 
                          type="email" 
                          id="reg-email" 
                          required 
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="you@dealership.com"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="reg-dealer" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Dealership Name</label>
                        <input 
                          type="text" 
                          id="reg-dealer" 
                          required 
                          value={regDealerName}
                          onChange={(e) => setRegDealerName(e.target.value)}
                          placeholder="123 Chevrolet"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="reg-phone" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Phone Number</label>
                        <input 
                          type="tel" 
                          id="reg-phone" 
                          required 
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="e.g. (555) 019-2834"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', margin: 0 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label htmlFor="reg-city" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>City</label>
                          <input 
                            type="text" 
                            id="reg-city" 
                            required 
                            value={regCity}
                            onChange={(e) => setRegCity(e.target.value)}
                            placeholder="e.g. Charlotte"
                            style={{ width: '100%' }}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label htmlFor="reg-state" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>State</label>
                          <input 
                            type="text" 
                            id="reg-state" 
                            required 
                            maxLength={2}
                            value={regState}
                            onChange={(e) => setRegState(e.target.value.toUpperCase())}
                            placeholder="NC"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={loading}
                        style={{ width: '100%', padding: '12px', marginTop: '8px' }}
                      >
                        {loading ? 'Submitting...' : 'Request Free Trial'}
                      </button>
                    </>
                  )}
                </form>
              ) : (
                /* SIGN IN FORM */
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {error && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textAlign: 'center'
                    }}>
                      {error}
                    </div>
                  )}
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="email" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Email Address</label>
                    <input 
                      type="email" 
                      id="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@dealership.com"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="password" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Password</label>
                    <input 
                      type="password" 
                      id="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={loading}
                    style={{ width: '100%', padding: '12px', marginTop: '8px' }}
                  >
                    {loading ? 'Logging in...' : 'Sign In'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '80px 8%',
        backgroundColor: '#121211',
        borderTop: '1px solid #262624',
        borderBottom: '1px solid #262624'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Built Specifically for Automotive Wholesalers
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>
            Automate conquest rules and pricing analytics to dominate your local parts market.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Feature 1 */}
          <div style={{
            backgroundColor: '#161615',
            border: '1px solid #262624',
            padding: '32px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ fontSize: '28px' }}>🎯</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f6b23a' }}>Improve Shop Pricing</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
              Offer parts to collision shops at the optimal price point. Save settings globally or set overrides per brand and account number.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{
            backgroundColor: '#161615',
            border: '1px solid #262624',
            padding: '32px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ fontSize: '28px' }}>💰</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f6b23a' }}>Maximize Reimbursements</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
              The server-side pricing algorithm calculates optimal values based on manufacturer reimbursement rate maps so you secure maximum parts profit.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{
            backgroundColor: '#161615',
            border: '1px solid #262624',
            padding: '32px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ fontSize: '28px' }}>⚡</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f6b23a' }}>Win CollisionLink Orders</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
              Instantly review quotes, calculate proration thresholds, and submit winning conquest prices in seconds through our dedicated Chrome Extension.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" style={{
        padding: '100px 8%',
        backgroundColor: '#0b0b0a'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '60px', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              How Better OEC Accelerates Bids
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '15px' }}>
              Three simple steps to connect and optimize your wholesale operations.
            </p>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '40px',
            flexWrap: 'wrap'
          }}>
            {/* Step 1 */}
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f6b23a' }}>STEP 01</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Define Margin Policies</h4>
              <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
                Configure fallback markup percentages and custom dealer rules in the web console dashboard.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f6b23a' }}>STEP 02</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Get the Chrome Extension</h4>
              <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
                Download our extension, enter your license seat passcode, and click optimize on OEC order details.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f6b23a' }}>STEP 03</div>
              <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Log & Export Results</h4>
              <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5', margin: 0 }}>
                View margin reports, log histories, and export detailed CSV reports to keep your wholesaling strategy optimized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '40px 8%',
        backgroundColor: '#121211',
        borderTop: '1px solid #262624',
        textAlign: 'center',
        fontSize: '13px',
        color: '#9ca3af'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
          <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Terms of Service</a>
        </div>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} My Part Pros. All rights reserved. Better OEC is a registered utility of My Part Pros.</p>
      </footer>
    </div>
  );
}
