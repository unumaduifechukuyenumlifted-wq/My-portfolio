# My-portfolio ✦

Portfolio of **Unumadu Ifechukuyenum Lifted** — UI/UX designer.
A modern, gen-z styled single-page site with live, tappable Figma prototypes
(ZENITH, CHAIN FLOW, SIGMAFLOW AI) embedded in a phone frame.

## Run locally

```bash
python3 -m http.server 8000 --bind 0.0.0.0
# then open http://localhost:8000
```

No build step, no dependencies — it's plain HTML/CSS/JS so it also deploys
straight to GitHub Pages.

## Make it yours (2 quick edits)

1. **Profile picture** — drop your photo into the repo as any of:
   `assets/img/profile.jpg` · `profile.png` · `profile.jpeg` · `profile.webp`.
   The hero card detects it automatically and swaps the "UL" monogram for your photo.

2. **Email & socials** — open `js/main.js` and edit the `CONFIG` object at the top
   (replace `hello@lifted.design` with your real email and uncomment/add your
   LinkedIn / Behance / X / Figma links).

## Figma embeds

Each "▶ live prototype" button embeds the real Figma prototype via
`embed.figma.com`. If an embed ever shows a login wall instead of the app,
open that file in Figma → **Share** → set link access to
*"Anyone with the link can view"*.

## GitHub Pages (no build step needed)

The site is plain HTML, so in the repo on GitHub:
**Settings → Pages → Build and deployment → Source: “Deploy from a branch”**
→ pick the branch (e.g. `main` after merging) and folder `/ (root)` → Save.
Your site will then live at `https://<your-username>.github.io/My-portfolio/`.

## Structure

```
index.html          page markup (hero, work, about, process, toolkit, contact)
css/style.css       design system & all styles
js/main.js          interactions + CONFIG (email/socials) + photo auto-detect
assets/img/         project cover art + your profile photo slot
```
