import type {
  CapacityMode,
  EffortLevel,
  Explanation,
  FixedEvent,
  FlexibleTask,
  GeneratedSchedule,
  MonthlyInput,
  PlannedTask,
  PlannerState,
  Routine
} from "../models/types";

const effortRank: Record<EffortLevel, number> = { low: 1, medium: 2, high: 3 };
const routineDurations: Record<EffortLevel, number> = { low: 35, medium: 60, high: 80 };
const demandingLimit: Record<CapacityMode, number> = {
  high: 3,
  normal: 2,
  tired: 1,
  survival: 0
};

export function generateMonthlyPlan(state: PlannerState): GeneratedSchedule {
  const monthCursor = new Date(`${state.plannedMonth ?? isoToday().slice(0, 7)}-01T00:00:00`);
  const days = daysInMonth(monthCursor);
  const explanations: Explanation[] = [];
  const fixedEvents = buildFixedEvents(state, monthCursor, days);
  const planned = fixedEvents.map(toLockedTask);

  const planningRange = monthPlanningRange(monthCursor, days);
  const flexibleTasks = buildFlexibleTasks(state);

  addDeadlinePrepBlocks(state, planned, explanations, planningRange);
  addRecoveryBlocks(state, planned, explanations, monthCursor, days, planningRange);
  addMealPrepBeforeWorkHeavyDays(state, planned, explanations, planningRange);
  placeFlexibleTasks(state, flexibleTasks, planned, explanations, planningRange);

  explanations.unshift({
    id: "monthly-fixed-baseline",
    message: "Fixed monthly commitments were locked first. Flexible routines were then placed across the month."
  });
  explanations.unshift({
    id: `monthly-capacity-${planningRange.start}`,
    date: planningRange.start,
    message: `${capacityLabel(state.capacity)} mode was used to place flexible tasks around fixed commitments for the month.`
  });

  return {
    tasks: planned
      .map((task) => ({ ...task, missed: isMissed(task) }))
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    explanations
  };
}

function buildFixedEvents(state: PlannerState, monthCursor: Date, days: number): FixedEvent[] {
  const fixedEvents: FixedEvent[] = [];

  for (let day = 1; day <= days; day += 1) {
    const date = isoDate(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day));
    fixedEvents.push({
      id: `sleep-${date}`,
      title: "Sleep window",
      date,
      startTime: state.settings.bedTime,
      endTime: state.settings.wakeTime,
      category: "self-care",
      effort: "low",
      priority: "essential",
      lock: "fixed",
      notes: "Protected sleep block"
    });
  }

  state.monthlyInputs
    .filter((input) => input.date.startsWith(state.plannedMonth))
    .forEach((input) => fixedEvents.push(toFixedEvent(input)));

  return fixedEvents;
}

function toFixedEvent(input: MonthlyInput): FixedEvent {
  return {
    id: input.id,
    title: input.title,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime ?? addMinutes(input.startTime, 60),
    category: input.category,
    notes: input.notes,
    effort: input.effort ?? (input.category === "work" || input.category === "deadline" ? "high" : "medium"),
    priority: input.priority ?? "essential",
    lock: "fixed"
  };
}

function buildFlexibleTasks(state: PlannerState): FlexibleTask[] {
  return state.routines.map((routine) => toFlexibleTask(routine));
}

function toFlexibleTask(routine: Routine): FlexibleTask {
  return {
    id: routine.id,
    title: routine.name,
    category: routine.category,
    preferredDay: routine.preferredDay,
    preferredTime: routine.preferredTime,
    frequency: routine.frequency,
    effort: routine.effort,
    durationMinutes: routine.durationMinutes,
    priority: routine.priority ?? (routine.category === "self-care" || routine.category === "food-shop" ? "high" : "medium"),
    lock: "flexible",
    active: routine.active
  };
}

function toLockedTask(event: FixedEvent): PlannedTask {
  return {
    id: event.id.startsWith("sleep-") ? event.id : `fixed-${event.id}`,
    sourceId: event.id,
    sourceType: event.id.startsWith("sleep-") ? "sleep" : "fixed",
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    category: event.category,
    notes: event.notes,
    effort: event.effort,
    lock: "fixed",
    priority: event.priority,
    explanation: "Fixed commitment locked during monthly setup.",
    completed: false,
    missed: false
  };
}

