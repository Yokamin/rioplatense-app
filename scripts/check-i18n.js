#!/usr/bin/env node
/**
 * Compare keys in src/i18n/en.js and src/i18n/es.js.
 * Exits 0 when both locale files have identical key sets; exits 1 on mismatch.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const enPath = path.join(root, "src/i18n/en.js");
const esPath = path.join(root, "src/i18n/es.js");

async function loadMessages(filePath) {
  const mod = await import(pathToFileURL(filePath).href);
  if (!mod.messages || typeof mod.messages !== "object") {
    throw new Error(`${filePath} must export \`messages\` object`);
  }
  return mod.messages;
}

function diffKeys(sourceKeys, targetKeys, label) {
  return [...sourceKeys].filter((key) => !targetKeys.has(key)).sort((a, b) => a.localeCompare(b));
}

async function main() {
  const [enMessages, esMessages] = await Promise.all([
    loadMessages(enPath),
    loadMessages(esPath),
  ]);

  const enKeys = new Set(Object.keys(enMessages));
  const esKeys = new Set(Object.keys(esMessages));

  const missingInEs = diffKeys(enKeys, esKeys, "es.js");
  const missingInEn = diffKeys(esKeys, enKeys, "en.js");

  if (missingInEs.length === 0 && missingInEn.length === 0) {
    console.log(`i18n OK — ${enKeys.size} keys in en.js and es.js`);
    process.exit(0);
  }

  console.error("i18n key mismatch:\n");

  if (missingInEs.length > 0) {
    console.error(`Missing in es.js (${missingInEs.length}):`);
    for (const key of missingInEs) {
      console.error(`  - ${key}`);
    }
    console.error("");
  }

  if (missingInEn.length > 0) {
    console.error(`Missing in en.js (${missingInEn.length}):`);
    for (const key of missingInEn) {
      console.error(`  - ${key}`);
    }
    console.error("");
  }

  process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
