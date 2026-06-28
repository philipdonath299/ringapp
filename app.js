// ─── AetherRing v2.0 — Boot + BLE Core ───────────────────────────────────────
import * as colmi from './colmiProtocol.js';
import { raw, derived, seedSimulator, minsToHM } from './modules/store.js';
import { buildCharts as homeCharts, initEvents as homeEvents, render as homeRender } from './modules/screens/home.js';
import { buildCharts as sleepCharts, initEvents as sleepEvents, render as sleepRender } from './modules/screens/sleep.js';
import { buildCharts as recCharts, initEvents as recEvents, render as recRender } from './modules/screens/recovery.js';
import { buildCharts as actCharts, initEvents as actEvents, render as actRender } from './modules/screens/activity.js';
import { buildCharts as bodyCharts, initEvents as bodyEvents, render as bodyRender } from './modules/screens/body.js';
import { buildCharts as coachCharts, initEvents as coachEvents, render as coachRender } from './modules/screens/coach.js';
import { destroyAll } from './modules/charts.js';

// ─── BLE State ────────────────────────────────────────────────────────────────
let bleDevice = null, bleServer = null;
let uartRxChar = null, uartTxChar = null;
let dataTxChar = null, dataRxChar = null;
let stepsAcc = [], hrAcc = { size: 0, range: 5, rates: [], idx: 0 };
let dataBuffer = [];

// ─── Tab Navigation ───────────────────────────────────────────────────────────
let currentTab = 'home';
const TAB_RENDERERS = {
  home:     { render: homeRender,  events: homeEvents,  charts: homeCharts },
  sleep:    { render: sleepRender, events: sleepEvents, charts: sleepCharts },
  recovery: { render: recRender,   events: recEvents,   charts: recCharts },
  activity: { render: actRender,   events: actEvents,   charts: actCharts },
  body:     { render: bodyRender,  events: bodyEvents,  charts: bodyCharts },
  coach:    { render: coachRender, events: coachEvents, charts: coachCharts },
};

function switchTab(tabId) {
  if (currentTab === tabId) return;
  currentTab = tabId;

  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.screen-container').forEach(s => {
    const isTarget = s.dataset.screen === tabId;
    s.style.display = isTarget ? 'block' : 'none';
    if (isTarget) { s.classList.add('screen-active'); }
    else { s.classList.remove('screen-active'); }
  });

  renderCurrentTab();
}

function renderCurrentTab() {
  const container = document.querySelector(`.screen-container[data-screen="${currentTab}"]`);
  if (!container) return;
  const r = TAB_RENDERERS[currentTab];
  if (!r) return;
  destroyAll();
  r.render(container);
  r.events();
  setTimeout(() => r.charts(), 60);

  // Rebind connect buttons rendered inside tabs
  rebindConnectButtons();
  rebindLiveButtons();
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  raw.theme = theme;
  localStorage.setItem('theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'light' ? '🌙' : '☀️';
}

// ─── BLE Connection ───────────────────────────────────────────────────────────
async function connectDevice() {
  if (raw.connecting) return;

  if (!navigator.bluetooth) {
    alert('Web Bluetooth is not supported.\n\nOn iPhone: use Bluefy or WebBLE app.\nOn desktop: Chrome or Edge required.');
    return;
  }

  raw.connecting = true;
  updateConnectionUI();
  log('Scanning for nearby devices…');

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
    } catch (e) { log(`Data service: ${e.message}`); }

    await uartTxChar.startNotifications();
    uartTxChar.addEventListener('characteristicvaluechanged', handleUartNotify);

    raw.connected = true;
    raw.connecting = false;
    raw.simulator = false;

    // Reset live data
    raw.today.steps = 0; raw.today.activeCalories = 0; raw.today.distance = 0;
    raw.hr.timeline = []; raw.oxygen.timeline = [];

    updateConnectionUI();
    await writeUart(colmi.CMD_BATTERY);
    await syncTime();
    log('✓ Connected. Syncing…');
    setTimeout(syncTelemetry, 1500);
  } catch (e) {
    log(`Connection failed: ${e.message}`);
    raw.connecting = false;
    updateConnectionUI();
  }
}

function onDisconnected() {
  log('Ring disconnected.');
  raw.connected = false;
  raw.realTime = { active: false, type: null, value: null };
  updateConnectionUI();
  renderCurrentTab();
}

async function disconnectDevice() {
  if (bleDevice?.gatt?.connected) bleDevice.gatt.disconnect();
}

