import { createNotificationCopy, getNotificationCopyVariationCounts } from "../build-src/services/notificationCopy.js";
import { buildScheduledReminders, formatTimeUntil } from "../build-src/services/whatsNext.js";
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
  assert(counts[vibe].general >= 24 && counts[vibe].work >= 12 && counts[vibe].selfCare >= 12, `${vibe}: expected the expanded wording banks`);
  assert(counts[vibe].encouragement >= 6, `${vibe}: expected at least 6 encouragement lines per energy level`);

  // Reminders sent a day or 8 hours ahead must say when the task is.
  for (const [timing, phrase] of [["24-hours-before", "tomorrow"], ["8-hours-before", "in about 8 hours"]]) {
    for (let i = 0; i < 40; i += 1) {
      const copy = createNotificationCopy({ notificationVibe: vibe, taskId: `t${i}`, taskTitle: "Gym routine", taskCategory: "gym", reminderType: timing, timing, capacity: "normal" });
      assert(copy.body.includes(phrase), `${vibe}: ${timing} reminder should mention "${phrase}": ${copy.body}`);
    }
  }

  // Encouragement follows the energy check.
  const tiredCopies = Array.from({ length: 40 }, (_, i) => createNotificationCopy({ notificationVibe: vibe, taskId: `e${i}`, taskTitle: "Cleaning", taskCategory: "cleaning", reminderType: "x", timing: "1-hour-before", capacity: "tired" }));
  assert(tiredCopies.some((copy) => copy.encouragement), `${vibe}: most reminders should include an encouraging line`);
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
assert(windows.windowStart === "2026-07-03T11:00:00.000Z", "due window should start 60 minutes before now");
assert(windows.windowEnd === "2026-07-03T12:00:00.000Z", "due window should end at now");
assert(windows.staleBefore === "2026-07-02T12:00:00.000Z", `stale threshold should be ${STALE_THRESHOLD_HOURS} hours before now`);

const friendlyTimes = [
  [0, "now"], [1, "in 1 minute"], [45, "in 45 minutes"], [60, "in 1 hour"], [75, "in 1 hour 15 minutes"],
  [120, "in 2 hours"], [400, "in about 7 hours"], [1440, "in about 1 day"], [5389, "in about 4 days"]
];
for (const [minutes, expected] of friendlyTimes) {
  assert(formatTimeUntil(minutes) === expected, `formatTimeUntil(${minutes}) should be "${expected}", got "${formatTimeUntil(minutes)}"`);
}

// Across a month of reminders, wording should not repeat close together.
{
  const variety = createState();
  variety.plannedTasks = Array.from({ length: 20 }, (_, day) => ({
    id: `variety-gym-${day}`, sourceId: "routine-gym", sourceType: "routine", title: "Gym routine",
    date: `2026-07-${String(day + 5).padStart(2, "0")}`, startTime: "10:00", endTime: "11:00",
    category: "gym", effort: "high", lock: "flexible", priority: "medium", completed: false, missed: false
  }));
  const monthReminders = buildScheduledReminders(variety, new Date("2026-07-01T00:00:00"));
  monthReminders.forEach((reminder, index) => {
    const previous = monthReminders.slice(Math.max(0, index - 10), index).map((item) => item.body);
    assert(!previous.includes(reminder.body), `reminder wording repeated within 10 reminders: ${reminder.body}`);
  });
}

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
