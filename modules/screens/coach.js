// ─── Screen: AI Coach ─────────────────────────────────────────────────────────
import { chatHistory, sendMessage, COACH_PERSONA } from '../coach.js';

const QUICK_QUESTIONS = [
  "How's my sleep?",
  "Should I train today?",
  "What's my HRV telling me?",
  "Give me my weekly summary",
  "How stressed am I?",
  "What's my biological age?",
  "What should I improve?",
  "How are my steps today?",
];

export function render(container) {
  container.innerHTML = `
    <div class="coach-screen">
      <div class="coach-header">
        <div class="coach-avatar">${COACH_PERSONA.avatar}</div>
        <div>
          <h2 class="coach-name">${COACH_PERSONA.name}</h2>
          <p class="coach-subtitle">Powered by your ring data</p>
        </div>
        <div class="coach-status-dot"></div>
      </div>

      <!-- Chat Window -->
      <div class="chat-window" id="chat-window">
        ${chatHistory.map(m => _renderMessage(m)).join('')}
      </div>

      <!-- Quick Question Chips -->
      <div class="quick-q-scroll" id="quick-q-scroll">
        ${QUICK_QUESTIONS.map(q => `
          <button class="quick-q-chip" data-q="${q}">${q}</button>
        `).join('')}
      </div>

      <!-- Input Area -->
      <div class="chat-input-area">
        <input type="text" id="chat-input" class="chat-input" placeholder="Ask about your health data…" autocomplete="off"/>
        <button class="chat-send-btn" id="chat-send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function _renderMessage(msg) {
  const isCoach = msg.role === 'coach';
  const formattedText = _formatMarkdown(msg.text);
  return `
    <div class="chat-msg ${isCoach ? 'msg-coach' : 'msg-user'}">
      ${isCoach ? `<div class="msg-avatar">${COACH_PERSONA.avatar}</div>` : ''}
      <div class="msg-bubble ${isCoach ? 'bubble-coach' : 'bubble-user'}">
        ${formattedText}
        <span class="msg-time">${msg.ts}</span>
      </div>
    </div>
  `;
}

function _formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n• /g, '<br>• ')
    .replace(/\n/g, '<br>');
}

function _appendMessage(msg) {
  const window = document.getElementById('chat-window');
  if (!window) return;
  const div = document.createElement('div');
  div.innerHTML = _renderMessage(msg);
  div.className = 'msg-appear';
  window.appendChild(div.firstElementChild);
  window.scrollTop = window.scrollHeight;
}

function _showTyping() {
  const window = document.getElementById('chat-window');
  if (!window) return;
  const typing = document.createElement('div');
  typing.className = 'chat-msg msg-coach';
  typing.id = 'typing-indicator';
  typing.innerHTML = `<div class="msg-avatar">${COACH_PERSONA.avatar}</div><div class="msg-bubble bubble-coach typing-bubble"><span></span><span></span><span></span></div>`;
  window.appendChild(typing);
  window.scrollTop = window.scrollHeight;
}

function _removeTyping() {
  document.getElementById('typing-indicator')?.remove();
}

export function initEvents() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  function handleSend() {
    const text = input?.value?.trim();
    if (!text) return;
    input.value = '';

    const ts = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    _appendMessage({ role: 'user', text, ts });
    _showTyping();

    setTimeout(() => {
      _removeTyping();
      const response = sendMessage(text);
      const ts2 = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      _appendMessage({ role: 'coach', text: response, ts: ts2 });
    }, 800 + Math.random() * 600);
  }

  sendBtn?.addEventListener('click', handleSend);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

  document.querySelectorAll('.quick-q-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (input) input.value = chip.dataset.q;
      handleSend();
    });
  });

  // Scroll to bottom of chat
  const chatWin = document.getElementById('chat-window');
  if (chatWin) chatWin.scrollTop = chatWin.scrollHeight;
}

export function buildCharts() {}
