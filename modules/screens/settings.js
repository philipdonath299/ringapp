// ─── Screen: Settings ────────────────────────────────────────────────────────
import { raw } from '../store.js';

export function render(container) {
  const isDark = raw.theme === 'dark';
  
  container.innerHTML = `
    <div class="screen-scroll">
      <div class="page-hero">
        <div class="hero-text">
          <p class="hero-eyebrow">PREFERENCES</p>
          <h1 class="hero-title">Settings</h1>
        </div>
      </div>

      <div class="section-label">DEVICE CONNECTION</div>
      <div class="card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 32px;">💍</div>
            <div>
              <div style="font-size: 16px; font-weight: 600;">Colmi R10 Ring</div>
              <div style="font-size: 14px; color: var(--text-secondary); margin-top: 2px;">
                ${raw.connected ? `Connected • Battery: ${raw.battery.level}%` : raw.connecting ? 'Connecting...' : 'Disconnected'}
              </div>
            </div>
          </div>
        </div>
        
        <button id="btn-settings-connect" style="width: 100%; padding: 14px; border-radius: 12px; background: ${raw.connected ? 'var(--bg-input)' : 'var(--text-primary)'}; color: ${raw.connected ? 'var(--text-primary)' : 'var(--bg-base)'}; font-size: 15px; font-weight: 600; text-align: center;">
          ${raw.connected ? 'Disconnect Ring' : 'Connect Ring'}
        </button>
      </div>

      <div class="section-label">APP PREFERENCES</div>
      <div class="card weekly-summary-card">
        <div class="ws-items">
          <div class="ws-item clickable-card" id="btn-toggle-theme">
            <span class="ws-label">Appearance</span>
            <span class="ws-value">${isDark ? 'Dark Mode 🌙' : 'Light Mode ☀️'}</span>
          </div>
          <div class="ws-item clickable-card" id="btn-sync-data">
            <span class="ws-label">Sync Data</span>
            <span class="ws-value">↻</span>
          </div>
        </div>
      </div>

      <div class="section-label">DEVELOPER OPTIONS</div>
      <div class="card weekly-summary-card">
        <div class="ws-items">
          <div class="ws-item clickable-card" id="btn-toggle-sim">
            <span class="ws-label">Simulator Mode</span>
            <span class="ws-value" style="color: ${raw.simulator ? 'var(--clr-optimal)' : 'var(--text-secondary)'}">${raw.simulator ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      <div class="section-label">TROUBLESHOOTING</div>
      <div class="card" style="padding: 20px;">
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;">
          <strong>Ring not connecting?</strong><br>
          If your ring fails to connect or stops advertising, it may be stuck in a background connection state. 
        </p>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5;">
          Go to your phone's OS Bluetooth Settings, find the <strong>R10</strong> ring, and tap <strong>Forget This Device</strong>. Then return here and tap Connect.
        </p>
      </div>
    </div>
  `;
}

export function initEvents() {
  document.getElementById('btn-settings-connect')?.addEventListener('click', () => {
    // We simulate a click on the hidden or topbar connect button, or dispatch an event, 
    // but the easiest is to just call the app-level connect method. 
    // We will emit a custom event that app.js listens for.
    document.dispatchEvent(new CustomEvent('request-ble-toggle'));
  });

  document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('request-theme-toggle'));
  });

  document.getElementById('btn-sync-data')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('request-sync'));
  });

  document.getElementById('btn-toggle-sim')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('request-sim-toggle'));
  });
}
