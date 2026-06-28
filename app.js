import * as colmi from './colmiProtocol.js';

// ─── BLE State ───
let bleDevice = null, bleServer = null;
let uartRxChar = null, uartTxChar = null;
let dataTxChar = null, dataRxChar = null;

// ─── App State ───
const state = {
  connected: false,
  connecting: false,
  syncing: false,
  simulator: true,
  battery: { level: 85, charging: false },
  realTime: { active: false, type: null, value: null },
  activity: {
    steps: 6420, goal: 10000, calories: 240, distance: 4.8,
    hourly: generateHourlySteps()
  },
  hr: { current: 72, min: 58, max: 124, avg: 71, timeline: [] },
  oxygen: { current: 98, min: 94, max: 99, timeline: [] },
  sleep: {
    totalMin: 465, deep: 110, light: 260, rem: 75, awake: 20, score: 84
  }
};

// ─── Helpers ───
function generateHourlySteps() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}`,
    steps: (i >= 7 && i <= 22) ? Math.floor(Math.random() * 550 + 50) : 0
  }));
}

function generateHRTimeline() {
  return Array.from({ length: 288 }, (_, i) => {
    const base = 64 + Math.sin(i / 18) * 9;
    return Math.max(45, Math.floor(base + (Math.random() * 7 - 3)));
  });
}

function generateOxyTimeline() {
  return Array.from({ length: 24 }, (_, i) => {
    const base = 97.2 + Math.sin(i / 5) * 1.2;
    return Math.min(100, Math.max(92, parseFloat((base + (Math.random() * 0.8 - 0.4)).toFixed(1))));
  });
}

function minutesToHM(m) {
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ─── Console log ───
const logs = [];
function log(msg, dir = 'system') {
  const ts = new Date().toLocaleTimeString();
  const sym = dir === 'in' ? '↓' : dir === 'out' ? '↑' : '·';
  const entry = `${ts} ${sym} ${msg}`;
  logs.unshift(entry);
  if (logs.length > 60) logs.pop();
  const el = document.getElementById('ble-console-logs');
  if (!el) return;
  el.innerHTML = logs.map(l => {
    const cls = l.includes('↓') ? 'log-in' : l.includes('↑') ? 'log-out' : 'log-system';
    return `<div class="${cls}">${l.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
  }).join('');
}

// ─── Charts ───
let chartSteps = null, chartHR = null, chartHRSleep = null, chartOxy = null;

const chartDefaults = {
  grid: { color: 'rgba(255,255,255,0.04)' },
  ticks: { color: '#48484a', font: { family: 'Inter', size: 10 } }
};

