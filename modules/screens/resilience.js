// ─── Screen: Body Health ──────────────────────────────────────────────────────
import { raw, derived, minsToHM, statusColor, statusLabel, confidenceBadge } from '../store.js';
import { getSpO2Insight, getRecommendations } from '../analytics.js';
import { buildLine, buildBar, buildHeatmap, PALETTE } from '../charts.js';
import { openDetail } from '../detail.js';

export function render(container) {
  const spo2 = raw.oxygen.current;
  const spo2Status = derived.status('spo2', spo2);
  const rr = derived.respiratoryRate;
  const tempDev = parseFloat(derived.tempDeviation);
  const immuneScore = derived.immuneReadiness;
  const longevity = derived.longevityScore;
  const bioAge = derived.biologicalAge;

  container.innerHTML = `
    <div class="screen-scroll">
      <div class="page-hero">
        <div class="hero-text">
          <p class="hero-eyebrow">PHYSIOLOGICAL</p>
          <h1 class="hero-title">Body</h1>
        </div>
      </div>

      <!-- Score Crown -->
      <div class="large-crown-card clickable-card" id="spo2-score-card">
        <div class="lc-wrap">
          <svg class="lc-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
            <circle cx="50" cy="50" r="44" fill="none" stroke="${PALETTE.spo2}" stroke-width="8" stroke-linecap="round"
              stroke-dasharray="198 276.4" stroke-dashoffset="${198 - (198 * ((spo2 - 88) / 12))}" class="arc-animate"/>
          </svg>
          <div class="lc-center">
            <span class="lc-val">${spo2}<span style="font-size:24px; letter-spacing:0">%</span></span>
            <span class="lc-lbl" style="color: ${PALETTE.spo2};">SpO₂</span>
          </div>
        </div>
        <p class="lc-msg">${getSpO2Insight()}</p>
      </div>

      <!-- Body Stats Grid -->
      <div class="section-label">VITALS OVERVIEW</div>
      <div class="body-vitals-grid">
        <div class="vital-card clickable-card" id="card-spo2-body" style="border-color:${statusColor(spo2Status)}33">
          <div class="vital-icon">💧</div>
          <div class="vital-val" style="color:${statusColor(spo2Status)}">${spo2}%</div>
          <div class="vital-lbl">Blood Oxygen</div>
          <div class="vital-status">${statusLabel(spo2Status)}</div>
        </div>
        <div class="vital-card">
          <div class="vital-icon">🌬</div>
          <div class="vital-val">${rr}</div>
          <div class="vital-lbl">Resp. Rate</div>
          <div class="vital-status">${rr <= 16 ? 'Normal' : rr <= 20 ? 'Elevated' : 'High'}</div>
        </div>
        <div class="vital-card">
          <div class="vital-icon">🌡</div>
          <div class="vital-val" style="color:${Math.abs(tempDev) > 0.5 ? 'var(--clr-attention)' : 'var(--text-primary)'}">${tempDev > 0 ? '+' : ''}${tempDev}°</div>
          <div class="vital-lbl">Temp. Δ</div>
          <div class="vital-status">${Math.abs(tempDev) <= 0.3 ? 'Baseline' : Math.abs(tempDev) <= 0.6 ? 'Slight shift' : 'Notable shift'}</div>
        </div>
        <div class="vital-card">
          <div class="vital-icon">🛡</div>
          <div class="vital-val" style="color:${immuneScore >= 80 ? 'var(--clr-optimal)' : immuneScore >= 60 ? 'var(--clr-good)' : 'var(--clr-attention)'}">${immuneScore}</div>
          <div class="vital-lbl">Immune Score</div>
          <div class="vital-status">${immuneScore >= 80 ? 'Strong' : immuneScore >= 60 ? 'Normal' : 'Weakened'}</div>
        </div>
      </div>

      <!-- Illness Detection -->
      <div class="section-label">HEALTH SIGNALS</div>
      <div class="card illness-card">
        ${_buildIllnessSignals(tempDev, spo2, raw.hr.resting)}
      </div>

      <!-- SpO2 Overnight Chart -->
      <div class="section-label">BLOOD OXYGEN — OVERNIGHT</div>
      <div class="card">
        <div class="card-meta-row">
          <span class="card-label">SpO₂ Timeline</span>
          <span class="card-value-badge">Min: ${raw.oxygen.min}% · Max: ${raw.oxygen.current}%</span>
        </div>
        <div style="height:150px"><canvas id="chart-body-spo2"></canvas></div>
      </div>

      <!-- SpO2 7-day trend -->
      <div class="section-label">BLOOD OXYGEN — 7-DAY TREND</div>
      <div class="card">
        <div style="height:140px"><canvas id="chart-spo2-hist"></canvas></div>
      </div>

      <!-- Respiratory Rate Details -->
      <div class="section-label">RESPIRATORY HEALTH</div>
      <div class="card">
        <div class="resp-detail-row">
          <div class="resp-item">
            <span class="resp-icon">🌬</span>
            <span class="resp-val">${rr}</span>
            <span class="resp-lbl">Breaths/min</span>
          </div>
          <div class="resp-item">
            <span class="resp-icon">📊</span>
            <span class="resp-val">${rr >= 12 && rr <= 20 ? '✅' : '⚠️'}</span>
            <span class="resp-lbl">Normal range: 12–20</span>
          </div>
        </div>
        <p class="card-body-text">Respiratory rate estimated from heart rate patterns. A rate consistently above 20 breaths/min can signal respiratory stress or illness.</p>
      </div>

      <!-- Biological Age & Longevity -->
      <div class="section-label">LONGEVITY INTELLIGENCE</div>
      <div class="two-col-cards">
        <div class="card info-card">
          <div class="ic-icon">🧬</div>
          <div class="ic-val" style="color:${bioAge <= 28 ? 'var(--clr-optimal)' : bioAge <= 32 ? 'var(--clr-good)' : 'var(--clr-attention)'}">${bioAge}</div>
          <div class="ic-lbl">Biological Age</div>
          <p class="ic-tip">Estimated from HRV, RHR, sleep, and activity patterns</p>
        </div>
        <div class="card info-card">
          <div class="ic-icon">⏳</div>
          <div class="ic-val" style="color:${longevity >= 75 ? 'var(--clr-optimal)' : longevity >= 55 ? 'var(--clr-good)' : 'var(--clr-attention)'}">${longevity}/100</div>
          <div class="ic-lbl">Longevity Score</div>
          <p class="ic-tip">Composite of all health biomarkers</p>
        </div>
      </div>

      <!-- Longevity contributors -->
      <div class="card metrics-list">
        ${[
          { name: 'HRV Health', val: Math.min(100, Math.round((derived.hrv / 70) * 100)), color: PALETTE.hrv },
          { name: 'Cardiovascular Efficiency', val: Math.min(100, Math.round((1 - (raw.hr.resting - 45) / 40) * 100)), color: PALETTE.hr },
          { name: 'Sleep Quality', val: raw.sleep.score, color: PALETTE.sleep },
          { name: 'Activity Level', val: derived.activityScore, color: PALETTE.activity },
          { name: 'Blood Oxygen', val: Math.round((spo2 - 88) / 12 * 100), color: PALETTE.spo2 },
        ].map(c => `
          <div class="metric-row">
            <div class="metric-info"><span class="metric-name">${c.name}</span><span class="metric-val">${c.val}/100</span></div>
            <div class="metric-bar-bg"><div class="metric-bar-fill" style="width:${c.val}%;background:${c.color}"></div></div>
          </div>
        `).join('')}
      </div>

      <!-- Confidence -->
      <div style="padding:0 16px 8px">${confidenceBadge(derived.confidence)}</div>

      <!-- Recommendations -->
      <div class="section-label">BODY HEALTH TIPS</div>
      <div class="card recs-card">
        ${getRecommendations('spo2').map(r => `<div class="rec-row"><span class="rec-icon">${r.icon}</span><span>${r.text}</span></div>`).join('')}
      </div>
    </div>
  `;
}

