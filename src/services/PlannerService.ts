import { LocalPlannerRepository } from "../data/LocalPlannerRepository";
import type { PlannerRepository } from "../data/PlannerRepository";
import { seedState } from "../data/seed";
import { generateMonthlyPlan } from "../planner/autoPlanner";
import type { PlannerState, PlannedTask } from "../models/types";

export class PlannerService {
  constructor(private repository: PlannerRepository = new LocalPlannerRepository()) {}

  async load(): Promise<PlannerState> {
    return (await this.repository.load()) ?? seedState;
  }

  async save(state: PlannerState): Promise<void> {
    await this.repository.save(state);
  }

  async generate(state: PlannerState): Promise<PlannerState> {
    const existingById = new Map(state.plannedTasks.map((task) => [task.id, task]));
    const plannedTasks = generateMonthlyPlan(state).map((task) => {
      const existing = existingById.get(task.id);
      return existing ? { ...task, completed: existing.completed } : task;
    });
    const next = { ...state, plannedTasks };
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