function buildCharts() {
  Chart.defaults.color = '#48484a';
  Chart.defaults.font.family = 'Inter';

  const ctxSteps   = document.getElementById('chart-steps');
  const ctxHR      = document.getElementById('chart-hr');
  const ctxHRSleep = document.getElementById('chart-hr-sleep');
  const ctxOxy     = document.getElementById('chart-oxygen');

  if (ctxSteps && state.activity.hourly.length) {
    if (chartSteps) chartSteps.destroy();
    chartSteps = new Chart(ctxSteps, {
      type: 'bar',
      data: {
        labels: state.activity.hourly.map(h => h.hour),
        datasets: [{
          data: state.activity.hourly.map(h => h.steps),
          backgroundColor: ctx => {
            const v = ctx.chart.ctx;
            const g = v.createLinearGradient(0, 0, 0, 160);
            g.addColorStop(0, 'rgba(52,211,153,0.8)');
            g.addColorStop(1, 'rgba(52,211,153,0.15)');
            return g;
          },
          borderRadius: 4, borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => ` ${ctx.parsed.y} steps` }
        }},
        scales: {
          x: { grid: chartDefaults.grid, ticks: { ...chartDefaults.ticks, maxTicksLimit: 8 } },
          y: { grid: chartDefaults.grid, ticks: chartDefaults.ticks }
        }
      }
    });
  }

  if (ctxHR && state.hr.timeline.length) {
    if (chartHR) chartHR.destroy();
    const hrLabels = state.hr.timeline.map((_, i) => {
      const h = Math.floor((i * 5) / 60).toString().padStart(2,'0');
      const m = ((i * 5) % 60).toString().padStart(2,'0');
      return `${h}:${m}`;
    });
    chartHR = new Chart(ctxHR, {
      type: 'line',
      data: {
        labels: hrLabels,
        datasets: [{
          data: state.hr.timeline,
          borderColor: '#f43f5e',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          backgroundColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 160);
            g.addColorStop(0, 'rgba(244,63,94,0.18)');
            g.addColorStop(1, 'rgba(244,63,94,0)');
            return g;
          },
          tension: 0.4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: chartDefaults.grid, ticks: { ...chartDefaults.ticks, maxTicksLimit: 6 } },
          y: { grid: chartDefaults.grid, ticks: chartDefaults.ticks, min: 40, max: 140 }
        }
      }
    });
  }

  if (ctxHRSleep && state.hr.timeline.length) {
    // Use the sleep-window portion of HR timeline (roughly 8h = 96 points)
    const sleepSlice = state.hr.timeline.slice(0, 96).map(v =>
      Math.max(45, Math.min(90, v - 8 + Math.floor(Math.random() * 4 - 2)))
    );
    if (chartHRSleep) chartHRSleep.destroy();
    chartHRSleep = new Chart(ctxHRSleep, {
      type: 'line',
      data: {
        labels: sleepSlice.map((_, i) => {
          const base = 23;
          const totalMins = i * 5;
          const h = (base + Math.floor(totalMins / 60)) % 24;
          const m = (totalMins % 60).toString().padStart(2,'0');
          return `${h}:${m}`;
        }),
        datasets: [{
          data: sleepSlice,
          borderColor: '#818cf8',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          backgroundColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 160);
            g.addColorStop(0, 'rgba(129,140,248,0.18)');
            g.addColorStop(1, 'rgba(129,140,248,0)');
            return g;
          },
          tension: 0.4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: chartDefaults.grid, ticks: { ...chartDefaults.ticks, maxTicksLimit: 6 } },
          y: { grid: chartDefaults.grid, ticks: chartDefaults.ticks, min: 40, max: 100 }
        }
      }
    });
  }

  if (ctxOxy && state.oxygen.timeline.length) {
    if (chartOxy) chartOxy.destroy();
    chartOxy = new Chart(ctxOxy, {
      type: 'line',
      data: {
        labels: state.oxygen.timeline.map((_, i) => `${i}:00`),
        datasets: [{
          data: state.oxygen.timeline,
          borderColor: '#60a5fa',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          backgroundColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 160);
            g.addColorStop(0, 'rgba(96,165,250,0.18)');
            g.addColorStop(1, 'rgba(96,165,250,0)');
            return g;
          },
          tension: 0.3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: chartDefaults.grid, ticks: { ...chartDefaults.ticks, maxTicksLimit: 6 } },
          y: { grid: chartDefaults.grid, ticks: chartDefaults.ticks, min: 90, max: 100 }
        }
      }
    });
  }
}

// ─── Score Arc Updater ───
function setArc(id, score) {
  const el = document.getElementById(id);
  if (!el) return;
  const circumference = 427; // 2π×68
  el.setAttribute('stroke-dashoffset', circumference - (circumference * score / 100));
}

