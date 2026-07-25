import { createNotificationCopy, getNotificationCopyVariationCounts } from "../build-src/services/notificationCopy.js";
import { buildScheduledReminders } from "../build-src/services/whatsNext.js";
import { reminderWindows, STALE_THRESHOLD_HOURS } from "../api/_lib/reminderWindows.js";

const vibes = ["bestie", "gentle", "coach", "professional", "chaos"];
const counts = getNotificationCopyVariationCounts();

for (const vibe of vibes) {
  assert(counts[vibe].titles >= 4, `${vibe}: expected at least 4 title variations`);
  assert(counts[vibe].general >= 12, `${vibe}: expected at least 12 general body variations`);
  assert(counts[vibe].work >= 6, `${vibe}: expected at least 6 work variations`);
  assert(counts[vibe].gym >= 6, `${vibe}: expected at least 6 gym variations`);
  assert(counts[vibe].chores >= 6, `${vibe}: expected at least 6 chore variations`);
  assert(counts[vibe].selfCare >= 6, `${vibe}: expected at least 6 self-care variations`);
  assert(counts[vibe].focus >= 6, `${vibe}: expected at least 6 deadline/appointment variations`);
}

const stableInput = {
  notificationVibe: "bestie",
  taskId: "task-gym",
  taskTitle: "Gym",
  taskCategory: "gym",
  reminderType: "gym-one-hour",
  timing: "1-hour-before",
  scheduledFor: "2026-07-04T08:00:00.000Z",
  timeUntilTask: "in about 1 hour",
  capacity: "normal"
};
const stableA = createNotificationCopy(stableInput);
const stableB = createNotificationCopy(stableInput);
assert(stableA.title === stableB.title && stableA.body === stableB.body, "same seed should produce stable copy");

const differentCopy = createNotificationCopy({
  ...stableInput,
  taskId: "task-meal-prep",
  taskTitle: "Meal prep",
  taskCategory: "meal-prep",
  reminderType: "meal-prep-one-hour",
  scheduledFor: "2026-07-04T16:00:00.000Z"
});
assert(stableA.body !== differentCopy.body, "different task/reminder combination should produce different wording");

const fallbackCopy = createNotificationCopy({
  ...stableInput,
  notificationVibe: "old-vibe"
});
assert(typeof fallbackCopy.body === "string" && fallbackCopy.body.length > 0, "unknown saved notification vibe should fall back safely");

const now = new Date("2026-07-03T12:00:00.000Z");
const state = createState();
const reminders = buildScheduledReminders(state, new Date("2026-07-03T00:00:00.000Z"));
assert(reminders.every((reminder) => reminder.taskId !== "completed-gym"), "completed tasks should not get reminders");
assert(reminders.some((reminder) => reminder.taskId === "active-gym"), "active upcoming tasks should get reminders");
for (const taskId of ["active-gym", "active-meal"]) {
  const taskReminders = reminders.filter((reminder) => reminder.taskId === taskId);
  assert(taskReminders.length === 3, `${taskId}: every upcoming activity should get exactly three reminders`);
}
const gymStart = new Date("2026-07-04T10:00:00");
const expectedGymTimes = [24, 8, 1].map((hours) => new Date(gymStart.getTime() - hours * 60 * 60 * 1000).toISOString());
const actualGymTimes = reminders.filter((reminder) => reminder.taskId === "active-gym").map((reminder) => reminder.scheduledFor);
assert(expectedGymTimes.every((time) => actualGymTimes.includes(time)), "activity reminders should be 24, 8, and 1 hour before");
assert(
  reminders.filter((reminder) => reminder.taskId === "active-gym").every((reminder) => reminder.taskDate === "2026-07-04"),
  "notification deep links should retain the activity date"
);

const windows = reminderWindows(now);
assert(windows.windowStart === "2026-07-03T11:45:00.000Z", "due window should start 15 minutes before now");
assert(windows.windowEnd === "2026-07-03T12:00:00.000Z", "due window should end at now");
assert(windows.staleBefore === "2026-07-02T12:00:00.000Z", `stale threshold should be ${STALE_THRESHOLD_HOURS} hours before now`);

console.log("Notification checks passed.");

function createState() {
  return {
    settings: {
      wakeTime: "07:00",
      bedTime: "22:30",
      notificationPersonality: "gentle"
    },
    monthlyInputs: [],
    routines: [],
    rules: {
      selected: [],
      custom: ""
    },
    capacity: "normal",
    capacityChecks: [],
    plannedMonth: "2026-07",
    setupComplete: true,
    explanations: [],
    plannedTasks: [
      task("completed-gym", "Completed Gym", "2026-07-04", "09:00", "10:00", "gym", true),
      task("active-gym", "Gym", "2026-07-04", "10:00", "11:00", "gym", false),
      task("active-meal", "Meal prep", "2026-07-04", "17:00", "18:00", "meal-prep", false)
    ]
  };
}

function task(id, title, date, startTime, endTime, category, completed) {
  return {
    id,
    sourceId: id,
    sourceType: "routine",
    title,
    date,
    startTime,
    endTime,
    category,
    effort: "medium",
    lock: "flexible",
    priority: "medium",
    completed,
    missed: false
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
