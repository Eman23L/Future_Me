import type { CapacityMode, Category, NotificationPersonality } from "../models/types";

export type ReminderTiming =
  | "evening-before"
  | "24-hours-before"
  | "2-hours-before"
  | "1-hour-before"
  | "30-min-before"
  | "morning-of"
  | "overdue"
  | "missed"
  | "due-now"
  | "soon";

export type NotificationCopyInput = {
  notificationVibe: NotificationPersonality;
  taskId?: string;
  taskTitle: string;
  taskCategory: Category;
  reminderType: string;
  timing: ReminderTiming;
  scheduledFor?: string;
  timeUntilTask?: string;
  capacity?: CapacityMode;
};

type CopyGroup = "general" | "work" | "gym" | "chores" | "selfCare" | "focus";

type VariationBank = {
  titles: string[];
  general: string[];
  work: string[];
  gym: string[];
  chores: string[];
  selfCare: string[];
  focus: string[];
};

type NotificationCopy = {
  title: string;
  body: string;
};

export function createNotificationCopy(input: NotificationCopyInput): NotificationCopy {
  const vibe = normalizeNotificationVibe(input.notificationVibe);
  const bank = copyBanks[vibe];
  const seed = [vibe, input.taskId, input.taskTitle, input.taskCategory, input.reminderType, input.scheduledFor].filter(Boolean).join("|");
  const group = copyGroupForCategory(input.taskCategory);
  const bodyTemplate = choose([...bank[group], ...bank.general], `${seed}|body`);
  const titleTemplate = choose(bank.titles, `${seed}|title`);
  const context = {
    task: input.taskTitle,
    timing: timingPhrase(input.timing, input.timeUntilTask),
    prep: prepPhrase(input.taskCategory),
    capacity: capacityPhrase(input.capacity)
  };

  return {
    title: applyTemplate(titleTemplate, context),
    body: applyTemplate(bodyTemplate, context)
  };
}

export function notificationMessage(personality: NotificationPersonality, title: string, time: string) {
  return createNotificationCopy({
    notificationVibe: personality,
    taskTitle: title,
    taskCategory: "custom",
    reminderType: "dashboard",
    timing: time === "now" ? "due-now" : time.startsWith("in ") ? "soon" : "soon",
    timeUntilTask: time
  }).body;
}

export function normalizeNotificationVibe(value: unknown): NotificationPersonality {
  return value === "bestie" || value === "gentle" || value === "coach" || value === "professional" || value === "chaos"
    ? value
    : "gentle";
}

export function getNotificationCopyVariationCounts() {
  return Object.fromEntries(
    Object.entries(copyBanks).map(([vibe, bank]) => [
      vibe,
      {
        titles: bank.titles.length,
        general: bank.general.length,
        work: bank.work.length,
        gym: bank.gym.length,
        chores: bank.chores.length,
        selfCare: bank.selfCare.length,
        focus: bank.focus.length
      }
    ])
  ) as Record<NotificationPersonality, Record<keyof VariationBank, number>>;
}

