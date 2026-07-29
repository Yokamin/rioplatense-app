import { messages as enMessages } from "./en.js";
import { messages as esMessages } from "./es.js";

const LOCALES = {
  en: enMessages,
  es: esMessages,
};

export const LOCALE_STORAGE_KEY = "rioplatense-locale";

const LOCALE_FLAG_SRC = {
  en: "assets/flags/gb.svg",
  es: "assets/flags/ar.svg",
};

let currentLocale = "en";
const listeners = new Set();
let localeToggleHost = null;
let localeToggleClickBound = false;
let localeToggleRenderRegistered = false;

function renderLocaleToggle() {
  const container = localeToggleHost;
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="locale-toggle" role="group" aria-label="${t("locale.switchAria")}">
      <button
        type="button"
        class="locale-btn locale-btn-flag${currentLocale === "en" ? " is-active" : ""}"
        data-locale="en"
        aria-label="${t("locale.englishAria")}"
        title="${t("locale.englishAria")}"
      >
        <img class="locale-flag-icon" src="${LOCALE_FLAG_SRC.en}" alt="" />
      </button>
      <button
        type="button"
        class="locale-btn locale-btn-flag${currentLocale === "es" ? " is-active" : ""}"
        data-locale="es"
        aria-label="${t("locale.spanishAria")}"
        title="${t("locale.spanishAria")}"
      >
        <img class="locale-flag-icon" src="${LOCALE_FLAG_SRC.es}" alt="" />
      </button>
    </div>
  `;
}

function interpolate(text, params = {}) {
  let result = String(text);
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(value ?? ""));
  }
  return result;
}

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  const next = LOCALES[locale] ? locale : "en";
  currentLocale = next;
  localStorage.setItem(LOCALE_STORAGE_KEY, next);
  document.documentElement.lang = next;
  for (const listener of listeners) {
    listener(next);
  }
}

export function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key, params = {}) {
  const dict = LOCALES[currentLocale] ?? enMessages;
  const text = dict[key];
  if (text === undefined) {
    return `⟦missing: ${key}⟧`;
  }
  return interpolate(text, params);
}

export function initLocale() {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && LOCALES[saved]) {
      currentLocale = saved;
    }
  } catch {
    currentLocale = "en";
  }
  document.documentElement.lang = currentLocale;
}

export function applyDocumentI18n(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }

  for (const el of root.querySelectorAll("[data-i18n-html]")) {
    el.innerHTML = t(el.dataset.i18nHtml);
  }

  for (const el of root.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  }

  for (const el of root.querySelectorAll("[data-i18n-title]")) {
    document.title = t(el.dataset.i18nTitle);
  }

  for (const el of root.querySelectorAll("[data-i18n-aria]")) {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  }
}

export function initLocaleToggle(container) {
  if (!container) {
    return;
  }

  localeToggleHost = container;

  if (!localeToggleClickBound) {
    localeToggleClickBound = true;
    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-locale]");
      if (button) {
        setLocale(button.dataset.locale);
      }
    });
  }

  if (!localeToggleRenderRegistered) {
    localeToggleRenderRegistered = true;
    onLocaleChange(renderLocaleToggle);
  }

  renderLocaleToggle();
}
