/* ============================================================
   StudyFlow — Profile screen
   ============================================================ */

import {
  getState, updateProfile, getCourses, completedTaskCount,
  studyStreak, totalStudyHours, exportJSON, importJSON, resetAll, getTasks, getSessions
} from '../store.js';
import { ICONS, esc, toast, openSheet, closeSheet, confirmSheet } from '../helpers.js';
import { requestNotificationPermission } from './planner.js';

export function renderProfile(el, { rerender }) {
  const st = getState();
  const p = st.profile;
  const initials = (p.name || 'S').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const pending = getTasks().filter(t => !t.completed).length;
  const plannedHours = getSessions().filter(s => !s.completed).reduce((a, s) => a + s.duration, 0) / 60;

  el.innerHTML = `
  <div class="screen-inner">
    <header class="screen-head"><h1>Profile</h1></header>

    <section class="card profile-card" data-act="edit-profile">
      <div class="avatar" style="--hue:${p.avatarHue}">${esc(initials)}</div>
      <div class="profile-info">
        <h2>${esc(p.name)}</h2>
        <p>${ICONS.book(12)} ${esc(p.university)}</p>
      </div>
      <span class="icon-btn">${ICONS.edit(16)}</span>
    </section>

    <section class="stats-grid">
      <div class="stat-card" style="--c:#2E8BFF">
        <span class="stat-icon">${ICONS.book(18)}</span>
        <strong>${getCourses().length}</strong><span>Total courses</span>
      </div>
      <div class="stat-card" style="--c:#10B981">
        <span class="stat-icon">${ICONS.check(18)}</span>
        <strong>${completedTaskCount()}</strong><span>Tasks done</span>
      </div>
      <div class="stat-card" style="--c:#F97316">
        <span class="stat-icon">${ICONS.flame(18)}</span>
        <strong>${studyStreak()}</strong><span>Day streak</span>
      </div>
      <div class="stat-card" style="--c:#8B5CF6">
        <span class="stat-icon">${ICONS.clock(18)}</span>
        <strong>${totalStudyHours().toFixed(1)}h</strong><span>Study hours</span>
      </div>
    </section>

    <section class="card summary-card">
      <div class="summary-row"><span>Pending tasks</span><strong>${pending}</strong></div>
      <div class="summary-row"><span>Study time planned</span><strong>${plannedHours.toFixed(1)}h</strong></div>
      <div class="summary-row"><span>Units this semester</span><strong>${getCourses().reduce((a, c) => a + (c.units || 0), 0)}</strong></div>
    </section>

    <section class="settings-group">
      <h3 class="settings-title">Settings</h3>
      <div class="card settings-card">
        <button class="setting-row" data-set="goal">
          <span class="set-icon" style="--c:#2E8BFF">${ICONS.target(16)}</span>
          <span class="set-label">Weekly study goal<small>Hours you aim to study per week</small></span>
          <span class="set-value">${p.weeklyGoalHours}h</span>
        </button>
        <button class="setting-row" data-set="notif">
          <span class="set-icon" style="--c:#F59E0B">${ICONS.bell(16)}</span>
          <span class="set-label">Reminders<small>Notify me about due tasks & exams</small></span>
          <span class="toggle ${p.notifications ? 'on' : ''}"><i></i></span>
        </button>
        <button class="setting-row" data-set="rtime">
          <span class="set-icon" style="--c:#8B5CF6">${ICONS.clock(16)}</span>
          <span class="set-label">Daily reminder time<small>When to nudge you each day</small></span>
          <span class="set-value">${p.reminderTime}</span>
        </button>
      </div>
    </section>

    <section class="settings-group">
      <h3 class="settings-title">Data</h3>
      <div class="card settings-card">
        <button class="setting-row" data-set="export">
          <span class="set-icon" style="--c:#10B981">${ICONS.download(16)}</span>
          <span class="set-label">Export data<small>Download a JSON backup</small></span>
          <span class="set-value">›</span>
        </button>
        <button class="setting-row" data-set="import">
          <span class="set-icon" style="--c:#06B6D4">${ICONS.layers(16)}</span>
          <span class="set-label">Import data<small>Restore from a backup file</small></span>
          <span class="set-value">›</span>
        </button>
        <button class="setting-row" data-set="reset">
          <span class="set-icon" style="--c:#EF4444">${ICONS.trash(16)}</span>
          <span class="set-label">Reset app data<small>Delete everything and start fresh</small></span>
          <span class="set-value">›</span>
        </button>
      </div>
    </section>

    <p class="app-version">StudyFlow v1.0.0 • Made with 💙 for students</p>
    <input type="file" id="import-file" accept=".json,application/json" hidden>
  </div>`;

  el.querySelector('[data-act="edit-profile"]').onclick = () => openProfileForm(rerender);

  el.querySelectorAll('[data-set]').forEach(row => {
    row.onclick = async () => {
      const key = row.dataset.set;
      if (key === 'goal') openGoalForm();
      else if (key === 'notif') {
        const on = !getState().profile.notifications;
        if (on) {
          const granted = await requestNotificationPermission();
          updateProfile({ notifications: true });
          toast(granted ? 'Reminders enabled 🔔' : 'Reminders on (browser blocked notifications — in-app reminders still work)', granted ? 'bell' : 'alert');
        } else {
          updateProfile({ notifications: false });
          toast('Reminders disabled');
        }
        rerender();
      }
      else if (key === 'rtime') openReminderTimeForm();
      else if (key === 'export') {
        const blob = new Blob([exportJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `studyflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast('Backup downloaded 📦');
      }
      else if (key === 'import') el.querySelector('#import-file').click();
      else if (key === 'reset') {
        const ok = await confirmSheet({
          title: 'Reset all data?',
          message: 'All courses, tasks, sessions and chat history will be permanently deleted. Consider exporting a backup first.'
        });
        if (ok) { resetAll(); toast('App reset to a clean slate'); rerender(); }
      }
    };
  });

  el.querySelector('#import-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      importJSON(await file.text());
      toast('Data imported ✅');
      rerender();
    } catch (err) {
      toast('Invalid backup file', 'alert');
    }
    e.target.value = '';
  };
}

function openProfileForm(rerender) {
  const p = getState().profile;
  openSheet({
    title: 'Edit profile',
    body: `
    <form id="profile-form" class="sf-form">
      <label class="field"><span>Your name</span>
        <input name="name" type="text" required maxlength="40" value="${esc(p.name)}" placeholder="e.g. Chidera Okafor">
      </label>
      <label class="field"><span>University</span>
        <input name="university" type="text" required maxlength="60" value="${esc(p.university)}" placeholder="e.g. University of Lagos">
      </label>
      <div class="form-actions"><button type="submit" class="btn btn-primary grow">Save profile</button></div>
    </form>`,
    onMount(sheet, close) {
      const form = sheet.querySelector('#profile-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const name = (fd.get('name') || '').trim();
        const university = (fd.get('university') || '').trim();
        if (!name || !university) { toast('Name and university are required', 'alert'); return; }
        updateProfile({ name, university });
        close();
        toast('Profile saved 👤');
        rerender();
      });
      form.querySelector('input[name="name"]').focus();
    }
  });
}

function openGoalForm() {
  const p = getState().profile;
  openSheet({
    title: 'Weekly study goal',
    body: `
    <form id="goal-form" class="sf-form">
      <label class="field"><span>Hours per week</span>
        <input name="goal" type="number" min="1" max="80" required value="${p.weeklyGoalHours}">
      </label>
      <p class="form-hint">Flow AI uses this goal when recommending your daily study hours.</p>
      <div class="form-actions"><button type="submit" class="btn btn-primary grow">Save goal</button></div>
    </form>`,
    onMount(sheet, close) {
      const form = sheet.querySelector('#goal-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = Number(new FormData(form).get('goal'));
        if (!v || v < 1) { toast('Enter a valid number of hours', 'alert'); return; }
        updateProfile({ weeklyGoalHours: v });
        close();
        toast('Goal updated 🎯');
        document.dispatchEvent(new CustomEvent('sf-rerender'));
      });
    }
  });
}

function openReminderTimeForm() {
  const p = getState().profile;
  openSheet({
    title: 'Daily reminder time',
    body: `
    <form id="rtime-form" class="sf-form">
      <label class="field"><span>Remind me at</span>
        <input name="rtime" type="time" required value="${p.reminderTime}">
      </label>
      <div class="form-actions"><button type="submit" class="btn btn-primary grow">Save time</button></div>
    </form>`,
    onMount(sheet, close) {
      const form = sheet.querySelector('#rtime-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = new FormData(form).get('rtime');
        if (!v) return;
        updateProfile({ reminderTime: v });
        close();
        toast('Reminder time saved ⏰');
        document.dispatchEvent(new CustomEvent('sf-rerender'));
      });
    }
  });
}
