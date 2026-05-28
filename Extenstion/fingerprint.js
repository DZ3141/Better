// Stable device fingerprint generator for session validation
(function() {
  async function initFingerprint() {
    const data = await chrome.storage.local.get('deviceFingerprint');
    if (!data.deviceFingerprint) {
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
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      const finalHash = 'fp-' + Math.abs(hash).toString(16) + '-' + Math.floor(1000 + Math.random() * 9000);
      await chrome.storage.local.set({ deviceFingerprint: finalHash });
    }
  }
  initFingerprint();
})();
