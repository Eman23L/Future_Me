import type { PlannerState } from "../models/types";

export interface PlannerRepository {
  load(): Promise<PlannerState | null>;
  save(state: PlannerState): Promise<void>;
  clear(): Promise<void>;
}
