// ─── AetherRing v2 — AI Health Coach ─────────────────────────────────────────
// Rule-based health intelligence coach powered by ring data analysis.

import { raw, derived, minsToHM } from './store.js';
import { getDailyCoachMessage, getWeeklySummary, getHRVInsight, getSleepInsight, getRHRInsight, getReadinessInsight } from './analytics.js';

const COACH_PERSONA = {
  name: 'AetherAI',
  avatar: '🤖',
  greeting: "Hi! I'm AetherAI, your personal health coach. I've analyzed your ring data and I'm here to help you understand your body better. Ask me anything!",
};

// ─── Intent Matching ──────────────────────────────────────────────────────────
const INTENTS = [
  {
    patterns: ['sleep', 'tired', 'rest', 'bed', 'insomnia', 'rem', 'deep sleep', 'awake'],
    respond: () => buildSleepResponse(),
  },
  {
    patterns: ['hrv', 'heart rate variability', 'recovery', 'nervous system'],
    respond: () => buildHRVResponse(),
  },
  {
    patterns: ['resting heart rate', 'rhr', 'heart rate', 'pulse', 'heart'],
    respond: () => buildHRResponse(),
  },
  {
    patterns: ['oxygen', 'spo2', 'breathing', 'blood oxygen', 'saturation'],
    respond: () => buildSpO2Response(),
  },
  {
    patterns: ['readiness', 'ready', 'should i train', 'workout today', 'exercise today'],
    respond: () => buildReadinessResponse(),
  },
  {
    patterns: ['steps', 'walk', 'activity', 'move', 'calories', 'active', 'sedentary'],
    respond: () => buildActivityResponse(),
  },
  {
    patterns: ['stress', 'anxiety', 'tense', 'relax', 'calm', 'breathe'],
    respond: () => buildStressResponse(),
  },
  {
    patterns: ['summary', 'week', 'weekly', 'how am i doing', 'overall', 'health score'],
    respond: () => buildWeeklySummaryResponse(),
  },
  {
    patterns: ['age', 'biological age', 'longevity', 'how old', 'lifespan'],
    respond: () => buildBioAgeResponse(),
  },
  {
    patterns: ['improve', 'tip', 'advice', 'recommendation', 'better', 'optimize'],
    respond: () => buildTopRecommendation(),
  },
  {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
    respond: () => getDailyCoachMessage(),
  },
];

function matchIntent(text) {
  const lower = text.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.patterns.some(p => lower.includes(p))) return intent.respond();
  }
  return buildFallback(text);
}

// ─── Response Builders ────────────────────────────────────────────────────────
function buildSleepResponse() {
  const s = raw.sleep;
  const score = s.score;
  const eff = s.efficiency;
  const deep = s.deep;
  const rem = s.rem;

  let msg = `**Your sleep last night:**\n\n`;
  msg += `• Score: **${score}/100** — ${score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 55 ? 'fair' : 'poor'}\n`;
  msg += `• Total sleep: **${minsToHM(s.totalMin)}** (in bed ${minsToHM(s.timeInBed)})\n`;
  msg += `• Deep sleep: **${minsToHM(deep)}** ${deep >= 90 ? '✅' : '⚠️ aim for 90+ min'}\n`;
  msg += `• REM sleep: **${minsToHM(rem)}** ${rem >= 90 ? '✅' : '⚠️ aim for 90+ min'}\n`;
  msg += `• Efficiency: **${eff}%** ${eff >= 88 ? '✅' : '⚠️'}\n\n`;
  msg += `💡 ${getSleepInsight()}`;
  return msg;
}

function buildHRVResponse() {
  const hrv = derived.hrv;
  let msg = `**Your HRV today: ${hrv}ms**\n\n`;
  msg += hrv >= 55 ? '🟢 Excellent — your autonomic nervous system is well balanced.\n\n'
       : hrv >= 40 ? '🟡 Normal — within your typical range.\n\n'
       : '🔴 Suppressed — your body is under more stress than usual.\n\n';
  msg += `${getHRVInsight()}\n\n`;
  msg += `**Tips to raise HRV:**\n• Box breathing (4-4-4-4) daily\n• Zone 2 cardio 3×/week\n• 7–9h quality sleep\n• Reduce alcohol`;
  return msg;
}

