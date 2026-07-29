# 🇦🇷 Rioplatense Practice App - System Architecture & Roadmap

## 🎯 Core Project Philosophy
- **Purpose**: A fast, mobile-first web app for practicing Rioplatense Spanish (verbs, daily vocabulary, numbers, and grammar patterns) while maintaining standard Spanish comprehension.
- **Personal scope**: Built alongside the author’s own class progression — content and defaults reflect that learner’s path (exam dates, verb tiers, vocab themes), not a complete language course. Others may use or fork it, but completeness and pacing are not guaranteed.
- **Target Platform**: GitHub Pages (Client-side HTML5/CSS/JS only. No Node build tools, no npm frameworks).
- **User Preference**: Step-by-step development. Do NOT attempt to build the entire app at once. Always propose a plan, discuss data schemas, and get user confirmation before writing code.
- **Learning Workflow**: The app is for passive review of material already covered in class—not for advancing ahead of lessons. Committed JSON is expanded from class material; Card Creator remains available for ad-hoc drafts.
- **Class Reference**: `Clase con Joakim.docx` may be uploaded to the repo root occasionally as an informal reference for content ideas. It is not a build dependency and is not parsed automatically.
- **CLI / Agent Workflow Rule**: Before implementing any non-trivial logic, explain the approach briefly and confirm. Never generate massive monolithic files if modular scripts make more sense.

---

## 📦 Current release snapshot (post v1 — commit `88506d0` baseline)

### Practice modes
| Page | Role |
|------|------|
| `conjugation.html` | Non-reflexive verb drills; optional exam scope via `?exam=&preset=` |
| `reflexive.html` | Reflexive-only drills; exam scope via `?exam=` |
| `vocab.html` | Category-based vocabulary recall |
| `exam.html` | Exam hub linking to scoped conjugation / reflexive URLs |
| `verbs.html` | Browse/search all verbs (filter: all / non-reflexive / reflexive) |
| `reference.html` | Grammar reference + reflexive pronoun table |
| `card-creator.html` | Draft entry + JSON export *(hidden from home nav for now)* |

### Drill engine (`src/drill-session.js`, `src/ui-helpers.js`)
- **Drill format**: `per_verb` (default) — all selected pronouns on one card; `single` — one pronoun per card.
- **Card order**: `deck` (default) — cover full deck before reshuffle; `random` — pick any card each time.
- **Per-verb UI**: compact rows; feedback inline after pronoun label; partial check (only filled rows validated); wrong rows do not reveal the answer.
- **Stem-change hints** (`src/stem-hints.js`): optional setting; shows *e → ie* / *o → ue* / *e → i* only when that form’s answer actually uses the change (vos unchanged forms stay silent).
- **Settings normalization** (`src/practice-settings.js`): empty saved `types` / `pronouns` arrays repair to “everything enabled”; `drillStyle` defaults to `per_verb`, `cardOrder` to `deck`.

### Exam mode (`src/exam-loader.js`, `src/exam-hub.js`, `data/exams/`)
- Catalog: `data/exams/exams.json` → per-exam JSON (e.g. `exam-2026-07-30.json`).
- Conjugation presets: scoped infinitive lists + separate localStorage settings key per preset.
- Reflexives: scoped list from exam JSON.
- Same drill pages/settings as main practice — new drill features apply to exam automatically.

### Data volume (committed — changes over time)
- **Verbs** — growing present-tense set (regular, stem-changing, irregular, reflexive); see `data/verbs.json`.
- **Vocabulary** — multiple themed categories in `data/vocab.json` (expanded beyond days/months as lessons progress).
- JSON fetch uses `cache: "no-store"` in `data-loader.js` so refreshed data is not stuck behind browser cache.

### Home layout (`index.html`)
- **Tools**: Verb Lookup, Reference (Card Creator commented out in HTML).
- **Practice**: Conjugation, Reflexive, Vocabulary.
- **Exam prep**: Exam Practice (bottom section).

### Navigation (`src/navigation.js`)
- Smart back links: `history.back()` with fallback to Home or Exam hub.

---

## 👩‍🏫 Pedagogical & Persona Guidelines