function _buildIllnessSignals(tempDev, spo2, rhr) {
  const signals = [];
  const risks = [];

  if (Math.abs(tempDev) <= 0.3 && spo2 >= 96 && rhr <= 68) {
    return `<div class="health-signal signal-ok"><span class="hs-icon">✅</span><div><strong>All Clear</strong><p>No illness signals detected. All physiological markers are within normal range.</p></div></div>`;
  }

  if (tempDev > 0.5) risks.push({ icon: '🌡', label: 'Temperature elevated', detail: `+${tempDev}°C above your baseline — possible immune response.` });
  if (spo2 < 95) risks.push({ icon: '💧', label: 'SpO₂ below optimal', detail: `${spo2}% — reduced oxygenation may indicate respiratory stress.` });
  if (rhr > 72) risks.push({ icon: '❤️', label: 'Elevated resting HR', detail: `${rhr} bpm — often an early illness indicator.` });

  if (risks.length === 0) {
    return `<div class="health-signal signal-ok"><span class="hs-icon">✅</span><div><strong>Looks Good</strong><p>Minor variations detected but within acceptable range.</p></div></div>`;
  }

  return risks.map(r => `
    <div class="health-signal signal-warn">
      <span class="hs-icon">${r.icon}</span>
      <div><strong>${r.label}</strong><p>${r.detail}</p></div>
    </div>
  `).join('');
}

export function initEvents() {
  document.getElementById('spo2-score-card')?.addEventListener('click', () => openDetail('spo2'));
  document.getElementById('card-spo2-body')?.addEventListener('click', () => openDetail('spo2'));
}

export function buildCharts() {
  const labels7 = ['6d','5d','4d','3d','2d','1d','Today'];
  buildLine('chart-spo2-hist', labels7, [...raw.history.spo2].reverse(), PALETTE.spo2, { yMin: 90, yMax: 100 });

  if (raw.oxygen.timeline.length) {
    buildLine('chart-body-spo2',
      raw.oxygen.timeline.map((_,i)=>`${i}:00`),
      raw.oxygen.timeline, PALETTE.spo2, { yMin: 90, yMax: 100 });
  }
}
