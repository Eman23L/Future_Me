import { createSeedState } from "./seed";
import type { CapacityMode, Category, EffortLevel, PlannerState, PlannedTask, PlanningPriority, Routine } from "../models/types";
import type { PlannerRepository } from "./PlannerRepository";
import { normalizeNotificationVibe } from "../services/notificationCopy";

const STORAGE_KEY = "future-me:v1";
const MONTHLY_STORAGE_KEY = "future-me:plans:v2";
const DAILY_TASK_STORAGE_KEY = "future-me:daily-tasks:v2";
const LEGACY_STORAGE_KEY = "plan-my-month:v1";
const DEMO_INPUT_IDS = new Set([
  "shift-1",
  "shift-2",
  "shift-3",
  "deadline-1",
  "social-1",
  "appointment-1"
]);
const DEMO_ROUTINE_IDS = new Set([
  "routine-gym",
  "routine-food-shop",
  "routine-meal-prep",
  "routine-clean",
  "routine-study"
]);
const DEMO_RULE_IDS = new Set([
  "never-gym-after-long-shift",
  "no-study-after-8",
  "protect-sunday-evenings",
  "recovery-after-3-shifts",
  "avoid-more-than-2-demanding"
]);
const DEMO_CUSTOM_RULE = "Keep Wednesday evenings light when possible.";
const CATEGORY_IDS = new Set<Category>([
  "work",
  "social",
  "deadline",
  "gym",
  "cleaning",
  "meal-prep",
  "food-shop",
  "self-care",
  "study",
  "appointment",
  "recovery",
  "custom"
]);
const SOURCE_TYPES = new Set<PlannedTask["sourceType"]>(["sleep", "fixed", "routine", "recovery", "prep"]);
const CAPACITY_MODES = new Set<CapacityMode>(["high", "normal", "tired", "survival"]);
const EFFORT_LEVELS = new Set<EffortLevel>(["low", "medium", "high"]);
const PRIORITIES = new Set<PlanningPriority>(["essential", "high", "medium", "low"]);

export class LocalPlannerRepository implements PlannerRepository {
  constructor(private storageNamespace = "") {}

  async load(monthKey = currentMonthKey()): Promise<PlannerState | null> {
    const plans = loadPlans(this.storageNamespace);
    if (plans[monthKey]) {
      const state = migrate(plans[monthKey]);
      await this.save(state);
      return state;
    }

    const raw = localStorage.getItem(this.storageKey(STORAGE_KEY));
    if (raw) {
      const state = migrate(JSON.parse(raw) as PlannerState);
      await this.save(state);
      return state.plannedMonth === monthKey ? state : null;
    }

    const legacy = localStorage.getItem(this.storageKey(LEGACY_STORAGE_KEY));
    if (!legacy) return null;

    const state = migrate(JSON.parse(legacy) as PlannerState);
    await this.save(state);
    return state.plannedMonth === monthKey ? state : null;
  }

  async save(state: PlannerState): Promise<void> {
    const plans = loadPlans(this.storageNamespace);
    plans[state.plannedMonth] = state;
    localStorage.setItem(this.storageKey(MONTHLY_STORAGE_KEY), JSON.stringify(plans));
    localStorage.setItem(this.storageKey(DAILY_TASK_STORAGE_KEY), JSON.stringify(mergeTasksByDate(state, this.storageNamespace)));
    localStorage.setItem(this.storageKey(STORAGE_KEY), JSON.stringify(state));
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.storageKey(MONTHLY_STORAGE_KEY));
    localStorage.removeItem(this.storageKey(DAILY_TASK_STORAGE_KEY));
    localStorage.removeItem(this.storageKey(STORAGE_KEY));
    localStorage.removeItem(this.storageKey(LEGACY_STORAGE_KEY));
  }

  private storageKey(baseKey: string) {
    return this.storageNamespace ? `${this.storageNamespace}:${baseKey}` : baseKey;
  }
}

function mergeTasksByDate(state: PlannerState, storageNamespace = "") {
  const existing = loadDailyTasks(storageNamespace);
  Object.keys(existing)
    .filter((date) => date.startsWith(state.plannedMonth))
    .forEach((date) => delete existing[date]);

  return state.plannedTasks.reduce<Record<string, PlannerState["plannedTasks"]>>((byDate, task) => {
    byDate[task.date] = [...(byDate[task.date] ?? []), task];
    return byDate;
  }, existing);
}

function loadDailyTasks(storageNamespace = ""): Record<string, PlannerState["plannedTasks"]> {
  const raw = localStorage.getItem(storageKey(DAILY_TASK_STORAGE_KEY, storageNamespace));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed as Record<string, PlannerState["plannedTasks"]> : {};
  } catch {
    return {};
  }
}