When generating learning materials, drill prompts, or instructional feedback in the application:
1. **Rioplatense First with Global Awareness**: Focus on active usage of *vos*, Rioplatense vocabulary (*che*, *bondi*, *re*, *materia*), and local conjugations, while maintaining passive recognition of standard forms (*tú*, *vosotros*).
2. **Pedagogical Feedback Principles**: 
   - Identify and explain structural or conjugation errors rather than providing immediate instant fixes without context.
   - Respect the user's learning curve by prioritizing foundational clarity over overwhelming advanced edge cases.
3. **UI language**:
   - **Learning data** (verb forms, vocab Spanish, conjugation tables) stays Spanish regardless of UI locale.
   - **UI chrome** (buttons, settings, instructions, stats, exam hub labels) uses EN/ES packs via `t("key")` — see **Internationalization** below.

---

## 🌐 Internationalization

- **Locale files**: `src/i18n/en.js`, `src/i18n/es.js` — parallel key → string maps (**306 keys**).
- **API**: `src/i18n/index.js` — `t(key, params?)`, `setLocale("en"|"es")`, `getLocale()`, `applyDocumentI18n()`, `initLocaleToggle()`.
- **Localized metadata**: `src/localized-data.js` — exam snapshot/preset/reflexive labels and vocab category display names (JSON stays English; UI reads `exam.*` / `vocab.category.*` keys).
- **Page bootstrap**: `src/page-locale.js` — `setupPageLocale({ titleKey, onChange })` on every page; restores toggle after bfcache via `pageshow`.
- **Toggle**: GB / AR flag buttons in page header (`assets/flags/`); choice persisted in `localStorage` (`rioplatense-locale`).
- **HTML**: static labels use `data-i18n="key"`; dynamic strings use `t()` in JS. Live locale refresh re-renders drill cards, stats chip/modal, and exam hub cards.
- **Missing key**: shows `⟦missing: key⟧` in the active locale (no silent English fallback in ES mode).
- **Rule for all new UI**: every new key **must** exist in **both** locale files. Run `node scripts/check-i18n.js` before pushing.

---

## 💾 Standard Data Schemas

### 1. Vocabulary (`data/vocab.json`)
Items are **grouped logically by category**, NOT stored as individual bloated objects.
- **Capitalization Standard**: Store terms in their natural grammatical state (lowercase for general nouns/days/months, uppercase for proper nouns). UI display handles sentence-start capitalization dynamically.
- **General fallback**: Use the `general` category for one-off words that do not belong to a themed group yet.

### 2. Verbs (`data/verbs.json`)
Verb entries contain base metadata and one or more **tense objects**, each holding a full 7-pronoun conjugation map. Start with `present_tense`; add sibling keys later (e.g. `preterite`, `imperfect`) without changing existing entries or loader contracts.
- **Active Rioplatense**: `yo`, `vos`, `el` (*él/ella/usted*), `nosotros`, `ustedes` (*ustedes/ellos/ellas*).
- **Passive Standard**: `tu`, `vosotros`.
- **`is_reflexive`**: boolean; reflexive drills filter `is_reflexive === true`.
- **Tense extensibility**: Drills and loaders accept a tense id (default `present_tense`). A verb missing a requested tense is excluded from drills for that tense—not a schema break.
- **Frequency tiers**: `"frequency": "core" | "common" | "extended"`.
- **Type ids**: `regular_ar`, `regular_er`, `regular_ir`, `stem_changer_e_ie`, `stem_changer_o_ue`, `stem_changer_e_i`, `irregular`, `unknown`. Settings UI groups these as Regular / Stem-changing / Irregular / Draft.
- **Optional `note`**: English pedagogical hint for drill cards.

### 3. Exams (`data/exams/`)
- **`exams.json`**: catalog entries (`id`, `label`, `date`, …).
- **Per-exam file** (e.g. `exam-2026-07-30.json`): `conjugation.presets[]` with `id`, `label`, `infinitives[]`; `reflexives` with `label`, `infinitives[]`.

---

## 📌 Specific Design Constraints & Niche Rules
- **Pronoun Support**: Maintain complete verb coverage for `yo`, `vos`, `tu`, `el`, `nosotros`, `vosotros`, and `ustedes`.
- **Rioplatense Priority**: Active drill modes default to **vos** for singular informal "you", but **tu** and **vosotros** are fully supported in reference views and optional drill settings.
- **Separate Practice Modes**: Conjugation, Reflexive, and Vocabulary are distinct pages with their own settings keys. Tools (lookup, reference, card creator) are not drills.
- **Session settings**: Each practice mode opens a settings screen first; choices persist in localStorage. Exam modes use scoped keys via `settings-storage.js`.
- **Typed recall default**: Drills support type-to-check or **reveal-only** mode (no input, no stats).
- **Verb detail popup**: After correct/reveal on a conjugation card, infinitive opens full tense tables.
- **Rioplatense notes**: Non-local forms (e.g. tú, vosotros) show a learning banner when drilled.

