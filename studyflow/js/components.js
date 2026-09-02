/* ============================================================
   StudyFlow — Shared components: task & session cards and forms
   ============================================================ */

import {
  addTask, updateTask, deleteTask, toggleTask, getTasks,
  addSession, updateSession, deleteSession, toggleSession, getSessions
} from './store.js';
import {
  ICONS, PRIORITY_META, TYPE_META, esc, relativeDay, fmtDate, fmtTime12,
  fmtDuration, courseLabel, courseColor, toast, openSheet, closeSheet,
  confirmSheet, courseOptionsHTML, todayStr
} from './helpers.js';

/* ---------------- Task card ---------------- */
export function taskCardHTML(t, { showDate = true, showActions = true } = {}) {
  const pr = PRIORITY_META[t.priority] || PRIORITY_META.medium;
  const type = TYPE_META[t.type] || TYPE_META.task;
  const overdue = !t.completed && t.dueDate < todayStr();
  return `
  <div class="task-card ${t.completed ? 'done' : ''}" data-task-id="${t.id}">
    <button class="check-btn ${t.completed ? 'checked' : ''}" data-act="toggle" style="--accent:${t.type === 'exam' ? '#EF4444' : '#2E8BFF'}" aria-label="Toggle complete">
      ${t.completed ? ICONS.check(14) : ''}
    </button>
    <div class="task-main" data-act="open">
      <div class="task-title-row">
        <span class="task-title">${esc(t.title)}</span>
      </div>
      <div class="task-meta">
        <span class="chip course-chip" style="--c:${courseColor(t.courseId)}">${esc(courseLabel(t.courseId))}</span>
        ${showDate ? `<span class="chip ${overdue ? 'chip-danger' : ''}">${overdue ? '⚠ ' : ''}${esc(relativeDay(t.dueDate))}${t.dueTime ? ' • ' + fmtTime12(t.dueTime) : ''}</span>` : ''}
        <span class="chip" style="color:${pr.color};background:${pr.bg}">${pr.label}</span>
        <span class="chip chip-type">${ICONS[type.icon](11)} ${type.label}</span>
      </div>
    </div>
    ${showActions ? `
    <div class="task-actions">
      <button class="icon-btn sm" data-act="edit" aria-label="Edit">${ICONS.edit(15)}</button>
      <button class="icon-btn sm danger" data-act="delete" aria-label="Delete">${ICONS.trash(15)}</button>
    </div>` : ''}
  </div>`;
}

/* ---------------- Session card ---------------- */
export function sessionCardHTML(s, { showDate = true, showActions = true } = {}) {
  return `
  <div class="session-card ${s.completed ? 'done' : ''}" data-session-id="${s.id}" style="--c:${courseColor(s.courseId)}">
    <div class="session-time" data-act="open">
      <strong>${fmtTime12(s.startTime)}</strong>
      <span>${fmtDuration(s.duration)}</span>
    </div>
    <div class="session-main" data-act="open">
      <span class="session-topic">${esc(s.topic || 'Study session')}</span>
      <div class="task-meta">
        <span class="chip course-chip" style="--c:${courseColor(s.courseId)}">${esc(courseLabel(s.courseId))}</span>
        ${showDate ? `<span class="chip">${esc(relativeDay(s.date))}</span>` : ''}
      </div>
    </div>
    <div class="session-actions">
      <button class="check-btn ${s.completed ? 'checked' : ''}" data-act="toggle" style="--accent:#10B981" aria-label="Mark complete">${s.completed ? ICONS.check(14) : ''}</button>
      ${showActions ? `
      <button class="icon-btn sm" data-act="edit" aria-label="Edit">${ICONS.edit(15)}</button>
      <button class="icon-btn sm danger" data-act="delete" aria-label="Delete">${ICONS.trash(15)}</button>` : ''}
    </div>
  </div>`;
}