// ─── Main UI Render ───
function render() {
  // Clock
  const now = new Date();
  const clockEl = document.getElementById('clock');
  if (clockEl) clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Battery
  setText('batt-pct', `${state.battery.level}%`);
  const chgEl = document.getElementById('batt-charging');
  if (chgEl) chgEl.style.display = state.battery.charging ? 'inline' : 'none';

  // Readiness score
  const restFactor  = Math.max(0, 100 - (state.hr.min - 50) * 2.2);
  const sleepFactor = Math.min(100, (state.sleep.totalMin / 480) * 100);
  const readiness   = Math.round(restFactor * 0.4 + sleepFactor * 0.4 + state.sleep.score * 0.2);
  const clampR      = Math.min(100, Math.max(30, readiness));
  setText('readiness-score', clampR);
  setText('readiness-label', clampR >= 85 ? 'Optimal' : clampR >= 70 ? 'Good' : clampR >= 50 ? 'Fair' : 'Pay attention');
  setText('readiness-summary',
    clampR >= 85
      ? 'Your body is fully recovered. Great conditions for intense training today.'
      : clampR >= 70
      ? 'You\'re in good shape. Light to moderate activity is recommended.'
      : 'Consider rest or light activity today. Your body needs more recovery time.'
  );
  setArc('readiness-arc', clampR);

  // Pillars
  setText('p-sleep-score', state.sleep.score);
  const actScore = Math.min(100, Math.round((state.activity.steps / state.activity.goal) * 100));
  setText('p-activity-score', actScore);
  setText('p-hr', state.hr.min);

  // Home chips
  setText('chip-steps', state.activity.steps.toLocaleString());
  setText('chip-cal',   state.activity.calories);
  setText('chip-dist',  state.activity.distance);
  setText('chip-oxy',   `${state.oxygen.current}%`);

  // Sleep screen
  setText('sleep-score-num', state.sleep.score);
  setText('sleep-duration-lbl', minutesToHM(state.sleep.totalMin));
  setArc('sleep-arc', state.sleep.score);

  const totalSleep = state.sleep.deep + state.sleep.light + state.sleep.rem + state.sleep.awake || 1;
  setBarWidth('bar-deep',  (state.sleep.deep  / totalSleep) * 100);
  setBarWidth('bar-light', (state.sleep.light / totalSleep) * 100);
  setBarWidth('bar-rem',   (state.sleep.rem   / totalSleep) * 100);
  setBarWidth('bar-awake', (state.sleep.awake / totalSleep) * 100);
  setText('dur-deep',  minutesToHM(state.sleep.deep));
  setText('dur-light', minutesToHM(state.sleep.light));
  setText('dur-rem',   minutesToHM(state.sleep.rem));
  setText('dur-awake', `${state.sleep.awake}m`);

  const oxyAvg = state.oxygen.timeline.filter(v => v > 0);
  setText('badge-oxy-avg', oxyAvg.length
    ? `${Math.round(oxyAvg.reduce((a,b)=>a+b,0)/oxyAvg.length)}% avg`
    : `${state.oxygen.current}% avg`);
  setText('sleep-hr-min', state.hr.min);
  setText('sleep-hr-max', state.hr.max);

  // Activity screen
  setText('activity-score-num', actScore);
  setText('activity-steps-lbl', `${state.activity.steps.toLocaleString()} steps`);
  setArc('activity-arc', actScore);
  setText('badge-steps-goal', `${state.activity.steps.toLocaleString()} / ${state.activity.goal.toLocaleString()}`);
  setBarWidth('goal-fill', Math.min(100, (state.activity.steps / state.activity.goal) * 100), 'goal-fill');
  setText('goal-dist', `${state.activity.distance} km walked`);
  setText('goal-cal',  `${state.activity.calories} kcal`);
  setText('hr-min', state.hr.min);
  setText('hr-avg', state.hr.avg);
  setText('hr-max', state.hr.max);

  // Settings / Device
  setText('info-name',  state.connected ? (bleDevice?.name || 'Colmi Ring R10') : 'Colmi Ring R10');
  setText('info-model', 'Colmi Ring R10');
  setText('info-fw',    'v1.2.4');
  setText('info-mode',  state.simulator ? 'Virtual / Simulator' : 'BLE Core');
  setText('info-batt',  `${state.battery.level}%`);

  // Connection pill + button
  const dot      = document.getElementById('conn-dot');
  const statusTx = document.getElementById('conn-status-text');
  const btnS     = document.getElementById('btn-connect-settings');
  const statusBar = document.getElementById('conn-status-text'); // tiny status in statusbar if added

  if (dot && statusTx && btnS) {
    if (state.connected) {
      dot.className = 'conn-ring-dot';
      statusTx.textContent = 'Connected via BLE';
      btnS.textContent = 'Disconnect';
      btnS.className = 'pill-btn';
      btnS.style.background = 'rgba(244,63,94,0.15)';
      btnS.style.color = '#f43f5e';
    } else if (state.connecting) {
      dot.className = 'conn-ring-dot dot-connecting';
      statusTx.textContent = 'Connecting…';
      btnS.textContent = 'Cancel';
      btnS.style.background = '';
      btnS.style.color = '';
      btnS.className = 'pill-btn';
    } else {
      dot.className = 'conn-ring-dot dot-disconnected';
      statusTx.textContent = state.simulator ? 'Simulator Mode' : 'Disconnected';
      btnS.textContent = 'Connect';
      btnS.className = 'pill-btn pill-btn--connect';
      btnS.style.background = '';
      btnS.style.color = '';
    }
  }

  // Main ring button
  const mainBtn = document.getElementById('btn-connect');
  if (mainBtn) {
    mainBtn.title = state.connected ? 'Disconnect' : 'Connect Ring';
    mainBtn.style.borderColor = state.connected ? 'rgba(45,212,191,0.5)' : '';
  }

  // Live pulse UI
  renderLivePulse();
}

