import type { PlannerState } from "../models/types";

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");

export const seedState: PlannerState = {
  settings: {
    wakeTime: "07:00",
    bedTime: "22:30",
    notificationPersonality: "gentle"
  },
  capacity: "normal",
  plannedMonth: `${yyyy}-${mm}`,
  setupComplete: false,
  rules: {
    selected: [],
    custom: ""
  },
  monthlyInputs: [],
  routines: [],
  plannedTasks: []
};
