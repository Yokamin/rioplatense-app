# 🇦🇷 Rioplatense Practice App - System Architecture & Roadmap

## 🎯 Core Project Philosophy
- **Purpose**: A fast, mobile-first web app for practicing Rioplatense Spanish (verbs, daily vocabulary, numbers, and grammar patterns) while maintaining standard Spanish comprehension.
- **Target Platform**: GitHub Pages (Client-side HTML5/CSS/JS only. No Node build tools, no npm frameworks).
- **User Preference**: Step-by-step development. Do NOT attempt to build the entire app at once. Always propose a plan, discuss data schemas, and get user confirmation before writing code.
- **Learning Workflow**: The app is for passive review of material already covered in class—not for advancing ahead of lessons. Initial JSON seed data stays intentionally minimal; most verbs and vocabulary enter via the Card Creator as the learner progresses.
- **Class Reference**: `Clase con Joakim.docx` may be uploaded to the repo root occasionally as an informal reference for content ideas. It is not a build dependency and is not parsed automatically.
- **CLI / Agent Workflow Rule**: Before implementing any non-trivial logic, explain the approach briefly and confirm. Never generate massive monolithic files if modular scripts make more sense.

---

## 👩‍🏫 Pedagogical & Persona Guidelines

When generating learning materials, drill prompts, or instructional feedback in the application:
1. **Rioplatense First with Global Awareness**: Focus on active usage of *vos*, Rioplatense vocabulary (*che*, *bondi*, *re*, *materia*), and local conjugations, while maintaining passive recognition of standard forms (*tú*, *vosotros*).
2. **Pedagogical Feedback Principles**: 
   - Identify and explain structural or conjugation errors rather than providing immediate instant fixes without context.
   - Respect the user's learning curve by prioritizing foundational clarity over overwhelming advanced edge cases.
3. **English Structural Framing**:
   - Use English for structural headers, explanations, UI control labels, and rule descriptions.
   - Keep Spanish focused on target examples, drill inputs, vocabulary terms, and conjugation tables.
   - Format grammar terminology with English first and Spanish in parentheses where helpful (e.g., "Reflexive Verbs (*Verbos reflexivos*)").

---

## 💾 Standard Data Schemas

### 1. Vocabulary (`data/vocab.json`)
Items are **grouped logically by category**, NOT stored as individual bloated objects.
- **Capitalization Standard**: Store terms in their natural grammatical state (lowercase for general nouns/days/months, uppercase for proper nouns like countries or names). UI display handles sentence-start capitalization dynamically.
- **General fallback**: Use the `general` category for one-off words that do not belong to a themed group yet.

```json
{
  "categories": [
    {
      "id": "days_of_week",
      "display_name": "Days of the Week",
      "items": {
        "lunes": "Monday",
        "martes": "Tuesday",
        "miércoles": "Wednesday",
        "jueves": "Thursday",
        "viernes": "Friday",
        "sábado": "Saturday",
        "domingo": "Sunday"
      }
    }
  ]
}
```

(Seed file also includes `months_of_year` and an empty `general` category — same shape.)

### 2. Verbs (`data/verbs.json`)
Verb entries contain base metadata and one or more **tense objects**, each holding a full 7-pronoun conjugation map. Start with `present_tense`; add sibling keys later (e.g. `preterite`, `imperfect`) without changing existing entries or loader contracts.
- **Active Rioplatense**: `yo`, `vos`, `el` (*él/ella/usted*), `nosotros`, `ustedes` (*ustedes/ellos/ellas*).
- **Passive Standard**: `tu`, `vosotros`.
- **Tense extensibility**: Drills and loaders accept a tense id (default `present_tense`). A verb missing a requested tense is excluded from drills for that tense—not a schema break.
- **Frequency tiers**: `"frequency": "core" | "common" | "extended"` — curated lists for settings quick-picks (core ≈ essential irregulars/stem-changers; common ≈ everyday regulars; extended ≈ useful but situational).
- **Type ids**: `regular_ar`, `regular_er`, `regular_ir`, `stem_changer_e_ie`, `stem_changer_o_ue`, `stem_changer_e_i`, `irregular`, `unknown`. Settings UI groups these as Regular / Stem-changing / Irregular / Draft.
- **Optional `note`**: English pedagogical hint for drill cards. Supported by the loader; not required. Current seed verbs omit it.

