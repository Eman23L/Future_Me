import type { PlannerState } from "../models/types";

export function createSeedState(monthKey = currentMonthKey()): PlannerState {
  return {
    settings: {
      wakeTime: "07:00",
      bedTime: "22:30",
      notificationPersonality: "gentle"
    },
    capacity: "normal",
    capacityChecks: [],
    plannedMonth: monthKey,
    setupComplete: false,
    explanations: [],
    rules: {
      selected: [],
      custom: ""
    },
    monthlyInputs: [],
    routines: [],
    plannedTasks: []
  };
}

export const seedState: PlannerState = createSeedState();

function currentMonthKey() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}
