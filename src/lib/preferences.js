const PREFS_KEY = 'udharpe_merchant_prefs';

const DEFAULT_PREFS = {
  defaultDueDays: 15,
  includeFirmNameInReminder: true,
};

export function getMerchantPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return {
      defaultDueDays: [0, 7, 15, 30, 45].includes(Number(parsed.defaultDueDays))
        ? Number(parsed.defaultDueDays)
        : DEFAULT_PREFS.defaultDueDays,
      includeFirmNameInReminder:
        typeof parsed.includeFirmNameInReminder === 'boolean'
          ? parsed.includeFirmNameInReminder
          : DEFAULT_PREFS.includeFirmNameInReminder,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveMerchantPrefs(partial) {
  const next = { ...getMerchantPrefs(), ...partial };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write errors
  }
  return next;
}
