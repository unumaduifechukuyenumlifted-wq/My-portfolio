/* ============================================================
   StudyFlow — Planner screen (calendar + tasks + sessions)
   ============================================================ */

import { getState, getTasks, getSessions, todayStr, dateStr } from '../store.js';
import { ICONS, esc, relativeDay, fmtDate, fmtTime12, fmtDuration, courseColor, courseLabel, toast } from '../helpers.js';
import { taskCardHTML, sessionCardHTML, bindCardActions, openTaskForm, openSessionForm } from '../components.js';

const state = {
  view: new Date(),        // month being viewed
  selected: todayStr(),    // selected day
  filter: 'all'            // all | tasks | assignments | exams | sessions
};

export function renderPlanner(el, { rerender }) {
  el.innerHTML = `
  <div class="screen-inner">
    <header class="screen-head row">
      <div>
        <h1>Planner</h1>
        <p class="head-sub" id="planner-sub"></p>
      </div>
      <button class="btn btn-primary sm" id="planner-add">${ICONS.plus(15)} New</button>
    </header>

    <section class="card calendar-card">
      <div class="cal-head">
        <button class="icon-btn" id="cal-prev" aria-label="Previous month">${ICONS.chevronLeft(18)}</button>
        <h3 id="cal-title"></h3>
        <button class="icon-btn" id="cal-next" aria-label="Next month">${ICONS.chevronRight(18)}</button>
      </div>
      <div class="cal-weekdays">${['S','M','T','W','T','F','S'].map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal-grid" id="cal-grid"></div>
      <button class="link-btn cal-today" id="cal-today">Jump to today</button>
    </section>

    <section class="day-section">
      <div class="section-head">
        <h3 id="day-title"></h3>
        <div class="day-add">
          <button class="icon-btn sm" id="day-add-task" aria-label="Add task">${ICONS.check(15)}</button>
          <button class="icon-btn sm" id="day-add-session" aria-label="Add session">${ICONS.clock(15)}</button>
        </div>
      </div>
      <div class="seg seg-filters" id="planner-filters">
        <button class="seg-btn sel" data-f="all">All</button>
        <button class="seg-btn" data-f="tasks">Tasks</button>
        <button class="seg-btn" data-f="assignments">Assignments</button>
        <button class="seg-btn" data-f="exams">Exams</button>
        <button class="seg-btn" data-f="sessions">Sessions</button>
      </div>
      <div id="day-list" class="stack"></div>
    </section>

    <section class="day-section">
      <div class="section-head"><h3>Coming up next</h3></div>
      <div id="upcoming-list" class="stack"></div>
    </section>

    <button class="fab" id="planner-fab" aria-label="Add task">${ICONS.plus(24)}</button>
  </div>`;

  const inner = el.querySelector('.screen-inner');

  el.querySelector('#cal-prev').onclick = () => { state.view.setMonth(state.view.getMonth() - 1); paint(); };
  el.querySelector('#cal-next').onclick = () => { state.view.setMonth(state.view.getMonth() + 1); paint(); };
  el.querySelector('#cal-today').onclick = () => { state.view = new Date(); state.selected = todayStr(); paint(); };
  el.querySelector('#planner-add').onclick = () => openAddMenu(state.selected, rerender);
  el.querySelector('#planner-fab').onclick = () => openTaskForm({ presetDate: state.selected, onSaved: rerender });
  el.querySelector('#day-add-task').onclick = () => openTaskForm({ presetDate: state.selected, onSaved: rerender });
  el.querySelector('#day-add-session').onclick = () => openSessionForm({ presetDate: state.selected, onSaved: rerender });

  el.querySelector('#planner-filters').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    state.filter = b.dataset.f;
    el.querySelectorAll('#planner-filters .seg-btn').forEach(x => x.classList.toggle('sel', x === b));
    paint();
  });

  el.querySelector('#cal-grid').addEventListener('click', (e) => {
    const cell = e.target.closest('.cal-day[data-date]');
    if (!cell) return;
    state.selected = cell.dataset.date;
    // switch month view if day belongs to neighboring month
    const d = new Date(cell.dataset.date + 'T00:00');
    state.view = new Date(d.getFullYear(), d.getMonth(), 1);
    paint();
  });

  bindCardActions(inner, { onChanged: rerender });

  function paint() {
    paintCalendar(el);
    paintDayList(el);
    paintUpcoming(el);
  }
  paint();
}