Field order in committed JSON is not enforced — match the example below for consistency when editing by hand.

```json
[
  {
    "is_reflexive": false,
    "infinitive": "querer",
    "english": "to want",
    "type": "stem_changer_e_ie",
    "present_tense": {
      "yo": "quiero",
      "vos": "querés",
      "tu": "quieres",
      "el": "quiere",
      "nosotros": "queremos",
      "vosotros": "queréis",
      "ustedes": "quieren"
    },
    "frequency": "core",
    "note": "Optional: vos keeps the stem (querés), unlike tú (quieres)."
  }
]
```

(`note` is optional — remove that key from entries that do not need a hint.)

---

## 📌 Specific Design Constraints & Niche Rules
- **Pronoun Support**: Maintain complete verb coverage for `yo`, `vos`, `tu`, `el`, `nosotros`, `vosotros`, and `ustedes`.
- **Rioplatense Priority**: Active drill modes default to **vos** for singular informal "you", but **tu** and **vosotros** are fully supported in reference views and optional drill settings.
- **No Unnecessary Minigames**: Keep drill modes focused on direct recall and typing practice. Avoid gimmick mechanics or complex distractor logic unless explicitly requested.
- **Separate Practice Modes**: Conjugation Practice and Vocabulary Recall are distinct pages with their own settings. Card Creator and Verb Lookup are separate tools—not drills.
- **Draft workflow**: Card Creator saves browser-local drafts (localStorage) merged at load time. Export merged JSON and commit to `data/*.json` via Git. Verbs without complete conjugations for a tense are stored but excluded from conjugation drills.
- **Session settings**: Each practice mode opens a settings screen first; choices persist in localStorage between visits. Verb types and pronouns are collapsible advanced sections.
- **Typed recall default**: Drills support type-to-check (green exact, yellow accent-only, red wrong) or **reveal-only** mode (no input, no stats).
- **Practice stats**: Typed mode only — session and lifetime counts (✓ / ~/accent / ✗ / reveal) persist in localStorage with daily rollups and reset per mode.
- **Verb detail popup**: After correct/reveal on a conjugation card, infinitive opens full tense tables; Verb Lookup page always allows browse. Type tags link to short rule blurbs.
- **Rioplatense notes**: Non-local forms (e.g. tú, vosotros) show a learning banner — understand them, but don't use them in Argentina.
- **Data Creator Tool**: Card Creator allows adding verbs and vocabulary in the UI, with export JSON for Git updates.

---

## 🗺️ Project Roadmap

### Phase 1: Foundation & Card Creator — **shipped (v1)**
- [x] Repository structure (`index.html`, `css/style.css`, `data/`, `src/`).
- [x] Seed `data/vocab.json` and `data/verbs.json` (expandable; ~59 present-tense verbs with frequency tiers).
- [x] **Card Creator** (vocab/verb/category entry, local drafts, JSON export).
- [x] **Conjugation Practice** and **Vocabulary Recall** with persistent settings.
- [x] **Verb Lookup**, **Reference**, stats, verb detail modal, filter match counts.

### Phase 2: Core Practice Engines — **partial**
- [x] Basic typed answer checking (exact / accent / wrong) and reveal flow.
- [ ] Richer pedagogical feedback (explain error type before correction).
- [x] Vocabulary typed recall with accent handling (basic).

### Phase 3: Polish & Expansion
- [ ] Additional tenses (e.g. preterite) via new tense keys on verb objects.
- [ ] Mobile PWA (manifest, icons, offline shell).

---

## 📁 Key modules (`src/`)

| Module | Role |
|--------|------|
| `data-loader.js` | Fetch JSON, merge Card Creator drafts |
| `conjugation.js` / `vocab.js` | Drill pages |
| `card-picker.js` | Random cards, filter logic |
| `answer-check.js` | Answer tiers |
| `stats-storage.js` / `stats-ui.js` | Typed-mode stats |
| `verb-picker.js` | Verb selection modal + “X match filters” |
| `verb-frequency.js` | Core / common / extended tiers |
| `verb-detail-modal.js` / `verb-detail-ui.js` | Conjugation popup |
| `card-creator.js` | Draft entry + export |

---

## 🚀 Deployment

Static hosting only. See root **`README.md`** for GitHub Pages steps. Requires HTTP(S)—`fetch` does not work from `file://`.
