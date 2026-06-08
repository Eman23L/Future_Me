import type {
  CapacityMode,
  EffortLevel,
  MonthlyInput,
  PlannedTask,
  PlannerState,
  Routine
} from "../models/types";

const effortRank: Record<EffortLevel, number> = { low: 1, medium: 2, high: 3 };
const capacityMaxEffort: Record<CapacityMode, EffortLevel> = {
  high: "high",
  normal: "high",
  tired: "medium",
  survival: "low"
};

const demandingLimit: Record<CapacityMode, number> = {
  high: 3,
  normal: 2,
  tired: 1,
  survival: 0
};

const routineDurations: Record<EffortLevel, number> = {
  low: 45,
  medium: 75,
  high: 90
};

export function generateMonthlyPlan(state: PlannerState): PlannedTask[] {
  const monthCursor = new Date(`${state.plannedMonth ?? isoToday().slice(0, 7)}-01T00:00:00`);
  monthCursor.setDate(1);
  const days = daysInMonth(monthCursor);
  const planned: PlannedTask[] = [];

  // Sleep is blocked first so every later placement can check against the user's protected rest window.
  for (let day = 1; day <= days; day += 1) {
    const date = isoDate(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day));
    planned.push({
      id: `sleep-${date}`,
      sourceId: "settings",
      sourceType: "sleep",
      title: "Sleep window",
      date,
      startTime: state.settings.bedTime,
      endTime: state.settings.wakeTime,
      category: "self-care",
      notes: "Protected sleep block",
      effort: "low",
      completed: false,
      missed: false
    });
  }

  // Fixed commitments are placed second and never moved by the V1 planner.
  state.monthlyInputs.filter((input) => input.date.startsWith(state.plannedMonth)).forEach((input) => {
    planned.push(toFixedTask(input));
  });

  addDeadlinePrepBlocks(state, planned);
  addRecoveryAfterShiftRuns(state, planned, monthCursor, days);
  addMealPrepBeforeWorkDays(state, planned);

  const eligibleRoutines = state.routines.filter((routine) => routine.active && allowedByCapacity(routine, state.capacity));
  eligibleRoutines.forEach((routine) => placeRoutineForMonth(routine, state, planned, monthCursor, days));

  return planned
    .map((task) => ({ ...task, missed: isMissed(task) }))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

function placeRoutineForMonth(
  routine: Routine,
  state: PlannerState,
  planned: PlannedTask[],
  monthCursor: Date,
  days: number
) {
  if (state.capacity === "survival" && routine.category !== "meal-prep" && routine.category !== "self-care") {
    return;
  }

  const weeklyCount = routine.frequency === "3x-weekly" ? 3 : routine.frequency === "2x-weekly" ? 2 : 1;
  if (routine.frequency === "daily") {
    for (let day = 1; day <= days; day += 1) {
      tryPlaceRoutine(routine, state, planned, new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day));
    }
    return;
  }

  for (let day = 1; day <= days; day += 7) {
    for (let instance = 0; instance < weeklyCount; instance += 1) {
      const preferred = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
      preferred.setDate(preferred.getDate() + ((routine.preferredDay + instance * 2 - preferred.getDay() + 7) % 7));
      if (preferred.getMonth() === monthCursor.getMonth()) {
        tryPlaceRoutine(routine, state, planned, preferred);
      }
    }
  }
}

function tryPlaceRoutine(routine: Routine, state: PlannerState, planned: PlannedTask[], day: Date) {
  const date = isoDate(day);
  const duration = routineDurations[routine.effort];
  const candidateTimes = candidateSlots(routine.preferredTime, state.settings.wakeTime, state.settings.bedTime);

  for (const startTime of candidateTimes) {
    const endTime = addMinutes(startTime, duration);
    if (!insideAwakeWindow(startTime, endTime, state.settings.wakeTime, state.settings.bedTime)) continue;
    if (isSundayEveningProtected(state, day, startTime)) continue;
    if (violatesStudyCutoff(state, routine, startTime)) continue;
    if (violatesLongShiftGymRule(state, planned, date, routine)) continue;
    if (overlaps(planned, date, startTime, endTime)) continue;
    if (demandingTasksForDate(planned, date) >= demandingLimit[state.capacity] && effortRank[routine.effort] > 1) continue;

    planned.push({
      id: `routine-${routine.id}-${date}-${startTime}`,
      sourceId: routine.id,
      sourceType: "routine",
      title: routine.name,
      date,
      startTime,
      endTime,
      category: routine.category,
      notes: "Auto-planned routine",
      effort: routine.effort,
      completed: false,
      missed: false
    });
    return;
  }
}

function addRecoveryAfterShiftRuns(state: PlannerState, planned: PlannedTask[], monthCursor: Date, days: number) {
  if (!state.rules.selected.includes("recovery-after-3-shifts")) return;

  let consecutive = 0;
  for (let day = 1; day <= days; day += 1) {
    const date = isoDate(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day));
    const hasShift = state.monthlyInputs.some((input) => input.category === "work" && input.date === date);
    consecutive = hasShift ? consecutive + 1 : 0;

    if (consecutive === 3) {
      const recoveryDate = isoDate(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day + 1));
      if (!state.monthlyInputs.some((input) => input.date === recoveryDate && input.category === "work")) {
        planned.push({
          id: `recovery-${recoveryDate}`,
          sourceId: "recovery-after-3-shifts",
          sourceType: "recovery",
          title: "Recovery block",
          date: recoveryDate,
          startTime: "10:00",
          endTime: "12:00",
          category: "recovery",
          notes: "Added after 3 consecutive work shifts",
          effort: "low",
          completed: false,
          missed: false
        });
      }
    }
  }
}

