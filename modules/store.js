// ─── AetherRing v2 — Central State Store ───────────────────────────────────
// All application state lives here. Derived metrics are computed on demand.

export const VERSION = '2.0.0';

// ─── Raw State ───────────────────────────────────────────────────────────────
export const raw = {
  connected: false,
  connecting: false,
  simulator: true,
  theme: localStorage.getItem('theme') || 'dark',

  battery: { level: 85, charging: false },
  realTime: { active: false, type: null, value: null },

  // Ring data (populated from BLE or simulator)
  today: {
    steps: 7840, goal: 10000,
    activeCalories: 312, totalCalories: 2180, bmr: 1868,
    distance: 5.9,
    activeMinutes: 47,
    inactiveMinutes: 540,
    floorsClimbed: 8,
    intensity: { low: 38, med: 28, high: 9 },
    hourly: _generateHourlySteps(),
  },
  hr: {
    current: 64, resting: 58, min: 52, max: 142, avg: 68,
    timeline: [],   // 288 × 5-min points
  },
  oxygen: { current: 97, min: 94, avg: 97, timeline: [] },
  sleep: {
    totalMin: 448, timeInBed: 490,
    deep: 98, light: 252, rem: 98, awake: 42,
    score: 82,
    latency: 14,
    efficiency: 91,
    restfulness: 78,
    tosses: 6,
    bedtime: '23:15', wakeTime: '07:23',
  },
  // 7-day history arrays (index 0 = today, 6 = 6 days ago)
  history: {
    steps:      [7840, 9120, 6530, 11200, 8340, 7100, 9800],
    sleepScore: [82, 78, 91, 73, 88, 85, 79],
    sleepMin:   [448, 421, 498, 388, 476, 461, 432],
    restingHr:  [58, 60, 57, 62, 59, 58, 61],
    hrv:        [45, 41, 52, 38, 48, 50, 43],
    spo2:       [97, 97, 98, 96, 97, 98, 97],
    actScore:   [74, 88, 61, 100, 79, 67, 94],
    readiness:  [83, 76, 88, 70, 87, 84, 81],
  },
  // Monthly trend (28 days, newest first)
  monthly: {
    sleepScore: _generateMonthlyTrend(80, 8),
    restingHr:  _generateMonthlyTrend(59, 4),
    hrv:        _generateMonthlyTrend(46, 10),
    steps:      _generateMonthlyTrend(8200, 2500),
    readiness:  _generateMonthlyTrend(82, 10),
  },
};

