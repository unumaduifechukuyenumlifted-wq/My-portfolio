/* ============================================================
   StudyFlow — App shell: navigation, routing, lifecycle
   ============================================================ */

import { init, subscribe } from './store.js';
import { ICONS } from './helpers.js';
import { renderHome } from './screens/home.js';
import { renderCourses } from './screens/courses.js';
import { renderPlanner, startReminders } from './screens/planner.js';
import { renderAI } from './screens/ai.js';
import { renderProfile } from './screens/profile.js';

const TABS = [
  { id: 'home',    label: 'Home',    icon: 'home' },
  { id: 'courses', label: 'Courses', icon: 'book' },
  { id: 'planner', label: 'Planner', icon: 'calendar' },
  { id: 'ai',      label: 'AI',      icon: 'sparkles' },
  { id: 'profile', label: 'Profile', icon: 'user' }
];

const RENDERERS = { home: renderHome, courses: renderCourses, planner: renderPlanner, ai: renderAI, profile: renderProfile };

let currentTab = 'home';
let screenEls = {};
let navEl = null;

function buildShell() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="phone">
      <div class="statusbar">
        <span id="sb-time"></span>
        <span class="sb-icons">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.3" y="4.7" width="3" height="7.3" rx="1"/><rect x="8.6" y="2.3" width="3" height="9.7" rx="1"/><rect x="12.9" y="0" width="3" height="12" rx="1"/></svg>
          <svg width="16" height="12" viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 7.5C7.5 2.5 16.5 2.5 22 7.5"/><path d="M5.5 11.2c3.6-3.2 9.4-3.2 13 0"/><path d="M9 14.8c1.6-1.4 4.4-1.4 6 0"/><circle cx="12" cy="17.4" r="0.6" fill="currentColor"/></svg>
          <svg width="24" height="12" viewBox="0 0 26 12" fill="none"><rect x="1" y="1" width="20" height="10" rx="3" stroke="currentColor" stroke-opacity=".45" stroke-width="1.4"/><rect x="3" y="3" width="14" height="6" rx="1.6" fill="currentColor"/><path d="M23.2 4.2v3.6c1-.4 1.6-1 1.6-1.8s-.6-1.4-1.6-1.8z" fill="currentColor" fill-opacity=".45"/></svg>
        </span>
      </div>
      <main class="screens" id="screens">
        ${TABS.map(t => `<section class="screen" id="screen-${t.id}" ${t.id === currentTab ? '' : 'hidden'}></section>`).join('')}
      </main>
      <div id="reminder-host"></div>
      <nav class="bottom-nav" id="bottom-nav">
        ${TABS.map(t => `
          <button class="nav-btn ${t.id === currentTab ? 'active' : ''}" data-tab="${t.id}" aria-label="${t.label}">
            <span class="nav-icon">${ICONS[t.icon](22)}</span>
            <span class="nav-label">${t.label}</span>
          </button>`).join('')}
      </nav>
      <div class="home-indicator"></div>
    </div>`;

  TABS.forEach(t => screenEls[t.id] = document.getElementById(`screen-${t.id}`));
  navEl = document.getElementById('bottom-nav');

  navEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) navigate(btn.dataset.tab);
  });

  // statusbar clock
  const tickClock = () => {
    const el = document.getElementById('sb-time');
    if (el) el.textContent = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };
  tickClock();
  setInterval(tickClock, 20000);
}

function navigate(tab) {
  if (!RENDERERS[tab]) return;
  const prev = currentTab;
  currentTab = tab;

  navEl.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  TABS.forEach(t => {
    const el = screenEls[t.id];
    if (t.id === tab) {
      el.hidden = false;
      el.classList.remove('screen-enter');
      void el.offsetWidth; // restart animation
      el.classList.add('screen-enter');
    } else {
      el.hidden = true;
    }
  });

  render(tab);
  // deep link support
  if (location.hash.slice(1) !== tab) history.replaceState(null, '', `#${tab}`);
  if (prev !== tab) document.querySelector('.screens')?.scrollTo?.({ top: 0 });
  try { window.scrollTo?.({ top: 0 }); } catch (_) { /* noop */ }
}

function render(tab) {
  const el = screenEls[tab];
  if (!el) return;
  const rerender = () => RENDERERS[tab](el, { rerender });
  RENDERERS[tab](el, { rerender });
}

function boot() {
  init();
  buildShell();

  // global nav hook for cross-screen links
  window.__sf_nav = (tab) => navigate(tab);

  const start = (location.hash.slice(1) in RENDERERS) ? location.hash.slice(1) : 'home';
  currentTab = start;
  navEl.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === start));
  TABS.forEach(t => { screenEls[t.id].hidden = t.id !== start; });
  render(start);

  // reminders (in-app banner + optional notifications)
  startReminders(() => document.getElementById('reminder-host'));

  // re-render current tab when settings ask for it
  document.addEventListener('sf-rerender', () => render(currentTab));

  // swipe-ish back navigation between tabs (left/right on Home only)
  let touchX = null;
  document.getElementById('screens').addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  document.getElementById('screens').addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 90) return;
    const idx = TABS.findIndex(t => t.id === currentTab);
    if (dx < 0 && idx < TABS.length - 1) navigate(TABS[idx + 1].id);
    else if (dx > 0 && idx > 0) navigate(TABS[idx - 1].id);
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', boot);
