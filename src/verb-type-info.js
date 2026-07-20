/** User-facing verb type labels and short explanations for detail popups. */

export const TYPE_EXPLANATIONS = {
  regular: {
    title: "Regular verbs",
    body:
      "Follow predictable present-tense endings for -ar, -er, or -ir. " +
      "Rioplatense vos keeps the regular stress pattern (e.g. hablás, comés, vivís).",
  },
  stem_changing: {
    title: "Stem-changing verbs (*Verbos con cambio de raíz*)",
    body:
      "The vowel in the stem changes in most forms (yo, tú, él, ellos), but often not in nosotros / vosotros. " +
      "In Rioplatense, vos often keeps the unchanged stem for e→ie and o→ue (querés, tenés, podés — not quierés).",
  },
  irregular: {
    title: "Irregular verbs",
    body:
      "Do not follow the regular pattern cleanly (e.g. ser, ir, hacer, decir). " +
      "Each verb has its own forms — worth drilling early because they are high-frequency.",
  },
};

const STEM_PATTERN_LABELS = {
  stem_changer_e_ie: "e → ie",
  stem_changer_o_ue: "o → ue",
  stem_changer_e_i: "e → i",
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
    return { category, label: `Regular (${ending})` };
  }

  if (category === "stem_changing") {
    const pattern = STEM_PATTERN_LABELS[type] ?? "stem change";
    return { category, label: `Stem-changing (${pattern})` };
  }

  if (category === "irregular") {
    return { category, label: "Irregular" };
  }

  return { category: "unknown", label: "Unknown / draft" };
}
