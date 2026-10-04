import type { Category, NotificationPersonality, PlannedTask, PlannerState } from "../models/types";
import { createNotificationCopy, notificationMessage, type ReminderTiming } from "./notificationCopy.js";

export type ScheduledReminderPayload = {
  taskId: string;
  title: string;
  body: string;
  scheduledFor: string;
  notificationVibe: NotificationPersonality;
  taskDate: string;
  taskCategory: Category;
};

export type WhatsNextState = {
  currentTask: PlannedTask | null;
  nextTask: PlannedTask | null;
  upcomingTasks: PlannedTask[];
  overdueTasks: PlannedTask[];
  completedTasks: PlannedTask[];
  activeTasks: PlannedTask[];
  shouldNotify: boolean;
  notificationReason: string;
  notificationTiming: string | null;
  notificationBody: string;
  targetUrl: string;
  targetDate: string | null;
};

export type ReminderKind =
  | "activity-24-hours"
  | "activity-8-hours"
  | "activity-1-hour"
  | "work-evening-before"
  | "work-one-hour"
  | "appointment-day-before"
  | "appointment-two-hours"
  | "social-morning-of"
  | "social-two-hours"
  | "social-untimed-morning"
  | "deadline-day-before"
  | "deadline-untimed-day-before"
  | "deadline-morning-of"
  | "gym-evening-before"
  | "gym-one-hour"
  | "cleaning-one-hour"
  | "meal-prep-one-hour"
  | "food-shop-one-hour"
  | "self-care-thirty-minutes"
  | "prep-one-hour";

export function getWhatsNext(state: PlannerState, now = new Date()): WhatsNextState {
  const tasks = state.plannedTasks
    .filter(isUsableTask)
    .filter((task) => task.sourceType !== "sleep")
    .sort(compareTasks);
  const completedTasks = tasks.filter((task) => task.completed);
  const activeTasks = tasks.filter((task) => !task.completed);
  const overdueTasks = activeTasks.filter((task) => taskEnd(task).getTime() < now.getTime());
  const currentTask = activeTasks.find((task) =>
    taskStart(task).getTime() <= now.getTime() && taskEnd(task).getTime() >= now.getTime()
  ) ?? null;
  const upcomingTasks = activeTasks.filter((task) => taskStart(task).getTime() > now.getTime());
  // Missed tasks stay in the day's list; the note always points at what is happening now or next.
  const nextTask = currentTask ?? upcomingTasks[0] ?? null;
  const notificationLead = nextTask ? Math.round((taskStart(nextTask).getTime() - now.getTime()) / 60000) : null;
  const shouldNotify = Boolean(nextTask && !nextTask.completed && notificationLead !== null && notificationLead >= 0 && notificationLead <= 60);
  const notificationBody = nextTask
    ? createNotificationCopy({
      notificationVibe: state.settings.notificationPersonality,
      taskId: nextTask.id,
      taskTitle: nextTask.title,
      taskCategory: nextTask.category,
      reminderType: reminderKindForTask(nextTask),
      timing: nextTask.missed ? "missed" : notificationLead !== null && notificationLead <= 0 ? "due-now" : "soon",
      timeUntilTask: notificationLead === null ? "soon" : formatTimeUntil(notificationLead),
      capacity: state.capacity
    }).body
    : notificationMessage(state.settings.notificationPersonality, "your next task", "soon");

  return {
    currentTask,
    nextTask,
    upcomingTasks,
    overdueTasks,
    completedTasks,
    activeTasks,
    shouldNotify,
    notificationReason: shouldNotify && nextTask ? `${nextTask.title} is coming up from the current plan.` : "",
    notificationTiming: notificationLead === null ? null : formatTimeUntil(notificationLead),
    notificationBody,
    targetUrl: nextTask ? `/?date=${nextTask.date}` : "/",
    targetDate: nextTask?.date ?? null
  };
}

