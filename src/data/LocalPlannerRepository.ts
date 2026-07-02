import type { PlannerState } from "../models/types";
import type { PlannerRepository } from "./PlannerRepository";

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
    return JSON.parse(raw) as Record<string, PlannerState["plannedTasks"]>;
  } catch {
    return {};
  }
}

function loadPlans(storageNamespace = ""): Record<string, PlannerState> {
  const raw = localStorage.getItem(storageKey(MONTHLY_STORAGE_KEY, storageNamespace));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, PlannerState>;
  } catch {
    return {};
  }
}

function storageKey(baseKey: string, storageNamespace = "") {
  return storageNamespace ? `${storageNamespace}:${baseKey}` : baseKey;
}

function migrate(state: PlannerState): PlannerState {
  const sourceDate = state.monthlyInputs[0]?.date ?? localDateKey(new Date());
  const hasDemoContent =
    state.monthlyInputs.some((input) => DEMO_INPUT_IDS.has(input.id)) ||
    state.routines.some((routine) => DEMO_ROUTINE_IDS.has(routine.id)) ||
    state.rules.custom === DEMO_CUSTOM_RULE;
  const monthlyInputs = state.monthlyInputs
    .filter((input) => !DEMO_INPUT_IDS.has(input.id))
    .map((input) => {
      const oldFakeTime = input.startTime === "23:59";
      if (!oldFakeTime) return input;
      if (input.category === "social") return { ...input, startTime: "18:00", endTime: "20:00", timeWasDefaulted: true, notes: appendNote(input.notes, "Time estimated") };
      if (input.category === "appointment") return { ...input, startTime: "12:00", endTime: input.endTime ?? "13:00", timeWasDefaulted: true, notes: appendNote(input.notes, "Time estimated") };
      if (input.category === "deadline") return { ...input, startTime: "09:00", endTime: "09:30", timeWasDefaulted: true, notes: appendNote(input.notes, "Due time not set.") };
      return input;
    });
  const routines = state.routines.filter((routine) => !DEMO_ROUTINE_IDS.has(routine.id));
  const plannedTasks = state.plannedTasks
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
      ? state.rules.selected.filter((rule) => !DEMO_RULE_IDS.has(rule))
      : state.rules.selected,
    custom: state.rules.custom === DEMO_CUSTOM_RULE ? "" : state.rules.custom
  };

  return {
    ...state,
    monthlyInputs,
    routines,
    rules,
    plannedTasks,
    capacityChecks: state.capacityChecks ?? [],
    plannedMonth: state.plannedMonth ?? sourceDate.slice(0, 7),
    setupComplete: state.setupComplete ?? false,
    explanations: state.explanations ?? []
  };
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
