export type NotificationPersonality =
  | "bestie"
  | "gentle"
  | "coach"
  | "professional"
  | "chaos";

export type CapacityMode = "high" | "normal" | "tired" | "survival";
export type EffortLevel = "low" | "medium" | "high";

export type Category =
  | "work"
  | "social"
  | "deadline"
  | "gym"
  | "cleaning"
  | "meal-prep"
  | "food-shop"
  | "self-care"
  | "study"
  | "appointment"
  | "recovery"
  | "custom";

export interface UserSettings {
  wakeTime: string;
  bedTime: string;
  notificationPersonality: NotificationPersonality;
}

export interface MonthlyInput {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  category: Category;
  notes?: string;
}

export type RoutineFrequency =
  | "daily"
  | "weekly"
  | "2x-weekly"
  | "3x-weekly"
  | "custom";

export interface Routine {
  id: string;
  name: string;
  frequency: RoutineFrequency;
  preferredDay: number;
  preferredTime: string;
  effort: EffortLevel;
  category: Category;
  active: boolean;
}

export type PresetRule =
  | "never-gym-after-long-shift"
  | "no-study-after-8"
  | "protect-sunday-evenings"
  | "recovery-after-3-shifts"
  | "meal-prep-before-work"
  | "avoid-more-than-2-demanding"
  | "no-high-effort-after-long-shifts"
  | "one-lighter-evening";

export interface PlanningRules {
  selected: PresetRule[];
  custom: string;
}

export interface PlannedTask {
  id: string;
  sourceId: string;
  sourceType: "sleep" | "fixed" | "routine" | "recovery" | "prep";
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: Category;
  notes?: string;
  effort: EffortLevel;
  completed: boolean;
  missed: boolean;
}

export interface PlannerState {
  settings: UserSettings;
  monthlyInputs: MonthlyInput[];
  routines: Routine[];
  rules: PlanningRules;
  capacity: CapacityMode;
  plannedMonth: string;
  setupComplete: boolean;
  plannedTasks: PlannedTask[];
}

export const categoryLabels: Record<Category, string> = {
  work: "Work",
  social: "Social",
  deadline: "Deadline",
  gym: "Gym",
  cleaning: "Cleaning",
  "meal-prep": "Meal prep",
  "food-shop": "Food shop",
  "self-care": "Self-care",
  study: "Study",
  appointment: "Appointment",
  recovery: "Recovery",
  custom: "Custom"
};
