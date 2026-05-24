'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/dataService';

export default function LoginPage() {
  const router = useRouter();
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
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0b0b0a',
      backgroundImage: 'radial-gradient(circle at center, #1a1a19 0%, #0b0b0a 100%)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#121211',
        border: '1px solid #262624',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 50px rgba(246, 178, 58, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '28px'
      }}>
        {/* Logo Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <img 
            src="/extension/my-part-pros-lg.svg" 
            alt="My Part Pros Logo" 
            style={{ height: '48px', width: 'auto' }}
            onError={(e) => {
              // Fallback if public asset is not loaded yet
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 800,
            fontSize: '24px',
            color: '#ffffff',
            textAlign: 'center',
            letterSpacing: '-0.02em',
            marginTop: '8px'
          }}>
            {mustReset ? 'Reset Your Password' : 'OEC Price Optimizer'}
          </h2>
          <p style={{
            fontSize: '13px',
            color: '#9ca3af',
            textAlign: 'center'
          }}>
            {mustReset 
              ? 'You are logging in with a temporary passcode. Please set a new password.'
              : 'Sign in to access your pricing control panel.'
            }
          </p>
        </div>

        {/* Login Form */}
        {!mustReset ? (
          <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              <label htmlFor="email" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Email Address</label>
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
              <label htmlFor="password" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Password</label>
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

            <div style={{
              fontSize: '11px',
              color: '#9ca3af',
              textAlign: 'center',
              borderTop: '1px solid #262624',
              paddingTop: '16px',
              marginTop: '8px'
            }}>
              Need an account or help? Contact support@mypartpros.com
            </div>
          </form>
        ) : (
          /* Password Reset Form */
          <form onSubmit={handlePasswordReset} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                Password updated successfully! Logging you in...
              </div>
            )}
            
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="newPassword" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>New Password</label>
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
              <label htmlFor="confirmPassword" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Confirm New Password</label>
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
        )}
      </div>
    </div>
  );
}
