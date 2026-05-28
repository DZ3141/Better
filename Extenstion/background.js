// Background service worker for heartbeat checks and state synchronization
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.local.set({
    apiBaseUrl: 'https://better-r4mnqg7i7-davidmpp.vercel.app'
  });
  
  // Set up 5-minute heartbeat checks
  chrome.alarms.create('heartbeat', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'heartbeat') {
    const data = await chrome.storage.local.get(['licenseKey', 'deviceFingerprint', 'apiBaseUrl']);
    if (!data.licenseKey) return;

    const apiBaseUrl = data.apiBaseUrl || 'https://better-r4mnqg7i7-davidmpp.vercel.app';
    try {
      const res = await fetch(`${apiBaseUrl}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: data.licenseKey,
          deviceFingerprint: data.deviceFingerprint
        })
      });
      const result = await res.json();
      if (result.error === 'UNAUTHORIZED' || result.error === 'SESSION_CONFLICT') {
        // Clear active session if kicked
        await chrome.storage.local.remove(['licenseKey', 'userEmail', 'dealerName', 'sessionActive']);
      }
    } catch (err) {
      console.error('Heartbeat check failed:', err);
    }
  }
});
