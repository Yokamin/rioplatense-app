# Rioplatense Practice

A mobile-first web app for reviewing **Rioplatense Spanish** — verb conjugations, vocabulary, and grammar patterns — with *vos* as the active “you” form and standard *tú* / *vosotros* kept for recognition.

Built as plain **HTML, CSS, and ES modules** (no build step). Designed to run on **GitHub Pages** or any static host.

## What it does

| Mode | Description |
|------|-------------|
| **Conjugation Practice** | Random drill cards by tense, verb type, pronoun, and verb list. Type answers or use reveal-only review mode. |
| **Vocabulary Recall** | English → Spanish recall by category (days, months, and more as you add them). |
| **Verb Lookup** | Searchable list of all verbs with full present-tense tables and type tags. |
| **Card Creator** | Add vocabulary and verbs in the browser; drafts live in localStorage until you export JSON and commit. |
| **Reference** | Short notes on regular, stem-changing, and irregular verbs, plus frequency tiers. |

After you answer correctly (or reveal) in conjugation drills, tap the **infinitive** on the card to open a conjugation popup — locked until you’ve resolved the card.

## Content included

- **~59 verbs** with full 7-pronoun **present tense** tables, tagged by frequency (**core** / **common** / **extended**) and conjugation type.
- **Vocabulary** seed data: days of the week, months, plus an empty `general` category for new words.
- Settings, stats, and Card Creator drafts persist in **localStorage** on your device.

You’re expected to grow the word lists yourself (class material, Card Creator, Git) rather than ship a huge dictionary upfront.

## Practice modes

- **Type answers (recommended)** — green = exact, yellow = accent only, red = wrong. Optional reveal if stuck. Session + lifetime stats.
- **Reveal only** — flip through cards with no typing and **no stats**; good for passive review.

## Local development

The app loads JSON via `fetch`, so it needs a local server (not `file://`):

```bash
cd rioplatense-app
python3 -m http.server 8765
```

Open [http://localhost:8765](http://localhost:8765).

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project.
2. On GitHub: **Settings → Pages → Build and deployment**.
3. Source: **Deploy from a branch**.
4. Branch: **`main`** (or `master`), folder **`/ (root)`**.
5. Save. After a minute or two, the site is live at  
   `https://<username>.github.io/<repo-name>/`

Open the **`index.html`** URL (or the root if Pages serves it as default). All asset paths are relative, so subpath hosting works without config.

This repo includes a **`.nojekyll`** file so GitHub Pages serves the site as static files without Jekyll interfering.

## Updating data

1. Use **Card Creator** to add words or verbs (drafts stay in your browser).
2. **Export JSON** from the creator.
3. Merge into `data/vocab.json` or `data/verbs.json` and commit.

Verbs need a complete 7-pronoun map for a tense to appear in conjugation drills. Partial entries are fine for storage and lookup.

## Tech stack

- Vanilla HTML5 / CSS3 / ES6 modules
- `data/vocab.json`, `data/verbs.json`
- No npm, no bundler

## Roadmap (brief)

- Richer conjugation feedback (explain errors before showing fixes)
- Past tenses when you’re ready
- Optional PWA / add-to-home-screen polish

See **`PROJECT_STATE.md`** for schemas, architecture notes, and agent workflow rules.

## License

Personal learning project — add a license if you plan to share or accept contributions.
