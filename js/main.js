/* ============================================================
   LIFTED portfolio — interactions & live Figma prototypes
   ============================================================ */

/* ---------------------------------------------------------------
   EDIT ME — your real contact details go here.
   Everything below in the contact section is driven by this config.
   --------------------------------------------------------------- */
const CONFIG = {
  email: "hello@lifted.design", // TODO: replace with your real email
  socials: [
    // { label: "linkedin", href: "https://linkedin.com/in/your-handle" },
    // { label: "behance",  href: "https://behance.net/your-handle" },
    // { label: "x",        href: "https://x.com/your-handle" },
    // { label: "figma",    href: "https://figma.com/@your-handle" },
  ],
};

/* ---------- footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- profile photo: auto-detects assets/img/profile.{jpg,png,jpeg,webp} ---------- */
(async () => {
  const img = document.getElementById("profileImg");
  const avatar = document.getElementById("avatar");
  for (const ext of ["jpg", "png", "jpeg", "webp"]) {
    try {
      const res = await fetch(`assets/img/profile.${ext}`, { method: "HEAD" });
      if (res.ok) {
        img.src = `assets/img/profile.${ext}`;
        img.hidden = false;
        avatar.classList.add("has-photo");
        break;
      }
    } catch {
      /* static server not reachable — keep monogram */
    }
  }
})();

/* ---------- contact config ---------- */
const emailText = document.getElementById("emailText");
const mailtoLink = document.getElementById("mailtoLink");
emailText.textContent = CONFIG.email;
mailtoLink.href = `mailto:${CONFIG.email}`;

document.getElementById("copyEmail").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(CONFIG.email);
    const prev = emailText.textContent;
    emailText.textContent = "copied ✓";
    setTimeout(() => (emailText.textContent = prev), 1600);
  } catch {
    /* clipboard blocked — the mailto button still works */
  }
});

const socialsEl = document.getElementById("socials");
socialsEl.innerHTML = CONFIG.socials
  .map((s) => `<li><a href="${s.href}" target="_blank" rel="noopener">${s.label} ↗</a></li>`)
  .join("");

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.16 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ---------- scroll progress ---------- */
const bar = document.getElementById("progressBar");
addEventListener(
  "scroll",
  () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    bar.style.width = `${pct}%`;
  },
  { passive: true }
);

/* ---------- cursor glow ---------- */
const glow = document.querySelector(".cursor-glow");
const finePointer = matchMedia("(pointer: fine)").matches;
if (finePointer) {
  let x = innerWidth / 2, y = innerHeight / 3, tx = x, ty = y;
  addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    x += (tx - x) * 0.08;
    y += (ty - y) * 0.08;
    glow.style.transform = `translate(${x - 260}px, ${y - 260}px)`;
    requestAnimationFrame(loop);
  })();
} else {
  glow.remove();
}

/* ---------- magnetic buttons ---------- */
if (finePointer) {
  document.querySelectorAll(".magnetic").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate(${dx * 0.18}px, ${dy * 0.22}px)`;
    });
    btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
  });
}

/* ---------- tilt on project media ---------- */
if (finePointer) {
  document.querySelectorAll(".tilt").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
}

/* ---------- mobile nav ---------- */
const nav = document.getElementById("nav");
const burger = document.getElementById("navBurger");
burger.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  burger.setAttribute("aria-expanded", String(open));
});
nav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    nav.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  })
);

/* ---------- live Figma prototype modal ---------- */
const modal = document.getElementById("protoModal");
const frame = document.getElementById("protoFrame");
const modalTitle = document.getElementById("modalTitle");
const modalOpen = document.getElementById("modalOpen");
const phoneHint = document.getElementById("phoneHint");
let lastFocus = null;

function openModal(btn) {
  lastFocus = btn;
  modalTitle.textContent = btn.dataset.title;
  modalOpen.href = btn.dataset.open;
  frame.src = btn.dataset.proto;
  phoneHint.style.opacity = "1";
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal-close").focus();
  /* fade the hint out once the embed has had time to boot */
  setTimeout(() => (phoneHint.style.opacity = "0"), 5000);
}

function closeModal() {
  modal.hidden = true;
  frame.src = "about:blank";
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}

document.querySelectorAll("[data-proto]").forEach((btn) =>
  btn.addEventListener("click", () => openModal(btn))
);
modal.querySelectorAll("[data-close]").forEach((el) =>
  el.addEventListener("click", closeModal)
);
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});
