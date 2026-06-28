// ─── Screen: Recovery & Heart ─────────────────────────────────────────────────
import { raw, derived, minsToHM, statusColor, statusLabel, trendArrowColored, confidenceBadge } from '../store.js';
import { getReadinessInsight, getHRVInsight, getRHRInsight, getRecommendations, getPrediction } from '../analytics.js';
import { buildLine, buildBar, buildHeatmap, buildSparkline, PALETTE } from '../charts.js';
import { openDetail } from '../detail.js';

export function render(container) {
  const r = derived.readiness;
  const hrv = derived.hrv;
  const rhr = raw.hr.resting;
  const contribs = derived.readinessContributors;
  const rStatus = derived.status('readiness', r);
  const hrvStatus = derived.status('hrv', hrv);
  const rhrStatus = derived.status('restingHr', rhr);
  const vo2 = derived.vo2max;
  const heartAge = derived.heartAge;

  container.innerHTML = `
    <div class="screen-scroll">
      <div class="page-hero">
        <div class="hero-text">
          <p class="hero-eyebrow">CARDIOVASCULAR</p>
          <h1 class="hero-title">Recovery</h1>
        </div>
        <div class="hero-badge" style="background:${statusColor(rStatus)}22;color:${statusColor(rStatus)}">${statusLabel(rStatus)}</div>
      </div>

      <!-- Score Crown -->
      <div class="large-crown-card clickable-card" id="rec-score-card">
        <div class="lc-wrap">
          <svg class="lc-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
            <circle cx="50" cy="50" r="44" fill="none" stroke="${PALETTE.readiness}" stroke-width="8" stroke-linecap="round"
              stroke-dasharray="198 276.4" stroke-dashoffset="${198 - (198 * r / 100)}" class="arc-animate"/>
          </svg>
          <div class="lc-center">
            <span class="lc-val">${r}</span>
            <span class="lc-lbl" style="color: ${PALETTE.readiness};">Readiness</span>
          </div>
        </div>
        <p class="lc-msg">${getReadinessInsight()}</p>
      </div>

      <!-- Recovery Contributors -->
      <div class="section-label">READINESS CONTRIBUTORS</div>
      <div class="card metrics-list">
        ${contribs.map(c => `
          <div class="metric-row">
            <div class="metric-info">
              <span class="metric-name">${c.icon} ${c.name}</span>
              <span class="metric-val">${c.value}</span>
            </div>
            <div class="metric-bar-bg">
              <div class="metric-bar-fill" style="width:${Math.min(100, Math.round(c.score))}%;background:${c.color}"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- HRV Section -->
      <div class="section-label">HEART RATE VARIABILITY</div>
      <div class="dual-metric-row">
        <div class="dual-card clickable-card" id="card-hrv" style="border-color:${statusColor(hrvStatus)}44">
          <div class="dm-icon">💚</div>
          <div class="dm-val" style="color:${statusColor(hrvStatus)}">${hrv}<span class="dm-unit">ms</span></div>
          <div class="dm-lbl">HRV</div>
          <div class="dm-status" style="color:${statusColor(hrvStatus)}">${statusLabel(hrvStatus)}</div>
          <div id="spark-hrv" class="sparkline-wrap"></div>
          <div class="dm-trend">${trendArrowColored(derived.trend(raw.history.hrv), true)} vs last 7d</div>
        </div>
        <div class="dual-card clickable-card" id="card-rhr" style="border-color:${statusColor(rhrStatus)}44">
          <div class="dm-icon">❤️</div>
          <div class="dm-val" style="color:${statusColor(rhrStatus)}">${rhr}<span class="dm-unit">bpm</span></div>
          <div class="dm-lbl">Resting HR</div>
          <div class="dm-status" style="color:${statusColor(rhrStatus)}">${statusLabel(rhrStatus)}</div>
          <div id="spark-rhr2" class="sparkline-wrap"></div>
          <div class="dm-trend">${trendArrowColored(derived.trend(raw.history.restingHr), false)} vs last 7d</div>
        </div>
      </div>

      <!-- HRV insight -->
      <div class="card insight-card">
        <p class="insight-label">💡 HRV INSIGHT</p>
        <p class="insight-body">${getHRVInsight()}</p>
      </div>

      <!-- HRV 7-day chart -->
      <div class="section-label">HRV — 7-DAY TREND</div>
      <div class="card">
        <div style="height:150px"><canvas id="chart-hrv-history"></canvas></div>
      </div>

      <!-- HRV Monthly heatmap -->
      <div class="section-label">HRV — 28-DAY HEATMAP</div>
      <div class="card"><div id="hrv-heatmap" class="heatmap-container"></div></div>

      <!-- Cardiovascular Profile -->
      <div class="section-label">CARDIOVASCULAR PROFILE</div>
      <div class="three-col-cards">
        <div class="card info-card small-info">
          <div class="ic-icon">🫀</div>
          <div class="ic-val" style="color:var(--clr-hr)">${heartAge}</div>
          <div class="ic-lbl">Heart Age</div>
          <p class="ic-tip">Estimated from HR + HRV patterns</p>
        </div>
        <div class="card info-card small-info">
          <div class="ic-icon">🏃</div>
          <div class="ic-val" style="color:var(--clr-activity)">${vo2}</div>
          <div class="ic-lbl">VO₂ Max Est.</div>
          <p class="ic-tip">ml/kg/min (estimated)</p>
        </div>
        <div class="card info-card small-info">
          <div class="ic-icon">📊</div>
          <div class="ic-val" style="color:var(--clr-readiness)">${Math.round(vo2 >= 50 ? 90 : vo2 >= 40 ? 70 : 55)}</div>
          <div class="ic-lbl">Cardio Fitness</div>
          <p class="ic-tip">Score /100</p>
        </div>
      </div>

      <!-- Resting HR insight -->
      <div class="card insight-card">
        <p class="insight-label">💡 RESTING HR INSIGHT</p>
        <p class="insight-body">${getRHRInsight()}</p>
      </div>

      <!-- Resting HR trend chart -->
      <div class="section-label">RESTING HR — 7-DAY TREND</div>
      <div class="card">
        <div style="height:150px"><canvas id="chart-rhr-history"></canvas></div>
      </div>

      <!-- Full Day HR Chart -->
      <div class="section-label">TODAY'S HEART RATE</div>
      <div class="card">
        <div class="card-meta-row">
          <span class="card-label">24-hour HR</span>
          <div class="card-hr-stats">
            <span class="hr-stat"><span class="hr-dot" style="background:#6366f1"></span>${raw.hr.min} min</span>
            <span class="hr-stat">avg ${raw.hr.avg}</span>
            <span class="hr-stat"><span class="hr-dot" style="background:#f43f5e"></span>${raw.hr.max} max</span>
          </div>
        </div>
        <div style="height:160px"><canvas id="chart-hr-full"></canvas></div>
      </div>

      <!-- Readiness 7-day trend -->
      <div class="section-label">READINESS — 7-DAY TREND</div>
      <div class="card">
        <div style="height:150px"><canvas id="chart-readiness-hist"></canvas></div>
      </div>

      <!-- Stress Score -->
      <div class="section-label">STRESS & RECOVERY</div>
      <div class="card stress-card">
        <div class="stress-header">
          <div>
            <p class="card-label">Stress Score</p>
            <div class="stress-val-row">
              <span class="stress-val ${derived.stressScore > 60 ? 'stress-high' : derived.stressScore > 35 ? 'stress-med' : 'stress-low'}">${derived.stressScore}</span>
              <span class="stress-unit">/100</span>
            </div>
          </div>
          <div class="stress-ring">
            <svg viewBox="0 0 60 60" width="60" height="60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
              <circle cx="30" cy="30" r="24" fill="none"
                stroke="${derived.stressScore > 60 ? '#f43f5e' : derived.stressScore > 35 ? '#fb923c' : '#34d399'}"
                stroke-width="5" stroke-linecap="round"
                stroke-dasharray="150.8" stroke-dashoffset="${150.8 - 150.8 * derived.stressScore / 100}"
                transform="rotate(-90 30 30)" class="arc-animate"/>
            </svg>
          </div>
        </div>
        <p class="card-body-text">${derived.stressScore > 60 ? '🔴 Elevated stress. Your HRV is suppressed — prioritize recovery and avoid stimulants.' : derived.stressScore > 35 ? '🟡 Moderate stress. Normal for an active day. A breathing session can help.' : '🟢 Low physiological stress. Your body is calm and balanced.'}</p>
        <button class="pill-btn pill-btn--rec breathing-btn" id="btn-breathing">Start Breathing Session</button>
      </div>

      <!-- Recommendations -->
      <div class="section-label">RECOVERY RECOMMENDATIONS</div>
      <div class="card recs-card">
        ${getRecommendations('hrv').map(r => `<div class="rec-row"><span class="rec-icon">${r.icon}</span><span>${r.text}</span></div>`).join('')}
      </div>

      ${confidenceBadge(derived.confidence)}
    </div>
  `;
}

export function initEvents() {
  document.getElementById('card-hrv')?.addEventListener('click', () => openDetail('hrv'));
  document.getElementById('card-rhr')?.addEventListener('click', () => openDetail('rhr'));
  document.getElementById('rec-score-card')?.addEventListener('click', () => openDetail('readiness'));
  document.getElementById('btn-breathing')?.addEventListener('click', startBreathingSession);
}

function startBreathingSession() {
  const btn = document.getElementById('btn-breathing');
  if (!btn) return;
  let count = 0;
  const phases = ['Inhale… (4s)', 'Hold… (7s)', 'Exhale… (8s)'];
  const durations = [4000, 7000, 8000];
  btn.disabled = true;
  function cycle() {
    if (count >= 9) { btn.textContent = 'Start Breathing Session'; btn.disabled = false; return; }
    btn.textContent = phases[count % 3];
    btn.style.opacity = '0.8';
    setTimeout(cycle, durations[count % 3]);
    count++;
  }
  cycle();
}

export function buildCharts() {
  const labels = ['6d','5d','4d','3d','2d','1d','Today'];
  buildLine('chart-hrv-history', labels, [...raw.history.hrv].reverse(), PALETTE.hrv, { yMin: 20, yMax: 90 });
  buildLine('chart-rhr-history', labels, [...raw.history.restingHr].reverse(), PALETTE.hr, { yMin: 40, yMax: 90 });
  buildLine('chart-readiness-hist', labels, [...raw.history.readiness].reverse(), PALETTE.readiness, { yMin: 40, yMax: 100 });
  buildHeatmap('hrv-heatmap', raw.monthly.hrv, PALETTE.hrv);

  if (raw.hr.timeline.length) {
    const hrLabels = raw.hr.timeline.map((_,i) => {
      const h = Math.floor((i*5)/60).toString().padStart(2,'0');
      const m = ((i*5)%60).toString().padStart(2,'0');
      return `${h}:${m}`;
    });
    buildLine('chart-hr-full', hrLabels, raw.hr.timeline, PALETTE.hr, { yMin: 40, yMax: 160 });
  }

  buildSparkline('spark-hrv', [...raw.history.hrv].reverse(), PALETTE.hrv);
  buildSparkline('spark-rhr2', [...raw.history.restingHr].reverse(), PALETTE.hr);
}