function renderLivePulse() {
  const valEl  = document.getElementById('live-value');
  const unitEl = document.getElementById('live-unit');
  const lblEl  = document.getElementById('live-label');
  const waveEl = document.getElementById('pulse-wave-svg');
  const hrBtn  = document.getElementById('btn-live-measure');
  const oxyBtn = document.getElementById('btn-live-oxy');
  if (!valEl) return;

  if (state.realTime.active) {
    valEl.textContent  = state.realTime.value ?? '--';
    unitEl.textContent = state.realTime.type === 'hr' ? 'bpm' : '%';
    lblEl.textContent  = state.realTime.type === 'hr' ? 'Live Heart Rate' : 'Live Blood Oxygen';
    valEl.style.color  = state.realTime.type === 'hr' ? 'var(--clr-hr)' : 'var(--clr-oxy)';
    if (waveEl) waveEl.classList.add('visible');

    if (hrBtn) {
      hrBtn.className = state.realTime.type === 'hr' ? 'pill-btn pill-btn--active-hr' : 'pill-btn pill-btn--hr';
      hrBtn.textContent = state.realTime.type === 'hr' ? 'Stop HR' : 'Live HR';
      hrBtn.disabled = state.realTime.type === 'spo2';
    }
    if (oxyBtn) {
      oxyBtn.className = state.realTime.type === 'spo2' ? 'pill-btn pill-btn--active-oxy' : 'pill-btn pill-btn--oxy';
      oxyBtn.textContent = state.realTime.type === 'spo2' ? 'Stop SpO₂' : 'Live SpO₂';
      oxyBtn.disabled = state.realTime.type === 'hr';
    }
  } else {
    valEl.textContent  = '--';
    unitEl.textContent = 'bpm';
    lblEl.textContent  = 'Tap a button to start';
    valEl.style.color  = 'var(--clr-hr)';
    if (waveEl) waveEl.classList.remove('visible');
    if (hrBtn)  { hrBtn.className = 'pill-btn pill-btn--hr'; hrBtn.textContent = 'Live HR'; hrBtn.disabled = false; }
    if (oxyBtn) { oxyBtn.className = 'pill-btn pill-btn--oxy'; oxyBtn.textContent = 'Live SpO₂'; oxyBtn.disabled = false; }
  }
}

// ─── Utility setters ───
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setBarWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

// ─── BLE Connection ───
async function connectDevice() {
  if (state.connecting) return;
  
  if (!navigator.bluetooth) {
    log('Error: Web Bluetooth not supported in this browser. On iOS, please use the Bluefy or WebBLE app.');
    alert('Web Bluetooth is not supported in this browser.\n\nIf you are on an iPhone, standard Safari does not support Bluetooth. Please download a free app like "Bluefy" or "WebBLE" from the App Store and open this page there.');
    return;
  }

  state.connecting = true;
  render();
  log('Requesting Colmi Ring R10…');

  try {
    bleDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [colmi.UART_SERVICE_UUID, colmi.DATA_SERVICE_UUID]
    });
    log(`Found: ${bleDevice.name}. Connecting…`);
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    bleServer = await bleDevice.gatt.connect();
    const uartSvc = await bleServer.getPrimaryService(colmi.UART_SERVICE_UUID);
    uartRxChar = await uartSvc.getCharacteristic(colmi.UART_RX_CHAR_UUID);
    uartTxChar = await uartSvc.getCharacteristic(colmi.UART_TX_CHAR_UUID);

    try {
      const dataSvc = await bleServer.getPrimaryService(colmi.DATA_SERVICE_UUID);
      dataRxChar = await dataSvc.getCharacteristic(colmi.DATA_RX_CHAR_UUID);
      dataTxChar = await dataSvc.getCharacteristic(colmi.DATA_TX_CHAR_UUID);
      await dataRxChar.startNotifications();
      dataRxChar.addEventListener('characteristicvaluechanged', handleDataNotify);
      log('Data service ready.');
    } catch (e) { log(`Data service unavailable: ${e.message}`); }

    await uartTxChar.startNotifications();
    uartTxChar.addEventListener('characteristicvaluechanged', handleUartNotify);

    state.connected = true;
    state.connecting = false;
    state.simulator = false;
    
    // Clear simulator data before syncing real data
    state.activity.steps = 0; state.activity.calories = 0; state.activity.distance = 0;
    state.activity.hourly = []; state.hr.timeline = []; state.oxygen.timeline = [];
    render();

    await writeUart(colmi.CMD_BATTERY);
    await syncTime();
    log('Ready ✓ Auto-syncing data...');
    setTimeout(syncTelemetry, 1500); // Automatically fetch data upon connection
  } catch (e) {
    log(`Connection failed: ${e.message}`);
    state.connecting = false;
    render();
  }
}

