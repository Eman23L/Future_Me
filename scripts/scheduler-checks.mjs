import { generateMonthlyPlan } from "../build-src/planner/autoPlanner.js";

const capacities = ["high", "normal", "tired", "survival"];
const expected = {
  high: { gym: 3, cleaning: 2, "meal-prep": 3, "food-shop": 2, "self-care": 4 },
  normal: { gym: 2, cleaning: 1, "meal-prep": 2, "food-shop": 2, "self-care": 4 },
  tired: { gym: 1, cleaning: 1, "meal-prep": 1, "food-shop": 1, "self-care": 5 },
  survival: { gym: 0, cleaning: 0, "meal-prep": 1, "food-shop": 0, "self-care": 5 }
};

for (const capacity of capacities) {
  const state = createState(capacity);
  const plan = generateMonthlyPlan(state);
  const weekTasks = plan.tasks.filter((task) => task.date >= "2026-06-01" && task.date <= "2026-06-07" && task.sourceType === "routine");

  for (const [category, count] of Object.entries(expected[capacity])) {
    assert(
      weekTasks.filter((task) => task.category === category).length === count,
      `${capacity}: expected ${count} ${category} tasks in first week`
    );
  }

  weekTasks.forEach((task) => {
    const start = minutes(task.startTime);
    const end = minutes(task.endTime);
    assert(start >= minutes(state.settings.wakeTime), `${capacity}: ${task.title} starts before wake time`);
    assert(end <= minutes(state.settings.bedTime), `${capacity}: ${task.title} ends after bedtime`);

    if (task.category === "gym") assert(start >= minutes("08:00") && start <= minutes("12:00"), `${capacity}: gym outside morning window`);
    if (task.category === "food-shop") assert(start >= minutes("10:00") && start <= minutes("18:00"), `${capacity}: food shop outside realistic window`);
    if (task.category === "meal-prep") assert(start >= minutes("13:00") && start <= minutes("19:00"), `${capacity}: meal prep outside afternoon window`);
    if (task.category === "cleaning") assert(start >= minutes("09:00") && start <= minutes("16:00"), `${capacity}: cleaning outside daytime window`);
    if (task.category === "self-care") assert(start >= minutes("10:00") && start <= minutes("22:00"), `${capacity}: self-care outside care window`);
  });

  assertNoClashes(plan.tasks);
}

console.log("Scheduler checks passed.");

function createState(capacity) {
  return {
    settings: {
      wakeTime: "07:00",
      bedTime: "22:30",
      notificationPersonality: "gentle"
    },
    monthlyInputs: [
      fixed("work-1", "Work shift", "2026-06-08", "07:30", "20:30", "work"),
      fixed("appointment-1", "Doctor", "2026-06-10", "14:00", "15:00", "appointment"),
      fixed("deadline-1", "Assignment due", "2026-06-12", "10:00", "10:30", "deadline"),
      fixed("social-1", "Dinner", "2026-06-13", "18:00", "20:00", "social")
    ],
    routines: [
      routine("routine-gym", "Gym routine", "gym", "high", 60, "09:00"),
      routine("routine-cleaning", "Cleaning", "cleaning", "medium", 60, "10:00"),
      routine("routine-meal-prep", "Meal prep", "meal-prep", "medium", 60, "15:00"),
      routine("routine-food-shop", "Food shop", "food-shop", "medium", 60, "14:00"),
      routine("routine-self-care", "Self-care", "self-care", "low", 60, "20:00")
    ],
    rules: {
      selected: ["never-gym-after-long-shift"],
      custom: ""
    },
    capacity,
    capacityChecks: [],
    plannedMonth: "2026-06",
    setupComplete: true,
    explanations: [],
    plannedTasks: []
  };
}

function fixed(id, title, date, startTime, endTime, category) {
  return {
    id,
    title,
    date,
    startTime,
    endTime,
    category,
    fixed: true,
    effort: category === "work" || category === "deadline" ? "high" : "medium",
    priority: "essential"
  };
}

function routine(id, name, category, effort, durationMinutes, preferredTime) {
  return {
    id,
    name,
    category,
    effort,
    durationMinutes,
    preferredTime,
    preferredDay: 1,
    active: true,
    frequency: "weekly",
    priority: category === "meal-prep" || category === "food-shop" || category === "self-care" ? "high" : "medium"
  };
}

function assertNoClashes(tasks) {
  const visible = tasks.filter((task) => task.sourceType !== "sleep");
  for (const task of visible) {
    const clashes = visible.filter((other) =>
      other.id !== task.id &&
      other.date === task.date &&
      minutes(task.startTime) < minutes(other.endTime) &&
      minutes(task.endTime) > minutes(other.startTime)
    );
    assert(clashes.length === 0, `${task.title} clashes on ${task.date}`);
  }
}

function minutes(time) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
