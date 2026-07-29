import { t } from "./i18n/index.js";

function isMissingTranslation(text) {
  return String(text).startsWith("⟦missing:");
}

function resolveTranslation(key, fallback) {
  const translated = t(key);
  return isMissingTranslation(translated) ? fallback : translated;
}

function examIdKey(examId) {
  return examId.replace(/-/g, "_");
}

export function tVocabCategoryName(categoryId, fallback = "") {
  return resolveTranslation(`vocab.category.${categoryId}`, fallback);
}

export function tExamSnapshotLabel(exam) {
  return resolveTranslation(`exam.snapshot.${examIdKey(exam.id)}.label`, exam.label);
}

export function tExamPresetLabel(preset) {
  return resolveTranslation(`exam.preset.${preset.id}.label`, preset.label);
}

export function tExamPresetDescription(preset) {
  return resolveTranslation(`exam.preset.${preset.id}.description`, preset.description);
}

export function tExamReflexivesLabel(exam, reflexives) {
  return resolveTranslation(
    `exam.snapshot.${examIdKey(exam.id)}.reflexives.label`,
    reflexives.label
  );
}

export function tExamReflexivesDescription(exam, reflexives) {
  return resolveTranslation(
    `exam.snapshot.${examIdKey(exam.id)}.reflexives.description`,
    reflexives.description
  );
}
