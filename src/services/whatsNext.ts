import type { Category, NotificationPersonality, PlannedTask, PlannerState } from "../models/types";

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

type ReminderKind =
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
    .filter((task) => task.sourceType !== "sleep")
    .sort(compareTasks);
  const completedTasks = tasks.filter((task) => task.completed);
  const activeTasks = tasks.filter((task) => !task.completed);
  const overdueTasks = activeTasks.filter((task) => taskEnd(task).getTime() < now.getTime());
  const currentTask = activeTasks.find((task) =>
    taskStart(task).getTime() <= now.getTime() && taskEnd(task).getTime() >= now.getTime()
  ) ?? null;
  const upcomingTasks = activeTasks.filter((task) => taskStart(task).getTime() > now.getTime());
  const nextTask = currentTask ?? overdueTasks[0] ?? upcomingTasks[0] ?? null;
  const notificationLead = nextTask ? Math.round((taskStart(nextTask).getTime() - now.getTime()) / 60000) : null;
  const shouldNotify = Boolean(nextTask && !nextTask.completed && notificationLead !== null && notificationLead >= 0 && notificationLead <= 60);
  const notificationBody = nextTask
    ? reminderBody(state.settings.notificationPersonality, nextTask, reminderKindForTask(nextTask))
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
    notificationTiming: notificationLead === null ? null : notificationLead <= 0 ? "now" : `in ${notificationLead} minutes`,
    notificationBody,
    targetUrl: nextTask ? `/?date=${nextTask.date}` : "/",
    targetDate: nextTask?.date ?? null
  };
}

