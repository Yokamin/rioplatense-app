# Rioplatense Practice

**Live app:** [yokamin.github.io/rioplatense-app](https://yokamin.github.io/rioplatense-app/)

A **personal side project** built alongside my own Spanish learning — not a complete course or dictionary. Content grows as my classes and exam prep do: verb lists, vocab themes, and exam snapshots reflect what *I* am working on at the time, with some Rioplatense-specific choices baked in. Anyone is welcome to use it, fork it, or adapt the data — but the defaults and scope are tailored to my progression, not to “all of Spanish.”

A mobile-first web app for reviewing **Rioplatense Spanish** — verb conjugations, vocabulary, and grammar patterns — with *vos* as the active “you” form and standard *tú* / *vosotros* kept for recognition.

Built as plain **HTML, CSS, and ES modules** (no build step). Designed to run on **GitHub Pages** or any static host.

## What it does

| Mode | Description |
|------|-------------|
| **Conjugation Practice** | Drill by tense, verb type, pronoun, and verb list. Default **per-verb** mode (all selected pronouns on one card) or single-form cards. Deck order covers every card before repeating. |
| **Reflexive Practice** | Same drill engine scoped to reflexive verbs — answers include the pronoun (e.g. *me lavo*). |
| **Vocabulary Recall** | English → Spanish recall by category (days, months, emotions, family, modismos, and more). |
| **Exam Practice** | Hub linking to exam-scoped conjugation presets and reflexive lists from JSON snapshots. |
| **Verb Lookup** | Searchable list with filters (all / non-reflexive / reflexive), full present-tense tables, and type tags. |
| **Reference** | Short notes on regular, stem-changing, and irregular verbs, plus frequency tiers and reflexive pronouns. |
| **Card Creator** | Add vocabulary and verbs in the browser; drafts live in localStorage until you export JSON and commit. *(Hidden from home for now; page kept at `card-creator.html`.)* |

After you answer correctly (or reveal) in conjugation drills, tap the **infinitive** on the card to open a conjugation popup — locked until you’ve resolved the card.

## Content included

Content is **intentionally incomplete** and updated over time — not meant to cover every verb or word in the language.

- **Verbs** — a growing set with full 7-pronoun **present tense** tables, grouped by frequency (**core** / **common** / **extended**) and conjugation type (regular, stem-changing, irregular). Includes everyday and exam-focused verbs plus a reflexive subset for daily routines.
- **Vocabulary** — themed categories (days, months, emotions, family, modismos, and others as they get added); not a full A1–C2 word list.
- **Exam snapshots** (`data/exams/`) — optional scoped drills for a specific exam date (e.g. irregular / regular / reflexive presets you configure in JSON).
- Settings, stats, and Card Creator drafts persist in **localStorage** on your device.

Exact lists live in `data/verbs.json`, `data/vocab.json`, and `data/exams/` — check there for what is in the repo today.

## Drill features

- **Per verb (default)** — type every selected pronoun for one infinitive on a single card; compact row layout with inline feedback.
- **Single form** — one pronoun per card (classic mode).
- **Deck order** — shuffle through the full deck once before reshuffling (recommended).
- **Stem-change hints** — optional reminders (*e → ie*, *o → ue*, *e → i*) on forms that actually change; vos unchanged forms stay silent.
- **Settings repair** — empty saved filters reset to “everything enabled”; your real choices still persist.
- **Type answers** — green = exact, yellow = accent only, red = wrong (try again without spoiling the answer). Partial check supported in per-verb mode.
- **Reveal only** — flip through cards with no typing and **no stats**.

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
3. Merge into `data/vocab.json`, `data/verbs.json`, or `data/exams/` and commit.

Verbs need a complete 7-pronoun map for a tense to appear in conjugation drills. Partial entries are fine for storage and lookup.

## Tech stack

- Vanilla HTML5 / CSS3 / ES6 modules
- `data/vocab.json`, `data/verbs.json`, `data/exams/*.json`
- No npm, no bundler

## UI languages

The app supports **EN | ES** for all UI chrome (buttons, settings, stats, exam hub cards, vocab category names in settings, instructions, feedback). Use the **GB / AR flag toggle** in the page header; your choice is saved in the browser (`localStorage` key `rioplatense-locale`). Spanish learning content (verb forms, vocabulary) stays Spanish either way.

When changing UI strings, add keys to both `src/i18n/en.js` and `src/i18n/es.js`, then run:

```bash
node scripts/check-i18n.js
```

## Roadmap (brief)

- Richer conjugation feedback (explain errors before showing fixes)
- Past tenses when ready
- Optional PWA / add-to-home-screen polish

Future ideas and discussed backlog items are tracked in **`PROJECT_STATE.md`**. See that file for schemas, architecture notes, and agent workflow rules.

## License

Personal learning project — add a license if you plan to share or accept contributions.
