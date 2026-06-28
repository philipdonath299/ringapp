// ─── AetherRing v2 — Chart Factory ───────────────────────────────────────────
// Standardized Chart.js wrappers with consistent styling.

const PALETTE = {
  hr:       '#f43f5e',
  hrFill:   'rgba(244,63,94,0.12)',
  sleep:    '#a78bfa',
  sleepFill:'rgba(167,139,250,0.12)',
  activity: '#34d399',
  actFill:  'rgba(52,211,153,0.12)',
  readiness:'#2dd4bf',
  readFill: 'rgba(45,212,191,0.12)',
  spo2:     '#60a5fa',
  spo2Fill: 'rgba(96,165,250,0.12)',
  hrv:      '#a78bfa',
  hrvFill:  'rgba(167,139,250,0.12)',
  grid:     'rgba(255,255,255,0.05)',
  ticks:    '#555',
};

const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 800, easing: 'easeOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(18,18,22,0.95)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor: '#fff',
      bodyColor: '#aaa',
      cornerRadius: 10,
      padding: 10,
    },
  },
  scales: {
    x: { grid: { color: PALETTE.grid }, ticks: { color: PALETTE.ticks, font: { family: 'Inter', size: 10 }, maxTicksLimit: 7 } },
    y: { grid: { color: PALETTE.grid }, ticks: { color: PALETTE.ticks, font: { family: 'Inter', size: 10 } } },
  },
};

const instances = {};

function destroy(id) {
  if (instances[id]) { try { instances[id].destroy(); } catch(e){} delete instances[id]; }
}

function create(id, config) {
  destroy(id);
  const el = document.getElementById(id);
  if (!el) return null;
  Chart.defaults.font.family = 'Inter';
  const chart = new Chart(el, config);
  instances[id] = chart;
  return chart;
}

function gradient(ctx, color, alpha1 = 0.25, alpha2 = 0.0) {
  const g = ctx.createLinearGradient(0, 0, 0, 200);
  const c = color.replace(/^#/, '');
  const r = parseInt(c.slice(0,2),16), gr2 = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  g.addColorStop(0, `rgba(${r},${gr2},${b},${alpha1})`);
  g.addColorStop(1, `rgba(${r},${gr2},${b},${alpha2})`);
  return g;
}

// ─── Line Chart ───────────────────────────────────────────────────────────────
export function buildLine(id, labels, data, color = PALETTE.hr, opts = {}) {
  return create(id, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: color,
        borderWidth: 1.8,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        backgroundColor: ctx => gradient(ctx.chart.ctx, color),
        tension: 0.4,
      }]
    },
    options: {
      ...BASE_OPTS,
      ...opts,
      plugins: { ...BASE_OPTS.plugins, ...(opts.plugins || {}) },
      scales: {
        ...BASE_OPTS.scales,
        y: { ...BASE_OPTS.scales.y, min: opts.yMin, max: opts.yMax },
      }
    }
  });
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
export function buildBar(id, labels, data, color = PALETTE.activity, opts = {}) {
  return create(id, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 180);
          const c = color.replace(/^#/,'');
          const r = parseInt(c.slice(0,2),16), gr2 = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
          g.addColorStop(0, `rgba(${r},${gr2},${b},0.9)`);
          g.addColorStop(1, `rgba(${r},${gr2},${b},0.3)`);
          return g;
        },
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      ...BASE_OPTS,
      ...opts,
      scales: {
        ...BASE_OPTS.scales,
        y: { ...BASE_OPTS.scales.y, min: opts.yMin },
        x: { ...BASE_OPTS.scales.x, ticks: { ...BASE_OPTS.scales.x.ticks, maxTicksLimit: opts.maxTicks || 8 } },
      }
    }
  });
}

// ─── Multi-series Line ────────────────────────────────────────────────────────
export function buildMultiLine(id, labels, datasets) {
  return create(id, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map(ds => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color,
        borderWidth: 1.8,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      }))
    },
    options: {
      ...BASE_OPTS,
      plugins: { ...BASE_OPTS.plugins, legend: { display: true, labels: { color: '#888', font: { size: 10, family: 'Inter' } } } },
    }
  });
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
export function buildHeatmap(containerId, data, color = '#a78bfa') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const c = color.replace(/^#/,'');
  const r = parseInt(c.slice(0,2),16), gr = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);

  const days = ['S','M','T','W','T','F','S'];
  const weeks = Math.ceil(data.length / 7);

  let html = '<div class="heatmap-grid">';
  // Day labels
  html += '<div class="heatmap-labels">' + days.map(d=>`<span>${d}</span>`).join('') + '</div>';
  html += '<div class="heatmap-weeks">';
  for (let w = 0; w < weeks; w++) {
    html += '<div class="heatmap-col">';
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      if (idx >= data.length) { html += '<div class="hm-cell hm-empty"></div>'; continue; }
      const intensity = (data[idx] - min) / range;
      html += `<div class="hm-cell" style="background:rgba(${r},${gr},${b},${0.1 + intensity * 0.85})" title="${data[idx]}"></div>`;
    }
    html += '</div>';
  }
  html += '</div></div>';
  el.innerHTML = html;
}

// ─── Radial Score Ring (SVG) ──────────────────────────────────────────────────
export function buildScoreRing(svgId, score, color = '#2dd4bf') {
  const el = document.getElementById(svgId);
  if (!el) return;
  const circumference = 427;
  el.setAttribute('stroke-dashoffset', circumference - (circumference * score / 100));
  el.setAttribute('stroke', color);
}

// ─── Sparkline (tiny inline) ──────────────────────────────────────────────────
export function buildSparkline(id, data, color = '#2dd4bf') {
  if (!data.length) return;
  const w = 80, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="overflow:visible"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ─── Cleanup All ─────────────────────────────────────────────────────────────
export function destroyAll() {
  Object.keys(instances).forEach(id => destroy(id));
}

export { PALETTE };
