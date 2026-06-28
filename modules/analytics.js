// ─── AetherRing v2 — Analytics & Insights Engine ────────────────────────────
// Generates AI-style text insights, recommendations, and correlations.

import { raw, derived, minsToHM } from './store.js';

// ─── Insight Database ─────────────────────────────────────────────────────────
const INSIGHTS = {
  sleep: {
    optimal: [
      "Your body completed full sleep cycles with excellent deep and REM phases. This is when growth hormone is released and memories consolidate.",
      "Exceptional sleep last night. Your brain cleared metabolic waste efficiently — a process linked to long-term cognitive health.",
      "Top-tier recovery sleep. Your deep sleep percentage suggests optimal cellular repair.",
    ],
    good: [
      "Solid sleep with good recovery. Your body went through most of its natural repair processes.",
      "Good sleep quality. A bit more deep sleep would push this to optimal — consider a consistent bedtime.",
      "You got enough sleep for most recovery functions. Small improvements to sleep timing could boost your score further.",
    ],
    fair: [
      "Your sleep was somewhat fragmented last night. This may increase cortisol levels today — prioritize low-stress activities.",
      "Below-average sleep. Your body likely didn't complete all repair cycles. Consider an earlier bedtime tonight.",
      "Disrupted sleep patterns detected. Consistent sleep/wake times are the single most impactful improvement you can make.",
    ],
    attention: [
      "Significant sleep disruption. Today, focus on light activity and stress management to compensate.",
      "Very low sleep quality. Consider identifying sleep disruptors: light, temperature, caffeine after 2pm, or screen time.",
      "Your body didn't get adequate restoration time. A 20-minute nap before 3pm can partially offset this.",
    ],
  },
  hrv: {
    high: "Your HRV is elevated, indicating your autonomic nervous system is well-balanced and your body is in full recovery mode.",
    normal: "HRV within your personal baseline range. Your nervous system is balanced between recovery and readiness.",
    low: "HRV is suppressed, which often follows intense training, poor sleep, alcohol, or high stress. Prioritize recovery today.",
    veryLow: "Significantly suppressed HRV — your body is signaling it needs rest. This is not a day for hard workouts.",
  },
  rhr: {
    optimal: "Resting heart rate is in the athlete range — a strong cardiovascular efficiency marker.",
    good: "Healthy resting heart rate. Your heart is pumping efficiently.",
    elevated: "Slightly elevated resting HR. Common causes: dehydration, stress, alcohol, or early illness. Monitor for trends.",
    high: "Elevated resting heart rate may indicate overtraining, illness onset, or high stress. Consider rest today.",
  },
  spo2: {
    optimal: "Blood oxygen saturation is excellent. Your respiratory system is functioning optimally.",
    good: "Normal blood oxygen. Minor dips can occur during movement or cold environments.",
    low: "SpO₂ dipped below optimal range. This can affect cognitive performance. Monitor closely.",
  },
};

const RECOMMENDATIONS = {
  sleep: [
    { icon: '🌡', text: 'Keep bedroom temperature between 16–19°C (60–67°F) for optimal deep sleep.' },
    { icon: '📱', text: 'Avoid screens 60 minutes before bed — blue light suppresses melatonin by up to 50%.' },
    { icon: '☕', text: 'Caffeine has a 6-hour half-life. Avoid after 2pm if you sleep at 10pm.' },
    { icon: '🕐', text: 'Consistent sleep/wake times are more impactful than total sleep duration for quality.' },
    { icon: '🧘', text: 'A 10-minute wind-down routine (reading, stretching, breathing) reduces sleep latency.' },
    { icon: '🍷', text: 'Alcohol fragments sleep architecture and suppresses REM. Avoid within 3 hours of bed.' },
  ],
  hrv: [
    { icon: '🧘', text: 'Box breathing (4-4-4-4 count) for 5 minutes increases HRV measurably within minutes.' },
    { icon: '🏃', text: 'Zone 2 cardio (conversational pace) 3×/week is the most evidence-backed HRV booster.' },
    { icon: '💧', text: 'Dehydration reduces HRV. Aim for 35ml of water per kg of bodyweight.' },
    { icon: '🥗', text: 'Anti-inflammatory diet rich in omega-3s supports autonomic nervous system health.' },
    { icon: '😴', text: 'HRV responds dramatically to sleep quality. Even one bad night can drop it 20–40%.' },
  ],
  rhr: [
    { icon: '🏃', text: 'Consistent aerobic exercise is the most effective way to lower resting heart rate over time.' },
    { icon: '🧘', text: 'Daily meditation (even 10 min) measurably reduces resting heart rate within weeks.' },
    { icon: '💧', text: 'Staying well-hydrated reduces the heart\'s workload, lowering HR by 2–4 bpm.' },
    { icon: '🍷', text: 'Alcohol raises resting heart rate even days after consumption.' },
  ],
  activity: [
    { icon: '🚶', text: 'Breaking up sitting every 30 minutes with 2-minute walks reduces metabolic risk factors.' },
    { icon: '📈', text: 'Increasing steps by just 2,000/day reduces cardiovascular mortality risk by 8%.' },
    { icon: '🏋️', text: '150 min/week of moderate activity is the WHO minimum for significant health benefits.' },
    { icon: '⚡', text: '2 weekly strength training sessions preserve muscle mass and boost metabolic rate.' },
  ],
  spo2: [
    { icon: '🧘', text: 'Diaphragmatic breathing exercises improve baseline SpO₂ and lung capacity.' },
    { icon: '🌿', text: 'Regular aerobic exercise improves oxygen uptake efficiency (VO₂ max).' },
    { icon: '💧', text: 'Good hydration supports optimal blood viscosity and oxygen transport.' },
  ],
};