function addMealPrepBeforeWorkDays(state: PlannerState, planned: PlannedTask[]) {
  if (!state.rules.selected.includes("meal-prep-before-work")) return;

  state.monthlyInputs
    .filter((input) => input.category === "work")
    .forEach((work) => {
      const previous = new Date(`${work.date}T00:00:00`);
      previous.setDate(previous.getDate() - 1);
      const date = isoDate(previous);
      if (overlaps(planned, date, "18:00", "18:45")) return;
      planned.push({
        id: `prep-${work.id}`,
        sourceId: work.id,
        sourceType: "prep",
        title: "Prep for work day",
        date,
        startTime: "18:00",
        endTime: "18:45",
        category: "meal-prep",
        notes: "Food, bag, clothes, transport check",
        effort: "low",
        completed: false,
        missed: false
      });
    });
}

function addDeadlinePrepBlocks(state: PlannerState, planned: PlannedTask[]) {
  const blockCount: Record<CapacityMode, number> = {
    high: 3,
    normal: 2,
    tired: 1,
    survival: 0
  };

  state.monthlyInputs
    .filter((input) => input.category === "deadline" && input.date.startsWith(state.plannedMonth))
    .forEach((deadline) => {
      for (let index = 1; index <= blockCount[state.capacity]; index += 1) {
        const dateCursor = new Date(`${deadline.date}T00:00:00`);
        dateCursor.setDate(dateCursor.getDate() - index * 2);
        const date = isoDate(dateCursor);
        if (!date.startsWith(state.plannedMonth)) continue;

        const startTime = state.capacity === "tired" ? "16:00" : "14:00";
        const endTime = addMinutes(startTime, state.capacity === "high" ? 120 : 90);
        if (overlaps(planned, date, startTime, endTime)) continue;

        planned.push({
          id: `prep-${deadline.id}-${index}`,
          sourceId: deadline.id,
          sourceType: "prep",
          title: `Prepare: ${deadline.title}`,
          date,
          startTime,
          endTime,
          category: "study",
          notes: state.capacity === "tired" ? "Lighter preparation block before the deadline" : "Auto-planned preparation block",
          effort: state.capacity === "tired" ? "medium" : "high",
          completed: false,
          missed: false
        });
      }
    });
}

function toFixedTask(input: MonthlyInput): PlannedTask {
  return {
    id: `fixed-${input.id}`,
    sourceId: input.id,
    sourceType: "fixed",
    title: input.title,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime ?? addMinutes(input.startTime, 60),
    category: input.category,
    notes: input.notes,
    effort: input.category === "work" || input.category === "deadline" ? "high" : "medium",
    completed: false,
    missed: false
  };
}

function allowedByCapacity(routine: Routine, capacity: CapacityMode) {
  return effortRank[routine.effort] <= effortRank[capacityMaxEffort[capacity]];
}

function candidateSlots(preferred: string, wake: string, bed: string) {
  return unique([
    preferred,
    addMinutes(preferred, -60),
    addMinutes(preferred, 60),
    "09:00",
    "11:00",
    "14:00",
    "17:00",
    addMinutes(wake, 60),
    addMinutes(bed, -120)
  ]);
}

function insideAwakeWindow(start: string, end: string, wake: string, bed: string) {
  return toMinutes(start) >= toMinutes(wake) && toMinutes(end) <= toMinutes(bed);
}

function isSundayEveningProtected(state: PlannerState, day: Date, startTime: string) {
  return (
    state.rules.selected.includes("protect-sunday-evenings") &&
    day.getDay() === 0 &&
    toMinutes(startTime) >= toMinutes("17:00")
  );
}

function violatesStudyCutoff(state: PlannerState, routine: Routine, startTime: string) {
  return (
    state.rules.selected.includes("no-study-after-8") &&
    routine.category === "study" &&
    toMinutes(startTime) >= toMinutes("20:00")
  );
}

function violatesLongShiftGymRule(state: PlannerState, planned: PlannedTask[], date: string, routine: Routine) {
  if (!state.rules.selected.includes("never-gym-after-long-shift") || routine.category !== "gym") return false;
  return planned.some((task) => task.date === date && task.category === "work" && minutesBetween(task.startTime, task.endTime) >= 12 * 60);
}

function demandingTasksForDate(planned: PlannedTask[], date: string) {
  return planned.filter((task) => task.date === date && effortRank[task.effort] > 1).length;
}

function overlaps(tasks: PlannedTask[], date: string, start: string, end: string) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return tasks
    .filter((task) => task.date === date && task.sourceType !== "sleep")
    .some((task) => startMinutes < toMinutes(task.endTime) && endMinutes > toMinutes(task.startTime));
}

function isMissed(task: PlannedTask) {
  const now = new Date();
  const taskEnd = new Date(`${task.date}T${task.endTime}`);
  return !task.completed && task.sourceType !== "sleep" && taskEnd < now;
}

function addMinutes(time: string, minutes: number) {
  const total = (toMinutes(time) + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function minutesBetween(start: string, end: string) {
  const diff = toMinutes(end) - toMinutes(start);
  return diff >= 0 ? diff : diff + 1440;
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isoToday() {
  return isoDate(new Date());
}

function unique(items: string[]) {
  return [...new Set(items)];
}