/* ---------------- Wire up card actions inside a container ---------------- */
export function bindCardActions(container, { onChanged } = {}) {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const taskCard = btn.closest('[data-task-id]');
    const sessionCard = btn.closest('[data-session-id]');
    const act = btn.dataset.act;

    if (taskCard) {
      const id = taskCard.dataset.taskId;
      if (act === 'toggle') { toggleTask(id); confettiIfDone(btn); toast('Task updated'); }
      else if (act === 'edit' || act === 'open') { openTaskForm({ taskId: id }); return; }
      else if (act === 'delete') {
        const ok = await confirmSheet({ title: 'Delete task?', message: 'This task will be permanently removed from your planner.' });
        if (ok) { deleteTask(id); toast('Task deleted', 'trash'); }
        return;
      }
    } else if (sessionCard) {
      const id = sessionCard.dataset.sessionId;
      if (act === 'toggle') { toggleSession(id); confettiIfDone(btn); toast('Session updated'); }
      else if (act === 'edit' || act === 'open') { openSessionForm({ sessionId: id }); return; }
      else if (act === 'delete') {
        const ok = await confirmSheet({ title: 'Delete session?', message: 'This study session will be permanently removed.' });
        if (ok) { deleteSession(id); toast('Session deleted', 'trash'); }
        return;
      }
    }
    onChanged?.();
  });
}

function confettiIfDone(btn) {
  if (!btn.classList.contains('checked') && !btn.querySelector('svg')) {
    btn.classList.add('pop');
    setTimeout(() => btn.classList.remove('pop'), 400);
  }
}

/* ---------------- Task form (add / edit) ---------------- */
export function openTaskForm({ taskId = null, presetDate = null, presetType = 'task', presetCourseId = '', onSaved } = {}) {
  const existing = taskId ? getTasks().find(t => t.id === taskId) : null;
  const t0 = presetDate || todayStr();

  const body = `
  <form id="task-form" class="sf-form" novalidate>
    <label class="field">
      <span>Title *</span>
      <input name="title" type="text" required maxlength="80" placeholder="${existing ? '' : 'e.g. Submit lab report'}" value="${esc(existing?.title || '')}">
    </label>
    <label class="field">
      <span>Type</span>
      <div class="seg" data-seg="type">
        ${['task', 'assignment', 'exam'].map(tp => `
          <button type="button" class="seg-btn ${(existing?.type || presetType) === tp ? 'sel' : ''}" data-val="${tp}">${TYPE_META[tp].label}</button>`).join('')}
      </div>
    </label>
    <label class="field">
      <span>Course</span>
      <select name="courseId">${courseOptionsHTML(existing?.courseId || presetCourseId)}</select>
    </label>
    <div class="field-row">
      <label class="field">
        <span>Deadline *</span>
        <input name="dueDate" type="date" required value="${existing?.dueDate || t0}">
      </label>
      <label class="field">
        <span>Time</span>
        <input name="dueTime" type="time" value="${existing?.dueTime || ''}">
      </label>
    </div>
    <label class="field">
      <span>Priority</span>
      <div class="seg" data-seg="priority">
        ${['low', 'medium', 'high'].map(p => `
          <button type="button" class="seg-btn seg-${p} ${(existing?.priority || 'medium') === p ? 'sel' : ''}" data-val="${p}">${PRIORITY_META[p].label}</button>`).join('')}
      </div>
    </label>
    <label class="field">
      <span>Notes</span>
      <textarea name="notes" rows="2" placeholder="Optional details…">${esc(existing?.notes || '')}</textarea>
    </label>
    ${existing ? `
    <div class="form-status">
      <span class="chip ${existing.completed ? 'chip-ok' : ''}">${existing.completed ? '✓ Completed' : 'Pending'}</span>
      ${existing.completed ? `<button type="button" class="link-btn" data-act="unmark">Mark as not done</button>` : `<button type="button" class="link-btn" data-act="mark">Mark as completed</button>`}
    </div>` : ''}
    <div class="form-actions">
      ${existing ? `<button type="button" class="btn btn-danger-ghost" data-act="del">${ICONS.trash(15)} Delete</button>` : ''}
      <button type="submit" class="btn btn-primary grow">${existing ? 'Save changes' : 'Add task'}</button>
    </div>
  </form>`;

  openSheet({
    title: existing ? 'Edit task' : 'New task',
    body,
    onMount(sheet, close) {
      const form = sheet.querySelector('#task-form');
      let type = existing?.type || presetType;
      let priority = existing?.priority || 'medium';
      bindSeg(form, 'type', v => type = v);
      bindSeg(form, 'priority', v => priority = v);

      const markBtn = form.querySelector('[data-act="mark"], [data-act="unmark"]');
      if (markBtn) markBtn.onclick = () => {
        toggleTask(existing.id);
        close();
        toast('Task updated');
        onSaved?.();
      };
      const delBtn = form.querySelector('[data-act="del"]');
      if (delBtn) delBtn.onclick = async () => {
        const ok = await confirmSheet({ title: 'Delete task?', message: 'This cannot be undone.' });
        if (ok) { deleteTask(existing.id); close(); toast('Task deleted', 'trash'); onSaved?.(); }
      };

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
          title: fd.get('title'),
          courseId: fd.get('courseId') || null,
          dueDate: fd.get('dueDate'),
          dueTime: fd.get('dueTime'),
          priority,
          type,
          notes: fd.get('notes')
        };
        if (!payload.title?.trim() || !payload.dueDate) {
          form.classList.add('shake');
          setTimeout(() => form.classList.remove('shake'), 400);
          toast('Title and deadline are required', 'alert');
          return;
        }
        if (existing) { updateTask(existing.id, payload); toast('Task saved'); }
        else { addTask(payload); toast('Task added 🎯'); }
        close();
        onSaved?.();
      });
      form.querySelector('input[name="title"]').focus();
    }
  });
}

