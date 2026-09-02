/* ============================================================
   StudyFlow — UI helpers: dates, icons, toasts, modals, sheets
   ============================================================ */

import { getState, uid } from './store.js';

/* ---------------- Date utilities ---------------- */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDS(ds) { // 'YYYY-MM-DD' -> Date (local)
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(ds, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return parseDS(ds).toLocaleDateString(undefined, opts);
}

export function fmtLongDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function relativeDay(ds) {
  const t0 = todayStr();
  if (ds === t0) return 'Today';
  const diff = Math.round((parseDS(ds) - parseDS(t0)) / 86400000);
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1) return `${Math.abs(diff)}d overdue`;
  return fmtDate(ds);
}

export function fmtTime12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function fmtDuration(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function courseOf(id) {
  return getState().courses.find(c => c.id === id) || null;
}

export function courseLabel(id) {
  const c = courseOf(id);
  return c ? c.code : 'General';
}

export function courseColor(id) {
  const c = courseOf(id);
  return c ? c.color : '#94A3B8';
}

/* ---------------- Icons (inline SVG, stroke style) ---------------- */
const P = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
function svg(inner, size = 24, viewBox = '0 0 24 24') {
  return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

export const ICONS = {
  home: (s) => svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>', s),
  book: (s) => svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', s),
  calendar: (s) => svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', s),
  sparkles: (s) => svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/><path d="M5 16l.7 1.6L7.3 18l-1.6.7L5 20.3l-.7-1.6L2.7 18l1.6-.4z"/>', s),
  user: (s) => svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', s),
  plus: (s) => svg('<path d="M12 5v14M5 12h14"/>', s),
  check: (s) => svg('<path d="M20 6 9 17l-5-5"/>', s),
  trash: (s) => svg('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>', s),
  edit: (s) => svg('<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>', s),
  clock: (s) => svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', s),
  flame: (s) => svg('<path d="M12 22c4.4 0 8-2.9 8-7 0-3-2-5.5-4-7.5-1 2-2.5 3-4 3 .5-3-1-6-4-8.5.5 3-1 4.5-2.5 6C4 9.5 4 11.7 4 15c0 4.1 3.6 7 8 7z"/>', s),
  target: (s) => svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', s),
  chevronLeft: (s) => svg('<path d="m15 18-6-6 6-6"/>', s),
  chevronRight: (s) => svg('<path d="m9 18 6-6-6-6"/>', s),
  x: (s) => svg('<path d="M18 6 6 18M6 6l12 12"/>', s),
  send: (s) => svg('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>', s),
  bell: (s) => svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>', s),
  settings: (s) => svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', s),
  download: (s) => svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>', s),
  award: (s) => svg('<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>', s),
  logout: (s) => svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>', s),
  layers: (s) => svg('<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>', s),
  play: (s) => svg('<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>', s),
  fileText: (s) => svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>', s),
  alert: (s) => svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', s),
  search: (s) => svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', s),
  refresh: (s) => svg('<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>', s)
};

export const PRIORITY_META = {
  low: { label: 'Low', color: '#10B981', bg: 'rgba(16,185,129,.12)' },
  medium: { label: 'Medium', color: '#F59E0B', bg: 'rgba(245,158,11,.12)' },
  high: { label: 'High', color: '#EF4444', bg: 'rgba(239,68,68,.12)' }
};

export const TYPE_META = {
  task: { label: 'Task', icon: 'check' },
  assignment: { label: 'Assignment', icon: 'fileText' },
  exam: { label: 'Exam', icon: 'award' }
};

/* ---------------- Toast ---------------- */
let toastEl = null;
export function toast(msg, icon = 'check') {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.getElementById('app-root').appendChild(toastEl);
  }
  toastEl.innerHTML = `<span class="toast-icon">${ICONS[icon] ? ICONS[icon](16) : ''}</span><span>${esc(msg)}</span>`;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

/* ---------------- Modal (bottom sheet) ---------------- */
let overlayEl = null;

export function openSheet({ title, body, onMount }) {
  closeSheet();
  overlayEl = document.createElement('div');
  overlayEl.className = 'sheet-overlay';
  overlayEl.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-grabber"></div>
      <div class="sheet-head">
        <h2>${esc(title)}</h2>
        <button class="icon-btn sheet-close" aria-label="Close">${ICONS.x(20)}</button>
      </div>
      <div class="sheet-body">${body}</div>
    </div>`;
  document.getElementById('app-root').appendChild(overlayEl);
  requestAnimationFrame(() => overlayEl.classList.add('open'));

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeSheet();
  });
  overlayEl.querySelector('.sheet-close').addEventListener('click', closeSheet);
  if (onMount) onMount(overlayEl.querySelector('.sheet'), closeSheet);
  return overlayEl.querySelector('.sheet');
}

export function closeSheet() {
  if (!overlayEl) return;
  const el = overlayEl;
  overlayEl = null;
  el.classList.remove('open');
  setTimeout(() => el.remove(), 260);
}

/* ---------------- Confirm dialog ---------------- */
export function confirmSheet({ title, message, confirmLabel = 'Delete', danger = true }) {
  return new Promise(resolve => {
    const sheet = openSheet({
      title,
      body: `
        <p class="confirm-msg">${esc(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" data-act="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${esc(confirmLabel)}</button>
        </div>`
    });
    sheet.querySelector('[data-act="cancel"]').onclick = () => { closeSheet(); resolve(false); };
    sheet.querySelector('[data-act="ok"]').onclick = () => { closeSheet(); resolve(true); };
    // closing via overlay = cancel
    const mo = new MutationObserver(() => {
      if (!document.body.contains(sheet)) { mo.disconnect(); resolve(false); }
    });
    mo.observe(document.getElementById('app-root'), { childList: true });
  });
}

/* ---------------- Form helpers ---------------- */
export function courseOptionsHTML(selectedId = '', includeGeneral = true) {
  const { courses } = getState();
  let html = includeGeneral ? `<option value="">General (no course)</option>` : '';
  courses.forEach(c => {
    html += `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${esc(c.code)} — ${esc(c.name)}</option>`;
  });
  return html;
}

export const COURSE_COLORS = ['#2E8BFF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];

export function colorPickerHTML(selected) {
  return `<div class="color-picker">${COURSE_COLORS.map(c => `
    <button type="button" class="color-dot ${c === selected ? 'sel' : ''}" data-color="${c}" style="--dot:${c}" aria-label="Color ${c}">
      ${c === selected ? ICONS.check(12) : ''}
    </button>`).join('')}</div>`;
}

export function bindColorPicker(root, onChange) {
  let current = root.querySelector('.color-dot.sel')?.dataset.color || COURSE_COLORS[0];
  root.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      current = dot.dataset.color;
      root.querySelectorAll('.color-dot').forEach(d => { d.classList.remove('sel'); d.innerHTML = ''; });
      dot.classList.add('sel');
      dot.innerHTML = ICONS.check(12);
      onChange?.(current);
    });
  });
  return () => current;
}
