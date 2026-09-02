/* ============================================================
   StudyFlow — Flow AI engine
   A data-aware assistant: builds study plans, practice
   questions, note summaries and hour calculations from the
   user's real courses, exams, tasks and sessions.
   ============================================================ */

import {
  getState, getCourse, upcomingTasks, todayStr, totalStudyHours,
  studyStreak, addSession
} from './store.js';
import { fmtDate, fmtDuration, relativeDay, fmtTime12, parseDS } from './helpers.js';

/* ---------------- intent detection ---------------- */
const INTENTS = [
  { id: 'plan',      re: /\b(study plan|plan (for|my)|schedule my|revision plan|revise for|prepare for)\b/i },
  { id: 'hours',     re: /\b(how (many|much).*(hours|time)|hours.*(study|day)|study.*(hours|time).*(day|week)|daily study|time should i)\b/i },
  { id: 'questions', re: /\b(practice questions|past questions|quiz me|test me|questions on|exam questions)\b/i },
  { id: 'summarize', re: /\b(summari[sz]e|summary|tl;?dr|condense|shorten)\b/i },
  { id: 'explain',   re: /\b(explain|what is|what are|what's|define|meaning of|break ?down|simplif|eli5|like i'?m 5)\b/i },
  { id: 'motivate',  re: /\b(motivat|stressed|overwhelm|burn(ed|t) out|procrastinat|can'?t focus|giving up|anxious)\b/i },
  { id: 'progress',  re: /\b(my progress|how am i doing|stats|streak|recap|what.*today|summary of my)\b/i },
  { id: 'tips',      re: /\b(tips|advice|how (do|can) i (study|learn|remember|memorize|focus)|technique|better grades)\b/i },
  { id: 'schedule',  re: /\b(schedule (it|them|a session|sessions for)|add (a )?session|book.*session|set up a session|block the time)\b/i },
  { id: 'hi',        re: /^(hi|hey|hello|yo|sup|good (morning|afternoon|evening))\b/i }
];

export function detectIntent(text) {
  for (const it of INTENTS) if (it.re.test(text)) return it.id;
  return 'fallback';
}

/* ---------------- main entry ---------------- */
export function flowAIResponse(userText) {
  const state = getState();
  const intent = detectIntent(userText);
  switch (intent) {
    case 'hi':        return greetingReply(state);
    case 'plan':      return studyPlanReply(userText, state);
    case 'hours':     return hoursReply(state);
    case 'questions': return questionsReply(userText, state);
    case 'summarize': return summarizeReply(userText);
    case 'explain':   return explainReply(userText);
    case 'motivate':  return motivateReply(state);
    case 'progress':  return progressReply(state);
    case 'tips':      return tipsReply();
    case 'schedule':  return scheduleReply(userText, state);
    default:          return fallbackReply(state);
  }
}

const name = (state) => state.profile.name?.split(' ')[0] || 'there';

/* ---------------- replies ---------------- */
function greetingReply(state) {
  const exams = upcomingTasks('exam', 3);
  let s = `Hey ${name(state)}! 👋 I'm Flow AI, your study assistant.\n\nHere's what I can do for you:\n`;
  s += `• 🗓️ Build a study plan for your upcoming exams\n• ⏱️ Calculate how many hours to study each day\n• ❓ Generate practice questions for any course\n• 📝 Summarize your notes\n• 💡 Explain tough topics simply\n`;
  if (exams.length) s += `\nYou have **${exams.length} upcoming exam${exams.length > 1 ? 's' : ''}** — the next is *${exams[0].title}* ${relativeDay(exams[0].dueDate).toLowerCase()}. Want me to plan for it?`;
  return s;
}

function studyPlanReply(text, state) {
  const exams = upcomingTasks('exam', 6);
  if (!exams.length) {
    return `You have no upcoming exams on your planner right now 🎉\n\nAdd an exam in the **Planner** tab (type: Exam) and I'll build a full day-by-day study plan around it. In the meantime, want me to:\n• Calculate your ideal daily study hours?\n• Generate practice questions for one of your ${state.courses.length} course(s)?`;
  }

  // pick exams mentioned in text if possible, else all
  const mentioned = exams.filter(e => {
    const c = getCourse(e.courseId);
    const hay = `${e.title} ${c?.code || ''} ${c?.name || ''}`.toLowerCase();
    return hay.split(/\s+/).some(w => w.length > 3 && text.toLowerCase().includes(w));
  });
  const targets = mentioned.length ? mentioned : exams.slice(0, 3);
  const t0 = parseDS(todayStr());

  let s = `Here's your personalized study plan, ${name(state)} 📚\n\n`;
  targets.forEach(exam => {
    const course = getCourse(exam.courseId);
    const label = course ? `${course.code} — ${course.name}` : exam.title;
    const daysLeft = Math.max(1, Math.round((parseDS(exam.dueDate) - t0) / 86400000));
    const units = course?.units || 2;
    const totalHours = Math.min(Math.max(units * 2, Math.ceil(daysLeft * 0.75)), units * 6);
    const perDay = Math.max(0.5, Math.round((totalHours / daysLeft) * 2) / 2);

    s += `**${label}**\n📅 ${exam.title} — ${fmtDate(exam.dueDate)} (${relativeDay(exam.dueDate)}, ${fmtTime12(exam.dueTime) || 'time TBA'})\n`;
    s += `⏳ ${daysLeft} day${daysLeft > 1 ? 's' : ''} left • ${units} unit${units > 1 ? 's' : ''}\n`;
    s += `🎯 Target: **${totalHours}h total → ${perDay}h/day**\n\n`;

    const phases = [
      { upto: 0.5, name: 'Learn & understand', detail: 'Go through lecture notes and textbooks. Write one-page summaries per topic.' },
      { upto: 0.8, name: 'Practice & apply', detail: 'Solve past questions and problem sets. Focus on topics you find hardest.' },
      { upto: 1.0, name: 'Review & recall', detail: 'Active recall + spaced repetition. Do a full mock under exam timing.' }
    ];
    phases.forEach(p => {
      const endDay = Math.max(1, Math.ceil(daysLeft * p.upto));
      const d = new Date(t0); d.setDate(d.getDate() + endDay - 1);
      s += `• *Days 1–${endDay}* (until ${fmtDate(fmtDS(d), { month: 'short', day: 'numeric' })}) — **${p.name}**: ${p.detail}\n`;
    });
    s += `\n`;
  });

  s += `Want me to **add these as study sessions** to your planner automatically? Just say *"schedule it"* and I'll block the time for you. 💪`;
  return s;
}

function fmtDS(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hoursReply(state) {
  const exams = upcomingTasks('exam', 10);
  const assignments = upcomingTasks('assignment', 10);
  const totalUnits = state.courses.reduce((a, c) => a + (c.units || 0), 0) || 3;
  const t0 = parseDS(todayStr());

  // workload model: units * 2h/week baseline + exam cram buffer + assignment buffer
  let weekly = totalUnits * 2;
  let note = `Based on your **${totalUnits} course units** across ${state.courses.length} courses, the standard rule is ~2h of self-study per unit per week.`;
  let daily = weekly / 7;

  if (exams.length) {
    const nearest = exams[0];
    const daysLeft = Math.max(1, Math.round((parseDS(nearest.dueDate) - t0) / 86400000));
    if (daysLeft <= 14) {
      const extra = Math.min(10, Math.ceil((exams.length * 6) / daysLeft));
      daily += extra / 7 * 1.5;
      note += `\n\n⚠️ You have **${exams.length} exam${exams.length > 1 ? 's' : ''}** coming up, the nearest in ${daysLeft} day${daysLeft > 1 ? 's' : ''} (*${nearest.title}*). I've added an exam-prep buffer.`;
    }
  }
  if (assignments.length) note += `\n📌 ${assignments.length} assignment${assignments.length > 1 ? 's' : ''} also pending — nearest: *${assignments[0].title}* (${relativeDay(assignments[0].dueDate)}).`;

  daily = Math.round(daily * 2) / 2;
  weekly = Math.round(daily * 7);
  const goal = state.profile.weeklyGoalHours;

  let s = `Here's my recommendation, ${name(state)} ⏱️\n\n${note}\n\n`;
  s += `## Your numbers\n`;
  s += `• **Daily study target: ${daily} hours** (${fmtDuration(Math.round(daily * 60))})\n`;
  s += `• **Weekly total: ~${weekly} hours**\n`;
  s += `• Your current weekly goal is **${goal}h** — ${weekly > goal ? `I suggest raising it to ${weekly}h in Profile → Settings.` : `you're already set to hit it ✅`}\n\n`;
  s += `💡 Split it into 2–3 focused blocks (e.g. 50 min study + 10 min break — the Pomodoro style). You've already logged **${totalStudyHours().toFixed(1)}h** total and you're on a **${studyStreak()}-day streak**. Keep it going! 🔥`;
  return s;
}

function questionsReply(text, state) {
  const lower = text.toLowerCase();
  const countMatch = lower.match(/(\d{1,2})\s*(practice|past|exam)?\s*question/);
  const count = Math.min(Math.max(parseInt(countMatch?.[1] || '10', 10), 3), 15);

  // find course mentioned
  let course = state.courses.find(c =>
    lower.includes(c.code.toLowerCase()) || lower.includes(c.name.toLowerCase().split(' ')[0])
  );
  // or a topic hint
  const topicMatch = text.match(/(?:on|about|for)\s+([A-Za-z0-9 ,\-&]{3,40}?)(?:\?|\.|$)/i);
  const topic = topicMatch ? topicMatch[1].trim() : null;

  if (!course && state.courses.length) {
    // pick course with nearest exam
    const exams = upcomingTasks('exam', 5);
    course = exams.length ? getCourse(exams[0].courseId) : state.courses[0];
  }

  const title = course ? `${course.code} — ${course.name}` : (topic || 'your topic');
  const themes = topic || course?.name || 'the course material';

  const qs = generateQuestions(count, themes, course);
  let s = `Here are **${count} practice questions** for *${title}* ✍️\n\n${qs}\n\n`;
  s += `📖 Tip: answer them closed-book first, then check your notes. Want me to quiz you on a specific topic? Just tell me, e.g. *"give me 5 questions on binary trees"*.`;
  return s;
}

function generateQuestions(n, themes, course) {
  const t = themes.replace(/[.?!]+$/, '');
  const templates = [
    `Define **${t}** in your own words and give one real-life example.`,
    `Explain the key principles of ${t} and why they matter in ${course ? course.code : 'this course'}.`,
    `List and compare the main components/types of ${t}.`,
    `A classmate says they don't understand ${t}. Walk them through it step by step.`,
    `What are the most common mistakes people make when applying ${t}? How do you avoid them?`,
    `Solve a typical problem involving ${t}, showing every step of your working.`,
    `How does ${t} connect to other topics you've studied this semester?`,
    `Describe a scenario where ${t} would be the right approach — and one where it wouldn't.`,
    `If an exam asked one big essay question on ${t}, what 3 arguments/points would you lead with?`,
    `Teach ${t} to a 10-year-old using an analogy.`,
    `What formulas, rules or definitions are essential to remember about ${t}?`,
    `Predict two likely exam questions on ${t} and outline model answers.`,
    `Identify the hardest part of ${t} for you personally, and design a 30-minute drill to fix it.`,
    `Compare and contrast ${t} with a related concept from earlier in the course.`,
    `Create a one-page cheat sheet for ${t}: what goes on it?`
  ];
  return templates.slice(0, n).map((q, i) => `${i + 1}. ${q}`).join('\n');
}

function summarizeReply(text) {
  // Look for pasted notes in the message (beyond the command words)
  const cleaned = text.replace(/\b(can you |please |could you )?\b(summari[sz]e|summary of|summarize|tl;?dr|condense)\b\s*(my notes|this|these notes|the following)?[:\-]?\s*/i, '').trim();

  if (cleaned.length < 60) {
    return `I can summarize your notes! 📝\n\nPaste the text right here in the chat (or type *"summarize: <your notes>"*) and I'll:\n• Extract the key ideas\n• Group them into a short outline\n• Flag anything that looks like an exam-favorite definition\n\nLong notes work best — paste as much as you like.`;
  }
  return extractiveSummary(cleaned);
}

/** Simple extractive summarizer: sentence scoring by word frequency. */
function extractiveSummary(text) {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.split(' ').length >= 4);

  if (sentences.length === 0) return `Hmm, I couldn't find complete sentences in that. Try pasting the notes again with full sentences 🙂`;

  const STOP = new Set('the a an and or but if then than that this these those of in on for to with from by at as is are was were be been being it its his her their our your my i you he she we they not no yes can could should would will have has had do does did about into over under between also such more most other some any each every'.split(' '));
  const freq = {};
  text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).forEach(w => {
    if (w.length > 2 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1;
  });

  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
    let score = words.reduce((a, w) => a + (freq[w] || 0), 0) / Math.sqrt(words.length || 1);
    score *= (i === 0 ? 1.3 : 1);           // first sentence often the thesis
    if (/important|key|therefore|thus|in summary|conclusion|means that|defined as/i.test(s)) score *= 1.4;
    return { s, i, score };
  }).sort((a, b) => b.score - a.score);

  const keep = Math.max(2, Math.min(5, Math.ceil(sentences.length * 0.3)));
  const top = scored.slice(0, keep).sort((a, b) => a.i - b.i);
  const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);

  let out = `Here's your summary 📝\n\n## Key points\n`;
  top.forEach(({ s }) => { out += `• ${s}\n`; });
  out += `\n## Keywords to remember\n${keywords.map(k => `\`${k}\``).join(' ')}\n`;
  out += `\n💡 Want me to turn these key points into practice questions? Just ask!`;
  return out;
}

function explainReply(text) {
  const topic = text
    .replace(/\b(can you |please |could you )?\b(explain|what is|what are|what's|define|break ?down|simplify)\b\s*/i, '')
    .replace(/\b(simply|in simple terms|like i'?m 5|eli5|for me|to me)\b/gi, '')
    .replace(/[?.!]+$/, '')
    .trim();

  if (!topic) {
    return `Sure! Which topic should I explain? 🤓\n\nType it like: *"explain recursion simply"* or *"what is a matrix?"* — I'll break it down with an analogy, the key ideas, and a quick check-yourself question.`;
  }

  let s = `Let's break down **${topic}** — simply 🧠\n\n`;
  s += `## 🍕 The everyday analogy\nThink of *${topic}* like learning to cook a new dish. You don't memorize the whole recipe book — you learn the core ingredients (the fundamentals), then practice combining them (application), and eventually you can improvise (mastery). The same pattern applies here.\n\n`;
  s += `## 📌 The 3 key ideas\n`;
  s += `1. **What it is** — ${topic} is a concept in your course with a precise definition. Write that definition in ONE sentence from your lecture notes; if you can't, that's the first gap to close.\n`;
  s += `2. **Why it matters** — every topic exists to solve a specific problem. Ask: "what was hard/impossible before ${topic}, and easy after?" That's its purpose.\n`;
  s += `3. **How it's used** — learn 2 worked examples: one basic, one tricky. Exams test the tricky pattern ~80% of the time.\n\n`;
  s += `## 🪜 The Feynman drill (5 steps)\n1. Write "${topic}" at the top of a blank page.\n2. Explain it in your own words like you're teaching a 10-year-old.\n3. Wherever you get stuck, that's a gap — go back to your notes for just that part.\n4. Simplify the language and add an analogy.\n5. Repeat until the page reads smoothly.\n\n`;
  s += `## ✅ Check yourself\nCan you answer: *"What is ${topic}, why does it exist, and give one example?"* — out loud, no notes.\n\n💬 If you paste your lecture notes on ${topic} here, I'll give you an explanation tailored to exactly what your lecturer covers.`;
  return s;
}