function onDisconnected() {
  log('Disconnected from ring.');
  state.connected = false;
  state.realTime.active = false;
  render();
}

async function disconnectDevice() {
  if (bleDevice?.gatt?.connected) bleDevice.gatt.disconnect();
}

// ─── BLE Write helpers ───
async function writeUart(cmd, data = null) {
  if (!uartRxChar) { log('UART not connected'); return; }
  const pkt = colmi.makePacket(cmd, data);
  log(`TX cmd=0x${cmd.toString(16).padStart(2,'0')} [${pkt.join(',')}]`, 'out');
  await uartRxChar.writeValue(pkt);
}

async function writeData(cmd) {
  if (!dataTxChar) { log('Data service not connected'); return; }
  const pkt = colmi.makeDataPacket(cmd);
  log(`TX data=0x${cmd.toString(16).padStart(2,'0')}`, 'out');
  await dataTxChar.writeValue(pkt);
}

// ─── Notification Handlers ───
let dataBuffer = [];
let stepsAcc = [];
let hrAcc = { size: 0, range: 5, rates: [], idx: 0, ts: null };

function handleUartNotify(ev) {
  const v = new Uint8Array(ev.target.value.buffer);
  log(`RX [${v.join(',')}]`, 'in');
  const cmd = v[0];

  if (cmd === colmi.CMD_BATTERY) {
    state.battery.level   = v[1];
    state.battery.charging = v[2] === 1;
    render();
  }

  if (cmd === colmi.CMD_START_REAL_TIME && v[2] === 0) {
    const val = v[3];
    state.realTime.value = val;
    if (v[1] === 1) state.hr.current = val;
    if (v[1] === 3) state.oxygen.current = val;
    render();
  }

  if (cmd === colmi.CMD_GET_STEP_SOMEDAY) {
    if (v[1] === 255) { log('No step data'); return; }
    if (v[1] === 240) { stepsAcc = []; return; }
    const yr  = colmi.bcdToDecimal(v[1]) + 2000;
    const mo  = colmi.bcdToDecimal(v[2]);
    const dy  = colmi.bcdToDecimal(v[3]);
    const ti  = v[4];
    const cal = v[7] | (v[8] << 8);
    const stp = v[9] | (v[10] << 8);
    const dst = v[11] | (v[12] << 8);
    stepsAcc.push({ ti, cal, stp, dst });
    if (v[5] === v[6] - 1) {
      state.activity.steps    = stepsAcc.reduce((s,r) => s+r.stp, 0);
      state.activity.calories = stepsAcc.reduce((s,r) => s+r.cal, 0);
      state.activity.distance = +(stepsAcc.reduce((s,r) => s+r.dst, 0) / 1000).toFixed(2);
      const hourly = Array.from({length:24}, (_,h) => ({ hour:`${h}`, steps:0 }));
      stepsAcc.forEach(r => { hourly[Math.floor(r.ti/4)].steps += r.stp; });
      state.activity.hourly = hourly;
      render(); buildCharts();
    }
  }

  if (cmd === colmi.CMD_READ_HEART_RATE) {
    if (v[1] === 255) { log('No HR data'); return; }
    if (v[1] === 0) {
      hrAcc.size = v[2]; hrAcc.range = v[3];
      hrAcc.rates = new Array(hrAcc.size * 13).fill(0); hrAcc.idx = 0;
      return;
    }
    if (v[1] === 1) {
      const dv = new DataView(v.buffer);
      hrAcc.ts = new Date(dv.getInt32(2, true) * 1000);
      for (let i=0;i<9;i++) hrAcc.rates[i] = v[6+i];
      hrAcc.idx = 9; return;
    }
    for (let i=0;i<13;i++) if (hrAcc.idx+i < hrAcc.rates.length) hrAcc.rates[hrAcc.idx+i] = v[2+i];
    hrAcc.idx += 13;
    if (v[1] === hrAcc.size - 1) {
      const clean = hrAcc.rates.slice(0,288).filter(x => x>0 && x<220);
      if (clean.length) {
        state.hr.timeline = hrAcc.rates.slice(0,288);
        state.hr.min = Math.min(...clean);
        state.hr.max = Math.max(...clean);
        state.hr.avg = Math.round(clean.reduce((a,b)=>a+b,0)/clean.length);
        state.hr.current = clean.at(-1);
        render(); buildCharts();
      }
    }
  }
}

