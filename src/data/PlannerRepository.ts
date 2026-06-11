import type { PlannerState } from "../models/types";

export interface PlannerRepository {
  load(monthKey?: string): Promise<PlannerState | null>;
  save(state: PlannerState): Promise<void>;
  clear(): Promise<void>;
}