// ─── BLE Helpers ─────────────────────────────────────────────────────────────
async function writeUart(cmd, data = null) {
  if (!uartRxChar) { log('UART not ready'); return; }
  await uartRxChar.writeValue(colmi.makePacket(cmd, data));
}

async function writeData(cmd) {
  if (!dataTxChar) return;
  await dataTxChar.writeValue(colmi.makeDataPacket(cmd));
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── Notification Handlers ────────────────────────────────────────────────────
function handleUartNotify(ev) {
  const v = new Uint8Array(ev.target.value.buffer);
  log(`RX [${Array.from(v).slice(0,4).join(',')}…]`, 'in');
  const cmd = v[0];

  if (cmd === colmi.CMD_BATTERY) {
    raw.battery.level = v[1];
    raw.battery.charging = v[2] === 1;
    updateBatteryUI();
  }

  if (cmd === colmi.CMD_START_REAL_TIME && v[2] === 0) {
    const val = v[3];
    raw.realTime.value = val;
    if (v[1] === 1) raw.hr.current = val;
    if (v[1] === 3) raw.oxygen.current = val;
    updateLivePulseUI();
  }

  if (cmd === colmi.CMD_GET_STEP_SOMEDAY) {
    if (v[1] === 255) return;
    if (v[1] === 240) { stepsAcc = []; return; }
    const cal = v[7] | (v[8] << 8);
    const stp = v[9] | (v[10] << 8);
    const dst = v[11] | (v[12] << 8);
    const ti  = v[4];
    stepsAcc.push({ ti, cal, stp, dst });
    if (v[5] === v[6] - 1) {
      raw.today.steps    = stepsAcc.reduce((s,r)=>s+r.stp, 0);
      raw.today.activeCalories = stepsAcc.reduce((s,r)=>s+r.cal, 0);
      raw.today.distance = +(stepsAcc.reduce((s,r)=>s+r.dst, 0) / 1000).toFixed(2);
      const h = Math.max(1, new Date().getHours());
      raw.today.bmr = 1800;
      raw.today.totalCalories = raw.today.activeCalories + Math.round(raw.today.bmr * (h / 24));
      const hourly = Array.from({length:24},(_,i)=>({hour:`${i}`,steps:0}));
      let low=0,med=0,high=0;
      stepsAcc.forEach(r => {
        hourly[Math.floor(r.ti/4)].steps += r.stp;
        if (r.stp > 600) high += 5;
        else if (r.stp > 200) med += 5;
        else if (r.stp > 0) low += 5;
      });
      raw.today.hourly = hourly;
      raw.today.intensity = {low,med,high};
      log('Steps synced.');
      renderCurrentTab();
    }
  }

  if (cmd === colmi.CMD_READ_HEART_RATE) {
    if (v[1] === 255) return;
    if (v[1] === 0) {
      hrAcc.size = v[2]; hrAcc.range = v[3];
      hrAcc.rates = new Array(hrAcc.size * 13).fill(0); hrAcc.idx = 0; return;
    }
    if (v[1] === 1) {
      for (let i=0;i<9;i++) hrAcc.rates[i] = v[6+i]; hrAcc.idx = 9; return;
    }
    for (let i=0;i<13;i++) if(hrAcc.idx+i < hrAcc.rates.length) hrAcc.rates[hrAcc.idx+i] = v[2+i];
    hrAcc.idx += 13;
    if (v[1] === hrAcc.size - 1) {
      const clean = hrAcc.rates.slice(0,288).filter(x => x>0 && x<220);
      if (clean.length) {
        raw.hr.timeline = hrAcc.rates.slice(0,288);
        raw.hr.min = Math.min(...clean);
        raw.hr.max = Math.max(...clean);
        raw.hr.avg = Math.round(clean.reduce((a,b)=>a+b,0)/clean.length);
        raw.hr.resting = raw.hr.min;
        log('HR synced.');
        renderCurrentTab();
      }
    }
  }
}

function handleDataNotify(ev) {
  const v = new Uint8Array(ev.target.value.buffer);
  dataBuffer.push(...v);
  if (dataBuffer.length < 6) return;
  const dataLen = (dataBuffer[3] << 8) | dataBuffer[2];
  const total = 6 + dataLen;
  if (dataBuffer.length < total) return;
  const cmd = dataBuffer[1];
  const payload = dataBuffer.slice(6, total);
  dataBuffer = dataBuffer.slice(total);
  if (cmd === colmi.DATA_REQ_SLEEP)  parseSleep(payload);
  if (cmd === colmi.DATA_REQ_OXYGEN) parseOxygen(payload);
}

function parseSleep(payload) {
  let idx = 1;
  while (idx < payload.length) {
    const rb = payload[idx+1]; if (!rb) break;
    const cnt = (rb - 4) >> 1;
    let deep=0,light=0,rem=0,awake=0;
    let ti = idx + 6;
    for (let i=0;i<cnt;i++) {
      const t=payload[ti], d=payload[ti+1];
      if(t===3)deep+=d; if(t===2)light+=d; if(t===4)rem+=d; if(t===5)awake+=d;
      ti += 2;
    }
    const asleep = deep + light + rem;
    raw.sleep.deep = deep; raw.sleep.light = light; raw.sleep.rem = rem; raw.sleep.awake = awake;
    raw.sleep.totalMin = asleep;
    raw.sleep.latency = 15;
    raw.sleep.timeInBed = asleep + awake + 15;
    raw.sleep.efficiency = Math.round((asleep / raw.sleep.timeInBed) * 100);
    raw.sleep.tosses = Math.max(1, Math.floor(awake / 4) + 1);
    raw.sleep.restfulness = Math.max(30, 100 - raw.sleep.tosses * 4);
    raw.sleep.score = Math.min(100, Math.max(30,
      Math.round((asleep/480)*55 + (deep/(asleep||1))*80)
    ));
    log('Sleep synced.');
    renderCurrentTab();
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
      raw.oxygen.timeline = rates;
      const clean = rates.filter(v=>v>0);
      if (clean.length) {
        raw.oxygen.current = clean.at(-1);
        raw.oxygen.min = Math.min(...clean);
      }
      log('SpO₂ synced.');
      renderCurrentTab();
    }
  }
}

