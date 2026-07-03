export const DUE_WINDOW_MINUTES = 15;
export const STALE_THRESHOLD_HOURS = 24;

export function reminderWindows(nowDate = new Date()) {
  return {
    windowStart: new Date(nowDate.getTime() - DUE_WINDOW_MINUTES * 60 * 1000).toISOString(),
    windowEnd: nowDate.toISOString(),
    staleBefore: new Date(nowDate.getTime() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString()
  };
}
