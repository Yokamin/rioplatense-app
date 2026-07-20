const STATS_KEY = "rioplatense-stats";
const MAX_DAILY_ENTRIES = 90;

const EMPTY_COUNTS = {
  exact: 0,
  accent: 0,
  wrong: 0,
  revealed: 0,
};

const sessionStats = {
  conjugation: { ...EMPTY_COUNTS },
  vocab: { ...EMPTY_COUNTS },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCounts(counts) {
  return { ...EMPTY_COUNTS, ...counts };
}

function emptyModeStats() {
  return {
    lifetime: { ...EMPTY_COUNTS },
    daily: {},
  };
}

function loadStoredStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      return {
        conjugation: emptyModeStats(),
        vocab: emptyModeStats(),
      };
    }

    const parsed = JSON.parse(raw);

    return {
      conjugation: {
        lifetime: normalizeCounts(parsed.conjugation?.lifetime),
        daily: parsed.conjugation?.daily ?? {},
      },
      vocab: {
        lifetime: normalizeCounts(parsed.vocab?.lifetime),
        daily: parsed.vocab?.daily ?? {},
      },
    };
  } catch {
    return {
      conjugation: emptyModeStats(),
      vocab: emptyModeStats(),
    };
  }
}

function saveStoredStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function trimDailyHistory(daily) {
  const keys = Object.keys(daily).sort();
  if (keys.length <= MAX_DAILY_ENTRIES) {
    return daily;
  }

  const trimmed = {};
  for (const key of keys.slice(-MAX_DAILY_ENTRIES)) {
    trimmed[key] = daily[key];
  }
  return trimmed;
}

export function getSessionStats(mode) {
  return normalizeCounts(sessionStats[mode]);
}

export function getLifetimeStats(mode) {
  const stats = loadStoredStats();
  return normalizeCounts(stats[mode].lifetime);
}

export function recordAnswerResult(mode, resultType) {
  if (!sessionStats[mode] || !(resultType in EMPTY_COUNTS)) {
    return;
  }

  sessionStats[mode][resultType] += 1;

  const stats = loadStoredStats();
  const modeStats = stats[mode];
  const day = todayKey();

  modeStats.lifetime = normalizeCounts(modeStats.lifetime);
  modeStats.lifetime[resultType] += 1;

  if (!modeStats.daily[day]) {
    modeStats.daily[day] = { ...EMPTY_COUNTS };
  }
  modeStats.daily[day] = normalizeCounts(modeStats.daily[day]);
  modeStats.daily[day][resultType] += 1;
  modeStats.daily = trimDailyHistory(modeStats.daily);

  saveStoredStats(stats);
}

export function formatCompactCounts(counts) {
  const normalized = normalizeCounts(counts);
  return (
    `${normalized.exact}✓ · ${normalized.accent}~ · ${normalized.wrong}✗ · ` +
    `${normalized.revealed} reveal`
  );
}

export function formatStatsLine(counts, label) {
  return `${label}: ${formatCompactCounts(counts)}`;
}

export function formatSessionAndLifetimeStats(mode) {
  return `${formatStatsLine(getSessionStats(mode), "Session")} | ${formatStatsLine(getLifetimeStats(mode), "All time")}`;
}

export function getDailyStats(mode, limit = 14) {
  const stats = loadStoredStats();
  const daily = stats[mode]?.daily ?? {};

  return Object.entries(daily)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, limit)
    .map(([date, counts]) => ({ date, counts: normalizeCounts(counts) }));
}

export function resetSessionStats(mode) {
  sessionStats[mode] = { ...EMPTY_COUNTS };
}

export function resetModeStats(mode) {
  resetSessionStats(mode);
  const stats = loadStoredStats();
  stats[mode] = emptyModeStats();
  saveStoredStats(stats);
}

export function clearAllStats() {
  localStorage.removeItem(STATS_KEY);
  sessionStats.conjugation = { ...EMPTY_COUNTS };
  sessionStats.vocab = { ...EMPTY_COUNTS };
}