function openAddMenu(date, rerender) {
  import('../helpers.js').then(({ openSheet, closeSheet }) => {
    openSheet({
      title: `Add to ${relativeDay(date)}`,
      body: `
      <div class="add-menu">
        <button class="add-menu-item" data-add="task">
          <span class="ami-icon" style="--c:#2E8BFF">${ICONS.check(20)}</span>
          <span><strong>Task / Assignment / Exam</strong><small>With deadline & priority</small></span>
        </button>
        <button class="add-menu-item" data-add="session">
          <span class="ami-icon" style="--c:#10B981">${ICONS.clock(20)}</span>
          <span><strong>Study session</strong><small>Schedule focused study time</small></span>
        </button>
      </div>`,
      onMount(sheet, close) {
        sheet.addEventListener('click', (e) => {
          const item = e.target.closest('[data-add]');
          if (!item) return;
          close();
          if (item.dataset.add === 'task') openTaskForm({ presetDate: date, onSaved: rerender });
          else openSessionForm({ presetDate: date, onSaved: rerender });
        });
      }
    });
  });
}

/* ---------------- Calendar ---------------- */
function paintCalendar(el) {
  const v = state.view;
  const t0 = todayStr();
  el.querySelector('#cal-title').textContent = v.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const tasks = getTasks();
  const sessions = getSessions();

  const first = new Date(v.getFullYear(), v.getMonth(), 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(v.getFullYear(), v.getMonth(), 0).getDate();

  let html = '';
  // leading days from previous month
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(v.getFullYear(), v.getMonth() - 1, prevMonthDays - i);
    html += dayCell(d, true, tasks, sessions, t0);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    html += dayCell(new Date(v.getFullYear(), v.getMonth(), day), false, tasks, sessions, t0);
  }
  // trailing to complete week rows
  const totalCells = startPad + daysInMonth;
  const trail = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= trail; i++) {
    html += dayCell(new Date(v.getFullYear(), v.getMonth() + 1, i), true, tasks, sessions, t0);
  }
  el.querySelector('#cal-grid').innerHTML = html;

  const pendingCount = tasks.filter(t => !t.completed).length;
  el.querySelector('#planner-sub').textContent = `${pendingCount} pending • ${sessions.length} sessions scheduled`;
}

function dayCell(d, muted, tasks, sessions, t0) {
  const ds = dateStr(d);
  const dayTasks = tasks.filter(t => t.dueDate === ds && !t.completed);
  const daySessions = sessions.filter(s => s.date === ds);
  const isToday = ds === t0;
  const isSel = ds === state.selected;
  const dots = [...new Set([
    ...dayTasks.filter(t => t.type === 'exam').map(t => '#EF4444'),
    ...dayTasks.filter(t => t.type === 'assignment').map(t => courseColor(t.courseId)),
    ...(daySessions.length ? ['#10B981'] : [])
  ])].slice(0, 3);

  return `
  <button class="cal-day ${muted ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}" data-date="${ds}">
    <span class="cal-num">${d.getDate()}</span>
    <span class="cal-dots">${dots.map(c => `<i style="background:${c}"></i>`).join('')}</span>
  </button>`;
}

