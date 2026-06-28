// ─── AetherRing v2 — Detail Panel System ─────────────────────────────────────
// Slide-up detail panel for every clickable metric.

import { raw, derived, minsToHM, statusColor, statusLabel, trendArrowColored, confidenceBadge } from './store.js';
import { WHY_MATTERS, HOW_TO_IMPROVE, getRecommendations, getPrediction, getCorrelations, getSleepInsight, getHRVInsight, getRHRInsight, getSpO2Insight, getReadinessInsight } from './analytics.js';
import { buildLine, buildBar, buildHeatmap, buildSparkline, PALETTE } from './charts.js';

let currentPanel = null;

export function openDetail(key) {
  closeDetail(false);
  const config = PANELS[key];
  if (!config) return;

  const panel = document.createElement('div');
  panel.className = 'detail-panel';
  panel.id = 'detail-panel';
  panel.innerHTML = `
    <div class="detail-backdrop" id="detail-backdrop"></div>
    <div class="detail-sheet">
      <div class="detail-handle"></div>
      <div class="detail-header">
        <div class="detail-title-group">
          <span class="detail-icon">${config.icon}</span>
          <div>
            <h2 class="detail-title">${config.title}</h2>
            <p class="detail-subtitle">${config.subtitle}</p>
          </div>
        </div>
        <button class="detail-close" id="detail-close-btn">✕</button>
      </div>
      <div class="detail-body" id="detail-body">
        ${config.render()}
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  currentPanel = panel;
  requestAnimationFrame(() => panel.classList.add('open'));

  document.getElementById('detail-backdrop')?.addEventListener('click', () => closeDetail());
  document.getElementById('detail-close-btn')?.addEventListener('click', () => closeDetail());

  // Post-render charts
  setTimeout(() => config.charts?.(), 80);
}

export function closeDetail(animate = true) {
  if (!currentPanel) return;
  if (animate) {
    currentPanel.classList.remove('open');
    setTimeout(() => { currentPanel?.remove(); currentPanel = null; }, 320);
  } else {
    currentPanel.remove();
    currentPanel = null;
  }
}

// ─── Detail Panel Configs ─────────────────────────────────────────────────────
function renderMetricHeader(value, unit, status) {
  const col = statusColor(status);
  return `
    <div class="dp-hero">
      <div class="dp-big-val" style="color:${col}">${value}<span class="dp-unit">${unit}</span></div>
      <span class="dp-status-badge" style="background:${col}22;color:${col}">${statusLabel(status)}</span>
    </div>
  `;
}

function renderTrendRow(history, label, positiveIsUp = true) {
  const trend = derived.trend(history);
  const last7Avg = Math.round(history.reduce((a,b)=>a+b,0)/history.length);
  return `
    <div class="dp-trend-row">
      <span class="dp-trend-label">7-day avg: <strong>${last7Avg}</strong></span>
      <span>${trendArrowColored(trend, positiveIsUp)} ${trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Stable'}</span>
    </div>
  `;
}

function renderWhyMatters(key) {
  const text = WHY_MATTERS[key];
  if (!text) return '';
  return `
    <div class="dp-section">
      <h3 class="dp-section-title">Why This Matters</h3>
      <p class="dp-body-text">${text}</p>
    </div>
  `;
}

function renderHowToImprove(key) {
  const items = HOW_TO_IMPROVE[key];
  if (!items) return '';
  return `
    <div class="dp-section">
      <h3 class="dp-section-title">How to Improve</h3>
      <ul class="dp-improve-list">
        ${items.map(i=>`<li>${i}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderPrediction(key, unit = '') {
  const p = getPrediction(key);
  if (!p) return '';
  return `
    <div class="dp-section">
      <h3 class="dp-section-title">Predictive Outlook (3 days)</h3>
      <div class="dp-prediction-row">
        ${p.next3.map((v,i)=>`<div class="dp-pred-day"><span class="dp-pred-val">${v}${unit}</span><span class="dp-pred-lbl">Day +${i+1}</span></div>`).join('')}
        <div class="dp-pred-day"><span class="dp-pred-val dp-pred-trend-${p.direction}">${p.direction === 'improving' ? '↑' : p.direction === 'declining' ? '↓' : '→'}</span><span class="dp-pred-lbl">Trend</span></div>
      </div>
    </div>
  `;
}

function renderCorrelations(metric) {
  const cors = getCorrelations().filter(c => c.from === metric || c.to === metric);
  if (!cors.length) return '';
  return `
    <div class="dp-section">
      <h3 class="dp-section-title">Correlations</h3>
      ${cors.map(c=>`
        <div class="dp-corr-row">
          <span class="dp-corr-badge">${c.from} → ${c.to}</span>
          <div class="dp-corr-bar-bg"><div class="dp-corr-bar-fill" style="width:${c.strength*100}%"></div></div>
          <span class="dp-corr-note">${c.note}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRecs(key) {
  const recs = getRecommendations(key);
  if (!recs.length) return '';
  return `
    <div class="dp-section">
      <h3 class="dp-section-title">Science-Backed Tips</h3>
      ${recs.map(r=>`<div class="dp-rec-row"><span class="dp-rec-icon">${r.icon}</span><span>${r.text}</span></div>`).join('')}
    </div>
  `;
}

function renderHistoryChart(id, height = 160) {
  return `
    <div class="dp-section">
      <h3 class="dp-section-title">7-Day History</h3>
      <div style="height:${height}px;"><canvas id="${id}"></canvas></div>
    </div>
  `;
}

function renderConfidence() {
  return `<div class="dp-conf">${confidenceBadge(derived.confidence)}</div>`;
}

// ─── Panel Definitions ────────────────────────────────────────────────────────
const DAYS_LABELS = ['6d','5d','4d','3d','2d','1d','Today'].reverse().slice(0,7);

const PANELS = {
  sleep: {
    icon: '🌙', title: 'Sleep Score', subtitle: 'Last night\'s sleep quality',
    render() {
      const s = raw.sleep.score;
      const st = derived.status('sleepScore', s);
      return `
        ${renderMetricHeader(s, '/100', st)}
        ${renderConfidence()}
        <div class="dp-section">
          <h3 class="dp-section-title">AI Insight</h3>
          <p class="dp-body-text">${getSleepInsight()}</p>
        </div>
        ${renderTrendRow(raw.history.sleepScore, 'Sleep Score')}
        ${renderHistoryChart('dp-chart-sleep')}
        <div class="dp-section">
          <h3 class="dp-section-title">Sleep Breakdown</h3>
          <div class="dp-grid-2">
            <div class="dp-grid-item"><span class="dp-grid-lbl">Total Sleep</span><span class="dp-grid-val">${minsToHM(raw.sleep.totalMin)}</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">In Bed</span><span class="dp-grid-val">${minsToHM(raw.sleep.timeInBed)}</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Efficiency</span><span class="dp-grid-val">${raw.sleep.efficiency}%</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Latency</span><span class="dp-grid-val">${raw.sleep.latency}m</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Deep</span><span class="dp-grid-val" style="color:#6366f1">${minsToHM(raw.sleep.deep)}</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">REM</span><span class="dp-grid-val" style="color:#c084fc">${minsToHM(raw.sleep.rem)}</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Light</span><span class="dp-grid-val" style="color:#93c5fd">${minsToHM(raw.sleep.light)}</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Awake</span><span class="dp-grid-val" style="color:#fbbf24">${raw.sleep.awake}m</span></div>
          </div>
        </div>
        ${renderPrediction('sleepScore', '/100')}
        ${renderWhyMatters('sleep')}
        ${renderHowToImprove('sleep')}
        ${renderCorrelations('Sleep Score')}
        ${renderRecs('sleep')}
      `;
    },
    charts() {
      buildBar('dp-chart-sleep', DAYS_LABELS, [...raw.history.sleepScore].reverse(), PALETTE.sleep, { yMin: 40, yMax: 100, plugins: { tooltip: { callbacks: { label: ctx => ` Score: ${ctx.parsed.y}` } } } });
    }
  },

  hrv: {
    icon: '💚', title: 'HRV Balance', subtitle: 'Heart rate variability',
    render() {
      const hrv = derived.hrv;
      const st = derived.status('hrv', hrv);
      return `
        ${renderMetricHeader(hrv, ' ms', st)}
        ${renderConfidence()}
        <div class="dp-section">
          <h3 class="dp-section-title">AI Insight</h3>
          <p class="dp-body-text">${getHRVInsight()}</p>
        </div>
        ${renderTrendRow(raw.history.hrv, 'HRV', true)}
        ${renderHistoryChart('dp-chart-hrv')}
        ${renderPrediction('hrv', 'ms')}
        ${renderWhyMatters('hrv')}
        ${renderHowToImprove('hrv')}
        ${renderCorrelations('HRV')}
        ${renderRecs('hrv')}
      `;
    },
    charts() {
      buildLine('dp-chart-hrv', DAYS_LABELS, [...raw.history.hrv].reverse(), PALETTE.hrv, { yMin: 20, yMax: 90 });
    }
  },

  rhr: {
    icon: '❤️', title: 'Resting Heart Rate', subtitle: 'Overnight minimum heart rate',
    render() {
      const rhr = raw.hr.resting;
      const st = derived.status('restingHr', rhr);
      return `
        ${renderMetricHeader(rhr, ' bpm', st)}
        ${renderConfidence()}
        <div class="dp-section">
          <h3 class="dp-section-title">AI Insight</h3>
          <p class="dp-body-text">${getRHRInsight()}</p>
        </div>
        ${renderTrendRow(raw.history.restingHr, 'RHR', false)}
        ${renderHistoryChart('dp-chart-rhr')}
        <div class="dp-section">
          <h3 class="dp-section-title">Heart Age Estimate</h3>
          <div class="dp-heart-age">
            <span class="dp-big-val" style="color:var(--clr-hr)">${derived.heartAge}</span>
            <span class="dp-unit"> years</span>
            <p class="dp-body-text" style="margin-top:8px">Based on resting HR and HRV patterns.</p>
          </div>
        </div>
        ${renderWhyMatters('rhr')}
        ${renderHowToImprove('rhr')}
        ${renderCorrelations('Resting HR')}
        ${renderRecs('rhr')}
      `;
    },
    charts() {
      buildLine('dp-chart-rhr', DAYS_LABELS, [...raw.history.restingHr].reverse(), PALETTE.hr, { yMin: 40, yMax: 90 });
    }
  },

  spo2: {
    icon: '💧', title: 'Blood Oxygen (SpO₂)', subtitle: 'Overnight average saturation',
    render() {
      const spo2 = raw.oxygen.current;
      const st = derived.status('spo2', spo2);
      return `
        ${renderMetricHeader(spo2, '%', st)}
        ${renderConfidence()}
        <div class="dp-section">
          <h3 class="dp-section-title">AI Insight</h3>
          <p class="dp-body-text">${getSpO2Insight()}</p>
        </div>
        ${renderTrendRow(raw.history.spo2, 'SpO₂', true)}
        ${renderHistoryChart('dp-chart-spo2')}
        ${renderWhyMatters('spo2')}
        ${renderHowToImprove('spo2')}
        ${renderRecs('spo2')}
      `;
    },
    charts() {
      buildLine('dp-chart-spo2', DAYS_LABELS, [...raw.history.spo2].reverse(), PALETTE.spo2, { yMin: 90, yMax: 100 });
    }
  },

  readiness: {
    icon: '🔋', title: 'Readiness Score', subtitle: 'How ready your body is today',
    render() {
      const r = derived.readiness;
      const st = derived.status('readiness', r);
      return `
        ${renderMetricHeader(r, '/100', st)}
        ${renderConfidence()}
        <div class="dp-section">
          <h3 class="dp-section-title">AI Insight</h3>
          <p class="dp-body-text">${getReadinessInsight()}</p>
        </div>
        ${renderTrendRow(raw.history.readiness, 'Readiness', true)}
        ${renderHistoryChart('dp-chart-readiness')}
        <div class="dp-section">
          <h3 class="dp-section-title">Contributors</h3>
          ${derived.readinessContributors.map(c => `
            <div class="dp-contrib-row">
              <span>${c.icon} ${c.name}</span>
              <div class="dp-contrib-track"><div class="dp-contrib-fill" style="width:${Math.round(c.score)}%;background:${c.color}"></div></div>
              <span class="dp-contrib-val">${c.value}</span>
            </div>
          `).join('')}
        </div>
        ${renderWhyMatters('readiness')}
        ${renderCorrelations('Sleep Score')}
      `;
    },
    charts() {
      buildLine('dp-chart-readiness', DAYS_LABELS, [...raw.history.readiness].reverse(), PALETTE.readiness, { yMin: 40, yMax: 100 });
    }
  },

  activity: {
    icon: '⚡', title: 'Activity Score', subtitle: 'Today\'s movement summary',
    render() {
      const score = derived.activityScore;
      const st = derived.status('actScore', score);
      return `
        ${renderMetricHeader(score, '/100', st)}
        ${renderConfidence()}
        ${renderTrendRow(raw.history.actScore, 'Activity', true)}
        ${renderHistoryChart('dp-chart-act')}
        <div class="dp-section">
          <h3 class="dp-section-title">Details</h3>
          <div class="dp-grid-2">
            <div class="dp-grid-item"><span class="dp-grid-lbl">Steps</span><span class="dp-grid-val">${raw.today.steps.toLocaleString()}</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Distance</span><span class="dp-grid-val">${raw.today.distance} km</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Active Cal</span><span class="dp-grid-val">${raw.today.activeCalories} kcal</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Total Cal</span><span class="dp-grid-val">${raw.today.totalCalories} kcal</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Active Min</span><span class="dp-grid-val">${raw.today.activeMinutes} min</span></div>
            <div class="dp-grid-item"><span class="dp-grid-lbl">Sedentary</span><span class="dp-grid-val">${minsToHM(raw.today.inactiveMinutes)}</span></div>
          </div>
        </div>
        ${renderWhyMatters('activity')}
        ${renderHowToImprove('activity')}
        ${renderRecs('activity')}
      `;
    },
    charts() {
      buildBar('dp-chart-act', DAYS_LABELS, [...raw.history.actScore].reverse(), PALETTE.activity, { yMin: 0, yMax: 110 });
    }
  },
};

// Allow external registration of panels
export function registerPanel(key, config) { PANELS[key] = config; }
