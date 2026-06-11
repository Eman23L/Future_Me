import { FormEvent, useEffect, useMemo, useState } from "react";
import { PlannerService } from "./services/PlannerService";
import type {
  CapacityMode,
  Category,
  EffortLevel,
  MonthlyInput,
  NotificationPersonality,
  PlannedTask,
  PlannerState,
  Routine,
  RoutineFrequency
} from "./models/types";
import { categoryLabels } from "./models/types";

const service = new PlannerService();

type FlowStep =
  | "start"
  | "loading"
  | "month"
  | "work-time"
  | "work-dates"
  | "work-again"
  | "appointment-details"
  | "appointment-date"
  | "appointment-again"
  | "deadline-details"
  | "deadline-date"
  | "deadline-again"
  | "social-details"
  | "social-date"
  | "social-again"
  | "flexible"
  | "capacity"
  | "personality"
  | "generating"
  | "calendar"
  | "review";

type WorkDraft = {
  startTime: string;
  endTime: string;
  dates: string[];
};

type FixedDraft = {
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  date: string;
  importance: string;
  effort: string;
};

type FlexibleConfig = {
  id: Category;
  title: string;
  detail: string;
  icon: string;
  active: boolean;
  durationMinutes: number;
  durationOptions: Array<{ label: string; value: number }>;
  frequency: RoutineFrequency;
  frequencyOptions: RoutineFrequency[];
  effort: EffortLevel;
  preferredDay: number;
  preferredTime: string;
  priority: Routine["priority"];
};

