import {
  applyDocumentI18n,
  initLocale,
  initLocaleToggle,
  onLocaleChange,
  t,
} from "./i18n/index.js";

/**
 * Mount locale toggle and apply static data-i18n strings.
 * Call `onChange` after locale switch to refresh dynamic UI (e.g. re-render card).
 */
export function setupPageLocale({ onChange, titleKey } = {}) {
  initLocale();

  const toggleHost = document.getElementById("locale-toggle");
  initLocaleToggle(toggleHost);
  applyDocumentI18n();

  if (titleKey) {
    document.title = t(titleKey);
  }

  if (onChange) {
    onLocaleChange(() => {
      applyDocumentI18n();
      if (titleKey) {
        document.title = t(titleKey);
      }
      onChange();
    });
  } else {
    onLocaleChange(() => {
      applyDocumentI18n();
      if (titleKey) {
        document.title = t(titleKey);
      }
    });
  }
}
