import { LocalPlannerRepository } from "../data/LocalPlannerRepository";
import type { PlannerRepository } from "../data/PlannerRepository";
import { createSeedState } from "../data/seed";
import { generateMonthlyPlan } from "../planner/autoPlanner";
import type { PlannerState, PlannedTask } from "../models/types";

export class PlannerService {
  constructor(private repository: PlannerRepository = new LocalPlannerRepository()) {}

  async load(monthKey?: string): Promise<PlannerState> {
    const requestedMonth = monthKey ?? currentMonthKey();
    return (await this.repository.load(requestedMonth)) ?? createSeedState(requestedMonth);
  }

  async save(state: PlannerState): Promise<void> {
    await this.repository.save(state);
  }

  async generate(state: PlannerState): Promise<PlannerState> {
    const existingById = new Map(state.plannedTasks.map((task) => [task.id, task]));
    const generated = generateMonthlyPlan(state);
    const plannedTasks = generated.tasks.map((task) => {
      const existing = existingById.get(task.id);
      return existing ? { ...task, completed: existing.completed } : task;
    });
    const next = { ...state, plannedTasks, explanations: generated.explanations };
    await this.save(next);
    return next;
  }

  async updateTask(state: PlannerState, taskId: string, patch: Partial<PlannedTask>): Promise<PlannerState> {
    const plannedTasks = state.plannedTasks.map((task) =>
      task.id === taskId ? { ...task, ...patch } : task
    );
    const next = { ...state, plannedTasks };
    await this.save(next);
    return next;
  }
}

function currentMonthKey() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}