function motivateReply(state) {
  const streak = studyStreak();
  const done = state.tasks.filter(t => t.completed).length;
  let s = `Hey — first of all, you're doing better than you think, ${name(state)} 💙\n\n`;
  if (streak > 0) s += `🔥 You're on a **${streak}-day streak**. That's proof you show up even when you don't feel like it.\n`;
  if (done > 0) s += `✅ You've completed **${done} task${done > 1 ? 's' : ''}** so far. Every one of those was a rep for your future self.\n`;
  s += `\n## Try the 5-minute rule\nDon't aim to "study". Aim to open your notes and work for just **5 minutes**. Starting is 90% of the battle — momentum does the rest.\n\n`;
  s += `## Shrink the mountain\nPick ONE small task from your planner — the smallest thing due soonest — and finish only that. Then stop if you want. (You usually won't.)\n\n`;
  s += `Remember: every expert was once a beginner who refused to quit. I've got your back. Want me to pick the perfect next task for you? 😊`;
  return s;
}

function progressReply(state) {
  const exams = upcomingTasks('exam', 3);
  const assignments = upcomingTasks('assignment', 3);
  const todayTasks = state.tasks.filter(t => t.dueDate === todayStr());
  const todaySessions = state.sessions.filter(s => s.date === todayStr());
  const pending = state.tasks.filter(t => !t.completed).length;

  let s = `Here's your recap, ${name(state)} 📊\n\n`;
  s += `## Today\n• ${todayTasks.length} task${todayTasks.length !== 1 ? 's' : ''} due (${todayTasks.filter(t => t.completed).length} done)\n• ${todaySessions.length} study session${todaySessions.length !== 1 ? 's' : ''} scheduled (${fmtDuration(todaySessions.reduce((a, x) => a + x.duration, 0))} planned)\n\n`;
  s += `## Overall\n• ${state.courses.length} course${state.courses.length !== 1 ? 's' : ''} • ${pending} pending task${pending !== 1 ? 's' : ''}\n• **${totalStudyHours().toFixed(1)}h** total study time logged\n• **${studyStreak()}-day** streak 🔥\n`;
  if (exams.length) s += `\n## Next exams\n${exams.map(e => `• *${e.title}* — ${fmtDate(e.dueDate)} (${relativeDay(e.dueDate)})`).join('\n')}\n`;
  if (assignments.length) s += `\n## Next assignments\n${assignments.map(a => `• *${a.title}* — ${relativeDay(a.dueDate)}`).join('\n')}\n`;
  s += `\nWant a study plan for any of these? Just say the word 💪`;
  return s;
}