const setupSteps: FlowStep[] = ["start", "loading", "month", "flexible", "capacity", "personality", "generating", "review"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const capacities: Array<{ id: CapacityMode; title: string; detail: string }> = [
  { id: "high", title: "I have plenty in me", detail: "A fuller week with room for the rituals you care about." },
  { id: "normal", title: "I feel steady", detail: "A balanced plan with space to move through the week calmly." },
  { id: "tired", title: "I need a softer week", detail: "Lighter days, fewer demanding tasks and more recovery space." },
  { id: "survival", title: "Just the essentials", detail: "Only what matters most: fixed plans, sleep, food, care and recovery." }
];

const personalities: Array<{ id: NotificationPersonality; title: string; sample: string }> = [
  { id: "bestie", title: "Bestie Mode", sample: "Hey girlie pop, gym is in about an hour. Let's get ready." },
  { id: "gentle", title: "Gentle Mode", sample: "Soft reminder, gym is coming up in about an hour. Start getting ready when you can." },
  { id: "coach", title: "Coach Mode", sample: "Gym in 1 hour. Get your kit ready and follow the plan." },
  { id: "professional", title: "Professional", sample: "Reminder: Gym is scheduled in 1 hour. Please prepare accordingly." },
  { id: "chaos", title: "Chaos Friend", sample: "BESTIE. Gym is in an hour. Shoes. Water. Go mode." }
];

const fixedCards: Array<{ id: Category; title: string; detail: string; step: FlowStep }> = [
  { id: "work", title: "Work", detail: "Add the shift patterns you already know.", step: "work-time" },
  { id: "appointment", title: "Appointments", detail: "Doctor, dentist, hair, meetings and life admin.", step: "appointment-details" },
  { id: "deadline", title: "Deadlines", detail: "Important dates that need protecting.", step: "deadline-details" },
  { id: "social", title: "Social plans", detail: "The people and places already in your month.", step: "social-details" }
];

const defaultFlexibleConfigs: FlexibleConfig[] = [
  {
    id: "gym",
    title: "Gym routine",
    detail: "I will tuck movement into open space without pushing you after long shifts.",
    icon: "G",
    active: true,
    durationMinutes: 60,
    durationOptions: durationOptions([60, 90, 120]),
    frequency: "3x-weekly",
    frequencyOptions: ["weekly", "2x-weekly", "3x-weekly", "4x-weekly"],
    effort: "high",
    preferredDay: 1,
    preferredTime: "17:30",
    priority: "medium"
  },
  {
    id: "cleaning",
    title: "Cleaning",
    detail: "A gentle home reset placed where your day still has breathing room.",
    icon: "C",
    active: true,
    durationMinutes: 60,
    durationOptions: durationOptions([30, 60, 90, 120]),
    frequency: "weekly",
    frequencyOptions: ["weekly", "2x-weekly"],
    effort: "medium",
    preferredDay: 6,
    preferredTime: "11:30",
    priority: "medium"
  },
  {
    id: "meal-prep",
    title: "Meal prep",
    detail: "Food prep fitted around work, deadlines and your energy.",
    icon: "M",
    active: true,
    durationMinutes: 120,
    durationOptions: durationOptions([60, 90, 120, 180]),
    frequency: "weekly",
    frequencyOptions: ["weekly", "2x-weekly"],
    effort: "medium",
    preferredDay: 0,
    preferredTime: "16:00",
    priority: "high"
  },
  {
    id: "food-shop",
    title: "Food shop",
    detail: "A simple shop placed before the week starts to feel full.",
    icon: "F",
    active: true,
    durationMinutes: 60,
    durationOptions: durationOptions([30, 60, 90, 120]),
    frequency: "weekly",
    frequencyOptions: ["weekly", "2x-weekly"],
    effort: "low",
    preferredDay: 6,
    preferredTime: "10:00",
    priority: "high"
  },
  {
    id: "self-care",
    title: "Self-care",
    detail: "Protected reset time for heavier days and softer evenings.",
    icon: "S",
    active: true,
    durationMinutes: 60,
    durationOptions: durationOptions([30, 60, 90, 120]),
    frequency: "2x-weekly",
    frequencyOptions: ["weekly", "2x-weekly", "3x-weekly"],
    effort: "low",
    preferredDay: 2,
    preferredTime: "20:00",
    priority: "high"
  }
];

export function App() {
  const [state, setState] = useState<PlannerState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<FlowStep>("start");
  const [workDraft, setWorkDraft] = useState<WorkDraft>({ startTime: "07:30", endTime: "20:30", dates: [] });
  const [fixedDraft, setFixedDraft] = useState<FixedDraft>(emptyFixedDraft(""));
  const [flexibleConfigs, setFlexibleConfigs] = useState<FlexibleConfig[]>(defaultFlexibleConfigs);
  const [realToday, setRealToday] = useState(isoToday());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    const today = isoToday();
    const monthKey = today.slice(0, 7);
    setRealToday(today);
    service.load(monthKey)
      .then(async (loaded) => {
        const withCurrentMonth = loaded.plannedMonth === monthKey ? loaded : { ...loaded, plannedMonth: monthKey, setupComplete: false };
        const withPlan = withCurrentMonth.setupComplete && withCurrentMonth.plannedTasks.length === 0 ? await service.generate(withCurrentMonth) : withCurrentMonth;
        setFlexibleConfigs(configsFromRoutines(withPlan.routines));
        setSelectedDate(null);
        setStep(initialStepForPlan(withPlan, today));
        setState(withPlan);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load planner data."));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const today = isoToday();
      if (today === realToday) return;
      setRealToday(today);
      void handleDateRollover(today);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [realToday, state, selectedDate]);

  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);

  async function update(next: PlannerState) {
    setState(next);
    await service.save(next);
  }

  async function handleDateRollover(today: string) {
    const monthKey = today.slice(0, 7);
    if (!state || state.plannedMonth !== monthKey) {
      const loaded = await service.load(monthKey);
      const withPlan = loaded.setupComplete && loaded.plannedTasks.length === 0 ? await service.generate(loaded) : loaded;
      setState(withPlan);
      setFlexibleConfigs(configsFromRoutines(withPlan.routines));
      setSelectedDate(null);
      setStep(initialStepForPlan(withPlan, today));
      return;
    }

    if (!selectedDate && state.setupComplete) {
      setStep(initialStepForPlan(state, today));
    }
  }

  function beginSetup() {
    setStep("loading");
    window.setTimeout(() => setStep("month"), 850);
  }

  async function changePlanMonth(monthKey: string, completedStep: FlowStep = "review") {
    const loaded = await service.load(monthKey);
    const withPlan = loaded.setupComplete && loaded.plannedTasks.length === 0 ? await service.generate(loaded) : loaded;
    setState(withPlan);
    setFlexibleConfigs(configsFromRoutines(withPlan.routines));
    setFixedDraft(emptyFixedDraft(withPlan.plannedMonth));
    setWorkDraft({ startTime: "07:30", endTime: "20:30", dates: [] });
    setSelectedDate(withPlan.setupComplete && withPlan.plannedMonth !== realToday.slice(0, 7) ? `${withPlan.plannedMonth}-01` : null);
    setStep(withPlan.setupComplete ? completedStep : "month");
  }

  function openFixedFlow(nextStep: FlowStep) {
    setFixedDraft(emptyFixedDraft(state?.plannedMonth ?? isoToday().slice(0, 7)));
    setStep(nextStep);
  }

  function saveWorkDates() {
    if (!state || workDraft.dates.length === 0) return;
    const inputs = workDraft.dates.map((date) => ({
      id: crypto.randomUUID(),
      title: "Work shift",
      date,
      startTime: workDraft.startTime,
      endTime: workDraft.endTime,
      category: "work" as Category,
      fixed: true,
      effort: "high" as EffortLevel,
      priority: "essential" as const,
      notes: `${workDraft.startTime}-${workDraft.endTime} shift`
    }));
    update({ ...state, monthlyInputs: [...state.monthlyInputs, ...inputs] });
    setWorkDraft({ ...workDraft, dates: [] });
    setStep("work-again");
  }

  function saveFixedEvent(category: "appointment" | "social" | "deadline") {
    if (!state || !fixedDraft.title.trim() || !fixedDraft.date) return;
    const input: MonthlyInput = category === "deadline"
      ? {
        id: crypto.randomUUID(),
        title: fixedDraft.title,
        date: fixedDraft.date,
        startTime: fixedDraft.startTime,
        endTime: addMinutes(fixedDraft.startTime, 30),
        category,
        fixed: true,
        effort: effortFromLabel(fixedDraft.effort),
        priority: "essential",
        notes: `${fixedDraft.importance} importance. ${fixedDraft.effort} effort. ${fixedDraft.notes}`.trim()
      }
      : {
        id: crypto.randomUUID(),
        title: fixedDraft.title,
        date: fixedDraft.date,
        startTime: fixedDraft.startTime,
        endTime: fixedDraft.endTime || addMinutes(fixedDraft.startTime, 60),
        category,
        fixed: true,
        effort: category === "appointment" ? "medium" : "low",
        priority: "essential",
        notes: [fixedDraft.location, fixedDraft.notes].filter(Boolean).join(" - ")
      };
    update({ ...state, monthlyInputs: [...state.monthlyInputs, input] });
    setFixedDraft(emptyFixedDraft(state.plannedMonth));
    setStep(category === "appointment" ? "appointment-again" : category === "deadline" ? "deadline-again" : "social-again");
  }

  async function saveFlexibleAndContinue() {
    if (!state) return;
    const flexibleRoutineIds = new Set(defaultFlexibleConfigs.map((config) => config.id));
    const preserved = state.routines.filter((routine) => !flexibleRoutineIds.has(routine.category));
    const routines = flexibleConfigs
      .filter((config) => config.active)
      .map((config): Routine => ({
        id: `routine-${config.id}`,
        name: config.title,
        frequency: config.frequency,
        preferredDay: config.preferredDay,
        preferredTime: config.preferredTime,
        effort: config.effort,
        category: config.id,
        active: true,
        durationMinutes: config.durationMinutes,
        priority: config.priority
      }));
    await update({ ...state, routines: [...preserved, ...routines] });
    setStep("capacity");
  }

  async function completeSetup() {
    if (!state) return;
    setStep("generating");
    const weekStart = startOfWeek(realToday);
    const weekKey = isoWeekKey(realToday);
    const withSetup = {
      ...state,
      setupComplete: true,
      capacityChecks: [
        ...state.capacityChecks.filter((check) => (check.weekKey ?? check.weekStart) !== weekKey),
        {
          id: `capacity-${weekKey}`,
          weekKey,
          weekStart,
          capacity: state.capacity,
          createdAt: new Date().toISOString()
        }
      ]
    };
    await update(withSetup);
    await delay(650);
    const generated = await service.generate(withSetup);
    setState(generated);
    setSelectedDate(generated.plannedMonth === realToday.slice(0, 7) ? null : `${generated.plannedMonth}-01`);
    setStep("review");
  }

  async function completeWeeklyCapacityCheck() {
    if (!state) return;
    const weekStart = startOfWeek(realToday);
    const weekKey = isoWeekKey(realToday);
    const next = {
      ...state,
      capacityChecks: [
        ...state.capacityChecks.filter((check) => (check.weekKey ?? check.weekStart) !== weekKey),
        {
          id: `capacity-${weekKey}`,
          weekKey,
          weekStart,
          capacity: state.capacity,
          createdAt: new Date().toISOString()
        }
      ]
    };
    const generated = await service.generate(next);
    setState(generated);
    setSelectedDate(null);
    setStep("review");
  }

  async function patchTask(taskId: string, patch: Partial<PlannedTask>) {
    if (!state) return;
    setState(await service.updateTask(state, taskId, patch));
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setNotificationStatus("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
    if (permission === "granted") {
      new Notification("FutureMe reminders are on", {
        body: notificationMessage(state?.settings.notificationPersonality ?? "gentle", "Gym", "in 1 hour")
      });
    }
  }

  if (loadError) return <Loading message={loadError} />;
  if (!state) return <Loading message="FutureMe" />;

  const visibleDate = selectedDate ?? realToday;

  if (state.setupComplete && step === "review") {
    return (
      <DailyApp
        state={state}
        visibleDate={visibleDate}
        realToday={realToday}
        isViewingToday={selectedDate === null || selectedDate === realToday}
        installPrompt={installPrompt}
        notificationStatus={notificationStatus}
        onDateChange={setSelectedDate}
        onToday={() => setSelectedDate(null)}
        onBack={() => setStep("month")}
        onPlan={() => setStep("calendar")}
        onWeeklyCheck={() => setStep("capacity")}
        onComplete={(task) => patchTask(task.id, { completed: true, missed: false })}
        onRequestNotifications={requestNotifications}
      />
    );
  }

  if (state.setupComplete && step === "calendar") {
    return (
      <MonthCalendarApp
        state={state}
        realToday={realToday}
        installPrompt={installPrompt}
        onBack={() => setStep("review")}
        onMonthChange={(monthKey) => changePlanMonth(monthKey, "calendar")}
        onSelectDate={(date) => {
          setSelectedDate(date === realToday ? null : date);
          setStep("review");
        }}
        onToday={() => {
          setSelectedDate(null);
          setStep("review");
        }}
        onWeeklyCheck={() => setStep("capacity")}
      />
    );
  }

  return (
    <FlowShell step={step} state={state} installPrompt={installPrompt} onBack={() => setStep(previousStep(step))}>
      {step === "start" && <StartScreen onSetup={beginSetup} />}
      {step === "loading" && <FutureMeLoading />}
      {step === "month" && <MonthSetupStep state={state} onUpdate={update} onMonthChange={changePlanMonth} onSelect={openFixedFlow} onNext={() => setStep("flexible")} />}
      {step === "work-time" && <WorkTimeStep draft={workDraft} onDraftChange={setWorkDraft} onNext={() => setStep("work-dates")} />}
      {step === "work-dates" && <WorkDatesStep state={state} draft={workDraft} onDraftChange={setWorkDraft} onSave={saveWorkDates} />}
      {step === "work-again" && <AgainStep title="Do you have a different work pattern this month?" addLabel="Add another work pattern" doneLabel="Done with work" onAdd={() => { setWorkDraft({ startTime: "07:30", endTime: "20:30", dates: [] }); setStep("work-time"); }} onDone={() => setStep("month")} />}
      {step === "appointment-details" && <FixedDetailsStep kind="appointment" draft={fixedDraft} onDraftChange={setFixedDraft} onNext={() => setStep("appointment-date")} />}
      {step === "appointment-date" && <SingleDateStep state={state} heading="Which day is this appointment?" draft={fixedDraft} onDraftChange={setFixedDraft} onSave={() => saveFixedEvent("appointment")} />}
      {step === "appointment-again" && <AgainStep title="Do you have another appointment to add?" addLabel="Add another appointment" doneLabel="Done with appointments" onAdd={() => setStep("appointment-details")} onDone={() => setStep("month")} />}
      {step === "deadline-details" && <FixedDetailsStep kind="deadline" draft={fixedDraft} onDraftChange={setFixedDraft} onNext={() => setStep("deadline-date")} />}
      {step === "deadline-date" && <SingleDateStep state={state} heading="When is this due?" draft={fixedDraft} onDraftChange={setFixedDraft} onSave={() => saveFixedEvent("deadline")} />}
      {step === "deadline-again" && <AgainStep title="Do you have another deadline to add?" addLabel="Add another deadline" doneLabel="Done with deadlines" onAdd={() => setStep("deadline-details")} onDone={() => setStep("month")} />}
      {step === "social-details" && <FixedDetailsStep kind="social" draft={fixedDraft} onDraftChange={setFixedDraft} onNext={() => setStep("social-date")} />}
      {step === "social-date" && <SingleDateStep state={state} heading="Which day is this social event?" draft={fixedDraft} onDraftChange={setFixedDraft} onSave={() => saveFixedEvent("social")} />}
      {step === "social-again" && <AgainStep title="Do you have another social event to add?" addLabel="Add another social event" doneLabel="Done with social events" onAdd={() => setStep("social-details")} onDone={() => setStep("month")} />}
      {step === "flexible" && <FlexibleActivitiesStep configs={flexibleConfigs} onChange={setFlexibleConfigs} onNext={saveFlexibleAndContinue} />}
      {step === "capacity" && <CapacityStep state={state} onUpdate={update} onNext={state.setupComplete ? completeWeeklyCapacityCheck : () => setStep("personality")} />}
      {step === "personality" && <PersonalityStep state={state} onUpdate={update} onNext={completeSetup} />}
      {step === "generating" && <GenerateStep />}
    </FlowShell>
  );
}

function FlowShell({
  children,
  step,
  state,
  installPrompt,
  onBack
}: {
  children: React.ReactNode;
  step: FlowStep;
  state: PlannerState;
  installPrompt: any;
  onBack: () => void;
}) {
  const progress = Math.max(1, setupSteps.indexOf(step) + 1);
  const total = setupSteps.length;
  const showHeader = step !== "loading" && step !== "generating";
  return (
    <main className="mobile-shell flow-screen">
      {showHeader && (
        <header className="flow-top">
          <button className="ghost-icon back-button" onClick={onBack} disabled={step === "start"} aria-label="Back">Back</button>
          <div className="progress-track" aria-label={`Step ${progress} of ${total}`}>
            <span style={{ width: `${Math.min(100, (progress / total) * 100)}%` }} />
          </div>
          <button className="ghost-icon" aria-label="Install app" onClick={() => installPrompt?.prompt()} disabled={!installPrompt}>+</button>
        </header>
      )}
      <div className="flow-content">{children}</div>
      {showHeader && <p className="storage-note">Saved on this device for {monthLabel(state.plannedMonth)}.</p>}
    </main>
  );
}

function StartScreen({ onSetup }: { onSetup: () => void }) {
  return (
    <section className="welcome-card">
      <p className="pill">FutureMe</p>
      <h1>Welcome to your gentle plan</h1>
      <p>Tell me what is already in your month, and I will shape the rest around your time, energy and care.</p>
      <button className="bottom-action" onClick={onSetup}>Set up</button>
    </section>
  );
}

function FutureMeLoading() {
  return (
    <section className="loading-screen">
      <div className="logo-mark">FM</div>
      <h1>FutureMe</h1>
      <p>Getting your month ready...</p>
    </section>
  );
}

function GenerateStep() {
  return (
    <section className="loading-screen">
      <div className="logo-mark">FM</div>
      <h1>Softly shaping your month...</h1>
      <p>I am placing the fixed things first, then fitting care around them.</p>
    </section>
  );
}

function MonthSetupStep({
  state,
  onUpdate,
  onMonthChange,
  onSelect,
  onNext
}: {
  state: PlannerState;
  onUpdate: (state: PlannerState) => void;
  onMonthChange: (monthKey: string) => void;
  onSelect: (step: FlowStep) => void;
  onNext: () => void;
}) {
  return (
    <StepCard eyebrow="Your first month" title="Let's build your first month" copy="Add what is already fixed. I will gently work around it.">
      <div className="month-picker">
        <button onClick={() => onMonthChange(shiftMonth(state.plannedMonth, -1))} aria-label="Previous month">&lt;</button>
        <strong>{monthLabel(state.plannedMonth)}</strong>
        <button onClick={() => onMonthChange(shiftMonth(state.plannedMonth, 1))} aria-label="Next month">&gt;</button>
      </div>
      <div className="category-grid">
        {fixedCards.map((card) => (
          <button key={card.id} className="category-card" onClick={() => onSelect(card.step)}>
            <span className={`category-dot ${card.id}`} />
            <strong>{card.title}</strong>
            <span>{statusForCategory(state, card.id)}</span>
            <small>{card.detail}</small>
          </button>
        ))}
      </div>
      <div className="form-card two sleep-card">
        <label>Wake-up time<input type="time" value={state.settings.wakeTime} onChange={(event) => onUpdate({ ...state, settings: { ...state.settings, wakeTime: event.target.value } })} /></label>
        <label>Bedtime<input type="time" value={state.settings.bedTime} onChange={(event) => onUpdate({ ...state, settings: { ...state.settings, bedTime: event.target.value } })} /></label>
      </div>
      <button className="bottom-action" onClick={onNext}>Continue</button>
    </StepCard>
  );
}

function WorkTimeStep({ draft, onDraftChange, onNext }: { draft: WorkDraft; onDraftChange: (draft: WorkDraft) => void; onNext: () => void }) {
  return (
    <StepCard eyebrow="Work" title="When are your shifts?" copy="Add one shift pattern, then choose every date it belongs to.">
      <div className="form-card two">
        <label>Start time<input type="time" value={draft.startTime} onChange={(event) => onDraftChange({ ...draft, startTime: event.target.value })} /></label>
        <label>End time<input type="time" value={draft.endTime} onChange={(event) => onDraftChange({ ...draft, endTime: event.target.value })} /></label>
      </div>
      <button className="bottom-action" onClick={onNext}>Choose the days</button>
    </StepCard>
  );
}

function WorkDatesStep({ state, draft, onDraftChange, onSave }: { state: PlannerState; draft: WorkDraft; onDraftChange: (draft: WorkDraft) => void; onSave: () => void }) {
  function toggle(date: string) {
    const dates = draft.dates.includes(date) ? draft.dates.filter((item) => item !== date) : [...draft.dates, date];
    onDraftChange({ ...draft, dates });
  }
  return (
    <StepCard eyebrow="Work days" title="Which days hold this shift?" copy="Tap every matching date so FutureMe can protect that time.">
      <p className="time-banner">{draft.startTime}-{draft.endTime}</p>
      <MonthGrid month={state.plannedMonth} selected={draft.dates} onToggle={toggle} />
      <button className="bottom-action" onClick={onSave} disabled={draft.dates.length === 0}>Save these days</button>
    </StepCard>
  );
}

function FixedDetailsStep({
  kind,
  draft,
  onDraftChange,
  onNext
}: {
  kind: "appointment" | "deadline" | "social";
  draft: FixedDraft;
  onDraftChange: (draft: FixedDraft) => void;
  onNext: () => void;
}) {
  const isDeadline = kind === "deadline";
  const title = kind === "appointment" ? "Add an appointment" : kind === "deadline" ? "Add a deadline" : "Add a social plan";
  const placeholder = kind === "appointment" ? "Doctor's appointment" : kind === "deadline" ? "Assignment due" : "Dinner";
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    onNext();
  }
  return (
    <StepCard eyebrow={isDeadline ? "Deadline" : categoryLabels[kind]} title={title} copy="Share the details first, then choose where it sits in your month.">
      <form className="form-card" onSubmit={submit}>
        <label>{isDeadline ? "Deadline title" : kind === "appointment" ? "Appointment title" : "Event title"}<input value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} placeholder={placeholder} /></label>
        <label>{isDeadline ? "Due time optional" : "Start time"}<input type="time" value={draft.startTime} onChange={(event) => onDraftChange({ ...draft, startTime: event.target.value })} /></label>
        {!isDeadline && <label>End time optional<input type="time" value={draft.endTime} onChange={(event) => onDraftChange({ ...draft, endTime: event.target.value })} /></label>}
        {!isDeadline && <label>Location optional<input value={draft.location} onChange={(event) => onDraftChange({ ...draft, location: event.target.value })} /></label>}
        {isDeadline && <label>Importance<select value={draft.importance} onChange={(event) => onDraftChange({ ...draft, importance: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></label>}
        {isDeadline && <label>Estimated effort<select value={draft.effort} onChange={(event) => onDraftChange({ ...draft, effort: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></label>}
        <label>Notes optional<textarea value={draft.notes} onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })} /></label>
        <button type="submit">Choose the day</button>
      </form>
    </StepCard>
  );
}

function SingleDateStep({
  state,
  heading,
  draft,
  onDraftChange,
  onSave
}: {
  state: PlannerState;
  heading: string;
  draft: FixedDraft;
  onDraftChange: (draft: FixedDraft) => void;
  onSave: () => void;
}) {
  return (
    <StepCard eyebrow="Calendar" title={heading} copy={draft.title}>
      <MonthGrid month={state.plannedMonth} selected={draft.date ? [draft.date] : []} onToggle={(date) => onDraftChange({ ...draft, date })} />
      <button className="bottom-action" onClick={onSave} disabled={!draft.date}>Save it</button>
    </StepCard>
  );
}

function AgainStep({
  title,
  addLabel,
  doneLabel,
  onAdd,
  onDone
}: {
  title: string;
  addLabel: string;
  doneLabel: string;
  onAdd: () => void;
  onDone: () => void;
}) {
  return (
    <StepCard eyebrow="Saved" title={title} copy="Add another if you need to, or come back to your month overview.">
      <div className="choice-stack">
        <button className="choice selected" onClick={onAdd}><strong>{addLabel}</strong><span>Add another moment to protect.</span></button>
        <button className="choice" onClick={onDone}><strong>{doneLabel}</strong><span>Return to your month overview.</span></button>
      </div>
    </StepCard>
  );
}

function FlexibleActivitiesStep({ configs, onChange, onNext }: { configs: FlexibleConfig[]; onChange: (configs: FlexibleConfig[]) => void; onNext: () => void }) {
  function patch(id: Category, patchConfig: Partial<FlexibleConfig>) {
    onChange(configs.map((config) => config.id === id ? { ...config, ...patchConfig } : config));
  }
  return (
    <StepCard eyebrow="Care and routines" title="What would you like me to fit in?" copy="Turn on the rituals you want FutureMe to place gently around your fixed plans.">
      <div className="flexible-stack">
        {configs.map((config) => (
          <article key={config.id} className={config.active ? "flex-card selected" : "flex-card"}>
            <button className="flex-main" onClick={() => patch(config.id, { active: !config.active })} aria-pressed={config.active}>
              <span className={`activity-icon ${config.id}`}>{config.icon}</span>
              <span>
                <strong>{config.title}</strong>
                <small>{config.detail}</small>
              </span>
              <span className={config.active ? "toggle on" : "toggle"}><span /></span>
            </button>
            {config.active && (
              <>
                <div className="pill-row" aria-label={`${config.title} duration`}>
                  {config.durationOptions.map((option) => (
                    <button key={option.value} className={config.durationMinutes === option.value ? "option-pill selected" : "option-pill"} onClick={() => patch(config.id, { durationMinutes: option.value })}>{option.label}</button>
                  ))}
                </div>
                <div className="pill-row" aria-label={`${config.title} frequency`}>
                  {config.frequencyOptions.map((frequency) => (
                    <button key={frequency} className={config.frequency === frequency ? "option-pill selected" : "option-pill"} onClick={() => patch(config.id, { frequency })}>{frequencyLabel(frequency)}</button>
                  ))}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      <button className="bottom-action" onClick={onNext}>Continue</button>
    </StepCard>
  );
}

function CapacityStep({ state, onUpdate, onNext }: { state: PlannerState; onUpdate: (state: PlannerState) => void; onNext: () => void }) {
  return (
    <StepCard eyebrow="Energy check" title="How are you feeling this week?" copy="This helps FutureMe choose a pace that supports you instead of overfilling your days.">
      <div className="choice-stack">
        {capacities.map((capacity) => (
          <button key={capacity.id} className={state.capacity === capacity.id ? "choice selected" : "choice"} onClick={() => onUpdate({ ...state, capacity: capacity.id })}>
            <strong>{capacity.title}</strong>
            <span>{capacity.detail}</span>
          </button>
        ))}
      </div>
      <button className="bottom-action" onClick={onNext}>Continue</button>
    </StepCard>
  );
}

function PersonalityStep({ state, onUpdate, onNext }: { state: PlannerState; onUpdate: (state: PlannerState) => void; onNext: () => void }) {
  return (
    <StepCard eyebrow="Your reminder voice" title="How should I talk to you?" copy="Choose the tone that will feel supportive when FutureMe checks in.">
      <div className="choice-stack">
        {personalities.map((personality) => (
          <button key={personality.id} className={state.settings.notificationPersonality === personality.id ? "choice selected" : "choice"} onClick={() => onUpdate({ ...state, settings: { ...state.settings, notificationPersonality: personality.id } })}>
            <strong>{personality.title}</strong>
            <span>{personality.sample}</span>
          </button>
        ))}
      </div>
      <button className="bottom-action" onClick={onNext}>Let's build your month</button>
    </StepCard>
  );
}

function DailyApp({
  state,
  visibleDate,
  realToday,
  isViewingToday,
  installPrompt,
  notificationStatus,
  onDateChange,
  onToday,
  onBack,
  onPlan,
  onWeeklyCheck,
  onComplete,
  onRequestNotifications
}: {
  state: PlannerState;
  visibleDate: string;
  realToday: string;
  isViewingToday: boolean;
  installPrompt: any;
  notificationStatus: NotificationPermission | "unsupported";
  onDateChange: (date: string) => void;
  onToday: () => void;
  onBack: () => void;
  onPlan: () => void;
  onWeeklyCheck: () => void;
  onComplete: (task: PlannedTask) => void;
  onRequestNotifications: () => void;
}) {
  const tasks = daySchedule(state, visibleDate);
  const nextTask = tasks.find((task) => !task.completed && task.sourceType !== "sleep");
  return (
    <main className="mobile-shell dashboard">
      <header className="dashboard-top">
        <button className="ghost-icon back-button dashboard-back" onClick={onBack} aria-label="Back">Back</button>
        <div>
          <p className="pill">FutureMe</p>
          <h1>{formatDateLong(visibleDate)}</h1>
          <span>{capacityTitle(state.capacity)}</span>
        </div>
        <button className="ghost-icon filled" onClick={() => installPrompt?.prompt()} disabled={!installPrompt} aria-label="Install app">+</button>
      </header>

      <section className="today-card">
        <p className="eyebrow">A note from FutureMe</p>
        <h2>{notificationMessage(state.settings.notificationPersonality, nextTask?.title ?? "your next task", nextTask?.startTime ?? "soon")}</h2>
        <button onClick={onRequestNotifications} disabled={notificationStatus === "granted" || notificationStatus === "unsupported"}>
          {notificationStatus === "granted" ? "Reminders are on" : "Turn on gentle reminders"}
        </button>
      </section>

      <section className="day-nav">
        <button onClick={() => onDateChange(offsetDate(visibleDate, -1))} aria-label="Previous day">&lt;</button>
        <div>
          <strong>{formatWeekday(visibleDate)}</strong>
          <span>{visibleDate === realToday ? "Today" : formatShortDate(visibleDate)}</span>
        </div>
        <button onClick={() => onDateChange(offsetDate(visibleDate, 1))} aria-label="Next day">&gt;</button>
      </section>
      {!isViewingToday && <button className="today-jump" onClick={onToday}>Return to current day</button>}

      <section className="task-section">
        <div className="section-title">
          <h2>Today, gently</h2>
          <span>{tasks.length} items</span>
        </div>
        {tasks.length === 0 ? <div className="empty-state">No tasks planned for this day.</div> : tasks.map((task) => (
          <article key={task.id} className={task.completed ? "schedule-row done" : "schedule-row"}>
            <span className="schedule-time">{task.startTime}</span>
            <div className={`dot ${task.category}`} />
            <div>
              <strong>{task.title}</strong>
              <span>{task.startTime} - {task.endTime}</span>
              <small>{task.lock === "fixed" ? "Set by you" : "Placed by FutureMe"} - {categoryLabels[task.category]}</small>
            </div>
            {task.sourceType !== "sleep" && <button onClick={() => onComplete(task)} disabled={task.completed}>{task.completed ? "Done" : "Complete"}</button>}
          </article>
        ))}
      </section>

      <nav className="bottom-nav">
        <button className={isViewingToday ? "active" : ""} onClick={onToday}>{isViewingToday ? "Today" : "Current day"}</button>
        <button onClick={onWeeklyCheck}>Energy</button>
        <button onClick={onPlan}>Month</button>
      </nav>
    </main>
  );
}

function MonthCalendarApp({
  state,
  realToday,
  installPrompt,
  onBack,
  onMonthChange,
  onSelectDate,
  onToday,
  onWeeklyCheck
}: {
  state: PlannerState;
  realToday: string;
  installPrompt: any;
  onBack: () => void;
  onMonthChange: (monthKey: string) => void;
  onSelectDate: (date: string) => void;
  onToday: () => void;
  onWeeklyCheck: () => void;
}) {
  const days = monthDays(state.plannedMonth);
  return (
    <main className="mobile-shell dashboard">
      <header className="dashboard-top">
        <button className="ghost-icon back-button dashboard-back" onClick={onBack} aria-label="Back">Back</button>
        <div>
          <p className="pill">FutureMe</p>
          <h1>{monthLabel(state.plannedMonth)}</h1>
          <span>Tap a day to see what FutureMe placed there.</span>
        </div>
        <button className="ghost-icon filled" onClick={() => installPrompt?.prompt()} disabled={!installPrompt} aria-label="Install app">+</button>
      </header>

      <section className="month-picker calendar-month-switcher">
        <button onClick={() => onMonthChange(shiftMonth(state.plannedMonth, -1))} aria-label="Previous month">&lt;</button>
        <strong>{monthLabel(state.plannedMonth)}</strong>
        <button onClick={() => onMonthChange(shiftMonth(state.plannedMonth, 1))} aria-label="Next month">&gt;</button>
      </section>

      <section className="task-section month-overview">
        <div className="month-calendar-grid">
          {weekdays.map((day) => <span key={day} className="weekday">{day}</span>)}
          {days.map((date, index) => date ? (
            <button
              key={date}
              className={date === realToday ? "month-day today" : "month-day"}
              onClick={() => onSelectDate(date)}
            >
              <span className="month-day-number">{Number(date.slice(8))}</span>
              <span className="month-day-items">
                {tasksForCalendarDay(state, date).slice(0, 3).map((task) => (
                  <span key={task.id} className={`month-task-chip ${task.category}`}>{task.title}</span>
                ))}
                {tasksForCalendarDay(state, date).length > 3 && <span className="month-more">...</span>}
              </span>
            </button>
          ) : <span key={`blank-${index}`} className="month-day blank" />)}
        </div>
      </section>

      <nav className="bottom-nav">
        <button onClick={onToday}>Today</button>
        <button onClick={onWeeklyCheck}>Energy</button>
        <button className="active">Month</button>
      </nav>
    </main>
  );
}

function StepCard({ eyebrow, title, copy, children }: { eyebrow: string; title: string; copy: string; children: React.ReactNode }) {
  return (
    <section className="step-card">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="step-copy">{copy}</p>
      {children}
    </section>
  );
}

function MonthGrid({ month, selected, onToggle }: { month: string; selected: string[]; onToggle: (date: string) => void }) {
  const days = useMemo(() => monthDays(month), [month]);
  return (
    <div className="calendar-card">
      {weekdays.map((day) => <span key={day} className="weekday">{day}</span>)}
      {days.map((date, index) => date ? (
        <button key={date} className={selected.includes(date) ? "selected" : ""} onClick={() => onToggle(date)}>
          {Number(date.slice(8))}
        </button>
      ) : <span key={`blank-${index}`} />)}
    </div>
  );
}

function Loading({ message }: { message: string }) {
  return <main className="mobile-shell loading"><h1>FutureMe</h1><p>{message}</p></main>;
}

function configsFromRoutines(routines: Routine[]) {
  return defaultFlexibleConfigs.map((config) => {
    const routine = routines.find((item) => item.category === config.id);
    return routine
      ? {
        ...config,
        active: routine.active,
        durationMinutes: routine.durationMinutes ?? config.durationMinutes,
        frequency: routine.frequency,
        preferredDay: routine.preferredDay,
        preferredTime: routine.preferredTime,
        effort: routine.effort,
        priority: routine.priority ?? config.priority
      }
      : config;
  });
}

function initialStepForPlan(state: PlannerState, today: string): FlowStep {
  if (!state.setupComplete) return "start";
  return hasCapacityCheckForWeek(state, today) ? "review" : "capacity";
}

function hasCapacityCheckForWeek(state: PlannerState, date: string) {
  const weekKey = isoWeekKey(date);
  const weekStart = startOfWeek(date);
  return state.capacityChecks.some((check) => check.weekKey === weekKey || check.weekStart === weekStart);
}

function statusForCategory(state: PlannerState, category: Category) {
  const count = state.monthlyInputs.filter((input) => input.category === category && input.date.startsWith(state.plannedMonth)).length;
  if (category === "work") return count === 1 ? "1 shift added" : `${count} shifts added`;
  return count === 1 ? "1 added" : `${count} added`;
}

function daySchedule(state: PlannerState, date: string) {
  const visible = state.plannedTasks
    .filter((task) => task.date === date && task.sourceType !== "sleep")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return [
    ...visible,
    {
      id: `bedtime-${date}`,
      sourceId: `sleep-${date}`,
      sourceType: "sleep" as const,
      title: "Bedtime",
      date,
      startTime: state.settings.bedTime,
      endTime: state.settings.bedTime,
      category: "self-care" as Category,
      effort: "low" as EffortLevel,
      lock: "fixed" as const,
      priority: "essential" as const,
      completed: false,
      missed: false
    }
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function tasksForCalendarDay(state: PlannerState, date: string) {
  return state.plannedTasks
    .filter((task) => task.date === date && task.sourceType !== "sleep")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function emptyFixedDraft(month: string): FixedDraft {
  return {
    title: "",
    startTime: "10:00",
    endTime: "",
    location: "",
    notes: "",
    date: month ? `${month}-01` : "",
    importance: "High",
    effort: "Medium"
  };
}

function durationOptions(values: number[]) {
  return values.map((value) => ({ value, label: value < 60 ? `${value} minutes` : value === 60 ? "1 hour" : `${value / 60} hours` }));
}

function frequencyLabel(frequency: RoutineFrequency) {
  if (frequency === "weekly") return "1x weekly";
  if (frequency === "2x-weekly") return "2x weekly";
  if (frequency === "3x-weekly") return "3x weekly";
  if (frequency === "4x-weekly") return "4x weekly";
  if (frequency === "daily") return "Daily";
  return "Custom";
}

function effortFromLabel(label: string): EffortLevel {
  if (label === "Low") return "low";
  if (label === "High") return "high";
  return "medium";
}

function previousStep(step: FlowStep): FlowStep {
  if (step === "month") return "start";
  if (step === "flexible") return "month";
  if (step === "capacity") return "flexible";
  if (step === "personality") return "capacity";
  if (step.includes("date")) {
    if (step.startsWith("appointment")) return "appointment-details";
    if (step.startsWith("deadline")) return "deadline-details";
    if (step.startsWith("social")) return "social-details";
  }
  if (step.includes("again")) return "month";
  if (step === "work-dates") return "work-time";
  if (step === "work-time" || step.endsWith("details")) return "month";
  return "start";
}

function notificationMessage(personality: NotificationPersonality, title: string, time: string) {
  const when = time === "soon" || time.startsWith("in ") ? time : `at ${time}`;
  const messages: Record<NotificationPersonality, string> = {
    bestie: `Hey girlie pop, ${title} is ${when}. Let's get ready.`,
    gentle: `Soft reminder, ${title} is coming up ${when}. Start getting ready when you can.`,
    coach: `${title} ${when}. Get your kit ready and follow the plan.`,
    professional: `Reminder: ${title} is scheduled ${when}. Please prepare accordingly.`,
    chaos: `BESTIE. ${title} is ${when}. Shoes. Water. Go mode.`
  };
  return messages[personality];
}

function monthDays(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const first = new Date(year, monthIndex - 1, 1);
  const count = new Date(year, monthIndex, 0).getDate();
  return [
    ...Array.from({ length: first.getDay() }, () => ""),
    ...Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`)
  ];
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
}

function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function capacityTitle(capacity: CapacityMode) {
  return capacities.find((item) => item.id === capacity)?.title ?? "I feel steady";
}

function formatDateLong(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date(`${date}T12:00:00`));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = (hours * 60 + mins + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function offsetDate(date: string, offset: number) {
  const cursor = new Date(`${date}T12:00:00`);
  cursor.setDate(cursor.getDate() + offset);
  return dateKey(cursor);
}

function isoToday() {
  return dateKey(new Date());
}

function startOfWeek(date: string) {
  const cursor = new Date(`${date}T12:00:00`);
  const day = cursor.getDay();
  cursor.setDate(cursor.getDate() + (day === 0 ? -6 : 1 - day));
  return dateKey(cursor);
}

function isoWeekKey(date: string) {
  const cursor = new Date(`${date}T12:00:00`);
  const day = cursor.getDay() || 7;
  cursor.setDate(cursor.getDate() + 4 - day);
  const yearStart = new Date(cursor.getFullYear(), 0, 1);
  const week = Math.ceil((((cursor.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${cursor.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
