/* ============================================================
   StudyFlow — Courses screen
   ============================================================ */

import {
  getState, getCourses, addCourse, updateCourse, deleteCourse,
  tasksForCourse, sessionsForCourse, totalStudyHours
} from '../store.js';
import {
  ICONS, esc, toast, openSheet, closeSheet, confirmSheet,
  colorPickerHTML, bindColorPicker, COURSE_COLORS, fmtDuration, relativeDay
} from '../helpers.js';
import { taskCardHTML, sessionCardHTML, bindCardActions, openTaskForm, openSessionForm } from '../components.js';

export function renderCourses(el, { rerender }) {
  const courses = getCourses();
  const state = getState();

  el.innerHTML = `
  <div class="screen-inner">
    <header class="screen-head">
      <h1>My Courses</h1>
      <p class="head-sub">${courses.length} course${courses.length !== 1 ? 's' : ''} • ${courses.reduce((a, c) => a + (c.units || 0), 0)} units this semester</p>
    </header>

    ${courses.length === 0 ? `
      <div class="empty-state">
        <div class="empty-illus">${ICONS.book(40)}</div>
        <h3>No courses yet</h3>
        <p>Add your first course to organize assignments, exams and study sessions.</p>
        <button class="btn btn-primary" data-act="add-course">${ICONS.plus(16)} Add Course</button>
      </div>` : `
      <div class="stack course-list">
        ${courses.map(c => courseCardHTML(c)).join('')}
      </div>
      <button class="btn btn-outline full add-course-btn" data-act="add-course">${ICONS.plus(16)} Add Course</button>`}

    <button class="fab" data-act="add-course" aria-label="Add course">${ICONS.plus(24)}</button>
  </div>`;

  const inner = el.querySelector('.screen-inner');

  inner.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      if (act.dataset.act === 'add-course') { openCourseForm({ onSaved: rerender }); return; }
    }
    const card = e.target.closest('[data-course-id]');
    if (card) {
      const editBtn = e.target.closest('[data-edit]');
      if (editBtn) { openCourseForm({ courseId: card.dataset.courseId, onSaved: rerender }); return; }
      openCourseDetail(card.dataset.courseId, rerender);
    }
  });
}

function courseCardHTML(c) {
  const tasks = tasksForCourse(c.id);
  const sessions = sessionsForCourse(c.id);
  const pending = tasks.filter(t => !t.completed).length;
  const hours = sessions.filter(s => s.completed).reduce((a, s) => a + s.duration, 0) / 60;
  return `
  <div class="course-card" data-course-id="${c.id}" style="--c:${c.color}">
    <div class="course-color-bar"></div>
    <div class="course-card-body">
      <div class="course-card-top">
        <span class="course-code">${esc(c.code)}</span>
        <button class="icon-btn sm" data-edit aria-label="Edit course">${ICONS.edit(15)}</button>
      </div>
      <h3 class="course-name">${esc(c.name)}</h3>
      <p class="course-lecturer">${ICONS.user(12)} ${esc(c.lecturer || 'No lecturer set')}</p>
      <div class="course-stats">
        <span class="chip">${c.units} unit${c.units !== 1 ? 's' : ''}</span>
        <span class="chip">${pending} pending</span>
        <span class="chip">${sessions.length} session${sessions.length !== 1 ? 's' : ''}</span>
        ${hours > 0 ? `<span class="chip">${hours.toFixed(1)}h logged</span>` : ''}
      </div>
    </div>
  </div>`;
}