export function buildScheduledReminders(state: PlannerState, now = new Date()): ScheduledReminderPayload[] {
  const nowTime = now.getTime();
  const reminders: ScheduledReminderPayload[] = [];

  state.plannedTasks
    .filter((task) => task.sourceType !== "sleep" && !task.completed)
    .forEach((task) => {
      const vibe = state.settings.notificationPersonality;
      const addReminder = (kind: ReminderKind, scheduledFor: string) => {
        const reminderTime = new Date(scheduledFor).getTime();
        if (Number.isNaN(reminderTime) || reminderTime <= nowTime) return;
        reminders.push({
          taskId: task.id,
          title: "FutureMe reminder",
          body: reminderBody(vibe, task, kind),
          scheduledFor,
          notificationVibe: vibe,
          taskDate: task.date,
          taskCategory: task.category
        });
      };

      if (task.category === "work") {
        addReminder("work-evening-before", localDateTimeToIso(offsetDate(task.date, -1), "20:00"));
        addReminder("work-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
        return;
      }

      if (task.category === "appointment") {
        addReminder("appointment-day-before", addMinutesToLocalDateTime(task.date, task.startTime, -24 * 60));
        addReminder("appointment-two-hours", addMinutesToLocalDateTime(task.date, task.startTime, -120));
        return;
      }

      if (task.category === "social") {
        if (task.timeWasDefaulted) {
          addReminder("social-untimed-morning", localDateTimeToIso(task.date, "10:00"));
        } else {
          addReminder("social-morning-of", localDateTimeToIso(task.date, "10:00"));
          addReminder("social-two-hours", addMinutesToLocalDateTime(task.date, task.startTime, -120));
        }
        return;
      }

      if (task.category === "deadline") {
        if (task.timeWasDefaulted) {
          addReminder("deadline-untimed-day-before", localDateTimeToIso(offsetDate(task.date, -1), "18:00"));
          addReminder("deadline-morning-of", localDateTimeToIso(task.date, "09:00"));
        } else {
          addReminder("deadline-day-before", addMinutesToLocalDateTime(task.date, task.startTime, -24 * 60));
          if (timeToMinutes(task.startTime) > timeToMinutes("09:00")) {
            addReminder("deadline-morning-of", localDateTimeToIso(task.date, "09:00"));
          }
        }
        return;
      }

      if (task.category === "gym") {
        addReminder("gym-evening-before", localDateTimeToIso(offsetDate(task.date, -1), "20:00"));
        addReminder("gym-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
        return;
      }

      if (task.category === "self-care") {
        addReminder("self-care-thirty-minutes", addMinutesToLocalDateTime(task.date, task.startTime, -30));
        return;
      }

      if (task.category === "cleaning") addReminder("cleaning-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
      if (task.category === "meal-prep") addReminder("meal-prep-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
      if (task.category === "food-shop") addReminder("food-shop-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
      if (task.sourceType === "prep" && task.category !== "meal-prep") addReminder("prep-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
    });

  return reminders;
}

export function notificationMessage(personality: NotificationPersonality, title: string, time: string) {
  const when = time === "soon" || time === "now" || time.startsWith("in ") ? time : `at ${time}`;
  const messages: Record<NotificationPersonality, string> = {
    bestie: `Hey girlie pop, ${title} is ${when}. Let's make it easy for future you.`,
    gentle: `Soft reminder, ${title} is coming up ${when}. Start when you feel ready.`,
    coach: `${title} is coming up ${when}. Keep it simple and follow the plan.`,
    professional: `Reminder: ${title} is scheduled ${when}. Please prepare accordingly.`,
    chaos: `BESTIE. ${title} is ${when}. Shoes, water, brain cells. Go mode.`
  };
  return messages[personality];
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

function reminderBody(personality: NotificationPersonality, task: PlannedTask, kind: ReminderKind) {
  const title = task.title;

  if (kind === "work-evening-before") {
    const messages: Record<NotificationPersonality, string> = {
      bestie: "Hey girlie pop, work is tomorrow. Uniform, lunch, water bottle. Future you says thanks.",
      gentle: "Soft reminder, work is tomorrow. Uniform, lunch and water bottle when you can.",
      coach: "Work tomorrow. Prep uniform, lunch and water bottle tonight.",
      professional: "Reminder: work is scheduled tomorrow. Please prepare your essentials.",
      chaos: "BESTIE. Work tomorrow. Uniform. Lunch. Water bottle. Go mode."
    };
    return messages[personality];
  }

  if (kind === "work-one-hour") {
    const messages: Record<NotificationPersonality, string> = {
      bestie: "Hey girlie pop, work starts in 1 hour. Let's get future you out the door calmly.",
      gentle: "Soft reminder, work starts in 1 hour. Start getting ready when you can.",
      coach: "Work starts in 1 hour. Get ready and follow the plan.",
      professional: "Reminder: work starts in 1 hour. Please prepare accordingly.",
      chaos: "WORK IN 1 HOUR. Shoes. Bag. Water. Go mode."
    };
    return messages[personality];
  }

  if (kind === "appointment-day-before") return vibeLine(personality, `${title} is tomorrow.`, `${title} is tomorrow. Check the time, place and anything you need.`);
  if (kind === "appointment-two-hours") return vibeLine(personality, `${title} is in 2 hours.`, `${title} is in 2 hours. Leave yourself enough time to get ready.`);
  if (kind === "social-morning-of") return vibeLine(personality, `${title} is today.`, `${title} is today. Check plans and give yourself space to get ready.`);
  if (kind === "social-two-hours") return vibeLine(personality, `${title} is in 2 hours.`, `${title} is in 2 hours. Time to start easing into it.`);
  if (kind === "social-untimed-morning") return vibeLine(personality, `${title} is today.`, `${title} is today. The time was not set, so check the plan when you can.`);

  if (kind === "deadline-day-before") {
    const messages: Record<NotificationPersonality, string> = {
      bestie: `Hey girlie pop, ${title} is due tomorrow. Tiny steady steps now.`,
      gentle: `Soft reminder, ${title} is due tomorrow. Give yourself a calm check-in today.`,
      coach: `${title} is due tomorrow. Review the final pieces today.`,
      professional: `Reminder: ${title} is due tomorrow. Please review your preparation.`,
      chaos: `BESTIE. ${title} is tomorrow. Open the thing. Finish the thing.`
    };
    return messages[personality];
  }

  if (kind === "deadline-untimed-day-before") return vibeLine(personality, `${title} is due tomorrow.`, `${title} is due tomorrow. No due time was set, so give it some attention today.`);
  if (kind === "deadline-morning-of") return vibeLine(personality, `${title} is today.`, `${title} is today. Start with the next kind step.`);
  if (kind === "gym-evening-before") return vibeLine(personality, "Gym is tomorrow.", "Gym is tomorrow. Put your kit, water and shoes somewhere easy.");
  if (kind === "gym-one-hour") return notificationMessage(personality, "Gym", "in about an hour");
  if (kind === "cleaning-one-hour") return vibeLine(personality, "Cleaning is in 1 hour.", "Cleaning is in 1 hour. Keep it simple and start with one reset.");
  if (kind === "meal-prep-one-hour") return vibeLine(personality, "Meal prep is in 1 hour.", "Meal prep is in 1 hour. Future you will be grateful.");
  if (kind === "food-shop-one-hour") return vibeLine(personality, "Food shop is in 1 hour.", "Food shop is in 1 hour. Check your list before you go.");
  if (kind === "self-care-thirty-minutes") return vibeLine(personality, "Self-care is in 30 minutes.", "Self-care is in 30 minutes. Protect the reset.");
  if (kind === "prep-one-hour") return vibeLine(personality, `${title} is in 1 hour.`, `${title} is in 1 hour. A small prep block now will help later.`);

  return notificationMessage(personality, title, "soon");
}

function vibeLine(personality: NotificationPersonality, shortLine: string, gentleLine: string) {
  const messages: Record<NotificationPersonality, string> = {
    bestie: `Hey girlie pop, ${shortLine} Let's make it easy for future you.`,
    gentle: `Soft reminder, ${gentleLine}`,
    coach: `${shortLine} Keep it simple and follow the plan.`,
    professional: `Reminder: ${shortLine}`,
    chaos: `BESTIE. ${shortLine} Shoes, water, brain cells. Go mode.`
  };
  return messages[personality];
}

function compareTasks(a: PlannedTask, b: PlannedTask) {
  return `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);
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

function offsetDate(date: string, offset: number) {
  const cursor = new Date(`${date}T12:00:00`);
  cursor.setDate(cursor.getDate() + offset);
  return `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
}