// ─── Ring Actions ─────────────────────────────────────────────────────────────
async function syncTime() {
  const now = new Date();
  const sub = new Uint8Array([
    colmi.byteToBcd(now.getFullYear()%100), colmi.byteToBcd(now.getMonth()+1),
    colmi.byteToBcd(now.getDate()), colmi.byteToBcd(now.getHours()),
    colmi.byteToBcd(now.getMinutes()), colmi.byteToBcd(now.getSeconds()), 0x01
  ]);
  await writeUart(colmi.CMD_SET_TIME, sub);
}

async function syncTelemetry() {
  if (!raw.connected) {
    log('Simulator: refreshing…');
    seedSimulator();
    renderCurrentTab();
    return;
  }
  log('Syncing telemetry…');
  await writeUart(colmi.CMD_GET_STEP_SOMEDAY, new Uint8Array([0,0x0f,0x00,0x5f,0x01]));
  await delay(600);
  const midnight = new Date(); midnight.setHours(0,0,0,0);
  const ts = Math.floor(+midnight/1000);
  await writeUart(colmi.CMD_READ_HEART_RATE, new Uint8Array([ts&0xFF,(ts>>8)&0xFF,(ts>>16)&0xFF,(ts>>24)&0xFF]));
  await delay(600);
  if (dataTxChar) {
    await writeData(colmi.DATA_REQ_SLEEP); await delay(600);
    await writeData(colmi.DATA_REQ_OXYGEN);
  }
}

async function toggleLive(type) {
  if (raw.simulator) {
    if (raw.realTime.active && raw.realTime.type === type) {
      raw.realTime = { active: false, type: null, value: null };
    } else {
      raw.realTime = { active: true, type, value: type === 'hr' ? 72 : 98 };
      simPulse();
    }
    updateLivePulseUI(); return;
  }
  const rt = type === 'hr' ? 1 : 3;
  if (raw.realTime.active) {
    await writeUart(colmi.CMD_STOP_REAL_TIME, new Uint8Array([rt,0,0]));
    raw.realTime = { active: false, type: null, value: null };
  } else {
    await writeUart(colmi.CMD_START_REAL_TIME, new Uint8Array([rt,1]));
    raw.realTime = { active: true, type, value: '…' };
    if (type === 'hr') keepAliveHR();
  }
  updateLivePulseUI();
}

async function keepAliveHR() {
  if (!raw.realTime.active || raw.realTime.type !== 'hr' || !raw.connected) return;
  await writeUart(colmi.CMD_START_REAL_TIME, new Uint8Array([1,3]));
  setTimeout(keepAliveHR, 8000);
}

