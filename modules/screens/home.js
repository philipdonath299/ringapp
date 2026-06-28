// ─── Screen: Home (Overview Dashboard) ───────────────────────────────────────
import { raw, derived, minsToHM, statusColor, statusLabel, confidenceBadge, trendArrowColored } from '../store.js';
import { getDailyCoachMessage, getWeeklySummary } from '../analytics.js';
import { buildScoreRing, buildSparkline, buildLine, PALETTE } from '../charts.js';
import { openDetail } from '../detail.js';

export function render(container) {
  const r = derived.readiness;
  const hs = derived.healthScore;
  const hrv = derived.hrv;
  const anomalies = derived.anomalies();
  const weekly = getWeeklySummary();

  container.innerHTML = `
    <!-- Hero: Overall Health Score -->
    <div class="screen-scroll">
      <div class="home-hero">
        <div class="home-hero-left">
          <p class="hero-eyebrow">HEALTH OVERVIEW</p>
          <h1 class="hero-title">Today</h1>
          <p class="hero-date">${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</p>
        </div>
        <button id="btn-connect" class="ring-btn" title="Connect Ring">
          <span id="ring-connect-icon">💍</span>
        </button>
      </div>

      <!-- Overall Score Ring -->
      <div class="overall-score-wrap clickable-card" id="card-readiness">
        <div class="score-ring-container">
          <svg class="score-svg" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="grad-overall" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2dd4bf"/>
                <stop offset="100%" stop-color="#818cf8"/>
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="12"/>
            <circle id="overall-arc" cx="100" cy="100" r="85" fill="none"
              stroke="url(#grad-overall)" stroke-width="12"
              stroke-linecap="round" stroke-dasharray="534" stroke-dashoffset="${534 - (534 * hs / 100)}"
              transform="rotate(-90 100 100)" class="arc-animate"/>
          </svg>
          <div class="score-center-large">
            <span class="score-big" id="overall-score-val">${hs}</span>
            <span class="score-lbl-sm">Health Score</span>
          </div>
        </div>
        <div class="overall-score-info">
          <p class="overall-score-label" style="color:${statusColor(derived.status('readiness', r))}">${statusLabel(derived.status('readiness', r))}</p>
          <p class="overall-ai-line">${getDailyCoachMessage().slice(0, 90)}…</p>
          <div class="overall-conf">${confidenceBadge(derived.confidence)}</div>
        </div>
      </div>

      <!-- Anomaly Alerts -->
      ${anomalies.length ? `
        <div class="section-label">⚠ ALERTS</div>
        <div class="alerts-list">
          ${anomalies.map(a => `
            <div class="alert-card alert-${a.severity}">
              <span class="alert-icon">${a.severity === 'high' ? '🔴' : '🟡'}</span>
              <div>
                <p class="alert-title">${a.metric} anomaly detected</p>
                <p class="alert-sub">Current value (${a.value}) is significantly outside your baseline.</p>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- 4-Pillar Summary Row -->
      <div class="section-label">READINESS PILLARS</div>
      <div class="pillars-row">
        <div class="pillar clickable-card" id="card-sleep-pillar">
          <div class="pillar-ring-wrap">
            <svg viewBox="0 0 60 60" class="pillar-svg">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
              <circle cx="30" cy="30" r="24" fill="none" stroke="${PALETTE.sleep}" stroke-width="5"
                stroke-linecap="round" stroke-dasharray="150.8"
                stroke-dashoffset="${150.8 - 150.8 * raw.sleep.score / 100}"
                transform="rotate(-90 30 30)" class="arc-animate"/>
            </svg>
            <span class="pillar-val">${raw.sleep.score}</span>
          </div>
          <div class="pillar-icon">🌙</div>
          <span class="pillar-name">Sleep</span>
          <span class="pillar-trend">${trendArrowColored(derived.trend(raw.history.sleepScore), true)}</span>
        </div>
        <div class="pillar clickable-card" id="card-recovery-pillar">
          <div class="pillar-ring-wrap">
            <svg viewBox="0 0 60 60" class="pillar-svg">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
              <circle cx="30" cy="30" r="24" fill="none" stroke="${PALETTE.readiness}" stroke-width="5"
                stroke-linecap="round" stroke-dasharray="150.8"
                stroke-dashoffset="${150.8 - 150.8 * r / 100}"
                transform="rotate(-90 30 30)" class="arc-animate"/>
            </svg>
            <span class="pillar-val">${r}</span>
          </div>
          <div class="pillar-icon">🔋</div>
          <span class="pillar-name">Readiness</span>
          <span class="pillar-trend">${trendArrowColored(derived.trend(raw.history.readiness), true)}</span>
        </div>
        <div class="pillar clickable-card" id="card-hrv-pillar">
          <div class="pillar-ring-wrap">
            <svg viewBox="0 0 60 60" class="pillar-svg">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
              <circle cx="30" cy="30" r="24" fill="none" stroke="${PALETTE.hrv}" stroke-width="5"
                stroke-linecap="round" stroke-dasharray="150.8"
                stroke-dashoffset="${150.8 - 150.8 * Math.min(100, hrv * 1.4) / 100}"
                transform="rotate(-90 30 30)" class="arc-animate"/>
            </svg>
            <span class="pillar-val">${hrv}</span>
          </div>
          <div class="pillar-icon">💚</div>
          <span class="pillar-name">HRV</span>
          <span class="pillar-trend">${trendArrowColored(derived.trend(raw.history.hrv), true)}</span>
        </div>
        <div class="pillar clickable-card" id="card-act-pillar">
          <div class="pillar-ring-wrap">
            <svg viewBox="0 0 60 60" class="pillar-svg">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
              <circle cx="30" cy="30" r="24" fill="none" stroke="${PALETTE.activity}" stroke-width="5"
                stroke-linecap="round" stroke-dasharray="150.8"
                stroke-dashoffset="${150.8 - 150.8 * derived.activityScore / 100}"
                transform="rotate(-90 30 30)" class="arc-animate"/>
            </svg>
            <span class="pillar-val">${derived.activityScore}</span>
          </div>
          <div class="pillar-icon">⚡</div>
          <span class="pillar-name">Activity</span>
          <span class="pillar-trend">${trendArrowColored(derived.trend(raw.history.actScore), true)}</span>
        </div>
      </div>

      <!-- Quick Stats Grid -->
      <div class="section-label">TODAY AT A GLANCE</div>
      <div class="stats-grid-3">
        <div class="stat-card clickable-card" id="card-rhr-stat">
          <div class="stat-icon-row"><span>❤️</span><span class="stat-status-dot" style="background:${statusColor(derived.status('restingHr', raw.hr.resting))}"></span></div>
          <span class="stat-val" style="color:${PALETTE.hr}">${raw.hr.resting}</span>
          <span class="stat-unit">bpm</span>
          <span class="stat-lbl">Resting HR</span>
          <div id="spark-rhr" class="sparkline-wrap"></div>
        </div>
        <div class="stat-card clickable-card" id="card-spo2-stat">
          <div class="stat-icon-row"><span>💧</span><span class="stat-status-dot" style="background:${statusColor(derived.status('spo2', raw.oxygen.current))}"></span></div>
          <span class="stat-val" style="color:${PALETTE.spo2}">${raw.oxygen.current}</span>
          <span class="stat-unit">%</span>
          <span class="stat-lbl">SpO₂</span>
          <div id="spark-spo2" class="sparkline-wrap"></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-row"><span>🔥</span></div>
          <span class="stat-val" style="color:${PALETTE.activity}">${raw.today.activeCalories}</span>
          <span class="stat-unit">kcal</span>
          <span class="stat-lbl">Active Cal</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon-row"><span>🚶</span></div>
          <span class="stat-val" style="color:${PALETTE.activity}">${raw.today.steps.toLocaleString()}</span>
          <span class="stat-unit">steps</span>
          <span class="stat-lbl">Steps</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon-row"><span>⏱</span></div>
          <span class="stat-val" style="color:var(--clr-sleep)">${minsToHM(raw.sleep.totalMin)}</span>
          <span class="stat-unit"></span>
          <span class="stat-lbl">Sleep</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon-row"><span>📍</span></div>
          <span class="stat-val" style="color:${PALETTE.activity}">${raw.today.distance}</span>
          <span class="stat-unit">km</span>
          <span class="stat-lbl">Distance</span>
        </div>
      </div>

      <!-- Weekly Summary Card -->
      <div class="section-label">WEEKLY AI SUMMARY</div>
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
    </div>
  `;
}

export function initEvents() {
  document.getElementById('card-readiness')?.addEventListener('click', () => openDetail('readiness'));
  document.getElementById('card-sleep-pillar')?.addEventListener('click', () => openDetail('sleep'));
  document.getElementById('card-recovery-pillar')?.addEventListener('click', () => openDetail('readiness'));
  document.getElementById('card-hrv-pillar')?.addEventListener('click', () => openDetail('hrv'));
  document.getElementById('card-act-pillar')?.addEventListener('click', () => openDetail('activity'));
  document.getElementById('card-rhr-stat')?.addEventListener('click', () => openDetail('rhr'));
  document.getElementById('card-spo2-stat')?.addEventListener('click', () => openDetail('spo2'));
}

export function buildCharts() {
  buildSparkline('spark-rhr', [...raw.history.restingHr].reverse(), PALETTE.hr);
  buildSparkline('spark-spo2', [...raw.history.spo2].reverse(), PALETTE.spo2);
}