function buildHRResponse() {
  const rhr = raw.hr.resting;
  let msg = `**Your resting heart rate: ${rhr} bpm**\n\n`;
  msg += rhr <= 55 ? '🟢 Excellent — athlete-level efficiency.\n\n'
       : rhr <= 65 ? '🟡 Good — healthy cardiovascular function.\n\n'
       : '🔴 Elevated — could indicate stress, dehydration, or fatigue.\n\n';
  msg += `${getRHRInsight()}\n\n`;
  msg += `**Estimated heart age:** ${derived.heartAge} years\n`;
  msg += `**VO₂ Max estimate:** ~${derived.vo2max} ml/kg/min`;
  return msg;
}

function buildSpO2Response() {
  const spo2 = raw.oxygen.current;
  let msg = `**Your blood oxygen (SpO₂): ${spo2}%**\n\n`;
  msg += spo2 >= 97 ? '🟢 Excellent — optimal oxygen saturation.\n\n'
       : spo2 >= 95 ? '🟡 Normal — within healthy range.\n\n'
       : '🔴 Below optimal — worth monitoring closely.\n\n';
  msg += `Normal range is 95–100%. Values consistently below 94% during sleep may warrant a sleep study.\n\n`;
  msg += `**Improvement tips:**\n• Diaphragmatic breathing exercises\n• Regular aerobic exercise\n• Check sleep position (side sleeping improves SpO₂)`;
  return msg;
}

function buildReadinessResponse() {
  const r = derived.readiness;
  let msg = `**Your readiness score today: ${r}/100**\n\n`;
  if (r >= 85) {
    msg += '🟢 **Go for it!** Your body is primed for high performance. Great day for intense training or demanding work.\n\n';
  } else if (r >= 70) {
    msg += '🟡 **Moderate.** You can train, but stay below maximum intensity. Listen to your body.\n\n';
  } else if (r >= 55) {
    msg += '🟠 **Easy day.** Keep it light — yoga, walking, or stretching. Prioritize sleep tonight.\n\n';
  } else {
    msg += '🔴 **Rest day.** Your biology is clearly asking for recovery. Skip training. Focus on sleep, hydration, and low stress.\n\n';
  }
  msg += `${getReadinessInsight()}\n\n`;
  msg += `**Key contributors:**\n• Resting HR: ${raw.hr.resting} bpm\n• HRV: ${derived.hrv} ms\n• Sleep quality: ${raw.sleep.score}/100`;
  return msg;
}

function buildActivityResponse() {
  const steps = raw.today.steps;
  const goal = raw.today.goal;
  const pct = Math.round((steps / goal) * 100);
  const remaining = Math.max(0, goal - steps);

  let msg = `**Your activity today:**\n\n`;
  msg += `• Steps: **${steps.toLocaleString()}** / ${goal.toLocaleString()} (${pct}%)\n`;
  msg += `• Distance: **${raw.today.distance} km**\n`;
  msg += `• Active calories: **${raw.today.activeCalories} kcal**\n`;
  msg += `• Active minutes: **${raw.today.activeMinutes} min**\n`;
  msg += `• Sedentary time: **${minsToHM(raw.today.inactiveMinutes)}**\n\n`;

  if (remaining > 0) {
    const walkMin = Math.round(remaining / 100);
    msg += `💡 You need **${remaining.toLocaleString()} more steps** to hit your goal — that's about a **${walkMin}-minute walk**.\n\n`;
  } else {
    msg += `✅ Goal achieved! Great movement today.\n\n`;
  }

  if (raw.today.inactiveMinutes > 360) {
    msg += `⚠️ You've been sedentary for ${minsToHM(raw.today.inactiveMinutes)}. Try standing and moving for 5 minutes every hour.`;
  }
  return msg;
}

