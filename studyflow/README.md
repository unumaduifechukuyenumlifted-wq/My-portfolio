# StudyFlow 📚✨

**StudyFlow** is an AI-powered study planner for university students — a fully functional mobile web app (installable as a PWA) for organizing courses, assignments, exams, study sessions, and daily tasks in one place.

## Features

### 🏠 Home
- Time-aware greeting ("Good afternoon 👋") and today's date
- Today's study progress with animated progress ring + bar (% completed)
- Overdue-task alert banner
- Quick actions: **Add Task**, **Study Session**, **Ask Flow AI**
- Today's study sessions, tasks due today, upcoming assignments & exams

### 📚 Courses
- Add / edit / delete courses with **code, name, lecturer, units, and color**
- Course detail view showing linked assignments, tasks and study sessions
- Per-course stats: pending tasks, completed tasks, hours studied

### 🗓️ Planner
- Interactive **month calendar** with colored dots (exams, assignments, sessions)
- Select any day to view / add / edit / complete / delete its items
- Tasks with **deadlines, times, and priorities** (Low / Medium / High)
- Types: Task, Assignment, Exam — filterable
- Study sessions with start time and duration (25m–2h presets)
- **Reminders**: in-app banner + optional native browser notifications, re-checked every minute
- "Coming up next" 14-day agenda

### 🤖 Flow AI
- Chat assistant that reads your **real data** (courses, exams, streak, hours)
- Intents: study plans, daily-hours calculator, practice-question generator, extractive notes summarizer, topic explainer (Feynman drill), progress recaps, motivation, and **auto-scheduling** study sessions into your planner ("schedule it")
- Typing indicator, streaming-style responses, quick prompt chips, persistent chat history

### 👤 Profile
- Editable student name & university
- Stats: total courses, completed tasks, **study streak 🔥**, total study hours
- Settings: weekly study goal, reminder time, notifications toggle
- Data: **JSON export / import backup**, full app reset

### 💾 Persistence
All data (courses, tasks, sessions, chat, profile) is stored in `localStorage` and survives closing/reopening the app. First launch seeds a realistic demo semester so the app is never empty.

## Design
- Primary `#2E8BFF`, secondary `#050505`, light backgrounds
- Inter font, rounded cards, soft shadows, bottom-sheet forms
- Smooth animations: screen transitions, sheet slide-up, progress fills, toasts, check pops
- Phone frame on desktop, full-bleed native feel on mobile; swipe left/right between tabs

## Tech
Vanilla ES modules — no build step, no dependencies.

```
studyflow/
├── index.html          # App shell + splash
├── manifest.json       # PWA manifest (installable)
├── icon.svg
├── css/style.css       # Design system
└── js/
    ├── app.js          # Router, bottom nav, lifecycle
    ├── store.js        # localStorage data layer + stats
    ├── helpers.js      # Dates, icons, toasts, sheets, forms
    ├── components.js   # Task/session cards + add/edit forms
    ├── ai.js           # Flow AI intent engine
    └── screens/        # home, courses, planner, ai, profile
```

## Run locally
Any static server works:

```bash
cd studyflow
python3 -m http.server 8000
# open http://localhost:8000
```