function loadPlans(storageNamespace = ""): Record<string, PlannerState> {
  const raw = localStorage.getItem(storageKey(MONTHLY_STORAGE_KEY, storageNamespace));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed as Record<string, PlannerState> : {};
  } catch {
    return {};
  }
}

function storageKey(baseKey: string, storageNamespace = "") {
  return storageNamespace ? `${storageNamespace}:${baseKey}` : baseKey;
}

function migrate(rawValue: unknown): PlannerState {
  const rawState: Partial<PlannerState> = isRecord(rawValue) ? rawValue as Partial<PlannerState> : {};
  const sourceMonth = isMonthKey(rawState.plannedMonth) ? rawState.plannedMonth : currentMonthKey();
  const seed = createSeedState(sourceMonth);
  const safeState: PlannerState = {
    ...seed,
    ...rawState,
    settings: {
      ...seed.settings,
      ...(rawState.settings ?? {}),
      wakeTime: isTimeValue(rawState.settings?.wakeTime) ? rawState.settings.wakeTime : seed.settings.wakeTime,
      bedTime: isTimeValue(rawState.settings?.bedTime) ? rawState.settings.bedTime : seed.settings.bedTime,
      notificationPersonality: normalizeNotificationVibe(rawState.settings?.notificationPersonality)
    },
    monthlyInputs: normalizeMonthlyInputs(rawState.monthlyInputs),
    routines: normalizeRoutines(rawState.routines),
    rules: {
      ...seed.rules,
      ...(rawState.rules ?? {}),
      selected: Array.isArray(rawState.rules?.selected) ? rawState.rules.selected : []
    },
    capacityChecks: Array.isArray(rawState.capacityChecks) ? rawState.capacityChecks : [],
    explanations: Array.isArray(rawState.explanations) ? rawState.explanations : [],
    plannedTasks: normalizePlannedTasks(rawState.plannedTasks),
    capacity: isCapacityMode(rawState.capacity) ? rawState.capacity : seed.capacity,
    plannedMonth: sourceMonth,
    setupComplete: Boolean(rawState.setupComplete)
  };
  const sourceDate = safeState.monthlyInputs[0]?.date ?? localDateKey(new Date());
  const hasDemoContent =
    safeState.monthlyInputs.some((input) => DEMO_INPUT_IDS.has(input.id)) ||
    safeState.routines.some((routine) => DEMO_ROUTINE_IDS.has(routine.id)) ||
    safeState.rules.custom === DEMO_CUSTOM_RULE;
  const monthlyInputs = safeState.monthlyInputs
    .filter((input) => !DEMO_INPUT_IDS.has(input.id))
    .map((input) => {
      const oldFakeTime = input.startTime === "23:59";
      if (!oldFakeTime) return input;
      if (input.category === "social") return { ...input, startTime: "18:00", endTime: "20:00", timeWasDefaulted: true, notes: appendNote(input.notes, "Time estimated") };
      if (input.category === "appointment") return { ...input, startTime: "12:00", endTime: input.endTime ?? "13:00", timeWasDefaulted: true, notes: appendNote(input.notes, "Time estimated") };
      if (input.category === "deadline") return { ...input, startTime: "09:00", endTime: "09:30", timeWasDefaulted: true, notes: appendNote(input.notes, "Due time not set.") };
      return input;
    });
  const routines = safeState.routines.filter((routine) => !DEMO_ROUTINE_IDS.has(routine.id));
  const plannedTasks = safeState.plannedTasks
    .filter((task) => {
      if (DEMO_INPUT_IDS.has(task.sourceId) || DEMO_ROUTINE_IDS.has(task.sourceId)) return false;
      if (task.sourceType === "prep" && DEMO_INPUT_IDS.has(task.sourceId)) return false;
      return true;
    })
    .map((task) => ({
      ...task,
      ...(task.startTime === "23:59" && task.category === "social" ? { startTime: "18:00", endTime: "20:00", timeWasDefaulted: true } : {}),
      ...(task.startTime === "23:59" && task.category === "deadline" ? { startTime: "09:00", endTime: "09:30", timeWasDefaulted: true } : {}),
      lock: task.lock ?? (task.sourceType === "fixed" || task.sourceType === "sleep" ? "fixed" : "flexible"),
      priority: task.priority ?? (task.sourceType === "fixed" || task.sourceType === "sleep" ? "essential" : "medium")
    }));
  const rules = {
    selected: hasDemoContent
      ? safeState.rules.selected.filter((rule) => !DEMO_RULE_IDS.has(rule))
      : safeState.rules.selected,
    custom: safeState.rules.custom === DEMO_CUSTOM_RULE ? "" : safeState.rules.custom
  };

  return {
    ...safeState,
    monthlyInputs,
    routines,
    rules,
    plannedTasks,
    plannedMonth: safeState.plannedMonth ?? sourceDate.slice(0, 7)
  };
}