function handleDataNotify(ev) {
  const v = new Uint8Array(ev.target.value.buffer);
  dataBuffer.push(...v);
  if (dataBuffer.length < 6) return;
  const dataLen = (dataBuffer[3] << 8) | dataBuffer[2];
  const total   = 6 + dataLen;
  if (dataBuffer.length < total) return;
  const cmd     = dataBuffer[1]; // capture before slicing
  const payload = dataBuffer.slice(6, total);
  dataBuffer    = dataBuffer.slice(total);
  if (cmd === colmi.DATA_REQ_SLEEP)  parseSleep(payload);
  if (cmd === colmi.DATA_REQ_OXYGEN) parseOxygen(payload);
}

function parseSleep(payload) {
  let idx = 1;
  while (idx < payload.length) {
    const rb = payload[idx+1];
    if (!rb) break;
    const cnt = (rb - 4) >> 1;
    let deep=0, light=0, rem=0, awake=0;
    let ti = idx + 6;
    for (let i=0;i<cnt;i++) {
      const t = payload[ti], d = payload[ti+1];
      if (t===3) deep+=d; if (t===2) light+=d; if (t===4) rem+=d; if (t===5) awake+=d;
      ti += 2;
    }
    state.sleep.deep = deep; state.sleep.light = light;
    state.sleep.rem  = rem;  state.sleep.awake = awake;
    state.sleep.totalMin = deep+light+rem+awake;
    state.sleep.score = Math.min(100, Math.max(30,
      Math.round((state.sleep.totalMin/480)*55 + (deep/(state.sleep.totalMin||1))*80)
    ));
    render(); buildCharts();
    idx += 2 + rb;
  }
}

function parseOxygen(payload) {
  let idx = 0;
  while (idx < payload.length) {
    const day = payload[idx]; idx++;
    const rates = [];
    for (let j=0;j<24;j++) { rates.push(payload[idx]); idx += 2; }
    if (day === 0) {
      state.oxygen.timeline = rates;
      const clean = rates.filter(v=>v>0);
      if (clean.length) {
        state.oxygen.current = clean.at(-1);
        state.oxygen.min = Math.min(...clean);
        state.oxygen.max = Math.max(...clean);
      }
      render(); buildCharts();
    }
  }
}

// ─── Ring Actions ───
async function syncTime() {
  const now = new Date();
  const utc = new Date(now.toUTCString());
  const sub = new Uint8Array([
    colmi.byteToBcd(utc.getUTCFullYear() % 100),
    colmi.byteToBcd(utc.getUTCMonth() + 1),
    colmi.byteToBcd(utc.getUTCDate()),
    colmi.byteToBcd(utc.getUTCHours()),
    colmi.byteToBcd(utc.getUTCMinutes()),
    colmi.byteToBcd(utc.getUTCSeconds()),
    0x01 // English
  ]);
  log('Syncing ring clock…');
  await writeUart(colmi.CMD_SET_TIME, sub);
}

async function syncTelemetry() {
  if (!state.connected) {
    log('Simulator: refreshing data…');
    state.activity.hourly = generateHourlySteps();
    state.hr.timeline = generateHRTimeline();
    state.oxygen.timeline = generateOxyTimeline();
    buildCharts(); render(); return;
  }
  log('Syncing all telemetry…');
  await writeUart(colmi.CMD_GET_STEP_SOMEDAY, new Uint8Array([0, 0x0f, 0x00, 0x5f, 0x01]));
  await delay(500);
  const midnight = new Date(); midnight.setHours(0,0,0,0);
  const ts = Math.floor(midnight/1000);
  await writeUart(colmi.CMD_READ_HEART_RATE, new Uint8Array([ts&0xFF,(ts>>8)&0xFF,(ts>>16)&0xFF,(ts>>24)&0xFF]));
  await delay(500);
  if (dataTxChar) {
    await writeData(colmi.DATA_REQ_SLEEP);
    await delay(500);
    await writeData(colmi.DATA_REQ_OXYGEN);
  }
}

