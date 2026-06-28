// ─── Screen: Activity ─────────────────────────────────────────────────────────
import { raw, derived, minsToHM, statusColor, statusLabel, trendArrowColored } from '../store.js';
import { getRecommendations, getPrediction } from '../analytics.js';
import { buildBar, buildLine, buildHeatmap, PALETTE } from '../charts.js';
import { openDetail } from '../detail.js';

export function render(container) {
  const t = raw.today;
  const score = derived.activityScore;
  const sStatus = derived.status('actScore', score);
  const pct = Math.min(100, Math.round((t.steps / t.goal) * 100));
  const remaining = Math.max(0, t.goal - t.steps);
  const recs = getRecommendations('activity');
  const prediction = getPrediction('actScore');
  const totalIntensity = t.intensity.low + t.intensity.med + t.intensity.high || 1;

  container.innerHTML = `
    <div class="screen-scroll">
      <div class="page-hero">
        <div class="hero-text">
          <p class="hero-eyebrow">TODAY</p>
          <h1 class="hero-title">Activity</h1>
        </div>
        <div class="hero-badge" style="background:${statusColor(sStatus)}22;color:${statusColor(sStatus)}">${statusLabel(sStatus)}</div>
      </div>

      <!-- Score Crown -->
      <div class="large-crown-card clickable-card" id="act-score-card">
        <div class="lc-wrap">
          <svg class="lc-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
            <circle cx="50" cy="50" r="44" fill="none" stroke="${PALETTE.activity}" stroke-width="8" stroke-linecap="round"
              stroke-dasharray="198 276.4" stroke-dashoffset="${198 - (198 * score / 100)}" class="arc-animate"/>
          </svg>
          <div class="lc-center">
            <span class="lc-val">${score}</span>
            <span class="lc-lbl" style="color: ${PALETTE.activity};">Activity</span>
          </div>
        </div>
        <p class="lc-msg">${pct >= 100 ? '🎉 Daily goal crushed! Outstanding movement today.' : pct >= 70 ? `💪 ${remaining.toLocaleString()} steps to your goal — almost there!` : `🚶 ${remaining.toLocaleString()} steps remaining. A ${Math.round(remaining/100)}-minute walk will do it.`}</p>
      </div>

      <!-- Step Goal Progress -->
      <div class="section-label">STEP GOAL</div>
      <div class="card">
        <div class="card-meta-row">
          <span class="card-label">Daily Steps</span>
          <span class="card-value-badge">${t.steps.toLocaleString()} / ${t.goal.toLocaleString()}</span>
        </div>
        <div class="goal-track-tall">
          <div class="goal-fill-animated" style="width:${pct}%"></div>
          <div class="goal-milestone" style="left:50%"><span class="gm-label">50%</span></div>
          <div class="goal-milestone" style="left:80%"><span class="gm-label">80%</span></div>
        </div>
        <div class="goal-sub-row">
          <span>${t.distance} km · ${t.floorsClimbed || 0} floors</span>
          <span>${pct}% complete</span>
        </div>
      </div>

      <!-- Activity Stats Grid -->
      <div class="section-label">ACTIVITY METRICS</div>
      <div class="act-stats-grid">
        <div class="act-stat-card">
          <span class="act-stat-icon">🔥</span>
          <span class="act-stat-val" style="color:#fb923c">${t.activeCalories}</span>
          <span class="act-stat-unit">kcal</span>
          <span class="act-stat-lbl">Active Cal</span>
        </div>
        <div class="act-stat-card">
          <span class="act-stat-icon">⚡</span>
          <span class="act-stat-val" style="color:${PALETTE.activity}">${t.totalCalories}</span>
          <span class="act-stat-unit">kcal</span>
          <span class="act-stat-lbl">Total Cal</span>
        </div>
        <div class="act-stat-card">
          <span class="act-stat-icon">⏱</span>
          <span class="act-stat-val" style="color:${PALETTE.activity}">${t.activeMinutes}</span>
          <span class="act-stat-unit">min</span>
          <span class="act-stat-lbl">Active Time</span>
        </div>
        <div class="act-stat-card">
          <span class="act-stat-icon">🪑</span>
          <span class="act-stat-val" style="color:${t.inactiveMinutes > 420 ? 'var(--clr-attention)' : 'var(--text-primary)'}">${minsToHM(t.inactiveMinutes)}</span>
          <span class="act-stat-unit"></span>
          <span class="act-stat-lbl">Sedentary</span>
        </div>
        <div class="act-stat-card">
          <span class="act-stat-icon">🧬</span>
          <span class="act-stat-val" style="color:var(--text-secondary)">${t.bmr}</span>
          <span class="act-stat-unit">kcal</span>
          <span class="act-stat-lbl">BMR</span>
        </div>
        <div class="act-stat-card">
          <span class="act-stat-icon">📍</span>
          <span class="act-stat-val" style="color:${PALETTE.activity}">${t.distance}</span>
          <span class="act-stat-unit">km</span>
          <span class="act-stat-lbl">Distance</span>
        </div>
      </div>

      <!-- Movement Intensity -->
      <div class="section-label">MOVEMENT INTENSITY</div>
      <div class="card metrics-list">
        ${[
          { name:'High Intensity', key:'high', color:'#f43f5e', tip:'Running, fast cycling, sports' },
          { name:'Medium Intensity', key:'med', color:'#fb923c', tip:'Brisk walking, light jog' },
          { name:'Low Intensity', key:'low', color:PALETTE.activity, tip:'Casual walking, light movement' },
        ].map(z => `
          <div class="metric-row">
            <div class="metric-info">
              <span class="metric-name">${z.name}</span>
              <span class="metric-val">${minsToHM(t.intensity[z.key])}</span>
            </div>
            <div class="metric-bar-bg">
              <div class="metric-bar-fill" style="width:${Math.round((t.intensity[z.key]/totalIntensity)*100)}%;background:${z.color}"></div>
            </div>
            <p class="sdr-tip">${z.tip}</p>
          </div>
        `).join('')}
      </div>

      <!-- Hourly Steps Chart -->
      <div class="section-label">HOURLY STEP DISTRIBUTION</div>
      <div class="card">
        <div style="height:160px"><canvas id="chart-steps-hourly"></canvas></div>
      </div>

      <!-- 7-day Steps History -->
      <div class="section-label">7-DAY STEP HISTORY</div>
      <div class="card">
        <div class="card-meta-row">
          <span class="card-label">Steps per Day</span>
          <span class="card-value-badge">${derived.avg7('steps').toLocaleString()} avg</span>
        </div>
        <div style="height:150px"><canvas id="chart-steps-history"></canvas></div>
      </div>

      <!-- Steps Heatmap -->
      <div class="section-label">28-DAY STEP HEATMAP</div>
      <div class="card"><div id="steps-heatmap" class="heatmap-container"></div></div>

      <!-- Training Load Card -->
      <div class="section-label">TRAINING INTELLIGENCE</div>
      <div class="card training-card">
        <div class="training-row">
          <div class="tr-item">
            <span class="tr-icon">⚖️</span>
            <span class="tr-val">${Math.round(score * 0.8)}</span>
            <span class="tr-lbl">Training Load</span>
          </div>
          <div class="tr-item">
            <span class="tr-icon">😴</span>
            <span class="tr-val">${score > 70 ? '24h' : '12h'}</span>
            <span class="tr-lbl">Rec. Recovery</span>
          </div>
          <div class="tr-item">
            <span class="tr-icon">💪</span>
            <span class="tr-val">${derived.readiness >= 75 ? 'Yes' : 'Light'}</span>
            <span class="tr-lbl">Train Hard?</span>
          </div>
        </div>
        <p class="card-body-text">${derived.readiness >= 80 ? '✅ Your body is ready for intense exercise. Today is an ideal workout day.' : derived.readiness >= 60 ? '🟡 Moderate training is fine. Stay below max effort.' : '⚠️ Recovery first. Light activity only — let your body restore.'}</p>
      </div>

      <!-- Predictive Outlook -->
      ${prediction ? `
        <div class="section-label">ACTIVITY TREND PREDICTION</div>
        <div class="card predict-card">
          <p class="predict-title">Activity score is <strong>${prediction.direction === 'improving' ? 'improving 📈' : prediction.direction === 'declining' ? 'declining 📉' : 'stable ➡️'}</strong> based on recent trends</p>
          <div class="predict-days">
            ${prediction.next3.map((v,i)=>`
              <div class="predict-day">
                <span class="pd-val" style="color:${v>=75?'var(--clr-optimal)':v>=55?'var(--clr-good)':'var(--clr-attention)'}">${v}</span>
                <span class="pd-lbl">Day +${i+1}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Recommendations -->
      <div class="section-label">ACTIVITY TIPS</div>
      <div class="card recs-card">
        ${recs.map(r => `<div class="rec-row"><span class="rec-icon">${r.icon}</span><span>${r.text}</span></div>`).join('')}
      </div>
    </div>
  `;
}

export function initEvents() {
  document.getElementById('act-score-card')?.addEventListener('click', () => openDetail('activity'));
}

export function buildCharts() {
  const labels7 = ['6d','5d','4d','3d','2d','1d','Today'];
  buildBar('chart-steps-history', labels7, [...raw.history.steps].reverse(), PALETTE.activity);
  buildHeatmap('steps-heatmap', raw.monthly.steps, PALETTE.activity);

  if (raw.today.hourly.length) {
    const hourlyData = raw.today.hourly.map(h => h.steps);
    const hourlyLabels = raw.today.hourly.map(h => `${h.hour}h`);
    buildBar('chart-steps-hourly', hourlyLabels, hourlyData, PALETTE.activity, { maxTicks: 8 });
  }
}
