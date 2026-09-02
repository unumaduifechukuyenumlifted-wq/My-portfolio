/* ============================================================
   StudyFlow — AI screen (Flow AI chat)
   ============================================================ */

import { getState, getChat, addMessage, clearChat } from '../store.js';
import { ICONS, esc, toast, confirmSheet } from '../helpers.js';
import { flowAIResponse, QUICK_PROMPTS } from '../ai.js';

let scroller = null;

export function renderAI(el, { rerender }) {
  const chat = getChat();

  el.innerHTML = `
  <div class="screen-inner ai-screen">
    <header class="screen-head row ai-head">
      <div class="ai-id">
        <div class="ai-avatar">${ICONS.sparkles(20)}</div>
        <div>
          <h1>Flow AI</h1>
          <p class="ai-status"><span class="status-dot"></span> Your personal study assistant</p>
        </div>
      </div>
      <button class="icon-btn" id="ai-clear" aria-label="Clear chat">${ICONS.refresh(18)}</button>
    </header>

    <div class="chat-scroll" id="chat-scroll">
      <div class="chat-msgs" id="chat-msgs"></div>
      <div class="quick-chips" id="quick-chips">
        ${QUICK_PROMPTS.map(p => `<button class="chip-btn">${esc(p)}</button>`).join('')}
      </div>
    </div>

    <form class="chat-input-bar" id="chat-form">
      <input type="text" id="chat-input" placeholder="Ask Flow AI anything…" autocomplete="off" maxlength="4000">
      <button type="submit" class="send-btn" aria-label="Send">${ICONS.send(18)}</button>
    </form>
  </div>`;

  scroller = el.querySelector('#chat-scroll');
  const msgsEl = el.querySelector('#chat-msgs');
  const input = el.querySelector('#chat-input');
  const form = el.querySelector('#chat-form');

  // Render stored history
  if (chat.length === 0) {
    msgsEl.innerHTML = welcomeBubble();
  } else {
    chat.forEach(m => msgsEl.appendChild(bubbleEl(m.role, m.text)));
  }
  scrollChat(false);

  el.querySelector('#ai-clear').onclick = async () => {
    if (!getChat().length) { toast('Chat is already empty'); return; }
    const ok = await confirmSheet({ title: 'Clear chat?', message: 'Your conversation with Flow AI will be deleted.', confirmLabel: 'Clear', danger: false });
    if (ok) { clearChat(); rerender(); }
  };

  el.querySelector('#quick-chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip-btn');
    if (!b) return;
    input.value = b.textContent;
    send();
  });

  form.addEventListener('submit', (e) => { e.preventDefault(); send(); });

  function send() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    appendBubble('user', text);
    scrollChat(true);

    // typing indicator
    const typing = document.createElement('div');
    typing.className = 'chat-row ai';
    typing.innerHTML = `<div class="bubble ai typing"><span></span><span></span><span></span></div>`;
    msgsEl.appendChild(typing);
    scrollChat(true);

    const reply = flowAIResponse(text);
    const delay = Math.min(600 + reply.length * 3, 1800);
    setTimeout(() => {
      typing.remove();
      addMessage('ai', reply);
      const b = appendBubble('ai', '');
      typeWriter(b.querySelector('.bubble-text'), reply, () => scrollChat(true));
    }, delay);
  }

  function appendBubble(role, text) {
    const row = bubbleEl(role, text);
    msgsEl.appendChild(row);
    return row;
  }
}

function welcomeBubble() {
  return `
  <div class="chat-row ai">
    <div class="bubble ai">
      <div class="bubble-text">Hi, I'm **Flow AI** ✨ your personal study assistant.

I know your courses, exams and schedule — and I can help you:

• 🗓️ **Create a study plan** for your exams
• ⏱️ **Calculate** how many hours to study each day
• ❓ **Generate practice questions** for any course
• 📝 **Summarize your notes** — just paste them here
• 💡 **Explain any topic** simply

Tap a suggestion below or type your question!</div>
    </div>
  </div>`;
}

function bubbleEl(role, text) {
  const row = document.createElement('div');
  row.className = `chat-row ${role}`;
  row.innerHTML = `<div class="bubble ${role}"><div class="bubble-text">${renderRich(text)}</div></div>`;
  return row;
}

/* Minimal markdown: **bold**, *italic*, `code`, ## headings, • lists, newlines */
export function renderRich(text) {
  let s = esc(text);
  s = s.replace(/^## (.+)$/gm, '<span class="md-h">$1</span>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function typeWriter(target, text, onTick) {
  // chunked typing for a natural streaming feel
  let i = 0;
  const chunk = Math.max(3, Math.round(text.length / 90));
  const tick = () => {
    i = Math.min(text.length, i + chunk);
    target.innerHTML = renderRich(text.slice(0, i));
    onTick?.();
    if (i < text.length) requestAnimationFrame(() => setTimeout(tick, 16));
  };
  tick();
}

function scrollChat(smooth) {
  if (scroller?.scrollTo) scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  else if (scroller) scroller.scrollTop = scroller.scrollHeight;
}
