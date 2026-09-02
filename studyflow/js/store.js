/* ============================================================
   StudyFlow — Data Store (persistent via localStorage)
   ============================================================ */

const KEY = 'studyflow.v1';

const DEFAULT_DATA = {
  profile: {
    name: 'Student',
    university: 'My University',
    weeklyGoalHours: 15,
    reminderTime: '09:00',
    notifications: false,
    avatarHue: 211
  },
  courses: [],      // {id, code, name, lecturer, units, color, createdAt}
  tasks: [],        // {id, title, courseId, dueDate, dueTime, priority, type, notes, completed, completedAt, createdAt}
  sessions: [],     // {id, courseId, date, startTime, duration, topic, completed, createdAt}
  chat: [],         // {id, role: 'user'|'ai', text, ts}
  seedDone: false
};

let data = null;
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    data = raw ? JSON.parse(raw) : structuredClone(DEFAULT_DATA);
    // merge missing keys for forward-compat
    for (const k of Object.keys(DEFAULT_DATA)) {
      if (data[k] === undefined) data[k] = structuredClone(DEFAULT_DATA[k]);
    }
    for (const k of Object.keys(DEFAULT_DATA.profile)) {
      if (data.profile[k] === undefined) data.profile[k] = DEFAULT_DATA.profile[k];
    }
  } catch (e) {
    console.error('Store load failed, resetting.', e);
    data = structuredClone(DEFAULT_DATA);
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch (e) { console.error('Store save failed', e); }
}

function emit() { save(); listeners.forEach(fn => fn(data)); }

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function getState() { return data; }

export function init() {
  if (!data) load();
  if (!data.seedDone) { seed(); data.seedDone = true; }
  save();
}

/* ---------------- Profile ---------------- */
export function updateProfile(patch) {
  data.profile = { ...data.profile, ...patch };
  emit();
}

/* ---------------- Courses ---------------- */
export function getCourses() { return data.courses; }
export function getCourse(id) { return data.courses.find(c => c.id === id) || null; }

export function addCourse({ code, name, lecturer, units, color }) {
  const course = { id: uid(), code: code.trim().toUpperCase(), name: name.trim(), lecturer: lecturer.trim(), units: Number(units) || 0, color, createdAt: Date.now() };
  data.courses.push(course);
  emit();
  return course;
}

export function updateCourse(id, patch) {
  const c = getCourse(id);
  if (!c) return;
  Object.assign(c, patch);
  if (patch.code) c.code = patch.code.trim().toUpperCase();
  if (patch.name) c.name = patch.name.trim();
  if (patch.units !== undefined) c.units = Number(patch.units) || 0;
  emit();
}

export function deleteCourse(id) {
  data.courses = data.courses.filter(c => c.id !== id);
  data.tasks = data.tasks.filter(t => t.courseId !== id);
  data.sessions = data.sessions.filter(s => s.courseId !== id);
  emit();
}

/* ---------------- Tasks ---------------- */
export function getTasks() { return data.tasks; }

export function addTask({ title, courseId, dueDate, dueTime, priority, type, notes }) {
  const task = {
    id: uid(),
    title: title.trim(),
    courseId: courseId || null,
    dueDate: dueDate || todayStr(),
    dueTime: dueTime || '',
    priority: priority || 'medium',
    type: type || 'task',           // task | assignment | exam
    notes: notes || '',
    completed: false,
    completedAt: null,
    createdAt: Date.now()
  };
  data.tasks.push(task);
  emit();
  return task;
}

export function updateTask(id, patch) {
  const t = data.tasks.find(t => t.id === id);
  if (!t) return;
  Object.assign(t, patch);
  if (patch.title !== undefined) t.title = patch.title.trim();
  emit();
}

export function toggleTask(id) {
  const t = data.tasks.find(t => t.id === id);
  if (!t) return;
  t.completed = !t.completed;
  t.completedAt = t.completed ? Date.now() : null;
  emit();
}

export function deleteTask(id) {
  data.tasks = data.tasks.filter(t => t.id !== id);
  emit();
}

export function tasksForCourse(courseId) {
  return data.tasks.filter(t => t.courseId === courseId);
}

/* ---------------- Study sessions ---------------- */
export function getSessions() { return data.sessions; }

export function addSession({ courseId, date, startTime, duration, topic }) {
  const s = {
    id: uid(),
    courseId: courseId || null,
    date: date || todayStr(),
    startTime: startTime || '16:00',
    duration: Number(duration) || 60,   // minutes
    topic: (topic || '').trim(),
    completed: false,
    createdAt: Date.now()
  };
  data.sessions.push(s);
  emit();
  return s;
}

export function updateSession(id, patch) {
  const s = data.sessions.find(s => s.id === id);
  if (!s) return;
  Object.assign(s, patch);
  if (patch.duration !== undefined) s.duration = Number(patch.duration) || 60;
  emit();
}

export function toggleSession(id) {
  const s = data.sessions.find(s => s.id === id);
  if (!s) return;
  s.completed = !s.completed;
  emit();
}

export function deleteSession(id) {
  data.sessions = data.sessions.filter(s => s.id !== id);
  emit();
}

export function sessionsForCourse(courseId) {
  return data.sessions.filter(s => s.courseId === courseId);
}

/* ---------------- Chat ---------------- */
export function getChat() { return data.chat; }

export function addMessage(role, text) {
  const m = { id: uid(), role, text, ts: Date.now() };
  data.chat.push(m);
  emit();
  return m;
}

export function clearChat() { data.chat = []; emit(); }

