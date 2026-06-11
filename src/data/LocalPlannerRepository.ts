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
  async load(monthKey = currentMonthKey()): Promise<PlannerState | null> {
    const plans = loadPlans();
    if (plans[monthKey]) {
      const state = migrate(plans[monthKey]);
      await this.save(state);
      return state;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = migrate(JSON.parse(raw) as PlannerState);
      await this.save(state);
      return state.plannedMonth === monthKey ? state : null;
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return null;

    const state = migrate(JSON.parse(legacy) as PlannerState);
    await this.save(state);
    return state.plannedMonth === monthKey ? state : null;
  }

  async save(state: PlannerState): Promise<void> {
    const plans = loadPlans();
    plans[state.plannedMonth] = state;
    localStorage.setItem(MONTHLY_STORAGE_KEY, JSON.stringify(plans));
    localStorage.setItem(DAILY_TASK_STORAGE_KEY, JSON.stringify(mergeTasksByDate(state)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async clear(): Promise<void> {
    localStorage.removeItem(MONTHLY_STORAGE_KEY);
    localStorage.removeItem(DAILY_TASK_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

function mergeTasksByDate(state: PlannerState) {
  const existing = loadDailyTasks();
  Object.keys(existing)
    .filter((date) => date.startsWith(state.plannedMonth))
    .forEach((date) => delete existing[date]);

  return state.plannedTasks.reduce<Record<string, PlannerState["plannedTasks"]>>((byDate, task) => {
    byDate[task.date] = [...(byDate[task.date] ?? []), task];
    return byDate;
  }, existing);
}

function loadDailyTasks(): Record<string, PlannerState["plannedTasks"]> {
  const raw = localStorage.getItem(DAILY_TASK_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, PlannerState["plannedTasks"]>;
  } catch {
    return {};
  }
}

function loadPlans(): Record<string, PlannerState> {
  const raw = localStorage.getItem(MONTHLY_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, PlannerState>;
  } catch {
    return {};
  }
}

function migrate(state: PlannerState): PlannerState {
  const sourceDate = state.monthlyInputs[0]?.date ?? localDateKey(new Date());
  const hasDemoContent =
    state.monthlyInputs.some((input) => DEMO_INPUT_IDS.has(input.id)) ||
    state.routines.some((routine) => DEMO_ROUTINE_IDS.has(routine.id)) ||
    state.rules.custom === DEMO_CUSTOM_RULE;
  const monthlyInputs = state.monthlyInputs.filter((input) => !DEMO_INPUT_IDS.has(input.id));
  const routines = state.routines.filter((routine) => !DEMO_ROUTINE_IDS.has(routine.id));
  const plannedTasks = state.plannedTasks
    .filter((task) => {
      if (DEMO_INPUT_IDS.has(task.sourceId) || DEMO_ROUTINE_IDS.has(task.sourceId)) return false;
      if (task.sourceType === "prep" && DEMO_INPUT_IDS.has(task.sourceId)) return false;
      return true;
    })
    .map((task) => ({
      ...task,
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

function currentMonthKey() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