// ─── Main Insight Generator ───────────────────────────────────────────────────
export function getSleepInsight() {
  const s = raw.sleep.score;
  const status = s >= 85 ? 'optimal' : s >= 70 ? 'good' : s >= 55 ? 'fair' : 'attention';
  const arr = INSIGHTS.sleep[status];
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getHRVInsight() {
  const hrv = derived.hrv;
  if (hrv >= 55) return INSIGHTS.hrv.high;
  if (hrv >= 40) return INSIGHTS.hrv.normal;
  if (hrv >= 28) return INSIGHTS.hrv.low;
  return INSIGHTS.hrv.veryLow;
}

export function getRHRInsight() {
  const rhr = raw.hr.resting;
  if (rhr <= 55) return INSIGHTS.rhr.optimal;
  if (rhr <= 65) return INSIGHTS.rhr.good;
  if (rhr <= 75) return INSIGHTS.rhr.elevated;
  return INSIGHTS.rhr.high;
}

export function getSpO2Insight() {
  const spo2 = raw.oxygen.current;
  if (spo2 >= 97) return INSIGHTS.spo2.optimal;
  if (spo2 >= 95) return INSIGHTS.spo2.good;
  return INSIGHTS.spo2.low;
}

export function getReadinessInsight() {
  const r = derived.readiness;
  if (r >= 85) return 'Your body is primed for peak performance. This is a great day for high-intensity training or any demanding mental work.';
  if (r >= 70) return 'Good readiness for moderate activity. You can train, but listen to your body and don\'t push to maximum intensity.';
  if (r >= 55) return 'Your body is still in recovery mode. Opt for low-intensity movement, stretching, or yoga. Focus on sleep tonight.';
  return 'Your body is clearly signaling it needs rest. Prioritize sleep, hydration, and stress management. Skip intense training today.';
}

export function getDailyCoachMessage() {
  const r = derived.readiness;
  const sleep = raw.sleep.score;
  const hrv = derived.hrv;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const msgs = [];
  if (r >= 85) msgs.push(`${greeting}! Your body is in excellent shape today. ${getReadinessInsight()}`);
  else if (r >= 70) msgs.push(`${greeting}. You're doing well. ${getReadinessInsight()}`);
  else msgs.push(`${greeting}. Your body is asking for recovery today. ${getReadinessInsight()}`);

  if (sleep < 70) msgs.push('Last night\'s sleep was below your baseline — consider an earlier bedtime tonight to rebuild your sleep bank.');
  if (hrv < 35) msgs.push('Your HRV is suppressed. This is a signal to reduce training load and prioritize stress management today.');
  if (raw.today.steps < raw.today.goal * 0.5 && hour > 14) msgs.push(`You\'re at ${raw.today.steps.toLocaleString()} steps — a brisk 20-minute walk would cover your remaining goal.`);

  return msgs.join(' ');
}

export function getWeeklySummary() {
  const avgSleep = Math.round(derived.avg7('sleepScore'));
  const avgHRV   = Math.round(derived.avg7('hrv'));
  const avgRHR   = Math.round(derived.avg7('restingHr'));
  const avgSteps = derived.avg7('steps');

  return {
    title: 'Your 7-Day Summary',
    items: [
      { label: 'Average Sleep Score', value: avgSleep + '/100', trend: derived.trend(raw.history.sleepScore) },
      { label: 'Average HRV', value: avgHRV + ' ms', trend: derived.trend(raw.history.hrv) },
      { label: 'Average Resting HR', value: avgRHR + ' bpm', trend: derived.trend(raw.history.restingHr) },
      { label: 'Average Steps', value: avgSteps.toLocaleString(), trend: derived.trend(raw.history.steps) },
    ],
    narrative: `This week your recovery averaged ${avgSleep >= 80 ? 'strong' : avgSleep >= 65 ? 'moderate' : 'below target'} with a sleep score of ${avgSleep}. Your HRV of ${avgHRV}ms ${avgHRV >= 45 ? 'reflects healthy autonomic tone' : 'is trending below your optimal range — prioritize recovery'}. Resting HR of ${avgRHR} bpm is ${avgRHR <= 60 ? 'excellent' : avgRHR <= 70 ? 'healthy' : 'slightly elevated — watch for overtraining or lifestyle factors'}.`,
  };
}

export function getCorrelations() {
  return [
    { from: 'HRV', to: 'Sleep Score', strength: 0.78, direction: 'positive', note: 'Higher HRV nights typically follow better sleep.' },
    { from: 'Steps', to: 'Sleep Quality', strength: 0.52, direction: 'positive', note: 'Days with >8,000 steps show improved sleep scores.' },
    { from: 'Resting HR', to: 'HRV', strength: 0.71, direction: 'negative', note: 'Elevated resting HR is associated with reduced HRV.' },
    { from: 'Sleep Debt', to: 'Readiness', strength: 0.83, direction: 'negative', note: 'Accumulated sleep debt strongly predicts low readiness.' },
  ];
}

export function getPrediction(key) {
  const arr = raw.history[key];
  if (!arr || arr.length < 4) return null;
  // Simple linear regression on last 7 days
  const n = arr.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  arr.forEach((y, i) => { const x = n - 1 - i; sumX += x; sumY += y; sumXY += x*y; sumX2 += x*x; });
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const next3 = [1,2,3].map(d => Math.round(intercept + slope * (n - 1 + d)));
  return { next3, direction: slope > 1 ? 'improving' : slope < -1 ? 'declining' : 'stable' };
}

export function getRecommendations(category) {
  return RECOMMENDATIONS[category] || [];
}

// ─── Why This Matters content ─────────────────────────────────────────────────
export const WHY_MATTERS = {
  hrv: 'HRV is your body\'s most sensitive recovery marker. High HRV indicates the autonomic nervous system can quickly adapt to challenges — physically, mentally, and emotionally. Research consistently links higher HRV to lower cardiovascular risk, better stress resilience, and improved athletic performance.',
  rhr: 'Resting heart rate reflects your cardiovascular efficiency. A lower RHR means your heart pumps more blood per beat. Every 10bpm decrease in RHR is associated with a 30% reduction in cardiovascular events according to large population studies.',
  sleep: 'Sleep is when your body heals, your brain consolidates memories, and your hormones reset. Even one night of poor sleep increases cortisol, reduces testosterone, impairs glucose regulation, and suppresses immune function.',
  spo2: 'Blood oxygen saturation reflects how efficiently your lungs transfer oxygen to your bloodstream. Drops below 95% even briefly during sleep can stress the cardiovascular system and impair cognitive function the following day.',
  readiness: 'Readiness represents your body\'s overall capacity to perform and recover. It integrates heart, sleep, and recovery data to tell you not just how you feel, but what your biology is actually ready for.',
  activity: 'Physical activity is the most potent preventive medicine available. Regular movement reduces all-cause mortality by up to 35%, improves mental health equivalently to antidepressants, and slows biological aging.',
};

export const HOW_TO_IMPROVE = {
  hrv: ['Practice daily diaphragmatic breathing', 'Add Zone 2 cardio 3× per week', 'Reduce alcohol to <2 drinks/week', 'Prioritize 7–9 hours of sleep', 'Manage stress via meditation or nature walks'],
  rhr: ['30+ minutes of cardio 5×/week', 'Daily meditation practice', 'Stay well hydrated', 'Reduce caffeine and alcohol', 'Practice slow breathing exercises'],
  sleep: ['Set a fixed wake time 7 days/week', 'Cool bedroom to 17–19°C', 'No screens 1 hour before bed', 'Avoid caffeine after 2pm', 'Create a relaxing pre-bed routine'],
  spo2: ['Practice deep breathing daily', 'Aerobic exercise improves lung efficiency', 'Maintain healthy sleep positions', 'Check for sleep apnea if consistently low', 'Stay well hydrated'],
  activity: ['Set hourly movement reminders', 'Walk during calls', 'Take stairs always', 'Do 2 strength sessions/week', 'Aim for 8,000–10,000 steps daily'],
};
