import { initSmartBackLink } from "./navigation.js";
import { setupPageLocale } from "./page-locale.js";

setupPageLocale({ titleKey: "page.title.reference" });

initSmartBackLink(document.getElementById("back-link"), {
  fallbackHref: "index.html",
  fallbackLabelKey: "nav.home",
});