// Turns a lead time in minutes into friendly text, e.g. "in 45 minutes", "in 2 hours 15 minutes", "in 4 days".
export function formatTimeUntil(minutes: number): string {
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${plural(minutes, "minute")}`;
  if (minutes < 6 * 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `in ${plural(hours, "hour")}` : `in ${plural(hours, "hour")} ${plural(rest, "minute")}`;
  }
  if (minutes < 24 * 60) return `in about ${plural(Math.round(minutes / 60), "hour")}`;
  return `in about ${plural(Math.round(minutes / (24 * 60)), "day")}`;
}

function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function buildScheduledReminders(state: PlannerState, now = new Date()): ScheduledReminderPayload[] {
  const nowTime = now.getTime();
  const reminders: ScheduledReminderPayload[] = [];
  // Recently used wording, so nearby reminders don't repeat the same main line or closing line.
  const recentMainLines: string[] = [];
  const recentEncouragements: string[] = [];
  const isRecent = (copy: { mainLine: string; encouragement: string }) =>
    recentMainLines.includes(copy.mainLine) || (copy.encouragement !== "" && recentEncouragements.includes(copy.encouragement));

  state.plannedTasks
    .filter(isUsableTask)
    .filter((task) => task.sourceType !== "sleep" && !task.completed)
    .forEach((task) => {
      const vibe = state.settings.notificationPersonality;
      const addReminder = (kind: ReminderKind, scheduledFor: string) => {
        const reminderTime = new Date(scheduledFor).getTime();
        if (Number.isNaN(reminderTime) || reminderTime <= nowTime) return;
        const copyInput = {
          notificationVibe: vibe,
          taskId: task.id,
          taskTitle: task.title,
          taskCategory: task.category,
          reminderType: kind,
          timing: timingForReminderKind(kind),
          scheduledFor,
          timeUntilTask: timingTextForReminderKind(kind),
          capacity: state.capacity,
          taskTime: task.startTime
        };
        let copy = createNotificationCopy(copyInput);
        for (let variant = 1; variant <= 12 && isRecent(copy); variant += 1) {
          copy = createNotificationCopy({ ...copyInput, variant });
        }
        remember(recentMainLines, copy.mainLine, 20);
        if (copy.encouragement) remember(recentEncouragements, copy.encouragement, 3);
        reminders.push({
          taskId: task.id,
          title: copy.title,
          body: copy.body,
          scheduledFor,
          notificationVibe: vibe,
          taskDate: task.date,
          taskCategory: task.category
        });
      };

      addReminder("activity-24-hours", addMinutesToLocalDateTime(task.date, task.startTime, -24 * 60));
      addReminder("activity-8-hours", addMinutesToLocalDateTime(task.date, task.startTime, -8 * 60));
      addReminder("activity-1-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
    });

  return reminders;
}

function remember(list: string[], value: string, limit: number) {
  list.push(value);
  if (list.length > limit) list.splice(0, list.length - limit);
}

function reminderKindForTask(task: PlannedTask): ReminderKind {
  if (task.category === "work") return "work-one-hour";
  if (task.category === "appointment") return "appointment-two-hours";
  if (task.category === "deadline") return "deadline-morning-of";
  if (task.category === "gym") return "gym-one-hour";
  if (task.category === "cleaning") return "cleaning-one-hour";
  if (task.category === "meal-prep") return "meal-prep-one-hour";
  if (task.category === "food-shop") return "food-shop-one-hour";
  if (task.category === "self-care") return "self-care-thirty-minutes";
  return "prep-one-hour";
}

function timingForReminderKind(kind: ReminderKind): ReminderTiming {
  if (kind === "activity-24-hours") return "24-hours-before";
  if (kind === "activity-8-hours") return "8-hours-before";
  if (kind === "activity-1-hour") return "1-hour-before";
  if (kind.includes("evening-before")) return "evening-before";
  if (kind.includes("day-before")) return "24-hours-before";
  if (kind.includes("two-hours")) return "2-hours-before";
  if (kind.includes("one-hour")) return "1-hour-before";
  if (kind.includes("thirty-minutes")) return "30-min-before";
  if (kind.includes("morning-of") || kind.includes("untimed-morning")) return "morning-of";
  return "soon";
}

function timingTextForReminderKind(kind: ReminderKind) {
  const timing = timingForReminderKind(kind);
  if (timing === "evening-before") return "tomorrow";
  if (timing === "24-hours-before") return "in about 24 hours";
  if (timing === "8-hours-before") return "in about 8 hours";
  if (timing === "2-hours-before") return "in about 2 hours";
  if (timing === "1-hour-before") return "in about 1 hour";
  if (timing === "30-min-before") return "in about 30 minutes";
  if (timing === "morning-of") return "today";
  return "soon";
}

function compareTasks(a: PlannedTask, b: PlannedTask) {
  return `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);
}

function isUsableTask(task: PlannedTask) {
  return isDateKey(task.date) && isTimeValue(task.startTime) && isTimeValue(task.endTime);
}

function taskStart(task: PlannedTask) {
  return new Date(`${task.date}T${task.startTime}`);
}

function taskEnd(task: PlannedTask) {
  return new Date(`${task.date}T${task.endTime}`);
}

function localDateTimeToIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

function addMinutesToLocalDateTime(date: string, time: string, minutes: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, mins] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hours, mins);
  value.setMinutes(value.getMinutes() + minutes);
  return value.toISOString();
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeValue(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function offsetDate(date: string, offset: number) {
  const cursor = new Date(`${date}T12:00:00`);
  cursor.setDate(cursor.getDate() + offset);
  return `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
}
