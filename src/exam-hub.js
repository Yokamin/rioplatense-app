import {
  buildExamConjugationUrl,
  buildExamReflexiveUrl,
  loadExamCatalog,
} from "./exam-loader.js";
import { getFileProtocolHint } from "./ui-helpers.js";
import { initSmartBackLink } from "./navigation.js";

const examListEl = document.getElementById("exam-list");
const statusEl = document.getElementById("exam-status");
const backLinkEl = document.getElementById("back-link");

initSmartBackLink(backLinkEl, {
  fallbackHref: "index.html",
  fallbackLabel: "← Home",
});

function renderExam(exam) {
  const section = document.createElement("section");
  section.className = "exam-section";
  section.setAttribute("aria-labelledby", `exam-${exam.id}-title`);

  const heading = document.createElement("h2");
  heading.id = `exam-${exam.id}-title`;
  heading.textContent = exam.label;
  section.appendChild(heading);

  if (exam.date) {
    const dateLine = document.createElement("p");
    dateLine.className = "exam-date";
    dateLine.textContent = `Exam date: ${exam.date}`;
    section.appendChild(dateLine);
  }

  const intro = document.createElement("p");
  intro.className = "exam-intro";
  intro.textContent =
    "Scoped drills use the same engines as main practice, limited to this exam snapshot.";
  section.appendChild(intro);

  const conjugationBlock = document.createElement("div");
  conjugationBlock.className = "exam-block";

  const conjugationTitle = document.createElement("h3");
  conjugationTitle.textContent = "Conjugation";
  conjugationBlock.appendChild(conjugationTitle);

  const nav = document.createElement("nav");
  nav.className = "mode-nav";
  nav.setAttribute("aria-label", `${exam.label} conjugation drills`);

  for (const preset of exam.conjugation?.presets ?? []) {
    const link = document.createElement("a");
    link.className = "mode-card";
    link.href = buildExamConjugationUrl(exam.id, preset.id);
    link.innerHTML = `
      <h2>${preset.label}</h2>
      <p>${preset.description}</p>
      <p class="exam-card-meta">${preset.infinitives.length} verbs</p>
    `;
    nav.appendChild(link);
  }

  conjugationBlock.appendChild(nav);
  section.appendChild(conjugationBlock);

  const reflexiveBlock = document.createElement("div");
  reflexiveBlock.className = "exam-block";

  const reflexiveTitle = document.createElement("h3");
  reflexiveTitle.textContent = "Reflexives";
  reflexiveBlock.appendChild(reflexiveTitle);

  const reflexiveNav = document.createElement("nav");
  reflexiveNav.className = "mode-nav";
  reflexiveNav.setAttribute("aria-label", `${exam.label} reflexive drills`);

  if (exam.reflexives?.available) {
    const link = document.createElement("a");
    link.className = "mode-card";
    link.href = buildExamReflexiveUrl(exam.id);
    link.innerHTML = `
      <h2>${exam.reflexives.label}</h2>
      <p>${exam.reflexives.description}</p>
      <p class="exam-card-meta">${exam.reflexives.infinitives.length} verbs</p>
    `;
    reflexiveNav.appendChild(link);
  } else {
    const reflexiveCard = document.createElement("div");
    reflexiveCard.className = "mode-card mode-card-static is-disabled";
    reflexiveCard.innerHTML = `
      <h2>Reflexive Practice</h2>
      <p>${exam.reflexives?.note ?? "Coming soon."}</p>
    `;
    reflexiveNav.appendChild(reflexiveCard);
  }

  reflexiveBlock.appendChild(reflexiveNav);
  section.appendChild(reflexiveBlock);

  return section;
}

async function init() {
  try {
    const exams = await loadExamCatalog();
    examListEl.innerHTML = "";

    if (exams.length === 0) {
      statusEl.hidden = false;
      statusEl.textContent = "No exam snapshots are configured yet.";
      return;
    }

    for (const exam of exams) {
      examListEl.appendChild(renderExam(exam));
    }
  } catch (error) {
    statusEl.hidden = false;
    statusEl.classList.add("error");
    statusEl.textContent = `Could not load exams: ${error.message}.${getFileProtocolHint()}`;
  }
}

init();