function addDeadlinePrepBlocks(
  state: PlannerState,
  planned: PlannedTask[],
  explanations: Explanation[],
  week: { start: string; end: string }
) {
  const blockCount: Record<CapacityMode, number> = { high: 3, normal: 2, tired: 1, survival: 0 };

  state.monthlyInputs
    .filter((input) => input.category === "deadline" && input.date.startsWith(state.plannedMonth))
    .forEach((deadline) => {
      for (let index = 1; index <= blockCount[state.capacity]; index += 1) {
        const cursor = new Date(`${deadline.date}T00:00:00`);
        cursor.setDate(cursor.getDate() - index * 2);
        const date = isoDate(cursor);
        if (!inRange(date, week.start, week.end)) continue;

        const startTime = state.capacity === "tired" ? "16:00" : "14:00";
        const duration = state.capacity === "high" ? 120 : 80;
        const endTime = addMinutes(startTime, duration);
        if (!canPlace({ state, planned, date, startTime, endTime, category: "study", effort: state.capacity === "tired" ? "medium" : "high" })) {
          explanations.push({
            id: `deadline-prep-skipped-${deadline.id}-${index}`,
            date,
            message: `Study prep for ${deadline.title} was not placed because no rule-safe slot was available.`
          });
          continue;
        }

        const taskId = `prep-${deadline.id}-${index}`;
        planned.push({
          id: taskId,
          sourceId: deadline.id,
          sourceType: "prep",
          title: `Prepare: ${deadline.title}`,
          date,
          startTime,
          endTime,
          category: "study",
          notes: "Flexible deadline preparation block",
          effort: state.capacity === "tired" ? "medium" : "high",
          lock: "flexible",
          priority: "high",
          explanation: `Placed before ${deadline.title} while respecting weekly capacity and hard rules.`,
          completed: false,
          missed: false
        });
        explanations.push({
          id: `deadline-prep-${deadline.id}-${index}`,
          taskId,
          date,
          message: `Study prep was scheduled before ${deadline.title} because deadlines are fixed but preparation is flexible.`
        });
      }
    });
}

function addRecoveryBlocks(
  state: PlannerState,
  planned: PlannedTask[],
  explanations: Explanation[],
  monthCursor: Date,
  days: number,
  week: { start: string; end: string }
) {
  for (let day = 1; day <= days; day += 1) {
    const date = isoDate(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day));
    const previousTwo = [offsetDate(date, -1), offsetDate(date, -2)];
    const recentShifts = [date, ...previousTwo].filter((item) => workOnDate(planned, item)).length;
    const lateYesterday = hasLateShift(planned, offsetDate(date, -1));
    const shouldRecover =
      (state.rules.selected.includes("recovery-after-3-shifts") && recentShifts >= 3) ||
      lateYesterday ||
      (state.capacity === "tired" && workOnDate(planned, offsetDate(date, -1)));

    if (!shouldRecover || !inRange(date, week.start, week.end)) continue;
    if (overlaps(planned, date, "09:30", "10:30")) continue;

    const taskId = `recovery-${date}`;
    planned.push({
      id: taskId,
      sourceId: "weekly-rules-engine",
      sourceType: "recovery",
      title: "Recovery time",
      date,
      startTime: "09:30",
      endTime: "10:30",
      category: "recovery",
      notes: "Added by weekly planner",
      effort: "low",
      lock: "flexible",
      priority: "high",
      explanation: lateYesterday ? "Added after a late shift." : "Added after a run of work shifts.",
      completed: false,
      missed: false
    });
    explanations.push({
      id: `recovery-${date}`,
      taskId,
      date,
      message: lateYesterday
        ? "Recovery time was added because the previous day had a late shift."
        : "Recovery time was added after multiple work shifts."
    });
  }
}