---

## 🗺️ Project Roadmap

### Phase 1: Foundation & Card Creator — **shipped (v1)**
- [x] Repository structure, Card Creator, Conjugation, Vocabulary, Verb Lookup, Reference, stats, verb detail modal.

### Phase 2: Core Practice & exam prep — **shipped (v2 baseline)**
- [x] Expanded verb/vocab data; reflexive practice; exam hub + scoped drills.
- [x] Per-verb deck drills; settings normalization; stem-change hints; verb browse filters.
- [x] Basic typed answer checking (exact / accent / wrong) and reveal flow.
- [ ] Richer pedagogical feedback (explain error type before correction).

### Phase 3: Polish & Expansion
- [x] UI locale pack (EN/ES) — shipped on `main` (`ec32783`)
- [ ] Additional tenses (e.g. preterite) via new tense keys on verb objects.
- [ ] Mobile PWA (manifest, icons, offline shell).

### Backlog (discussed, not built)

*Backlog items from conversation are recorded here so they are not lost between sessions. Ask to add items explicitly if you want them tracked.*

- IE / UE / yo-irregular sub-filters in main + exam drills.
- “Reflexive or not?” judgment drill; routine fill-in-the-blank.
- Mock test mode; per-exam stats; re-enable Card Creator on home.
- **CEFR / level presets** — optional “study level” mode (e.g. A1 vs B2): suggested drill settings, color-coded guidance, or a single toggle that enables/disables verb types, categories, and hints by level. User-facing guidelines (“use these settings at A1…”) — only if it proves useful; not started.

---

## 📁 Key modules (`src/`)

| Module | Role |
|--------|------|
| `data-loader.js` | Fetch JSON (`cache: "no-store"`), merge Card Creator drafts |
| `conjugation.js` / `reflexive.js` / `vocab.js` | Drill pages |
| `drill-session.js` | Deck building, per-verb vs single cards, drill runner |
| `practice-settings.js` | Normalize/repair saved drill settings |
| `stem-hints.js` | Stem-change hint detection for drill cards |
| `exam-loader.js` / `exam-hub.js` | Exam catalog, scoped URLs |
| `navigation.js` | Smart back links |
| `card-picker.js` | Filter logic, eligible verb counts |
| `answer-check.js` | Answer tiers |
| `ui-helpers.js` | Drill card render, check/reveal, settings form helpers |
| `stats-storage.js` / `stats-ui.js` | Typed-mode stats |
| `verb-picker.js` | Verb selection modal |
| `verb-frequency.js` | Core / common / extended tiers |
| `verb-detail-modal.js` / `verb-detail-ui.js` | Conjugation popup |
| `settings-storage.js` | localStorage keys (main + exam-scoped) |
| `card-creator.js` | Draft entry + export |
| `i18n/index.js` | Locale toggle, `t()`, document i18n |
| `localized-data.js` | Localized exam preset labels and vocab category names |
| `page-locale.js` | Per-page locale bootstrap |
| `reference.js` | Reference page entry (locale + back link) |

---

## 🚀 Deployment

Static hosting only. See root **`README.md`** for GitHub Pages steps. Requires HTTP(S)—`fetch` does not work from `file://`.

---

## 📓 Development log

| Date | Branch | Notes |
|------|--------|-------|
| 2026-07-20 | `main` | v1 shipped: conjugation, vocab, card creator, lookup, reference, stats. |
| 2026-07-29 | `main` | v2 baseline (`88506d0`): exam hub, reflexives, per-verb drills, stem hints, expanded data. |
| 2026-07-29 | `feature/i18n` | Full UI locale pack (306 keys), flag toggle, exam/vocab metadata i18n, live stats/card refresh; vocab card render fix. |
| 2026-07-29 | `main` | Merged `feature/i18n` → `main` (`ec32783`); EN/ES UI live on GitHub Pages. |