async function blinkLED()   { log('Blink LED'); await writeUart(colmi.CMD_BLINK_TWICE); }
async function rebootRing() { log('Rebooting…'); await writeUart(colmi.CMD_REBOOT, new Uint8Array([0x01])); }

async function toggleLive(type) {
  if (state.simulator) {
    if (state.realTime.active && state.realTime.type === type) {
      state.realTime = { active: false, type: null, value: null };
    } else {
      state.realTime = { active: true, type, value: type === 'hr' ? 72 : 98 };
      simPulse();
    }
    render(); return;
  }
  const rt = type === 'hr' ? 1 : 3;
  if (state.realTime.active) {
    await writeUart(colmi.CMD_STOP_REAL_TIME, new Uint8Array([rt, 0, 0]));
    state.realTime = { active: false, type: null, value: null };
  } else {
    await writeUart(colmi.CMD_START_REAL_TIME, new Uint8Array([rt, 1]));
    state.realTime = { active: true, type, value: '…' };
    if (type === 'hr') keepAliveHR();
  }
  render();
}

async function keepAliveHR() {
  if (!state.realTime.active || state.realTime.type !== 'hr' || !state.connected) return;
  await writeUart(colmi.CMD_START_REAL_TIME, new Uint8Array([1, 3]));
  setTimeout(keepAliveHR, 8000);
}

function simPulse() {
  if (!state.realTime.active || !state.simulator) return;
  if (state.realTime.type === 'hr') {
    state.realTime.value = Math.round(68 + Math.random() * 16 - 8);
  } else {
    state.realTime.value = Math.min(100, Math.max(95, Math.round(98 + Math.random() * 3 - 1)));
  }
  render();
  setTimeout(simPulse, 1400);
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── Tab Navigation ───
function setupTabs() {
  const tabs    = document.querySelectorAll('.tab');
  const screens = document.querySelectorAll('.screen');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.screen;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      screens.forEach(s => {
        const isTarget = s.id === target;
        if (isTarget) {
          s.style.display = 'block';
          requestAnimationFrame(() => s.classList.add('active'));
        } else {
          s.classList.remove('active');
          // hide after transition
          s.addEventListener('transitionend', () => {
            if (!s.classList.contains('active')) s.style.display = 'none';
          }, { once: true });
        }
      });
      // Rebuild charts after DOM is visible
      setTimeout(buildCharts, 80);
    });
  });

  // Quick-nav pillars on Home
  document.getElementById('nav-to-sleep')?.addEventListener('click', () => {
    document.getElementById('tab-sleep')?.click();
  });
  document.getElementById('nav-to-activity')?.addEventListener('click', () => {
    document.getElementById('tab-activity')?.click();
  });
}

// ─── Clock Ticker ───
function startClock() {
  function tick() {
    const el = document.getElementById('clock');
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }
  tick();
  setInterval(tick, 10000);
}

// ─── Init ───
window.addEventListener('DOMContentLoaded', () => {
  // Seed simulator data
  state.hr.timeline = generateHRTimeline();
  state.oxygen.timeline = generateOxyTimeline();

  setupTabs();
  startClock();

  // Button bindings
  const bindAll = (ids, fn) => ids.forEach(id => document.getElementById(id)?.addEventListener('click', fn));

  bindAll(['btn-connect'], () => state.connected ? disconnectDevice() : connectDevice());
  bindAll(['btn-connect-settings'], () => state.connected ? disconnectDevice() : connectDevice());
  document.getElementById('btn-sync-telemetry')?.addEventListener('click', syncTelemetry);
  document.getElementById('btn-sync-time')?.addEventListener('click', syncTime);
  document.getElementById('btn-blink-led')?.addEventListener('click', blinkLED);
  document.getElementById('btn-reboot')?.addEventListener('click', rebootRing);
  document.getElementById('btn-live-measure')?.addEventListener('click', () => toggleLive('hr'));
  document.getElementById('btn-live-oxy')?.addEventListener('click', () => toggleLive('spo2'));

  render();
  buildCharts();

  log('AetherRing initialized — Simulator Mode active. Tap 💍 to connect your R10.');
});
