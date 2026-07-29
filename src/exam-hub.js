import {
  buildExamConjugationUrl,
  buildExamReflexiveUrl,
  loadExamCatalog,
} from "./exam-loader.js";
import { t } from "./i18n/index.js";
import { setupPageLocale } from "./page-locale.js";
import { getFileProtocolHint } from "./ui-helpers.js";
import { initSmartBackLink } from "./navigation.js";

const examListEl = document.getElementById("exam-list");
const statusEl = document.getElementById("exam-status");
const backLinkEl = document.getElementById("back-link");

let backLinkRefresh = null;
let cachedExams = [];

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
    dateLine.textContent = t("exam.dateLine", { date: exam.date });
    section.appendChild(dateLine);
  }

  const intro = document.createElement("p");
  intro.className = "exam-intro";
  intro.textContent = t("exam.intro");
  section.appendChild(intro);

  const conjugationBlock = document.createElement("div");
  conjugationBlock.className = "exam-block";

  const conjugationTitle = document.createElement("h3");
  conjugationTitle.textContent = t("exam.conjugation");
  conjugationBlock.appendChild(conjugationTitle);

  const nav = document.createElement("nav");
  nav.className = "mode-nav";
  nav.setAttribute(
    "aria-label",
    t("exam.conjugationDrillsAria", { examLabel: exam.label })
  );

  for (const preset of exam.conjugation?.presets ?? []) {
    const link = document.createElement("a");
    link.className = "mode-card";
    link.href = buildExamConjugationUrl(exam.id, preset.id);
    link.innerHTML = `
      <h2>${preset.label}</h2>
      <p>${preset.description}</p>
      <p class="exam-card-meta">${t("exam.verbCount", { count: preset.infinitives.length })}</p>
    `;
    nav.appendChild(link);
  }

  conjugationBlock.appendChild(nav);
  section.appendChild(conjugationBlock);

  const reflexiveBlock = document.createElement("div");
  reflexiveBlock.className = "exam-block";

  const reflexiveTitle = document.createElement("h3");
  reflexiveTitle.textContent = t("exam.reflexives");
  reflexiveBlock.appendChild(reflexiveTitle);

  const reflexiveNav = document.createElement("nav");
  reflexiveNav.className = "mode-nav";
  reflexiveNav.setAttribute(
    "aria-label",
    t("exam.reflexiveDrillsAria", { examLabel: exam.label })
  );

  if (exam.reflexives?.available) {
    const link = document.createElement("a");
    link.className = "mode-card";
    link.href = buildExamReflexiveUrl(exam.id);
    link.innerHTML = `
      <h2>${exam.reflexives.label}</h2>
      <p>${exam.reflexives.description}</p>
      <p class="exam-card-meta">${t("exam.verbCount", { count: exam.reflexives.infinitives.length })}</p>
    `;
    reflexiveNav.appendChild(link);
  } else {
    const reflexiveCard = document.createElement("div");
    reflexiveCard.className = "mode-card mode-card-static is-disabled";
    reflexiveCard.innerHTML = `
      <h2>${t("exam.reflexiveTitle")}</h2>
      <p>${exam.reflexives?.note ?? t("exam.comingSoon")}</p>
    `;
    reflexiveNav.appendChild(reflexiveCard);
  }

  reflexiveBlock.appendChild(reflexiveNav);
  section.appendChild(reflexiveBlock);

  return section;
}

function renderExamList() {
  examListEl.innerHTML = "";

  if (cachedExams.length === 0) {
    statusEl.hidden = false;
    statusEl.classList.remove("error");
    statusEl.textContent = t("exam.noSnapshots");
    return;
  }

  statusEl.hidden = true;
  for (const exam of cachedExams) {
    examListEl.appendChild(renderExam(exam));
  }
}

async function loadExams() {
  try {
    cachedExams = await loadExamCatalog();
    renderExamList();
  } catch (error) {
    statusEl.hidden = false;
    statusEl.classList.add("error");
    statusEl.textContent = t("exam.loadFailed", {
      message: error.message,
      fileProtocolHint: getFileProtocolHint(),
    });
  }
}

setupPageLocale({
  titleKey: "page.title.exam",
  onChange: () => {
    backLinkRefresh?.();
    renderExamList();
  },
});

backLinkRefresh = initSmartBackLink(backLinkEl, {
  fallbackHref: "index.html",
}).refresh;

loadExams();