function addMealPrepBeforeWorkHeavyDays(
  state: PlannerState,
  planned: PlannedTask[],
  explanations: Explanation[],
  week: { start: string; end: string }
) {
  const workDates = unique(planned.filter((task) => task.category === "work").map((task) => task.date));
  workDates.forEach((workDate) => {
    const previous = offsetDate(workDate, -1);
    if (!inRange(previous, week.start, week.end)) return;
    if (!state.rules.selected.includes("meal-prep-before-work") && state.capacity !== "survival") return;
    if (overlaps(planned, previous, "18:00", "18:45")) return;

    const taskId = `meal-prep-before-${workDate}`;
    planned.push({
      id: taskId,
      sourceId: workDate,
      sourceType: "prep",
      title: "Prep for work day",
      date: previous,
      startTime: "18:00",
      endTime: "18:45",
      category: "meal-prep",
      notes: "Food, bag, clothes, transport check",
      effort: "low",
      lock: "flexible",
      priority: state.capacity === "survival" ? "essential" : "high",
      explanation: "Added before a work day.",
      completed: false,
      missed: false
    });
    explanations.push({
      id: taskId,
      taskId,
      date: previous,
      message: "Meal prep was added before a work day so the fixed shift stays easier to manage."
    });
  });
}

function placeFlexibleTasks(
  state: PlannerState,
  flexibleTasks: FlexibleTask[],
  planned: PlannedTask[],
  explanations: Explanation[],
  range: { start: string; end: string }
) {
  const weeks = weeksInRange(range.start, range.end);

  flexibleTasks
    .filter((task) => task.active)
    .forEach((task) => {
      weeks.forEach((week) => {
        const targetCount = targetWeeklyCount(task, state.capacity);
        if (targetCount === 0) {
          explanations.push({
            id: `paused-${task.id}-${week.start}`,
            message: `${task.title} was reduced this week because ${capacityLabel(state.capacity)} mode prioritises essentials and recovery.`
          });
          return;
        }

        const candidateDays = rankedWeekDays(task, week, planned);
        let placed = 0;
        for (const date of candidateDays) {
          if (placed >= targetCount) break;
          if (!inRange(date, range.start, range.end)) continue;
          if (task.frequency !== "daily" && planned.some((item) => item.sourceId === task.id && item.date === date)) continue;

          const placedTask = tryPlaceFlexibleTask(state, task, planned, date);
          if (placedTask) {
            planned.push(placedTask);
            explanations.push({
              id: `${placedTask.id}-explanation`,
              taskId: placedTask.id,
              date,
              message: placedTask.explanation ?? `${task.title} was placed in the best available rule-safe slot.`
            });
            placed += 1;
          }
        }

        if (placed < targetCount) {
          explanations.push({
            id: `shortfall-${task.id}-${week.start}`,
            message: `${task.title} was only scheduled ${placed}/${targetCount} times this week because fixed commitments and hard rules limited safe slots.`
          });
        }
      });
    });
}

function tryPlaceFlexibleTask(state: PlannerState, task: FlexibleTask, planned: PlannedTask[], date: string): PlannedTask | null {
  const duration = adjustedDuration(task.effort, state.capacity, task.durationMinutes);
  const candidateTimes = candidateSlots(task.preferredTime, state.settings.wakeTime, state.settings.bedTime);
  const day = new Date(`${date}T12:00:00`);

  for (const startTime of candidateTimes) {
    const endTime = addMinutes(startTime, duration);
    if (!canPlace({ state, planned, date, startTime, endTime, category: task.category, effort: task.effort })) continue;
    const explanation = explainPlacement(task, date, planned, state, day);

    return {
      id: `routine-${task.id}-${date}-${startTime}`,
      sourceId: task.id,
      sourceType: "routine",
      title: task.title,
      date,
      startTime,
      endTime,
      category: task.category,
      notes: "Placed by weekly rules engine",
      effort: state.capacity === "tired" && task.effort === "high" ? "medium" : task.effort,
      lock: "flexible",
      priority: task.priority,
      explanation,
      completed: false,
      missed: false
    };
  }

  return null;
}

