import { t } from "./i18n/index.js";

/**
 * Use browser history when the user arrived from another page in this app;
 * otherwise fall back to a sensible default link.
 */
export function initSmartBackLink(
  linkEl,
  { fallbackHref = "index.html", fallbackLabelKey = "nav.home" } = {}
) {
  if (!linkEl) {
    return { refresh: () => {} };
  }

  function refresh() {
    linkEl.href = fallbackHref;
    linkEl.textContent = t(fallbackLabelKey);
  }

  refresh();

  linkEl.addEventListener("click", (event) => {
    const referrer = document.referrer;
    if (!referrer) {
      return;
    }

    try {
      const refUrl = new URL(referrer, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (refUrl.origin !== currentUrl.origin) {
        return;
      }

      if (refUrl.pathname === currentUrl.pathname) {
        return;
      }

      event.preventDefault();
      window.history.back();
    } catch {
      // Keep default href navigation.
    }
  });

  return { refresh };
}