/* ---------------- Stats & queries ---------------- */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function upcomingTasks(type = null, limit = 5) {
  const t0 = todayStr();
  return data.tasks
    .filter(t => !t.completed && t.dueDate >= t0 && (!type || t.type === type))
    .sort((a, b) => (a.dueDate + (a.dueTime || '99:99')).localeCompare(b.dueDate + (b.dueTime || '99:99')))
    .slice(0, limit);
}

export function overdueTasks() {
  const t0 = todayStr();
  return data.tasks.filter(t => !t.completed && t.dueDate < t0);
}

export function tasksOnDate(ds) { return data.tasks.filter(t => t.dueDate === ds); }
export function sessionsOnDate(ds) { return data.sessions.filter(s => s.date === ds); }

export function totalStudyHours() {
  const mins = data.sessions.filter(s => s.completed).reduce((a, s) => a + s.duration, 0);
  return mins / 60;
}

export function completedTaskCount() { return data.tasks.filter(t => t.completed).length; }

/** Streak: consecutive days (ending today or yesterday) with a completed session or task. */
export function studyStreak() {
  const active = new Set();
  data.sessions.filter(s => s.completed).forEach(s => active.add(s.date));
  data.tasks.filter(t => t.completed && t.completedAt).forEach(t => active.add(dateStr(new Date(t.completedAt))));
  if (!active.size) return 0;

  let streak = 0;
  const cur = new Date();
  // today may not be done yet — start checking from today, but allow streak to hold via yesterday
  if (!active.has(dateStr(cur))) cur.setDate(cur.getDate() - 1);
  while (active.has(dateStr(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export function todayProgress() {
  const t0 = todayStr();
  const tasks = data.tasks.filter(t => t.dueDate === t0);
  const sessions = data.sessions.filter(s => s.date === t0);
  const total = tasks.length + sessions.length;
  const done = tasks.filter(t => t.completed).length + sessions.filter(s => s.completed).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

/* ---------------- Reset / Export / Import ---------------- */
export function exportJSON() {
  return JSON.stringify(data, null, 2);
}

export function importJSON(str) {
  const parsed = JSON.parse(str);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid file');
  data = { ...structuredClone(DEFAULT_DATA), ...parsed };
  emit();
}

export function resetAll(keepSeed = false) {
  data = structuredClone(DEFAULT_DATA);
  if (!keepSeed) data.seedDone = true; // don't re-seed after explicit reset
  emit();
}

/* ---------------- Demo seed (first launch only) ---------------- */
function seed() {
  const t = new Date();
  const ds = off => { const d = new Date(t); d.setDate(d.getDate() + off); return dateStr(d); };

  const colors = ['#2E8BFF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

  data.courses = [
    { id: uid(), code: 'CSC 305', name: 'Data Structures & Algorithms', lecturer: 'Dr. Amara Okafor', units: 3, color: colors[0], createdAt: Date.now() },
    { id: uid(), code: 'MTH 210', name: 'Linear Algebra', lecturer: 'Prof. David Mensah', units: 2, color: colors[1], createdAt: Date.now() },
    { id: uid(), code: 'GST 202', name: 'Entrepreneurship Studies', lecturer: 'Mrs. Fatima Bello', units: 2, color: colors[2], createdAt: Date.now() }
  ];

  const [c1, c2, c3] = data.courses;

  data.tasks = [
    { id: uid(), title: 'Submit AVL Trees assignment', courseId: c1.id, dueDate: ds(0), dueTime: '23:59', priority: 'high', type: 'assignment', notes: 'Implement insert + delete with rotations.', completed: false, completedAt: null, createdAt: Date.now() },
    { id: uid(), title: 'Read chapter 4 — Vector Spaces', courseId: c2.id, dueDate: ds(1), dueTime: '', priority: 'medium', type: 'task', notes: '', completed: false, completedAt: null, createdAt: Date.now() },
    { id: uid(), title: 'Business plan draft', courseId: c3.id, dueDate: ds(3), dueTime: '12:00', priority: 'low', type: 'assignment', notes: '', completed: false, completedAt: null, createdAt: Date.now() },
    { id: uid(), title: 'Data Structures midterm exam', courseId: c1.id, dueDate: ds(7), dueTime: '10:00', priority: 'high', type: 'exam', notes: 'Topics: trees, heaps, hashing.', completed: false, completedAt: null, createdAt: Date.now() },
    { id: uid(), title: 'Linear Algebra quiz', courseId: c2.id, dueDate: ds(12), dueTime: '09:00', priority: 'medium', type: 'exam', notes: 'Matrices & determinants.', completed: false, completedAt: null, createdAt: Date.now() },
    { id: uid(), title: 'Solve 10 past questions', courseId: c2.id, dueDate: ds(-1), dueTime: '', priority: 'medium', type: 'task', notes: '', completed: true, completedAt: Date.now() - 86400000, createdAt: Date.now() }
  ];

  data.sessions = [
    { id: uid(), courseId: c1.id, date: ds(0), startTime: '16:00', duration: 90, topic: 'AVL tree rotations practice', completed: false, createdAt: Date.now() },
    { id: uid(), courseId: c2.id, date: ds(0), startTime: '19:30', duration: 60, topic: 'Vector spaces — definitions & examples', completed: false, createdAt: Date.now() },
    { id: uid(), courseId: c1.id, date: ds(1), startTime: '17:00', duration: 60, topic: 'Heap operations', completed: false, createdAt: Date.now() },
    { id: uid(), courseId: c3.id, date: ds(-1), startTime: '15:00', duration: 45, topic: 'Case study review', completed: true, createdAt: Date.now() }
  ];
}
