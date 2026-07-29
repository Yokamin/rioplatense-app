import { t } from "./i18n/index.js";

/** User-facing verb type labels and short explanations for detail popups. */

export function getTypeExplanation(category) {
  const key = `verbTypeExplain.${category}`;
  const title = t(`${key}.title`);
  const body = t(`${key}.body`);

  if (title.startsWith("⟦missing:") || body.startsWith("⟦missing:")) {
    return null;
  }

  return { title, body };
}

const STEM_PATTERN_KEYS = {
  stem_changer_e_ie: "e_ie",
  stem_changer_o_ue: "o_ue",
  stem_changer_e_i: "e_i",
};

export function getVerbTypeCategory(type) {
  if (type?.startsWith("regular_")) {
    return "regular";
  }
  if (type?.startsWith("stem_changer")) {
    return "stem_changing";
  }
  if (type === "irregular") {
    return "irregular";
  }
  return "unknown";
}

export function getVerbTypeBadge(type) {
  const category = getVerbTypeCategory(type);

  if (category === "regular") {
    const ending = type.replace("regular_", "-");
    return { category, label: t("verbDetail.badgeRegular", { ending }) };
  }

  if (category === "stem_changing") {
    const patternKey = STEM_PATTERN_KEYS[type];
    const pattern = patternKey
      ? t(`stemHint.pattern.${patternKey}`)
      : t("verbDetail.stemChangeFallback");
    return { category, label: t("verbDetail.badgeStemChanging", { pattern }) };
  }

  if (category === "irregular") {
    return { category, label: t("verbDetail.badgeIrregular") };
  }

  return { category: "unknown", label: t("verbDetail.badgeUnknown") };
}
