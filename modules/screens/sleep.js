// ─── Screen: Sleep ────────────────────────────────────────────────────────────
import { raw, derived, minsToHM, statusColor, statusLabel, trendArrowColored } from '../store.js';
import { getSleepInsight, getRecommendations, getPrediction } from '../analytics.js';
import { buildLine, buildBar, buildHeatmap, PALETTE } from '../charts.js';
import { openDetail } from '../detail.js';

export function render(container) {
  const s = raw.sleep;
  const score = s.score;
  const sStatus = derived.status('sleepScore', score);
  const total = s.deep + s.light + s.rem + s.awake || 1;
  const efficiency = s.efficiency;
  const debt = derived.sleepDebt.toFixed(1);
  const chrono = derived.chronotype;
  const regularity = derived.sleepRegularity;
  const prediction = getPrediction('sleepScore');
  const recs = getRecommendations('sleep');

  container.innerHTML = `
    <div class="screen-scroll">
      <div class="page-hero">
        <div class="hero-text">
          <p class="hero-eyebrow">LAST NIGHT</p>
          <h1 class="hero-title">Sleep</h1>
        </div>
        <div class="hero-badge" style="background:${statusColor(sStatus)}22; color:${statusColor(sStatus)}">${statusLabel(sStatus)}</div>
      </div>

      <!-- Score Ring -->
      <div class="score-hero clickable-card" id="sleep-score-card">
        <div class="score-ring-wrap">
          <svg class="score-svg" viewBox="0 0 160 160">
            <defs>
              <linearGradient id="grad-sleep" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#c084fc"/>
                <stop offset="100%" stop-color="#818cf8"/>
              </linearGradient>
            </defs>
            <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="10"/>
            <circle id="sleep-arc" cx="80" cy="80" r="68" fill="none"
              stroke="url(#grad-sleep)" stroke-width="10"
              stroke-linecap="round" stroke-dasharray="427"
              stroke-dashoffset="${427 - 427 * score / 100}"
              transform="rotate(-90 80 80)" class="arc-animate"/>
          </svg>
          <div class="score-center">
            <span class="score-number">${score}</span>
            <span class="score-word">${minsToHM(s.totalMin)}</span>
          </div>
        </div>
        <p class="score-summary">${getSleepInsight()}</p>
      </div>

      <!-- Sleep Stats Row -->
      <div class="section-label">SLEEP DETAILS</div>
      <div class="sleep-stats-grid">
        <div class="ss-card">
          <span class="ss-icon">🛏</span>
          <span class="ss-val">${minsToHM(s.timeInBed)}</span>
          <span class="ss-lbl">In Bed</span>
        </div>
        <div class="ss-card">
          <span class="ss-icon">😴</span>
          <span class="ss-val">${minsToHM(s.totalMin)}</span>
          <span class="ss-lbl">Asleep</span>
        </div>
        <div class="ss-card">
          <span class="ss-icon">⚡</span>
          <span class="ss-val">${efficiency}%</span>
          <span class="ss-lbl">Efficiency</span>
        </div>
        <div class="ss-card">
          <span class="ss-icon">⏱</span>
          <span class="ss-val">${s.latency}m</span>
          <span class="ss-lbl">Latency</span>
        </div>
        <div class="ss-card">
          <span class="ss-icon">🌙</span>
          <span class="ss-val">${s.bedtime || '--'}</span>
          <span class="ss-lbl">Bedtime</span>
        </div>
        <div class="ss-card">
          <span class="ss-icon">☀️</span>
          <span class="ss-val">${s.wakeTime || '--'}</span>
          <span class="ss-lbl">Wake</span>
        </div>
      </div>

      <!-- Sleep Stages Visual -->
      <div class="section-label">SLEEP STAGES</div>
      <div class="card">
        <!-- Stacked timeline bar -->
        <div class="stages-timeline">
          <div class="stage-block" style="width:${(s.light/total)*100}%;background:#93c5fd" title="Light ${minsToHM(s.light)}"></div>
          <div class="stage-block" style="width:${(s.deep/total)*100}%;background:#6366f1" title="Deep ${minsToHM(s.deep)}"></div>
          <div class="stage-block" style="width:${(s.rem/total)*100}%;background:#c084fc" title="REM ${minsToHM(s.rem)}"></div>
          <div class="stage-block" style="width:${(s.awake/total)*100}%;background:#fbbf24;opacity:0.6" title="Awake ${s.awake}m"></div>
        </div>
        <div class="stages-legend">
          <div class="sl-item"><span class="sl-dot" style="background:#93c5fd"></span>Light <strong>${minsToHM(s.light)}</strong></div>
          <div class="sl-item"><span class="sl-dot" style="background:#6366f1"></span>Deep <strong>${minsToHM(s.deep)}</strong></div>
          <div class="sl-item"><span class="sl-dot" style="background:#c084fc"></span>REM <strong>${minsToHM(s.rem)}</strong></div>
          <div class="sl-item"><span class="sl-dot" style="background:#fbbf24"></span>Awake <strong>${s.awake}m</strong></div>
        </div>
        <!-- Stage detail bars -->
        <div class="sleep-stages-list">
          ${[
            { name:'Deep', val:s.deep, color:'#6366f1', pct: Math.round((s.deep/total)*100), ideal:'20–25%', tip:'Deep sleep drives physical repair and growth hormone release.' },
            { name:'REM', val:s.rem, color:'#c084fc', pct: Math.round((s.rem/total)*100), ideal:'20–25%', tip:'REM is critical for memory consolidation and emotional processing.' },
            { name:'Light', val:s.light, color:'#93c5fd', pct: Math.round((s.light/total)*100), ideal:'50–60%', tip:'Light sleep is transitional but necessary for overall architecture.' },
            { name:'Awake', val:s.awake, color:'#fbbf24', pct: Math.round((s.awake/total)*100), ideal:'<5%', tip:'Brief awakenings are normal. Excessive wake time reduces recovery.' },
          ].map(stage => `
            <div class="stage-detail-row">
              <div class="sdr-header">
                <div class="sdr-left"><span class="sl-dot" style="background:${stage.color}"></span><span class="sdr-name">${stage.name}</span></div>
                <div class="sdr-right"><span class="sdr-pct">${stage.pct}%</span><span class="sdr-dur">${stage.name === 'Awake' ? stage.val + 'm' : minsToHM(stage.val)}</span></div>
              </div>
              <div class="sdr-bar-bg"><div class="sdr-bar-fill" style="width:${stage.pct * 2}%;background:${stage.color}"></div></div>
              <p class="sdr-tip">Ideal: ${stage.ideal} — ${stage.tip}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Sleep Contributors -->
      <div class="section-label">SLEEP CONTRIBUTORS</div>
      <div class="card metrics-list">
        ${[
          { name:'Sleep Efficiency', val:`${efficiency}%`, score: efficiency, color: PALETTE.sleep },
          { name:'Restfulness', val:`${s.restfulness}/100`, score: s.restfulness, color: PALETTE.sleep },
          { name:'Deep Sleep', val: minsToHM(s.deep), score: Math.min(100, s.deep / 1.2), color:'#6366f1' },
          { name:'REM Sleep', val: minsToHM(s.rem), score: Math.min(100, s.rem / 1.2), color:'#c084fc' },
          { name:'Timing Regularity', val: regularity + '/100', score: regularity, color: PALETTE.sleep },
        ].map(c => `
          <div class="metric-row">
            <div class="metric-info"><span class="metric-name">${c.name}</span><span class="metric-val">${c.val}</span></div>
            <div class="metric-bar-bg"><div class="metric-bar-fill" style="width:${Math.round(c.score)}%;background:${c.color}"></div></div>
          </div>
        `).join('')}
      </div>

      <!-- Sleep Debt & Chronotype -->
      <div class="section-label">SLEEP INTELLIGENCE</div>
      <div class="two-col-cards">
        <div class="card info-card">
          <div class="ic-icon">😴</div>
          <div class="ic-val" style="color:${parseFloat(debt) > 3 ? 'var(--clr-attention)' : 'var(--text-primary)'}">${debt}h</div>
          <div class="ic-lbl">Sleep Debt (7d)</div>
          <p class="ic-tip">${parseFloat(debt) > 3 ? '⚠️ Significant debt. Extra sleep tonight helps.' : '✅ Sleep debt is manageable.'}</p>
        </div>
        <div class="card info-card">
          <div class="ic-icon">${chrono.emoji}</div>
          <div class="ic-val">${chrono.type}</div>
          <div class="ic-lbl">Chronotype</div>
          <p class="ic-tip">${chrono.desc}</p>
        </div>
      </div>

      <!-- 7-Day History -->
      <div class="section-label">7-DAY SLEEP TREND</div>
      <div class="card">
        <div style="height:160px"><canvas id="chart-sleep-history"></canvas></div>
      </div>

      <!-- Monthly Heatmap -->
      <div class="section-label">28-DAY SLEEP HEATMAP</div>
      <div class="card"><div id="sleep-heatmap" class="heatmap-container"></div></div>

      <!-- SpO2 During Sleep -->
      <div class="section-label">BLOOD OXYGEN DURING SLEEP</div>
      <div class="card">
        <div class="card-meta-row">
          <span class="card-label">SpO₂ Overnight</span>
          <span class="card-value-badge" id="badge-oxy-avg">${raw.oxygen.current}% avg</span>
        </div>
        <div style="height:140px"><canvas id="chart-sleep-oxy"></canvas></div>
      </div>

      <!-- Heart Rate During Sleep -->
      <div class="section-label">HEART RATE DURING SLEEP</div>
      <div class="card">
        <div class="card-meta-row">
          <span class="card-label">Overnight HR</span>
          <div class="card-hr-stats">
            <span class="hr-stat"><span class="hr-dot" style="background:#f43f5e"></span>${raw.hr.min} min</span>
            <span class="hr-stat"><span class="hr-dot" style="background:#fb923c"></span>${raw.hr.max} max</span>
          </div>
        </div>
        <div style="height:140px"><canvas id="chart-sleep-hr"></canvas></div>
      </div>

      <!-- Prediction -->
      ${prediction ? `
        <div class="section-label">PREDICTIVE OUTLOOK</div>
        <div class="card predict-card">
          <p class="predict-title">Based on your 7-day trend, your sleep score is <strong>${prediction.direction === 'improving' ? 'improving 📈' : prediction.direction === 'declining' ? 'declining 📉' : 'stable ➡️'}</strong></p>
          <div class="predict-days">
            ${prediction.next3.map((v,i)=>`
              <div class="predict-day">
                <span class="pd-val" style="color:${v>=80?'var(--clr-optimal)':v>=65?'var(--clr-good)':'var(--clr-attention)'}">${v}</span>
                <span class="pd-lbl">Day +${i+1}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Recommendations -->
      <div class="section-label">HOW TO IMPROVE</div>
      <div class="card recs-card">
        ${recs.map(r => `<div class="rec-row"><span class="rec-icon">${r.icon}</span><span>${r.text}</span></div>`).join('')}
      </div>
    </div>
  `;
}

export function initEvents() {
  document.getElementById('sleep-score-card')?.addEventListener('click', () => openDetail('sleep'));
}

export function buildCharts() {
  buildBar('chart-sleep-history',
    ['6d','5d','4d','3d','2d','1d','Today'],
    [...raw.history.sleepScore].reverse(),
    PALETTE.sleep, { yMin: 40, yMax: 100 });

  buildHeatmap('sleep-heatmap', raw.monthly.sleepScore, PALETTE.sleep);

  if (raw.oxygen.timeline.length) {
    buildLine('chart-sleep-oxy',
      raw.oxygen.timeline.map((_,i)=>`${i}:00`),
      raw.oxygen.timeline, PALETTE.spo2, { yMin: 90, yMax: 100 });
  }

  if (raw.hr.timeline.length) {
    const sleepHR = raw.hr.timeline.slice(0, 96).map(v => Math.max(45, Math.min(90, v - 6)));
    buildLine('chart-sleep-hr',
      sleepHR.map((_,i) => `${23 + Math.floor(i*5/60)}:${String((i*5)%60).padStart(2,'0')}`),
      sleepHR, PALETTE.hr, { yMin: 40, yMax: 100 });
  }
}
