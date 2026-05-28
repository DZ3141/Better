// MPP Price Optimizer Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const banner = document.getElementById('banner');
  const loginView = document.getElementById('login-view');
  const resetView = document.getElementById('reset-view');
  const sessionView = document.getElementById('session-view');

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-btn');

  const currentPasscode = document.getElementById('reset-current');
  const newPassword = document.getElementById('reset-new');
  const confirmPassword = document.getElementById('reset-confirm');
  const resetBtn = document.getElementById('reset-btn');
  const resetBackBtn = document.getElementById('reset-back-btn');

  const sessDealer = document.getElementById('sess-dealer');
  const sessUser = document.getElementById('sess-user');
  const sessLicense = document.getElementById('sess-license');
  const logoutBtn = document.getElementById('logout-btn');

  // Temp storage during reset process
  let tempResetEmail = '';

  // 1. Initialize API Base URL and Device Fingerprint
  const storage = await chrome.storage.local.get(['apiBaseUrl', 'deviceFingerprint', 'licenseKey', 'userEmail', 'dealerName']);
  const apiBaseUrl = storage.apiBaseUrl || 'https://better-r4mnqg7i7-davidmpp.vercel.app';
  let deviceFingerprint = storage.deviceFingerprint;

  if (!deviceFingerprint) {
    deviceFingerprint = generateFingerprint();
    await chrome.storage.local.set({ deviceFingerprint });
  }

  // Helper to safely parse JSON response and provide clear error messages for HTML/text
  async function parseResponseJson(res) {
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      if (text.includes('The page could not be found') || res.status === 404) {
        throw new Error(`Endpoint not found (404) at ${res.url}. Check API connection.`);
      }
      throw new Error(`Invalid response format (HTTP ${res.status}). Server returned HTML instead of JSON.`);
    }
    try {
      return await res.json();
    } catch (e) {
      throw new Error(`Failed to parse JSON response: ${e.message}`);
    }
  }

  // 2. Check existing session
  if (storage.licenseKey) {
    showLoading(loginBtn, true);
    try {
      const active = await validateSession(storage.licenseKey, deviceFingerprint);
      if (active) {
        showView('session');
      } else {
        // Clear expired session info
        await chrome.storage.local.remove(['licenseKey', 'userEmail', 'dealerName']);
        showView('login');
        showBanner('Session expired. Please log in again.', 'error');
      }
    } catch (err) {
      // Network/offline error, fallback to showing session view offline or login
      showView('session');
      showBanner('Running in offline/cached mode.', 'success');
    } finally {
      showLoading(loginBtn, false);
    }
  } else {
    showView('login');
  }

  // 3. Login Event handler
  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showBanner('Please fill in all fields.', 'error');
      return;
    }

    clearBanner();
    showLoading(loginBtn, true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await parseResponseJson(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed. Please verify credentials.');
      }

      if (data.user && data.user.password_reset_required) {
        // Go to reset view
        tempResetEmail = email;
        currentPasscode.value = password; // pre-fill for ease of use
        showBanner('Password reset required by administrator.', 'success');
        showView('reset');
        return;
      }

      // Save credentials & validate session
      await chrome.storage.local.set({
        licenseKey: data.licenseKey,
        userEmail: data.user.email,
        dealerName: data.dealerAccount ? data.dealerAccount.name : 'Independent Dealer'
      });

      const validated = await validateSession(data.licenseKey, deviceFingerprint);
      if (validated) {
        showView('session');
      } else {
        throw new Error('Could not establish device session. Key may be in use.');
      }

    } catch (err) {
      console.error(err);
      showBanner(err.message, 'error');
      await chrome.storage.local.remove(['licenseKey', 'userEmail', 'dealerName']);
    } finally {
      showLoading(loginBtn, false);
    }
  });

  // 4. Password Reset handler
  resetBtn.addEventListener('click', async () => {
    const current = currentPasscode.value;
    const newPass = newPassword.value;
    const confirmPass = confirmPassword.value;

    if (!current || !newPass || !confirmPass) {
      showBanner('Please fill in all password fields.', 'error');
      return;
    }

    if (newPass.length < 6) {
      showBanner('New password must be at least 6 characters.', 'error');
      return;
    }

    if (newPass !== confirmPass) {
      showBanner('New passwords do not match.', 'error');
      return;
    }

    clearBanner();
    showLoading(resetBtn, true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tempResetEmail,
          password: current,
          newPassword: newPass
        })
      });

      const data = await parseResponseJson(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update passcode.');
      }

      showView('login');
      passwordInput.value = ''; // clear password input
      showBanner('Password updated! Please log in with your new password.', 'success');

    } catch (err) {
      console.error(err);
      showBanner(err.message, 'error');
    } finally {
      showLoading(resetBtn, false);
    }
  });

  resetBackBtn.addEventListener('click', () => {
    clearBanner();
    showView('login');
  });

  // 5. Logout handler
  logoutBtn.addEventListener('click', async () => {
    clearBanner();
    await chrome.storage.local.remove(['licenseKey', 'userEmail', 'dealerName']);
    emailInput.value = '';
    passwordInput.value = '';
    showView('login');
    showBanner('Logged out successfully.', 'success');
  });

  // Helper functions
  function showView(viewName) {
    loginView.classList.remove('active');
    resetView.classList.remove('active');
    sessionView.classList.remove('active');

    if (viewName === 'login') {
      loginView.classList.add('active');
    } else if (viewName === 'reset') {
      resetView.classList.add('active');
    } else if (viewName === 'session') {
      chrome.storage.local.get(['userEmail', 'dealerName', 'licenseKey'], (data) => {
        sessUser.innerText = data.userEmail || '-';
        sessDealer.innerText = data.dealerName || '-';
        sessLicense.innerText = data.licenseKey || '-';
      });
      sessionView.classList.add('active');
    }
  }

  function showBanner(msg, type) {
    banner.innerText = msg;
    banner.className = 'message-banner ' + type;
  }

  function clearBanner() {
    banner.innerText = '';
    banner.className = 'message-banner';
  }

  function showLoading(btn, isLoading) {
    const span = btn.querySelector('span');
    if (isLoading) {
      btn.disabled = true;
      if (span) span.style.display = 'none';
      let spinner = btn.querySelector('.spinner');
      if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'spinner';
        btn.appendChild(spinner);
      }
    } else {
      btn.disabled = false;
      if (span) span.style.display = 'inline';
      const spinner = btn.querySelector('.spinner');
      if (spinner) spinner.remove();
    }
  }

  async function validateSession(licenseKey, fingerprint) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/validate-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, deviceFingerprint: fingerprint })
      });
      if (!res.ok) return false;
      const data = await parseResponseJson(res);
      return data.success;
    } catch (e) {
      console.error('Validation error:', e);
      throw e;
    }
  }

  function generateFingerprint() {
    const parts = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      navigator.deviceMemory || 'unknown'
    ];
    const raw = parts.join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return 'fp-' + Math.abs(hash).toString(16) + '-' + Math.floor(1000 + Math.random() * 9000);
  }
});