function tipsReply() {
  return `Here are the study techniques that actually work (backed by research) 🧪\n\n1. **Active recall** — close the book and write what you remember. Testing yourself beats re-reading by ~2x.\n2. **Spaced repetition** — review at day 1, day 3, day 7, day 14. Your brain keeps what it revisits.\n3. **Interleaving** — mix topics in one session instead of blocking. Harder, but it sticks better.\n4. **Pomodoro** — 50 min deep focus + 10 min break. Phone in another room.\n5. **Feynman technique** — explain it like you're teaching a child. Gaps reveal themselves instantly.\n6. **Sleep is studying** — memory consolidates during sleep. An all-nighter costs you more than it gains.\n7. **Past questions are gold** — lecturers recycle patterns. Do them under timed conditions.\n\n💡 Want me to build these into a weekly routine around your actual timetable? Ask me for a study plan!`;
}

function scheduleReply(text, state) {
  const exams = upcomingTasks('exam', 3);
  if (!exams.length) return `I'd love to schedule sessions for you — but I don't see any upcoming exams. Add one in the **Planner** tab, then ask me to *"schedule it"* ⏱️`;

  const t0 = parseDS(todayStr());
  const created = [];
  exams.slice(0, 2).forEach(exam => {
    const course = getCourse(exam.courseId);
    const daysLeft = Math.max(1, Math.round((parseDS(exam.dueDate) - t0) / 86400000));
    const units = course?.units || 2;
    const sessionsCount = Math.min(Math.max(2, Math.ceil(daysLeft / 2)), 5);
    const perSession = Math.min(120, Math.max(45, Math.round((units * 2 * 60) / sessionsCount / 15) * 15));

    for (let i = 1; i <= sessionsCount; i++) {
      const d = new Date(t0);
      d.setDate(d.getDate() + Math.round((daysLeft - 1) * (i / sessionsCount)));
      const ds = fmtDS(d);
      if (ds >= exam.dueDate) continue;
      // avoid duplicate at same date+time
      const startHour = 15 + ((i - 1) % 3);
      const startTime = `${String(startHour).padStart(2, '0')}:00`;
      const dup = state.sessions.some(s => s.date === ds && s.startTime === startTime);
      if (dup) continue;
      addSession({
        courseId: exam.courseId,
        date: ds,
        startTime,
        duration: perSession,
        topic: `Exam prep: ${exam.title} (${i}/${sessionsCount})`
      });
      created.push(`${fmtDate(ds, { weekday: 'short', month: 'short', day: 'numeric' })} @ ${fmtTime12(startTime)} — ${fmtDuration(perSession)}`);
    }
  });

  if (!created.length) return `I checked your calendar and it already covers the prep window nicely ✅ Nothing to add — focus on executing the sessions you have!`;
  return `Done! ✅ I've added **${created.length} study session${created.length > 1 ? 's' : ''}** to your planner for your upcoming exams:\n\n${created.map(c => `• ${c}`).join('\n')}\n\nYou'll find them in the **Planner** tab and on your **Home** screen. Check them off as you complete them to keep your streak alive 🔥`;
}

function fallbackReply(state) {
  const exams = upcomingTasks('exam', 2);
  let s = `Great question! Here's how I can help you best right now 🤖\n\nI'm Flow AI — I work with your actual planner data. Try asking me:\n`;
  s += `• *"Create a study plan for my exams"*\n• *"How many hours should I study each day?"*\n• *"Give me 10 practice questions for ${state.courses[0]?.code || 'my course'}"*\n• *"Summarize: <paste your notes>"*\n• *"Explain <any topic> simply"*\n• *"How's my progress?"*\n• *"I'm feeling overwhelmed"*\n`;
  if (exams.length) s += `\n👀 I can see *${exams[0].title}* is coming up ${relativeDay(exams[0].dueDate).toLowerCase()} — want a plan for it?`;
  return s;
}

/* ---------------- quick prompt chips ---------------- */
export const QUICK_PROMPTS = [
  'Create a study plan for my exams',
  'How many hours should I study each day?',
  'Give me 10 practice questions',
  'Summarize my notes',
  'Explain recursion simply',
  "How's my progress?"
];
