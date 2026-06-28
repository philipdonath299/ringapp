// ─── Screen: Today (Oura Overview) ──────────────────────────────────────────
import { raw, derived, minsToHM, statusColor, confidenceBadge } from '../store.js';
import { getDailyCoachMessage, getWeeklySummary } from '../analytics.js';
import { buildSparkline, PALETTE } from '../charts.js';
import { openDetail } from '../detail.js';

export function render(container) {
  const r = derived.readiness;
  const slp = raw.sleep.score;
  const act = derived.activityScore;
  const hs = derived.healthScore;
  const anomalies = derived.anomalies();
  const weekly = getWeeklySummary();

  container.innerHTML = `
    <div class="screen-scroll">
      <!-- Top Date Header -->
      <div class="page-hero">
        <h1 class="hero-title">Today</h1>
        <p class="hero-date">${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</p>
      </div>

      <!-- Horizontal Crown Score Scroll -->
      <div class="crown-row">
        <!-- Readiness Crown -->
        <div class="crown-card clickable-card" id="card-readiness-crown">
          <div class="crown-wrap">
            <svg class="crown-svg" viewBox="0 0 200 140">
              <path d="M 30,140 A 80,80 0 1,1 170,140" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="14" stroke-linecap="round"/>
              <path d="M 30,140 A 80,80 0 1,1 170,140" fill="none" stroke="${PALETTE.readiness}" stroke-width="14" stroke-linecap="round"
                stroke-dasharray="350" stroke-dashoffset="${350 - (350 * r / 100)}" class="arc-animate"/>
            </svg>
            <div class="crown-center">
              <span class="crown-val">${r}</span>
              <span class="crown-lbl" style="color:${PALETTE.readiness}">Readiness</span>
            </div>
          </div>
          <p class="crown-msg">${r >= 80 ? 'Optimal recovery. You are ready to take on the day.' : r >= 65 ? 'Good recovery. Keep an eye on your energy levels.' : 'Pay attention. Take it easy today.'}</p>
        </div>

        <!-- Sleep Crown -->
        <div class="crown-card clickable-card" id="card-sleep-crown">
          <div class="crown-wrap">
            <svg class="crown-svg" viewBox="0 0 200 140">
              <path d="M 30,140 A 80,80 0 1,1 170,140" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="14" stroke-linecap="round"/>
              <path d="M 30,140 A 80,80 0 1,1 170,140" fill="none" stroke="${PALETTE.sleep}" stroke-width="14" stroke-linecap="round"
                stroke-dasharray="350" stroke-dashoffset="${350 - (350 * slp / 100)}" class="arc-animate"/>
            </svg>
            <div class="crown-center">
              <span class="crown-val">${slp}</span>
              <span class="crown-lbl" style="color:${PALETTE.sleep}">Sleep</span>
            </div>
          </div>
          <p class="crown-msg">${slp >= 80 ? 'Excellent rest. Your sleep stages were perfectly balanced.' : slp >= 65 ? 'Fair sleep. Try to go to bed 15 mins earlier.' : 'Poor sleep. Prioritize rest tonight.'}</p>
        </div>

        <!-- Activity Crown -->
        <div class="crown-card clickable-card" id="card-act-crown">
          <div class="crown-wrap">
            <svg class="crown-svg" viewBox="0 0 200 140">
              <path d="M 30,140 A 80,80 0 1,1 170,140" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="14" stroke-linecap="round"/>
              <path d="M 30,140 A 80,80 0 1,1 170,140" fill="none" stroke="${PALETTE.activity}" stroke-width="14" stroke-linecap="round"
                stroke-dasharray="350" stroke-dashoffset="${350 - (350 * act / 100)}" class="arc-animate"/>
            </svg>
            <div class="crown-center">
              <span class="crown-val">${act}</span>
              <span class="crown-lbl" style="color:${PALETTE.activity}">Activity</span>
            </div>
          </div>
          <p class="crown-msg">${act >= 80 ? 'Great movement so far. Keep hitting those goals.' : act >= 65 ? 'Good activity. A short walk would help.' : 'Low activity. Time to get moving.'}</p>
        </div>
      </div>

      <!-- Anomaly Alerts -->
      ${anomalies.length ? `
        <div class="alerts-list" style="padding:0 8px">
          ${anomalies.map(a => `
            <div class="alert-card">
              <span class="alert-icon">${a.severity === 'high' ? '🔴' : '🟡'}</span>
              <div class="alert-content">
                <p class="alert-title">${a.metric} anomaly</p>
                <p class="alert-sub">Value (${a.value}) is outside your baseline.</p>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Quick Stats Grid -->
      <div class="section-label">TODAY AT A GLANCE</div>
      <div class="stats-grid-3">
        <div class="stat-card clickable-card" id="card-rhr-stat">
          <span class="stat-val" style="color:${PALETTE.hr}">${raw.hr.resting}</span>
          <span class="stat-unit">bpm</span>
          <span class="stat-lbl">Resting HR</span>
        </div>
        <div class="stat-card clickable-card" id="card-hrv-stat">
          <span class="stat-val" style="color:${PALETTE.readiness}">${derived.hrv}</span>
          <span class="stat-unit">ms</span>
          <span class="stat-lbl">HRV</span>
        </div>
        <div class="stat-card clickable-card" id="card-spo2-stat">
          <span class="stat-val" style="color:${PALETTE.sleep}">${raw.oxygen.current}</span>
          <span class="stat-unit">%</span>
          <span class="stat-lbl">Blood Oxygen</span>
        </div>
        <div class="stat-card">
          <span class="stat-val">${raw.today.activeCalories}</span>
          <span class="stat-unit">kcal</span>
          <span class="stat-lbl">Active Cal</span>
        </div>
        <div class="stat-card">
          <span class="stat-val">${(raw.today.steps/1000).toFixed(1)}k</span>
          <span class="stat-unit">steps</span>
          <span class="stat-lbl">Movement</span>
        </div>
        <div class="stat-card">
          <span class="stat-val">${minsToHM(raw.sleep.totalMin)}</span>
          <span class="stat-unit">h</span>
          <span class="stat-lbl">Sleep Time</span>
        </div>
      </div>

      <!-- Live HR Card -->
      <div class="section-label">REAL-TIME MONITORING</div>
      <div class="card pulse-card">
        <div class="pulse-header">
          <div>
            <p class="card-label">Heart Rate</p>
            <div class="pulse-display">
              <span class="pulse-value" id="live-value">--</span>
              <span class="pulse-unit" id="live-unit">bpm</span>
            </div>
            <p class="pulse-subtitle" id="live-label">Tap to start measuring</p>
          </div>
          <div class="pulse-wave-wrap" id="pulse-wave-wrap">
            <svg id="pulse-wave-svg" class="pulse-wave-svg" viewBox="0 0 120 40" preserveAspectRatio="none">
              <path id="pulse-path"
                d="M0,20 L10,20 L14,6 L18,34 L22,6 L26,20 L36,20 L40,12 L44,28 L48,12 L52,20 L62,20 L66,8 L70,32 L74,8 L78,20 L88,20 L92,14 L96,26 L100,14 L104,20 L120,20"
                fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div class="pulse-btns">
          <button id="btn-live-measure" class="pill-btn pill-btn--hr">Live HR</button>
          <button id="btn-live-oxy" class="pill-btn pill-btn--oxy">Live SpO₂</button>
        </div>
      </div>

      <!-- Weekly Summary Card -->
      <div class="section-label">WEEKLY SUMMARY</div>
      <div class="card weekly-summary-card">
        <p class="ws-title">📊 ${weekly.title}</p>
        <p class="ws-narrative">${weekly.narrative}</p>
        <div class="ws-items">
          ${weekly.items.map(item => `
            <div class="ws-item">
              <span class="ws-label">${item.label}</span>
              <span class="ws-value">${item.value}</span>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;
}

export function initEvents() {
  document.getElementById('card-readiness-crown')?.addEventListener('click', () => openDetail('readiness'));
  document.getElementById('card-sleep-crown')?.addEventListener('click', () => openDetail('sleep'));
  document.getElementById('card-act-crown')?.addEventListener('click', () => openDetail('activity'));
  document.getElementById('card-rhr-stat')?.addEventListener('click', () => openDetail('rhr'));
  document.getElementById('card-spo2-stat')?.addEventListener('click', () => openDetail('spo2'));
  document.getElementById('card-hrv-stat')?.addEventListener('click', () => openDetail('hrv'));
}

export function buildCharts() {
}