/* ---------------- Selected day list ---------------- */
function paintDayList(el) {
  const ds = state.selected;
  const t0 = todayStr();
  el.querySelector('#day-title').textContent =
    ds === t0 ? 'Today' : fmtDate(ds, { weekday: 'long', month: 'short', day: 'numeric' });

  const f = state.filter;
  let tasks = getTasks().filter(t => t.dueDate === ds);
  let sessions = getSessions().filter(s => s.date === ds).sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (f === 'sessions') tasks = [];
  else if (f === 'tasks') { tasks = tasks.filter(t => t.type === 'task'); sessions = []; }
  else if (f === 'assignments') { tasks = tasks.filter(t => t.type === 'assignment'); sessions = []; }
  else if (f === 'exams') { tasks = tasks.filter(t => t.type === 'exam'); sessions = []; }

  tasks.sort((a, b) => (a.completed - b.completed) || (a.dueTime || '99').localeCompare(b.dueTime || '99'));

  const html = [];
  if (f !== 'sessions') tasks.forEach(t => html.push(taskCardHTML(t, { showDate: false })));
  if (f === 'all' || f === 'sessions') sessions.forEach(s => html.push(sessionCardHTML(s, { showDate: false })));

  el.querySelector('#day-list').innerHTML = html.length
    ? html.join('')
    : `<div class="empty-mini">${ICONS.calendar(20)}<span>Nothing ${f === 'all' ? 'scheduled' : 'in this category'} on this day.</span></div>`;
}

/* ---------------- Upcoming (next 14 days) ---------------- */
function paintUpcoming(el) {
  const t0 = todayStr();
  const limit = new Date(); limit.setDate(limit.getDate() + 14);
  const limitDS = dateStr(limit);

  const items = [
    ...getTasks().filter(t => !t.completed && t.dueDate >= t0 && t.dueDate <= limitDS)
      .map(t => ({ kind: 'task', sort: t.dueDate + (t.dueTime || '99:99'), t })),
    ...getSessions().filter(s => !s.completed && s.date >= t0 && s.date <= limitDS)
      .map(s => ({ kind: 'session', sort: s.date + s.startTime, s }))
  ].sort((a, b) => a.sort.localeCompare(b.sort)).slice(0, 8);

  el.querySelector('#upcoming-list').innerHTML = items.length
    ? items.map(it => it.kind === 'task' ? taskCardHTML(it.t) : sessionCardHTML(it.s)).join('')
    : `<div class="empty-mini">${ICONS.sparkles(20)}<span>Nothing scheduled in the next 14 days.</span></div>`;
}

/* ---------------- Reminders ----------------
   In-app reminder banner + optional browser notifications for
   tasks due today / overdue, checked on load and every minute. */
let reminderTimer = null;
let notifiedIds = new Set();

export function startReminders(getBannerHost) {
  const check = () => {
    const st = getState();
    const t0 = todayStr();
    const dueToday = st.tasks.filter(t => !t.completed && t.dueDate === t0 && t.priority !== 'low');
    const overdue = st.tasks.filter(t => !t.completed && t.dueDate < t0);

    // native notifications (only when enabled + permission granted)
    if (st.profile.notifications && 'Notification' in window && Notification.permission === 'granted') {
      [...overdue, ...dueToday].slice(0, 3).forEach(t => {
        if (notifiedIds.has(t.id)) return;
        notifiedIds.add(t.id);
        try {
          new Notification('StudyFlow reminder 🔔', {
            body: t.dueDate < t0 ? `"${t.title}" is overdue!` : `"${t.title}" is due today${t.dueTime ? ' at ' + fmtTime12(t.dueTime) : ''}.`,
            tag: t.id
          });
        } catch (_) { /* some platforms require serviceWorker — ignore */ }
      });
    }

    // in-app banner
    const host = getBannerHost?.();
    if (!host) return;
    let banner = host.querySelector('#reminder-banner');
    const total = overdue.length + dueToday.length;
    if (!total) { banner?.remove(); return; }
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'reminder-banner';
      banner.className = 'reminder-banner';
      host.prepend(banner);
    }
    const first = overdue[0] || dueToday[0];
    banner.innerHTML = `${ICONS.bell(15)} <span>${overdue.length ? `<strong>${overdue.length} overdue</strong>` : `<strong>${dueToday.length} due today</strong>`} — ${esc(first.title)}</span>`;
  };

  check();
  clearInterval(reminderTimer);
  reminderTimer = setInterval(check, 60000);
  return check;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  const p = await Notification.requestPermission();
  return p === 'granted';
}