// ─── Generator Helpers ────────────────────────────────────────────────────────
function _generateHourlySteps() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}`,
    steps: (i >= 7 && i <= 21) ? Math.floor(
      [0,0,0,0,0,0,0,120,340,620,580,710,890,540,420,780,650,920,480,320,210,140,60,0][i]
      + (Math.random() * 60 - 30)
    ) : 0
  }));
}

function _generateMonthlyTrend(base, variance) {
  return Array.from({ length: 28 }, (_, i) =>
    Math.round(base + Math.sin(i / 4) * variance * 0.5 + (Math.random() * variance * 0.3))
  );
}

export function seedSimulator() {
  raw.hr.timeline = _generateHRTimeline();
  raw.oxygen.timeline = _generateOxyTimeline();
}

function _generateHRTimeline() {
  return Array.from({ length: 288 }, (_, i) => {
    const hour = Math.floor((i * 5) / 60);
    const isSleep = hour < 7 || hour >= 23;
    const base = isSleep ? 54 : 72 + Math.sin(i / 30) * 12;
    return Math.max(45, Math.round(base + (Math.random() * 8 - 4)));
  });
}

function _generateOxyTimeline() {
  return Array.from({ length: 24 }, (_, i) => {
    const base = 97.2 + Math.sin(i / 5) * 0.9;
    return Math.min(100, Math.max(93, parseFloat((base + (Math.random() * 0.6 - 0.3)).toFixed(1))));
  });
}

// ─── Derived Metrics (computed on demand) ────────────────────────────────────
export const derived = {
  // Algorithmic HRV from HR timeline volatility
  get hrv() {
    const clean = raw.hr.timeline.filter(x => x > 0 && x < 220);
    if (!clean.length) return raw.history.hrv[0] || 45;
    let diff = 0;
    for (let i = 1; i < clean.length; i++) diff += Math.abs(clean[i] - clean[i-1]);
    return Math.min(120, Math.max(20, Math.round(28 + (diff / (clean.length - 1)) * 7)));
  },

  // 7-day avg for any history key
  avg7(key) { return Math.round(raw.history[key].reduce((a,b)=>a+b,0) / raw.history[key].length); },

  // Baseline = 28-day avg
  baseline(key) {
    const arr = raw.monthly[key];
    return arr ? Math.round(arr.reduce((a,b)=>a+b,0) / arr.length) : null;
  },

  // Delta vs baseline
  delta(current, key) {
    const b = this.baseline(key);
    if (b == null) return null;
    return { value: current - b, pct: Math.round(((current - b) / b) * 100) };
  },

  // Status classification
  status(metric, value) {
    const thresholds = {
      sleepScore:  { optimal: 85, good: 70, fair: 55 },
      readiness:   { optimal: 85, good: 70, fair: 55 },
      hrv:         { optimal: 55, good: 40, fair: 28 },
      restingHr:   { optimal: 55, good: 65, fair: 72 }, // lower is better
      spo2:        { optimal: 97, good: 95, fair: 93 },
      sleepEff:    { optimal: 90, good: 80, fair: 70 },
      actScore:    { optimal: 80, good: 60, fair: 40 },
    };
    const t = thresholds[metric];
    if (!t) return 'good';
    const lowerBetter = metric === 'restingHr';
    if (lowerBetter) {
      if (value <= t.optimal) return 'optimal';
      if (value <= t.good)    return 'good';
      if (value <= t.fair)    return 'fair';
      return 'attention';
    }
    if (value >= t.optimal) return 'optimal';
    if (value >= t.good)    return 'good';
    if (value >= t.fair)    return 'fair';
    return 'attention';
  },

  // Confidence based on data completeness
  get confidence() {
    let score = 100;
    if (!raw.hr.timeline.length) score -= 30;
    if (!raw.oxygen.timeline.length) score -= 20;
    if (raw.sleep.totalMin === 0) score -= 25;
    if (raw.simulator) score = Math.min(score, 70);
    return Math.max(30, score);
  },

  // Sleep debt (hours below 7h/night over 7 days)
  get sleepDebt() {
    const target = 420; // 7 hours
    return Math.max(0, raw.history.sleepMin.reduce((acc, m) => acc + Math.max(0, target - m), 0) / 60);
  },

  // Chronotype estimate
  get chronotype() {
    const bed = parseInt(raw.sleep.bedtime?.split(':')[0] || '23');
    if (bed < 22) return { type: 'Morning Lark', emoji: '🌅', desc: 'You naturally rise early.' };
    if (bed < 24) return { type: 'Intermediate', emoji: '🌤', desc: 'Typical sleep schedule.' };
    return { type: 'Night Owl', emoji: '🦉', desc: 'You naturally stay up late.' };
  },

  // Sleep regularity (variance in bedtime across week)
  get sleepRegularity() {
    const avg = raw.history.sleepMin.reduce((a,b)=>a+b,0) / 7;
    const variance = raw.history.sleepMin.reduce((a,b)=>a + (b-avg)**2, 0) / 7;
    const consistency = Math.max(0, 100 - Math.sqrt(variance) / 3);
    return Math.round(consistency);
  },

  // Readiness score
  get readiness() {
    const restFactor = Math.max(0, 100 - (raw.hr.resting - 48) * 2.5);
    const sleepFactor = Math.min(100, (raw.sleep.totalMin / 480) * 100);
    const hrvFactor = Math.min(100, (this.hrv / 70) * 100);
    return Math.min(100, Math.max(30, Math.round(
      restFactor * 0.35 + sleepFactor * 0.35 + hrvFactor * 0.2 + raw.sleep.score * 0.1
    )));
  },

  // Readiness contributors detail
  get readinessContributors() {
    const hrv = this.hrv;
    return [
      { name: 'Resting Heart Rate', value: raw.hr.resting + ' bpm', score: Math.max(0, 100 - (raw.hr.resting - 48) * 2.5), color: 'var(--clr-hr)', icon: '❤️' },
      { name: 'HRV Balance',        value: hrv + ' ms',             score: Math.min(100, (hrv / 70) * 100),                 color: 'var(--clr-readiness)', icon: '💚' },
      { name: 'Sleep Quality',       value: raw.sleep.score + '/100', score: raw.sleep.score,                                color: 'var(--clr-sleep)', icon: '🌙' },
      { name: 'Sleep Duration',      value: _minsToHM(raw.sleep.totalMin), score: Math.min(100, (raw.sleep.totalMin / 480) * 100), color: 'var(--clr-sleep)', icon: '⏱' },
      { name: 'Recovery Index',      value: Math.round(Math.min(100, (this.hrv / 60) * 100 * 0.7 + raw.sleep.efficiency * 0.3)) + '/100', score: Math.min(100, (this.hrv / 60) * 100 * 0.7 + raw.sleep.efficiency * 0.3), color: 'var(--clr-readiness)', icon: '🔋' },
    ];
  },

  // Overall health score (composite)
  get healthScore() {
    const s = raw.sleep.score;
    const r = this.readiness;
    const h = this.status('hrv', this.hrv) === 'optimal' ? 90 : this.status('hrv', this.hrv) === 'good' ? 75 : 55;
    const a = Math.min(100, Math.round((raw.today.steps / raw.today.goal) * 100));
    const o = raw.oxygen.current;
    const ox = o >= 97 ? 95 : o >= 95 ? 80 : 60;
    return Math.round(s * 0.25 + r * 0.25 + h * 0.2 + a * 0.2 + ox * 0.1);
  },

  // VO2 Max estimate (simple regression from resting HR + age assumption)
  get vo2max() {
    return Math.round(15.3 * (raw.hr.max / raw.hr.resting));
  },

  // Heart age estimate
  get heartAge() {
    const base = 30; // assumed user age
    const rrFactor = raw.hr.resting > 70 ? 3 : raw.hr.resting > 60 ? 1 : -2;
    const hrvFactor = this.hrv < 30 ? 3 : this.hrv < 45 ? 1 : -2;
    return Math.max(18, base + rrFactor + hrvFactor);
  },

  // Activity score
  get activityScore() {
    return Math.min(100, Math.round((raw.today.steps / raw.today.goal) * 60 + (raw.today.activeMinutes / 60) * 40));
  },

  // Stress estimate (inverse of HRV health)
  get stressScore() {
    const hrv = this.hrv;
    const base = Math.max(0, 100 - (hrv / 70) * 100);
    return Math.round(Math.min(100, base + (Math.random() * 10 - 5)));
  },

  // Respiratory rate estimate (breaths/min, from HR timeline patterns)
  get respiratoryRate() {
    return Math.round(14 + (raw.hr.resting - 55) * 0.15);
  },

  // Body temp deviation (simulated baseline delta)
  get tempDeviation() {
    return (Math.random() * 0.4 - 0.2).toFixed(1);
  },

  // Immune readiness (composite of SpO2, sleep, HRV)
  get immuneReadiness() {
    const spo2Score = raw.oxygen.current >= 97 ? 100 : raw.oxygen.current >= 95 ? 75 : 50;
    const sleepScore = raw.sleep.score;
    const hrvScore = Math.min(100, (this.hrv / 70) * 100);
    return Math.round(spo2Score * 0.4 + sleepScore * 0.4 + hrvScore * 0.2);
  },

  // Trend direction for a history array
  trend(arr) {
    if (arr.length < 2) return 'stable';
    const recent = arr.slice(0, 3).reduce((a,b)=>a+b,0) / 3;
    const older = arr.slice(4).reduce((a,b)=>a+b,0) / (arr.length - 4);
    const diff = recent - older;
    if (diff > older * 0.05) return 'up';
    if (diff < -older * 0.05) return 'down';
    return 'stable';
  },

  // Anomaly detection (>1.8 std dev from 7-day history)
  anomalies() {
    const alerts = [];
    const check = (key, current, label, lowerBad = false) => {
      const arr = raw.history[key];
      if (!arr) return;
      const mean = arr.reduce((a,b)=>a+b,0) / arr.length;
      const std = Math.sqrt(arr.reduce((a,b)=>a+(b-mean)**2, 0) / arr.length);
      const z = (current - mean) / (std || 1);
      const bad = lowerBad ? z > 1.8 : z < -1.8;
      if (Math.abs(z) > 1.8 && bad) {
        alerts.push({ metric: label, value: current, severity: Math.abs(z) > 2.5 ? 'high' : 'medium' });
      }
    };
    check('sleepScore', raw.sleep.score, 'Sleep Score');
    check('hrv', this.hrv, 'HRV');
    check('restingHr', raw.hr.resting, 'Resting HR', true);
    check('spo2', raw.oxygen.current, 'SpO₂');
    return alerts;
  },

  // Biological age estimate
  get biologicalAge() {
    const assumed = 30;
    const hrv = this.hrv;
    const rhr = raw.hr.resting;
    const sleep = raw.sleep.score;
    const activity = this.activityScore;
    const score = (hrv / 60) * 20 + (1 - (rhr - 45) / 40) * 20 + (sleep / 100) * 30 + (activity / 100) * 30;
    const ageDelta = Math.round((1 - score / 100) * 15 - 7);
    return Math.max(18, assumed + ageDelta);
  },

  // Longevity score
  get longevityScore() {
    return Math.round(
      (this.hrv / 70) * 20 +
      ((1 - Math.max(0, raw.hr.resting - 55) / 30)) * 20 +
      (raw.sleep.score / 100) * 25 +
      (this.activityScore / 100) * 20 +
      (raw.oxygen.current - 90) / 10 * 15
    );
  },
};

// ─── Utility ──────────────────────────────────────────────────────────────────
export function minsToHM(m) {
  m = Math.round(m);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function _minsToHM(m) { return minsToHM(m); }

export function statusColor(s) {
  return { optimal: 'var(--clr-optimal)', good: 'var(--clr-good)', fair: 'var(--clr-fair)', attention: 'var(--clr-attention)' }[s] || 'var(--clr-good)';
}

export function statusLabel(s) {
  return { optimal: 'Optimal', good: 'Good', fair: 'Fair', attention: 'Needs Attention' }[s] || 'Good';
}

export function trendArrow(t) {
  return { up: '↑', down: '↓', stable: '→' }[t] || '→';
}

export function trendArrowColored(t, positiveIsUp = true) {
  const up = positiveIsUp;
  if (t === 'up')   return `<span class="trend-${up ? 'pos' : 'neg'}">${trendArrow('up')}</span>`;
  if (t === 'down') return `<span class="trend-${up ? 'neg' : 'pos'}">${trendArrow('down')}</span>`;
  return `<span class="trend-stable">${trendArrow('stable')}</span>`;
}

export function confidenceBadge(score) {
  const label = score >= 85 ? 'High' : score >= 60 ? 'Medium' : 'Low';
  const cls = score >= 85 ? 'conf-high' : score >= 60 ? 'conf-med' : 'conf-low';
  return `<span class="${cls} conf-badge">${label} Confidence</span>`;
}
