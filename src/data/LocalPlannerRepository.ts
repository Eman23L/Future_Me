import type { PlannerState } from "../models/types";
import type { PlannerRepository } from "./PlannerRepository";

const STORAGE_KEY = "future-me:v1";
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
  async load(): Promise<PlannerState | null> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = migrate(JSON.parse(raw) as PlannerState);
      await this.save(state);
      return state;
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return null;

    const state = migrate(JSON.parse(legacy) as PlannerState);
    await this.save(state);
    return state;
  }

  async save(state: PlannerState): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

function migrate(state: PlannerState): PlannerState {
  const sourceDate = state.monthlyInputs[0]?.date ?? new Date().toISOString().slice(0, 10);
  const hasDemoContent =
    state.monthlyInputs.some((input) => DEMO_INPUT_IDS.has(input.id)) ||
    state.routines.some((routine) => DEMO_ROUTINE_IDS.has(routine.id)) ||
    state.rules.custom === DEMO_CUSTOM_RULE;
  const monthlyInputs = state.monthlyInputs.filter((input) => !DEMO_INPUT_IDS.has(input.id));
  const routines = state.routines.filter((routine) => !DEMO_ROUTINE_IDS.has(routine.id));
  const plannedTasks = state.plannedTasks.filter((task) => {
    if (DEMO_INPUT_IDS.has(task.sourceId) || DEMO_ROUTINE_IDS.has(task.sourceId)) return false;
    if (task.sourceType === "prep" && DEMO_INPUT_IDS.has(task.sourceId)) return false;
    return true;
  });
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
    plannedMonth: state.plannedMonth ?? sourceDate.slice(0, 7),
    setupComplete: state.setupComplete ?? false
  };
}