function canPlace({
  state,
  planned,
  date,
  startTime,
  endTime,
  category,
  effort
}: {
  state: PlannerState;
  planned: PlannedTask[];
  date: string;
  startTime: string;
  endTime: string;
  category: PlannedTask["category"];
  effort: EffortLevel;
}) {
  const day = new Date(`${date}T12:00:00`);
  if (!insideAwakeWindow(startTime, endTime, state.settings.wakeTime, state.settings.bedTime)) return false;
  if (overlaps(planned, date, startTime, endTime)) return false;
  if (isSundayEveningProtected(state, day, startTime)) return false;
  if (violatesStudyCutoff(state, category, startTime)) return false;
  if (violatesLongShiftGymRule(state, planned, date, category)) return false;
  if (violatesMorningAfterLateShift(planned, date, startTime, category)) return false;
  if (violatesDemandingLimit(state, planned, date, effort)) return false;
  if (state.rules.selected.includes("no-high-effort-after-long-shifts") && effort === "high" && workOnDate(planned, date)) return false;
  return true;
}

function targetWeeklyCount(task: FlexibleTask, capacity: CapacityMode) {
  if (capacity === "survival") {
    return task.priority === "essential" || task.category === "self-care" || task.category === "food-shop" || task.category === "meal-prep" ? 1 : 0;
  }

  const base = task.frequency === "daily"
    ? 7
    : task.frequency === "3x-weekly"
      ? 3
      : task.frequency === "4x-weekly"
        ? 4
        : task.frequency === "2x-weekly"
          ? 2
          : 1;

  if (capacity === "tired") {
    if (task.category === "gym") return Math.max(1, Math.min(base - 1, 2));
    if (task.effort === "high") return Math.max(1, base - 1);
    return Math.max(1, Math.min(base, 3));
  }

  if (capacity === "high" && task.frequency !== "daily") return Math.min(base + 1, 5);
  return base;
}

function rankedWeekDays(task: FlexibleTask, week: { start: string; end: string }, planned: PlannedTask[]) {
  const days = daysBetween(week.start, week.end);
  if (task.frequency === "daily") return days;

  return [...days].sort((a, b) => {
    const aScore = dayScore(task, a, planned);
    const bScore = dayScore(task, b, planned);
    return bScore - aScore;
  });
}

function dayScore(task: FlexibleTask, date: string, planned: PlannedTask[]) {
  const day = new Date(`${date}T12:00:00`);
  let score = day.getDay() === task.preferredDay ? 8 : 4;
  if (workOnDate(planned, date)) score -= task.effort === "high" ? 6 : 2;
  if (hasLateShift(planned, offsetDate(date, -1))) score -= task.category === "gym" ? 8 : 3;
  score -= demandingTasksForDate(planned, date) * 2;
  return score;
}

function explainPlacement(task: FlexibleTask, date: string, planned: PlannedTask[], state: PlannerState, day: Date) {
  if (hasLateShift(planned, offsetDate(date, -1)) && task.category !== "gym") {
    return `${task.title} was placed gently after a late-shift day while avoiding early gym.`;
  }
  if (workOnDate(planned, date)) {
    return `${task.title} was placed around fixed work commitments.`;
  }
  if (state.capacity === "tired") {
    return `${task.title} was kept lighter because this week is in Tired mode.`;
  }
  if (day.getDay() === task.preferredDay) {
    return `${task.title} was placed on your preferred day.`;
  }
  return `${task.title} was placed in the best available rule-safe slot.`;
}

function monthPlanningRange(monthCursor: Date, days: number) {
  const start = isoDate(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1));
  const end = isoDate(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), days));
  return { start, end };
}

function weeksInRange(start: string, end: string) {
  const weeks: Array<{ start: string; end: string }> = [];
  const cursor = new Date(`${start}T12:00:00`);
  const day = cursor.getDay();
  cursor.setDate(cursor.getDate() + (day === 0 ? -6 : 1 - day));

  while (isoDate(cursor) <= end) {
    const weekStart = isoDate(cursor);
    cursor.setDate(cursor.getDate() + 6);
    const weekEnd = isoDate(cursor);
    weeks.push({ start: weekStart, end: weekEnd });
    cursor.setDate(cursor.getDate() + 1);
  }

  return weeks;
}