function normalizeMonthlyInputs(value: unknown): PlannerState["monthlyInputs"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((input): input is Partial<PlannerState["monthlyInputs"][number]> => Boolean(input && typeof input === "object"))
    .filter((input) =>
      typeof input.title === "string" &&
      isDateKey(input.date) &&
      isTimeValue(input.startTime) &&
      isCategory(input.category)
    )
    .map((input) => ({
      id: typeof input.id === "string" ? input.id : `input-${input.category}-${input.date}-${input.startTime}`,
      title: input.title as string,
      date: input.date as string,
      startTime: input.startTime as string,
      endTime: isTimeValue(input.endTime) ? input.endTime : undefined,
      category: input.category as Category,
      notes: typeof input.notes === "string" ? input.notes : undefined,
      fixed: Boolean(input.fixed),
      effort: isEffortLevel(input.effort) ? input.effort : "medium",
      priority: isPriority(input.priority) ? input.priority : "medium",
      timeWasDefaulted: Boolean(input.timeWasDefaulted)
    }));
}

function normalizeRoutines(value: unknown): Routine[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((routine): routine is Partial<Routine> => Boolean(routine && typeof routine === "object"))
    .filter((routine) => typeof routine.name === "string" && isCategory(routine.category))
    .map((routine) => ({
      id: typeof routine.id === "string" ? routine.id : `routine-${routine.category}`,
      name: routine.name as string,
      frequency: isRoutineFrequency(routine.frequency) ? routine.frequency : "weekly",
      preferredDay: isWeekdayIndex(routine.preferredDay) ? routine.preferredDay : 1,
      preferredTime: isTimeValue(routine.preferredTime) ? routine.preferredTime : "10:00",
      effort: isEffortLevel(routine.effort) ? routine.effort : "medium",
      category: routine.category as Category,
      active: routine.active !== false,
      durationMinutes: isPositiveNumber(routine.durationMinutes) ? routine.durationMinutes : 60,
      priority: isPriority(routine.priority) ? routine.priority : "medium"
    }));
}

function normalizePlannedTasks(value: unknown): PlannedTask[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((task): task is Partial<PlannedTask> => Boolean(task && typeof task === "object"))
    .filter((task) =>
      typeof task.title === "string" &&
      isDateKey(task.date) &&
      isTimeValue(task.startTime) &&
      isTimeValue(task.endTime) &&
      isCategory(task.category)
    )
    .map((task) => ({
      id: typeof task.id === "string" ? task.id : `task-${task.category}-${task.date}-${task.startTime}`,
      sourceId: typeof task.sourceId === "string" ? task.sourceId : typeof task.id === "string" ? task.id : "legacy-task",
      sourceType: isSourceType(task.sourceType) ? task.sourceType : "routine",
      title: task.title as string,
      date: task.date as string,
      startTime: task.startTime as string,
      endTime: task.endTime as string,
      category: task.category as Category,
      notes: typeof task.notes === "string" ? task.notes : undefined,
      effort: isEffortLevel(task.effort) ? task.effort : "medium",
      lock: task.lock === "fixed" || task.lock === "flexible" ? task.lock : "flexible",
      priority: isPriority(task.priority) ? task.priority : "medium",
      explanation: typeof task.explanation === "string" ? task.explanation : undefined,
      timeWasDefaulted: Boolean(task.timeWasDefaulted),
      completed: Boolean(task.completed),
      missed: Boolean(task.missed)
    }));
}

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORY_IDS.has(value as Category);
}

function isSourceType(value: unknown): value is PlannedTask["sourceType"] {
  return typeof value === "string" && SOURCE_TYPES.has(value as PlannedTask["sourceType"]);
}

function isCapacityMode(value: unknown): value is CapacityMode {
  return typeof value === "string" && CAPACITY_MODES.has(value as CapacityMode);
}

function isEffortLevel(value: unknown): value is EffortLevel {
  return typeof value === "string" && EFFORT_LEVELS.has(value as EffortLevel);
}

function isPriority(value: unknown): value is PlanningPriority {
  return typeof value === "string" && PRIORITIES.has(value as PlanningPriority);
}

function isRoutineFrequency(value: unknown): value is Routine["frequency"] {
  return value === "daily" || value === "weekly" || value === "2x-weekly" || value === "3x-weekly" || value === "4x-weekly" || value === "custom";
}

function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeValue(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isWeekdayIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function appendNote(notes: string | undefined, note: string) {
  return notes?.includes(note) ? notes : [notes, note].filter(Boolean).join(" - ");
}

function currentMonthKey() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