function choose(items: string[], seed: string) {
  return items[hash(seed) % items.length];
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function applyTemplate(template: string, context: Record<string, string>) {
  return template.replace(/\{(task|timing|prep|capacity)\}/g, (_, key: string) => context[key] ?? "");
}

function copyGroupForCategory(category: Category): CopyGroup {
  if (category === "work") return "work";
  if (category === "gym") return "gym";
  if (category === "meal-prep" || category === "food-shop" || category === "cleaning") return "chores";
  if (category === "self-care" || category === "recovery") return "selfCare";
  if (category === "deadline" || category === "appointment" || category === "study") return "focus";
  return "general";
}

function timingPhrase(timing: ReminderTiming, fallback = "soon") {
  if (timing === "evening-before") return "tomorrow";
  if (timing === "24-hours-before") return "in about 24 hours";
  if (timing === "2-hours-before") return "in about 2 hours";
  if (timing === "1-hour-before") return "in about 1 hour";
  if (timing === "30-min-before") return "in about 30 minutes";
  if (timing === "morning-of") return "today";
  if (timing === "overdue") return "still waiting for you";
  if (timing === "missed") return "still on the plan";
  if (timing === "due-now") return "now";
  return fallback;
}

function prepPhrase(category: Category) {
  if (category === "work") return "uniform, lunch, travel, water";
  if (category === "gym") return "kit, shoes, water";
  if (category === "meal-prep") return "food sorted for future you";
  if (category === "food-shop") return "list, bags, essentials";
  if (category === "cleaning") return "one small reset";
  if (category === "appointment") return "time, place, travel";
  if (category === "deadline" || category === "study") return "the next focused step";
  if (category === "self-care" || category === "recovery") return "a softer reset";
  return "the next small step";
}

function capacityPhrase(capacity?: CapacityMode) {
  if (capacity === "tired") return "Keep it soft.";
  if (capacity === "survival") return "Just the essentials.";
  if (capacity === "high") return "Use the energy wisely.";
  return "Keep it simple.";
}

const copyBanks: Record<NotificationPersonality, VariationBank> = {
  bestie: {
    titles: ["FutureMe nudge", "Tiny nudge", "Next up", "For future you"],
    general: [
      "Bestie, {task} is coming up {timing}. Let's make future you proud.",
      "Tiny nudge: {task} is nearly here. {capacity}",
      "Okay love, {task} is next on the list.",
      "Future you asked nicely: it is almost time for {task}.",
      "You do not need to do everything. Just this next thing: {task}.",
      "{task} is coming up {timing}. One gentle move now.",
      "Little heads-up: {task} is on the plan {timing}.",
      "Bestie check-in: {task} is the next step.",
      "The plan says {task}. We can keep this simple.",
      "{task} is nearly here. Future you is rooting for current you.",
      "Soft accountability moment: {task} is coming up.",
      "One thing at a time, love. Next is {task}."
    ],
    work: [
      "Work is {timing}. Quick check: {prep}.",
      "Bestie, work is coming up. Bag, water, and the basics.",
      "Future you would love a calm work prep moment now.",
      "Work is on the plan {timing}. Start gathering the essentials.",
      "Tiny work nudge: uniform, lunch, travel, water. You know the drill.",
      "Okay love, work is next. Make leaving easier for future you."
    ],
    gym: [
      "Gym is {timing}. Kit, shoes, water, no drama.",
      "Bestie, movement is coming up. Start with getting changed.",
      "Gym soon. You only need the first step: {prep}.",
      "Future you booked gym. Current you just needs to get ready.",
      "Tiny nudge for gym: shoes and water first.",
      "Gym is next on the plan. Make it easy to begin."
    ],
    chores: [
      "{task} is {timing}. Make the week easier for future you.",
      "Tiny home-life nudge: {task}. Start with {prep}.",
      "Okay love, {task} is coming up. Keep it small and doable.",
      "{task} is next. One simple reset counts.",
      "Future you would appreciate {task} being handled.",
      "Bestie, {task} is on deck. Small start, smoother week."
    ],
    selfCare: [
      "{task} is {timing}. This counts too.",
      "Soft check-in, love: {task} is next. No performance required.",
      "Future you protected this time. Let it be gentle.",
      "{task} is coming up. You are allowed to slow down.",
      "Tiny care nudge: {task}. Keep it kind.",
      "Bestie, this is the reset part. {task} is next."
    ],
    focus: [
      "{task} is {timing}. Tiny steady steps now.",
      "Bestie, {task} needs a calm check-in.",
      "Future you put {task} here for a reason. Start small.",
      "{task} is approaching. Check the details and take one step.",
      "Okay love, focus moment: {task}.",
      "{task} is on the plan. No panic, just the next step."
    ]
  },
  gentle: {
    titles: ["Soft reminder", "Gentle nudge", "FutureMe check-in", "Coming up"],
    general: [
      "A soft reminder: {task} is coming up {timing}.",
      "When you are ready, start easing toward {task}.",
      "No rush, just a gentle nudge for {task}.",
      "Your next step is {task}. Keep it simple.",
      "FutureMe is holding this for you: {task} is coming up.",
      "{task} is on the plan {timing}. Begin gently.",
      "A calm heads-up: {task} is next.",
      "You do not need to do everything now. Just notice {task}.",
      "{task} is approaching. Take the smallest useful step.",
      "Gentle check-in: {task} is still here for you.",
      "If you have capacity, start moving toward {task}.",
      "{task} is coming up. Let it be simple."
    ],
    work: [
      "Work is {timing}. Start with the basics: {prep}.",
      "A gentle work reminder: check what you need before you leave.",
      "Work is coming up. Give yourself time to prepare calmly.",
      "Soft heads-up for work: water, food, travel, and anything important.",
      "Work is next soon. One small prep step is enough to begin.",
      "FutureMe is holding work prep for you. Start when you can."
    ],
    gym: [
      "Gym is {timing}. Start with kit and water when you can.",
      "A soft gym reminder. No pressure, just prepare gently.",
      "Movement is coming up. Begin with shoes or clothes.",
      "Gym is on the plan. Make the first step easy.",
      "When you are ready, start easing toward gym.",
      "A small nudge for gym: gather what you need."
    ],
    chores: [
      "{task} is {timing}. A small start is enough.",
      "Gentle nudge: {task} can begin with {prep}.",
      "{task} is coming up. Keep the reset simple.",
      "Future you may appreciate a small step toward {task}.",
      "No need to finish everything. Just begin {task}.",
      "{task} is next. Do the easiest useful part first."
    ],
    selfCare: [
      "{task} is {timing}. You do not have to earn rest.",
      "Soft reminder: {task} is part of the plan too.",
      "This is your gentle nudge to protect {task}.",
      "{task} is coming up. Let it stay kind.",
      "FutureMe saved this softer moment for you.",
      "A calm care check-in: {task} is next."
    ],
    focus: [
      "{task} is {timing}. Start with one calm check.",
      "A gentle focus reminder: {task} is approaching.",
      "FutureMe is holding {task} for you. Begin with the next small step.",
      "{task} is due soon. Check the plan when ready.",
      "No panic. {task} just needs one clear next action.",
      "{task} is today. Keep it steady and kind."
    ]
  },
  coach: {
    titles: ["Next move", "Plan check", "Action reminder", "Stay with the plan"],
    general: [
      "Next up: {task}. Prepare now and keep the plan moving.",
      "{task} is coming up. Small action, clear progress.",
      "Time to get ready for {task}. Stay with the plan.",
      "Focus on the next move: {task}.",
      "You planned this. Execute the next step: {task}.",
      "{task} is {timing}. Start clean, keep it simple.",
      "One task, one action: {task}.",
      "Check the plan. {task} is next.",
      "Move toward {task} now. Momentum comes from starting.",
      "{task} is approaching. Prepare the basics.",
      "Keep the day moving: {task} is next.",
      "Start with the first useful step for {task}."
    ],
    work: [
      "Work is {timing}. Prepare {prep} and leave on plan.",
      "Work prep now: uniform, lunch, travel, water.",
      "Shift coming up. Get ready and reduce friction.",
      "Work is next. Prepare early and keep it steady.",
      "Check your work essentials. Move before it gets rushed.",
      "Work reminder: gather the basics and follow the plan."
    ],
    gym: [
      "Gym is {timing}. Kit, shoes, water. Start there.",
      "Gym next. Prepare now and remove excuses.",
      "Movement block coming up. Get ready and keep it simple.",
      "Gym reminder: first step is getting changed.",
      "You planned gym. Prepare the basics and go.",
      "Gym is approaching. Small action, clear follow-through."
    ],
    chores: [
      "{task} is {timing}. Start with {prep}.",
      "Household task next: {task}. Keep the scope small.",
      "{task} supports the week. Start now.",
      "One reset block: {task}. Move it forward.",
      "{task} is next. Do the first useful piece.",
      "Keep the plan moving with {task}."
    ],
    selfCare: [
      "{task} is {timing}. Recovery is part of performance.",
      "Self-care block next. Protect it.",
      "{task} is on the plan. Follow through gently.",
      "Reset time coming up. Take it seriously.",
      "Stay sustainable: {task} is next.",
      "Your next action is care: {task}."
    ],
    focus: [
      "{task} is {timing}. Check the brief and start.",
      "Focus block next: {task}. One clear step.",
      "{task} is approaching. Prepare materials and begin.",
      "Deadline/appointment reminder: {task}. Stay ahead.",
      "Execute the next focused move for {task}.",
      "{task} needs attention. Start with the easiest concrete action."
    ]
  },
  professional: {
    titles: ["Reminder", "Scheduled reminder", "Upcoming task", "FutureMe notice"],
    general: [
      "Reminder: {task} is scheduled {timing}.",
      "Upcoming task: {task}. Please prepare accordingly.",
      "{task} is due shortly. Check your plan when ready.",
      "Scheduled reminder: {task} is approaching.",
      "Your next planned activity is {task}.",
      "{task} is on your schedule {timing}.",
      "Please review your plan for {task}.",
      "FutureMe reminder: {task} is coming up.",
      "Planned activity approaching: {task}.",
      "Please begin preparing for {task}.",
      "Your schedule shows {task} next.",
      "{task} remains active until completed."
    ],
    work: [
      "Reminder: work is scheduled {timing}. Please prepare essentials.",
      "Work is approaching. Check uniform, lunch, travel, and water.",
      "Upcoming shift: please allow time to prepare.",
      "Work reminder: review your departure plan.",
      "Please prepare for work and check required items.",
      "Scheduled work reminder: gather essentials before leaving."
    ],
    gym: [
      "Reminder: gym is scheduled {timing}.",
      "Upcoming gym session. Please prepare kit and water.",
      "Gym is approaching. Allow time to get ready.",
      "Scheduled activity: gym. Check shoes and water.",
      "Please prepare for your planned gym session.",
      "Gym reminder: review the plan and prepare accordingly."
    ],
    chores: [
      "Reminder: {task} is scheduled {timing}.",
      "{task} is approaching. Please prepare {prep}.",
      "Upcoming household task: {task}.",
      "Scheduled reminder: {task} supports your weekly plan.",
      "Please begin preparing for {task}.",
      "{task} remains on today's plan."
    ],
    selfCare: [
      "Reminder: {task} is scheduled {timing}.",
      "Upcoming care block: {task}.",
      "{task} is approaching. Please keep this time protected.",
      "Scheduled self-care reminder: {task}.",
      "Your plan includes {task} next.",
      "Please allow time for {task}."
    ],
    focus: [
      "Reminder: {task} is scheduled {timing}.",
      "{task} is approaching. Please check details.",
      "Upcoming deadline or appointment: {task}.",
      "Please review the plan for {task}.",
      "{task} requires attention {timing}.",
      "Scheduled focus reminder: {task}."
    ]
  },
  chaos: {
    titles: ["Chaos alarm", "Bestie alert", "Official summons", "Go mode"],
    general: [
      "BESTIE. {task} is coming. Shoes? Water? Brain cells? Let's go.",
      "This is your official chaos alarm for {task}.",
      "Not to be dramatic, but {task} is approaching.",
      "Future you booked this. Current you has been summoned.",
      "Tiny panic? No. Tiny action. {task} is next.",
      "{task} is {timing}. We are doing the first step only.",
      "The plan has spoken: {task}.",
      "Attention please: {task} has entered the chat.",
      "{task} is next. Do not negotiate with the couch.",
      "Small action, big FutureMe energy: {task}.",
      "Official nudge: {task}. Begin the side quest.",
      "Current mission: {task}. Keep it tiny, keep it moving."
    ],
    work: [
      "WORK ALERT. Uniform, lunch, water, travel. Assemble the kit.",
      "Work is {timing}. The bag will not pack itself.",
      "Future you needs current you to locate {prep}.",
      "Shift incoming. Shoes, bag, water. Go mode.",
      "Official work summons. Prepare the essentials.",
      "Work is approaching. Calm chaos, practical actions."
    ],
    gym: [
      "GYM ALERT. Shoes? Water? Human body? Excellent.",
      "Gym is {timing}. Locate kit and become unstoppable-ish.",
      "Future you chose movement. Current you gets shoes.",
      "Gym side quest unlocked. Start with water.",
      "Not a drill: gym is approaching. Prepare the kit.",
      "Tiny action: shoes on. Gym is next."
    ],
    chores: [
      "{task} is {timing}. We are doing one tiny reset.",
      "House quest: {task}. Start with {prep}.",
      "Future you requested a smoother week. {task} is next.",
      "Chaos contained through {task}. Begin.",
      "{task} has appeared. Do the smallest useful bit.",
      "Official reset alarm: {task}."
    ],
    selfCare: [
      "SELF-CARE SUMMONS. This is not optional villain admin.",
      "{task} is {timing}. Go be nice to your nervous system.",
      "Plot twist: rest is productive. {task} is next.",
      "Future you scheduled softness. Current you may comply.",
      "Care task unlocked: {task}. Keep it gentle.",
      "Tiny chaos pause. {task} is up."
    ],
    focus: [
      "{task} is {timing}. Open the thing. Do one bit.",
      "Deadline or appointment alarm? No spiral. One clear step: {task}.",
      "Focus alarm: {task}. Tiny action, no spiral.",
      "Important thing approaching. Check details for {task}.",
      "Future you put {task} here. Current you starts.",
      "Brain cells assemble: {task} needs attention."
    ]
  }
};