function adjustedDuration(effort: EffortLevel, capacity: CapacityMode, configuredDuration?: number) {
  const duration = configuredDuration ?? routineDurations[effort];
  if (capacity === "tired" && effort === "high") return Math.min(duration, 60);
  if (capacity === "survival") return Math.min(duration, 45);
  return duration;
}

function candidateSlots(preferred: string, wake: string, bed: string) {
  return unique([
    preferred,
    addMinutes(preferred, -60),
    addMinutes(preferred, 60),
    addMinutes(wake, 45),
    addMinutes(wake, 90),
    addMinutes(wake, 150),
    "07:00",
    "08:00",
    "09:30",
    "10:30",
    "11:30",
    "13:00",
    "14:30",
    "16:00",
    "17:30",
    "18:30",
    "19:30",
    addMinutes(bed, -120)
  ]);
}

function isSundayEveningProtected(state: PlannerState, day: Date, startTime: string) {
  return state.rules.selected.includes("protect-sunday-evenings") && day.getDay() === 0 && toMinutes(startTime) >= toMinutes("17:00");
}

function violatesStudyCutoff(state: PlannerState, category: PlannedTask["category"], startTime: string) {
  return state.rules.selected.includes("no-study-after-8") && category === "study" && toMinutes(startTime) >= toMinutes("20:00");
}

function violatesLongShiftGymRule(state: PlannerState, planned: PlannedTask[], date: string, category: PlannedTask["category"]) {
  if (!state.rules.selected.includes("never-gym-after-long-shift") || category !== "gym") return false;
  return planned.some((task) => task.date === date && task.category === "work" && minutesBetween(task.startTime, task.endTime) >= 12 * 60);
}

function violatesMorningAfterLateShift(planned: PlannedTask[], date: string, startTime: string, category: PlannedTask["category"]) {
  return category === "gym" && toMinutes(startTime) < toMinutes("12:00") && hasLateShift(planned, offsetDate(date, -1));
}

function violatesDemandingLimit(state: PlannerState, planned: PlannedTask[], date: string, effort: EffortLevel) {
  const enforce = state.rules.selected.includes("avoid-more-than-2-demanding") || state.capacity === "tired" || state.capacity === "survival";
  return enforce && effortRank[effort] > 1 && demandingTasksForDate(planned, date) >= demandingLimit[state.capacity];
}

function workOnDate(planned: PlannedTask[], date: string) {
  return planned.some((task) => task.date === date && task.category === "work");
}

function hasLateShift(planned: PlannedTask[], date: string) {
  return planned.some((task) => task.date === date && task.category === "work" && (toMinutes(task.endTime) >= toMinutes("20:00") || toMinutes(task.endTime) < toMinutes(task.startTime)));
}

function demandingTasksForDate(planned: PlannedTask[], date: string) {
  return planned.filter((task) => task.date === date && task.sourceType !== "sleep" && effortRank[task.effort] > 1).length;
}

function overlaps(tasks: PlannedTask[], date: string, start: string, end: string) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return tasks
    .filter((task) => task.date === date && task.sourceType !== "sleep")
    .some((task) => startMinutes < toMinutes(task.endTime) && endMinutes > toMinutes(task.startTime));
}

function insideAwakeWindow(start: string, end: string, wake: string, bed: string) {
  return toMinutes(start) >= toMinutes(wake) && toMinutes(end) <= toMinutes(bed);
}

function isMissed(task: PlannedTask) {
  const now = new Date();
  const taskEnd = new Date(`${task.date}T${task.endTime}`);
  return !task.completed && task.sourceType !== "sleep" && taskEnd < now;
}

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function daysBetween(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  while (isoDate(cursor) <= end) {
    days.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function offsetDate(date: string, offset: number) {
  const cursor = new Date(`${date}T12:00:00`);
  cursor.setDate(cursor.getDate() + offset);
  return isoDate(cursor);
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isoToday() {
  return isoDate(new Date());
}

function unique(items: string[]) {
  return [...new Set(items)];
}

function capacityLabel(capacity: CapacityMode) {
  if (capacity === "high") return "High Capacity";
  if (capacity === "tired") return "Tired";
  if (capacity === "survival") return "Survival Mode";
  return "Normal";
}
