/* ============================================================
   StudyFlow — Home screen
   ============================================================ */

import { getState, todayProgress, upcomingTasks, overdueTasks, todayStr, getSessions } from '../store.js';
import { ICONS, esc, greeting, fmtLongDate, fmtTime12, fmtDuration, relativeDay, courseColor, courseLabel } from '../helpers.js';
import { taskCardHTML, sessionCardHTML, bindCardActions, openTaskForm, openSessionForm } from '../components.js';

export function renderHome(el, { rerender }) {
  const state = getState();
  const t0 = todayStr();
  const prog = todayProgress();
  const overdue = overdueTasks();
  const assignments = upcomingTasks('assignment', 4);
  const exams = upcomingTasks('exam', 3);
  const todaySessions = getSessions().filter(s => s.date === t0).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const todayTasks = state.tasks.filter(t => t.dueDate === t0).sort((a, b) => (a.completed - b.completed) || a.title.localeCompare(b.title));

  el.innerHTML = `
  <div class="screen-inner home-screen">
    <header class="home-head">
      <div>
        <h1 class="greet">${greeting()} 👋</h1>
        <p class="greet-sub">${fmtLongDate()}</p>
      </div>
      <div class="progress-ring" style="--pct:${prog.pct}">
        <svg viewBox="0 0 76 76">
          <circle class="ring-bg" cx="38" cy="38" r="32"></circle>
          <circle class="ring-fg" cx="38" cy="38" r="32"></circle>
        </svg>
        <span class="ring-label">${prog.pct}%</span>
      </div>
    </header>

    ${overdue.length ? `
    <div class="alert-banner" data-act="overdue">
      ${ICONS.alert(18)}
      <div><strong>${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}</strong><span>${esc(overdue[0].title)}${overdue.length > 1 ? ` +${overdue.length - 1} more` : ''}</span></div>
      ${ICONS.chevronRight(16)}
    </div>` : ''}

    <section class="card progress-card">
      <div class="card-head">
        <h3>Today's progress</h3>
        <span class="pill">${prog.done}/${prog.total} done</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${prog.pct}%"></div></div>
      <p class="progress-note">${
        prog.total === 0 ? 'Nothing scheduled today — enjoy it, or add a task! 🌤️'
        : prog.pct === 100 ? 'All done for today! Amazing work 🎉'
        : `Keep going — ${prog.total - prog.done} item${prog.total - prog.done > 1 ? 's' : ''} left to finish today.`
      }</p>
    </section>

    <div class="quick-actions">
      <button class="qa-btn qa-primary" data-act="add-task">${ICONS.plus(18)} Add Task</button>
      <button class="qa-btn" data-act="add-session">${ICONS.clock(18)} Study Session</button>
      <button class="qa-btn" data-act="go-ai">${ICONS.sparkles(18)} Ask Flow AI</button>
    </div>

    <section class="home-section">
      <div class="section-head">
        <h3>Today's study sessions</h3>
        <button class="link-btn" data-act="add-session">+ Add</button>
      </div>
      ${todaySessions.length
        ? `<div class="stack">${todaySessions.map(s => sessionCardHTML(s, { showDate: false })).join('')}</div>`
        : `<div class="empty-mini">${ICONS.clock(20)}<span>No sessions scheduled for today.</span></div>`}
    </section>

    <section class="home-section">
      <div class="section-head">
        <h3>Due today</h3>
        <button class="link-btn" data-act="add-task">+ Add</button>
      </div>
      ${todayTasks.length
        ? `<div class="stack">${todayTasks.map(t => taskCardHTML(t, { showDate: false })).join('')}</div>`
        : `<div class="empty-mini">${ICONS.check(20)}<span>Nothing due today. Nice!</span></div>`}
    </section>

    <section class="home-section">
      <div class="section-head">
        <h3>Upcoming assignments</h3>
        <button class="link-btn" data-nav="planner">See all</button>
      </div>
      ${assignments.length
        ? `<div class="stack">${assignments.map(t => taskCardHTML(t)).join('')}</div>`
        : `<div class="empty-mini">${ICONS.fileText(20)}<span>No pending assignments.</span></div>`}
    </section>

    <section class="home-section">
      <div class="section-head">
        <h3>Upcoming exams</h3>
        <button class="link-btn" data-nav="planner">See all</button>
      </div>
      ${exams.length
        ? `<div class="stack">${exams.map(t => `
            <div class="exam-card" data-task-id="${t.id}" style="--c:${courseColor(t.courseId)}">
              <div class="exam-date">
                <strong>${new Date(t.dueDate + 'T00:00').getDate()}</strong>
                <span>${new Date(t.dueDate + 'T00:00').toLocaleDateString(undefined, { month: 'short' })}</span>
              </div>
              <div class="exam-info" data-act="open">
                <span class="exam-title">${esc(t.title)}</span>
                <div class="task-meta">
                  <span class="chip course-chip" style="--c:${courseColor(t.courseId)}">${esc(courseLabel(t.courseId))}</span>
                  <span class="chip">${esc(relativeDay(t.dueDate))}${t.dueTime ? ' • ' + fmtTime12(t.dueTime) : ''}</span>
                </div>
              </div>
            </div>`).join('')}</div>`
        : `<div class="empty-mini">${ICONS.award(20)}<span>No exams scheduled. Add one in the Planner.</span></div>`}
    </section>

    <button class="fab" data-act="add-task" aria-label="Add Task">${ICONS.plus(24)}</button>
  </div>`;

  const inner = el.querySelector('.screen-inner');

  inner.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { window.__sf_nav(nav.dataset.nav); return; }

    const act = e.target.closest('[data-act]');
    if (act) {
      switch (act.dataset.act) {
        case 'add-task': openTaskForm({ presetDate: t0, onSaved: rerender }); return;
        case 'add-session': openSessionForm({ presetDate: t0, onSaved: rerender }); return;
        case 'go-ai': window.__sf_nav('ai'); return;
        case 'overdue': window.__sf_nav('planner'); return;
      }
    }
    const examCard = e.target.closest('.exam-card');
    if (examCard && !e.target.closest('[data-act]')) {
      openTaskForm({ taskId: examCard.dataset.taskId, onSaved: rerender });
    }
  });

  bindCardActions(inner, { onChanged: rerender });
}
