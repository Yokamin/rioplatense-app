import { t } from "./i18n/index.js";

/** Frequency tiers for curated verbs in data/verbs.json */
export const VERB_FREQUENCY = {
  core: "core",
  common: "common",
  extended: "extended",
};

export const VERB_FREQUENCY_ORDER = ["core", "common", "extended"];

/** @deprecated Use getFrequencyBadgeLabel(tier) for localized labels. */
export const VERB_FREQUENCY_LABELS = {
  core: "Core",
  common: "Common",
  extended: "Extended",
};

/** @deprecated Use getFrequencySectionLabel(tier) for localized labels. */
export const VERB_FREQUENCY_SECTIONS = {
  core: "Core — essential (ser, ir, hacer…)",
  common: "Common — everyday verbs",
  extended: "Extended — useful but more situational",
};

export function getFrequencyBadgeLabel(tier) {
  return t(`frequency.${tier}`);
}

export function getFrequencySectionLabel(tier) {
  return t(`frequency.section.${tier}`);
}

/** Supports legacy is_core until all data uses frequency. */
export function getVerbFrequency(verb) {
  if (verb.frequency) {
    return verb.frequency;
  }
  if (verb.is_core) {
    return VERB_FREQUENCY.core;
  }
  return VERB_FREQUENCY.extended;
}

export function isCoreVerb(verb) {
  return getVerbFrequency(verb) === VERB_FREQUENCY.core;
}

export function isCommonTierOrAbove(verb) {
  const tier = getVerbFrequency(verb);
  return tier === VERB_FREQUENCY.core || tier === VERB_FREQUENCY.common;
}

export function getVerbsByFrequency(verbs, tier) {
  return verbs.filter((verb) => getVerbFrequency(verb) === tier);
}

export function getFrequencyBadge(verb) {
  return getFrequencyBadgeLabel(getVerbFrequency(verb));
}
