import type { PlannerState } from "../models/types";
import type { PlannerRepository } from "./PlannerRepository";

const STORAGE_KEY = "future-me:v1";
const LEGACY_STORAGE_KEY = "plan-my-month:v1";

export class LocalPlannerRepository implements PlannerRepository {
  async load(): Promise<PlannerState | null> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw) as PlannerState);

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
  return {
    ...state,
    plannedMonth: state.plannedMonth ?? sourceDate.slice(0, 7),
    setupComplete: state.setupComplete ?? false
  };
}
