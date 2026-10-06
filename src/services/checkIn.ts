import type { Category, NotificationPersonality, PlannedTask, PlannerState } from "../models/types";

// The "Have you got ready?" check-in shown in the hour before an activity starts.

export type CheckInAnswer = "yes" | "no";
export type CheckInRecord = { answer: CheckInAnswer; at: string };
export type CheckInRecords = Record<string, CheckInRecord>;

export const CHECK_IN_WINDOW_MINUTES = 60;

const prompts: Partial<Record<Category, { question: string; prep: string }>> = {
  gym: { question: "Have you packed your gym bag?", prep: "kit, shoes and water" },
  work: { question: "Have you got everything ready for work?", prep: "uniform, lunch, travel and water" },
  "meal-prep": { question: "Have you got everything ready for meal prep?", prep: "ingredients out and a clear space" },
  "food-shop": { question: "Are you ready to go shopping?", prep: "your list, bags and essentials" },
  cleaning: { question: "Are you ready to start cleaning?", prep: "one small area to start with" },
  "self-care": { question: "Have you made space for your self-care?", prep: "phone down and something comforting" },
  recovery: { question: "Are you ready to rest?", prep: "somewhere comfy and a drink" },
  appointment: { question: "Are you ready for your appointment?", prep: "the time, place and how you're getting there" },
  social: { question: "Are you ready to head out?", prep: "outfit, keys and how you're getting there" },
  study: { question: "Have you got your study things ready?", prep: "notes, laptop and a quiet spot" },
  deadline: { question: "Are you ready to work on this?", prep: "everything you need to finish" }
};

export function checkInPrompt(task: Pick<PlannedTask, "title" | "category">) {
  return prompts[task.category] ?? { question: `Are you ready for ${task.title}?`, prep: "the first small step" };
}

const replies: Record<NotificationPersonality, { yes: string[]; no: string[] }> = {
  bestie: {
    yes: ["Yes bestie! You're so ready ✨", "Look at you, all prepared! 💖", "That's my girl. You've got this!"],
    no: ["No stress, love. You've still got time.", "That's okay bestie, let's sort it now.", "All good! Small steps, starting now."]
  },
  gentle: {
    yes: ["Lovely. You're ready 🌸", "Well done for getting ready.", "That's wonderful. Go gently."],
    no: ["That's okay. There's still time.", "No rush. One small step at a time.", "It's alright. Start with something small."]
  },
  coach: {
    yes: ["Prepared. Now execute 💪", "Ready. Let's go.", "That's how it's done."],
    no: ["Fine. Fix it now.", "No problem. Get moving.", "Time's still on your side. Start now."]
  },
  professional: {
    yes: ["Great. You're well prepared.", "Thank you. You're all set.", "Excellent preparation."],
    no: ["Understood. There's still time to prepare.", "Noted. Please begin preparing now.", "That's fine. A few minutes now will help."]
  },
  chaos: {
    yes: ["LEGEND. Fully prepared 🔥", "Iconic. Ready for anything.", "Prepared AND fabulous."],
    no: ["Plot twist! Speed-run it now.", "No panic. Tiny chaos, quick prep.", "Okay okay, go go go!"]
  }
};

export function checkInReply(vibe: NotificationPersonality, answer: CheckInAnswer, taskId: string) {
  const options = (replies[vibe] ?? replies.gentle)[answer];
  let hash = 0;
  for (const char of taskId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return options[hash % options.length];
}

// The activity (if any) starting within the next hour that she hasn't checked in for yet.
// A task named in the notification she tapped is preferred; otherwise the soonest one.
export function findDueCheckIn(state: PlannerState, records: CheckInRecords, now: Date, preferredTaskId?: string | null) {
  const nowTime = now.getTime();
  const due = state.plannedTasks
    .filter((task) => task.sourceType !== "sleep" && !task.completed && !records[task.id])
    .filter((task) => !(task.category === "deadline" && task.timeWasDefaulted))
    .map((task) => ({ task, minutesUntil: Math.round((localStart(task).getTime() - nowTime) / 60000) }))
    .filter(({ minutesUntil }) => minutesUntil > 0 && minutesUntil <= CHECK_IN_WINDOW_MINUTES)
    .sort((a, b) => a.minutesUntil - b.minutesUntil);
  return due.find(({ task }) => task.id === preferredTaskId) ?? due[0] ?? null;
}

function localStart(task: Pick<PlannedTask, "date" | "startTime">) {
  const [year, month, day] = task.date.split("-").map(Number);
  const [hours, minutes] = task.startTime.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}