function buildStressResponse() {
  const stress = derived.stressScore;
  const hrv = derived.hrv;

  let msg = `**Your estimated stress level: ${stress}/100**\n\n`;
  msg += stress < 30 ? '🟢 Low stress — your body is calm and balanced.\n\n'
       : stress < 55 ? '🟡 Moderate stress — normal for an active life. Watch for patterns.\n\n'
       : '🔴 High stress — your nervous system is under significant load. Recovery is key.\n\n';

  msg += `Your HRV of **${hrv}ms** is the main stress indicator — ${hrv >= 45 ? 'it looks healthy' : 'it\'s suppressed, suggesting high physiological stress'}.\n\n`;
  msg += `**Quick stress relief:**\n• 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s\n• 5-minute walk in nature\n• Progressive muscle relaxation\n• Limit news and social media for the day`;
  return msg;
}

function buildWeeklySummaryResponse() {
  const summary = getWeeklySummary();
  let msg = `**Your 7-Day Health Summary:**\n\n`;
  summary.items.forEach(item => {
    const arrow = item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→';
    msg += `• ${item.label}: **${item.value}** ${arrow}\n`;
  });
  msg += `\n${summary.narrative}\n\n`;
  msg += `**Overall health score: ${derived.healthScore}/100**`;
  return msg;
}

function buildBioAgeResponse() {
  const bio = derived.biologicalAge;
  const longevity = derived.longevityScore;
  let msg = `**Biological Age Estimate: ${bio} years**\n\n`;
  msg += `Based on your HRV, resting heart rate, sleep quality, and activity patterns, your biological markers suggest you're performing at the level of a typical ${bio}-year-old.\n\n`;
  msg += `**Longevity Score: ${longevity}/100**\n\n`;
  msg += bio < 30 ? '🟢 Excellent biological health markers. Keep up your current lifestyle!\n\n'
       : bio < 35 ? '🟡 Good markers. Small consistent improvements compound significantly over time.\n\n'
       : '🔴 Your markers suggest some areas need attention — focus on sleep, HRV, and regular exercise.\n\n';
  msg += `The biggest levers for biological age reversal: **sleep quality, HRV improvement, and daily movement.**`;
  return msg;
}

function buildTopRecommendation() {
  const r = derived.readiness;
  const sleep = raw.sleep.score;
  const hrv = derived.hrv;
  const steps = raw.today.steps;

  // Find biggest opportunity
  const opportunities = [
    { score: 100 - sleep, label: 'sleep quality', tip: 'Set a fixed wake time and avoid screens 60 min before bed.' },
    { score: 100 - Math.min(100, (hrv / 70) * 100), label: 'HRV', tip: 'Add 5 minutes of box breathing daily. It\'s the fastest HRV booster.' },
    { score: Math.max(0, 100 - (steps / raw.today.goal) * 100), label: 'daily steps', tip: `You need ${(raw.today.goal - steps).toLocaleString()} more steps today.` },
    { score: 100 - r, label: 'readiness', tip: 'Your readiness will improve most from better sleep consistency.' },
  ].sort((a,b) => b.score - a.score);

  const top = opportunities[0];
  return `**Your biggest opportunity right now: ${top.label}**\n\n${top.tip}\n\nFocusing on this one thing consistently for 2 weeks will produce the most measurable improvement in your health score.`;
}

function buildFallback(text) {
  return `I analyzed your health data but didn't recognize a specific metric in your question. Here's what I can help with:\n\n• **Sleep** — quality, stages, efficiency, debt\n• **HRV** — heart rate variability and recovery\n• **Heart rate** — resting HR and trends\n• **Readiness** — how ready to train today\n• **Activity** — steps, calories, intensity\n• **Stress** — stress score and relief tips\n• **Weekly summary** — 7-day overview\n• **Biological age** — longevity estimate\n• **Improvement tips** — what to focus on\n\nTry asking: "How's my sleep?" or "Should I train today?"`;
}

// ─── Chat History ─────────────────────────────────────────────────────────────
export const chatHistory = [
  { role: 'coach', text: COACH_PERSONA.greeting, ts: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) },
  { role: 'coach', text: getDailyCoachMessage(), ts: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) },
];

export function sendMessage(userText) {
  const ts = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  chatHistory.push({ role: 'user', text: userText, ts });
  const response = matchIntent(userText);
  chatHistory.push({ role: 'coach', text: response, ts });
  return response;
}

export { COACH_PERSONA };