/* ---------------- Session form (add / edit) ---------------- */
export function openSessionForm({ sessionId = null, presetDate = null, presetCourseId = '', onSaved } = {}) {
  const existing = sessionId ? getSessions().find(s => s.id === sessionId) : null;

  const durations = [25, 30, 45, 60, 90, 120];
  const body = `
  <form id="session-form" class="sf-form" novalidate>
    <label class="field">
      <span>Topic</span>
      <input name="topic" type="text" maxlength="80" placeholder="e.g. Past questions — Chapter 5" value="${esc(existing?.topic || '')}">
    </label>
    <label class="field">
      <span>Course</span>
      <select name="courseId">${courseOptionsHTML(existing?.courseId || presetCourseId)}</select>
    </label>
    <label class="field">
      <span>Date</span>
      <input name="date" type="date" required value="${existing?.date || presetDate || todayStr()}">
    </label>
    <label class="field">
      <span>Start time</span>
      <input name="startTime" type="time" required value="${existing?.startTime || '16:00'}">
    </label>
    <label class="field">
      <span>Duration</span>
      <div class="seg seg-wrap" data-seg="duration">
        ${durations.map(d => `
          <button type="button" class="seg-btn ${(existing?.duration || 60) === d ? 'sel' : ''}" data-val="${d}">${fmtDuration(d)}</button>`).join('')}
      </div>
    </label>
    <div class="form-actions">
      ${existing ? `<button type="button" class="btn btn-danger-ghost" data-act="del">${ICONS.trash(15)} Delete</button>` : ''}
      <button type="submit" class="btn btn-primary grow">${existing ? 'Save changes' : 'Schedule session'}</button>
    </div>
  </form>`;

  openSheet({
    title: existing ? 'Edit study session' : 'New study session',
    body,
    onMount(sheet, close) {
      const form = sheet.querySelector('#session-form');
      let duration = existing?.duration || 60;
      bindSeg(form, 'duration', v => duration = Number(v));

      const delBtn = form.querySelector('[data-act="del"]');
      if (delBtn) delBtn.onclick = async () => {
        const ok = await confirmSheet({ title: 'Delete session?', message: 'This cannot be undone.' });
        if (ok) { deleteSession(existing.id); close(); toast('Session deleted', 'trash'); onSaved?.(); }
      };

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
          courseId: fd.get('courseId') || null,
          date: fd.get('date'),
          startTime: fd.get('startTime'),
          duration,
          topic: fd.get('topic')
        };
        if (!payload.date || !payload.startTime) {
          form.classList.add('shake');
          setTimeout(() => form.classList.remove('shake'), 400);
          toast('Date and start time are required', 'alert');
          return;
        }
        if (existing) { updateSession(existing.id, payload); toast('Session saved'); }
        else { addSession(payload); toast('Session scheduled ⏱️'); }
        close();
        onSaved?.();
      });
      form.querySelector('input[name="topic"]').focus();
    }
  });
}

/* ---------------- Segmented control ---------------- */
function bindSeg(form, name, onChange) {
  const seg = form.querySelector(`[data-seg="${name}"]`);
  if (!seg) return;
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    seg.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    onChange(b.dataset.val);
  });
}