function simPulse() {
  if (!raw.realTime.active || !raw.simulator) return;
  raw.realTime.value = raw.realTime.type === 'hr'
    ? Math.round(68 + Math.random()*16 - 8)
    : Math.min(100, Math.max(95, Math.round(98 + Math.random()*3 - 1)));
  updateLivePulseUI();
  setTimeout(simPulse, 1400);
}

// ─── UI Updaters ──────────────────────────────────────────────────────────────
function updateConnectionUI() {
  // Ring button icon
  const icon = document.getElementById('ring-connect-icon');
  if (icon) icon.textContent = raw.connected ? '🔗' : raw.connecting ? '⏳' : '💍';

  // Topbar status
  const dot = document.getElementById('topbar-status-dot');
  if (dot) {
    dot.className = `status-dot ${raw.connected ? 'dot-connected' : raw.connecting ? 'dot-connecting' : 'dot-disconnected'}`;
    dot.title = raw.connected ? `Connected: ${bleDevice?.name}` : raw.connecting ? 'Connecting…' : 'Not connected';
  }

  // Battery in topbar
  updateBatteryUI();
}

function updateBatteryUI() {
  const el = document.getElementById('topbar-battery');
  if (el) el.textContent = raw.connected ? `${raw.battery.level}%` : '';
}

function updateLivePulseUI() {
  const valEl  = document.getElementById('live-value');
  const unitEl = document.getElementById('live-unit');
  const lblEl  = document.getElementById('live-label');
  const waveEl = document.getElementById('pulse-wave-svg');
  const hrBtn  = document.getElementById('btn-live-measure');
  const oxyBtn = document.getElementById('btn-live-oxy');
  if (!valEl) return;

  if (raw.realTime.active) {
    valEl.textContent  = raw.realTime.value ?? '--';
    unitEl.textContent = raw.realTime.type === 'hr' ? 'bpm' : '%';
    lblEl.textContent  = raw.realTime.type === 'hr' ? 'Live Heart Rate' : 'Live Blood Oxygen';
    valEl.style.color  = raw.realTime.type === 'hr' ? 'var(--clr-hr)' : 'var(--clr-spo2)';
    if (waveEl) waveEl.classList.add('visible');
    if (hrBtn) { hrBtn.textContent = raw.realTime.type === 'hr' ? 'Stop HR' : 'Live HR'; hrBtn.disabled = raw.realTime.type === 'spo2'; }
    if (oxyBtn) { oxyBtn.textContent = raw.realTime.type === 'spo2' ? 'Stop SpO₂' : 'Live SpO₂'; oxyBtn.disabled = raw.realTime.type === 'hr'; }
  } else {
    valEl.textContent = '--'; unitEl.textContent = 'bpm'; lblEl.textContent = 'Tap to start measuring';
    valEl.style.color = 'var(--clr-hr)';
    if (waveEl) waveEl.classList.remove('visible');
    if (hrBtn) { hrBtn.textContent = 'Live HR'; hrBtn.disabled = false; }
    if (oxyBtn) { oxyBtn.textContent = 'Live SpO₂'; oxyBtn.disabled = false; }
  }
}

function rebindConnectButtons() {
  const bindConnect = (id) => {
    document.getElementById(id)?.addEventListener('click', () =>
      raw.connected ? disconnectDevice() : connectDevice()
    );
  };
  bindConnect('btn-connect');
}

function rebindLiveButtons() {
  document.getElementById('btn-live-measure')?.addEventListener('click', () => toggleLive('hr'));
  document.getElementById('btn-live-oxy')?.addEventListener('click', () => toggleLive('spo2'));
}

// ─── Console log ──────────────────────────────────────────────────────────────
const logs = [];
function log(msg, dir = 'system') {
  const ts = new Date().toLocaleTimeString();
  logs.unshift(`${ts} ${dir==='in'?'↓':dir==='out'?'↑':'·'} ${msg}`);
  if (logs.length > 80) logs.pop();
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function startClock() {
  const tick = () => {
    const el = document.getElementById('topbar-clock');
    if (el) el.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  };
  tick(); setInterval(tick, 10000);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  applyTheme(raw.theme);
  seedSimulator();
  startClock();

  // Tab navigation
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Theme toggle
  document.getElementById('btn-theme')?.addEventListener('click', () => {
    applyTheme(raw.theme === 'dark' ? 'light' : 'dark');
  });

  // Sync button
  document.getElementById('btn-sync')?.addEventListener('click', syncTelemetry);

  // Initial render
  renderCurrentTab();

  log('AetherRing v2.0 ready — Simulator active. Connect your R10 via the 💍 button.');
});