/* ---------------- Course form ---------------- */
export function openCourseForm({ courseId = null, onSaved } = {}) {
  const existing = courseId ? getCourses().find(c => c.id === courseId) : null;
  const body = `
  <form id="course-form" class="sf-form" novalidate>
    <div class="field-row">
      <label class="field">
        <span>Course code *</span>
        <input name="code" type="text" required maxlength="12" placeholder="CSC 305" value="${esc(existing?.code || '')}" autocapitalize="characters">
      </label>
      <label class="field">
        <span>Units *</span>
        <input name="units" type="number" min="0" max="12" required placeholder="3" value="${existing?.units ?? ''}">
      </label>
    </div>
    <label class="field">
      <span>Course name *</span>
      <input name="name" type="text" required maxlength="80" placeholder="Data Structures & Algorithms" value="${esc(existing?.name || '')}">
    </label>
    <label class="field">
      <span>Lecturer</span>
      <input name="lecturer" type="text" maxlength="60" placeholder="Dr. Jane Smith" value="${esc(existing?.lecturer || '')}">
    </label>
    <div class="field">
      <span>Course color</span>
      ${colorPickerHTML(existing?.color || COURSE_COLORS[getCourses().length % COURSE_COLORS.length])}
    </div>
    <div class="form-actions">
      ${existing ? `<button type="button" class="btn btn-danger-ghost" data-act="del">${ICONS.trash(15)} Delete</button>` : ''}
      <button type="submit" class="btn btn-primary grow">${existing ? 'Save changes' : 'Add course'}</button>
    </div>
  </form>`;

  openSheet({
    title: existing ? 'Edit course' : 'Add course',
    body,
    onMount(sheet, close) {
      const form = sheet.querySelector('#course-form');
      const getColor = bindColorPicker(form);

      const delBtn = form.querySelector('[data-act="del"]');
      if (delBtn) delBtn.onclick = async () => {
        const ok = await confirmSheet({
          title: 'Delete course?',
          message: `This will also delete all tasks and sessions linked to ${existing.code}. This cannot be undone.`
        });
        if (ok) { deleteCourse(existing.id); close(); toast('Course deleted', 'trash'); onSaved?.(); }
      };

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
          code: fd.get('code'),
          name: fd.get('name'),
          lecturer: fd.get('lecturer'),
          units: fd.get('units'),
          color: getColor()
        };
        if (!payload.code?.trim() || !payload.name?.trim() || payload.units === '') {
          form.classList.add('shake');
          setTimeout(() => form.classList.remove('shake'), 400);
          toast('Code, name and units are required', 'alert');
          return;
        }
        const dup = getCourses().find(c => c.code === payload.code.trim().toUpperCase() && c.id !== courseId);
        if (dup) { toast('That course code already exists', 'alert'); return; }
        if (existing) { updateCourse(existing.id, payload); toast('Course saved'); }
        else { addCourse(payload); toast('Course added 📘'); }
        close();
        onSaved?.();
      });
      form.querySelector('input[name="code"]').focus();
    }
  });
}

/* ---------------- Course detail ---------------- */
function openCourseDetail(courseId, onChanged) {
  const c = getCourses().find(x => x.id === courseId);
  if (!c) return;

  const refresh = () => { onChanged?.(); draw(); };

  const draw = () => {
    const tasks = tasksForCourse(courseId).sort((a, b) => (a.completed - b.completed) || a.dueDate.localeCompare(b.dueDate));
    const sessions = sessionsForCourse(courseId).sort((a, b) => b.date.localeCompare(a.date));
    const hours = sessions.filter(s => s.completed).reduce((a, s) => a + s.duration, 0);

    openSheet({
      title: c.code,
      body: `
      <div class="course-detail" style="--c:${c.color}">
        <div class="cd-header">
          <span class="cd-code">${esc(c.code)}</span>
          <h2>${esc(c.name)}</h2>
          <p>${ICONS.user(13)} ${esc(c.lecturer || 'No lecturer set')} • ${c.units} unit${c.units !== 1 ? 's' : ''}</p>
        </div>
        <div class="cd-stats">
          <div class="cd-stat"><strong>${tasks.filter(t => !t.completed).length}</strong><span>Pending</span></div>
          <div class="cd-stat"><strong>${tasks.filter(t => t.completed).length}</strong><span>Completed</span></div>
          <div class="cd-stat"><strong>${(hours / 60).toFixed(1)}h</strong><span>Studied</span></div>
        </div>
        <div class="cd-actions">
          <button class="btn btn-primary sm" data-cd="add-task">${ICONS.plus(14)} Task</button>
          <button class="btn btn-outline sm" data-cd="add-session">${ICONS.plus(14)} Session</button>
          <button class="btn btn-outline sm" data-cd="edit-course">${ICONS.edit(14)} Edit</button>
        </div>
        <h4 class="cd-section">Assignments & tasks (${tasks.length})</h4>
        ${tasks.length ? `<div class="stack">${tasks.map(t => taskCardHTML(t)).join('')}</div>` : `<div class="empty-mini">${ICONS.fileText(18)}<span>Nothing here yet.</span></div>`}
        <h4 class="cd-section">Study sessions (${sessions.length})</h4>
        ${sessions.length ? `<div class="stack">${sessions.map(s => sessionCardHTML(s)).join('')}</div>` : `<div class="empty-mini">${ICONS.clock(18)}<span>No sessions yet.</span></div>`}
      </div>`,
      onMount(sheet) {
        // header-level actions
        sheet.addEventListener('click', (e) => {
          const cd = e.target.closest('[data-cd]');
          if (!cd) return;
          if (cd.dataset.cd === 'add-task') openTaskForm({ presetType: 'assignment', presetCourseId: courseId, onSaved: refresh });
          else if (cd.dataset.cd === 'add-session') openSessionForm({ presetCourseId: courseId, onSaved: refresh });
          else if (cd.dataset.cd === 'edit-course') { closeSheet(); openCourseForm({ courseId, onSaved: onChanged }); }
        });
        // nested task/session card actions
        bindCardActions(sheet.querySelector('.course-detail'), { onChanged: refresh });
      }
    });
  };
  draw();
}
