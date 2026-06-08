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
  PresetRule,
  Routine,
  RoutineFrequency
} from "./models/types";
import { categoryLabels } from "./models/types";

const service = new PlannerService();

type FlowStep =
  | "welcome"
  | "capacity"
  | "personality"
  | "month"
  | "categories"
  | "work-time"
  | "work-dates"
  | "work-again"
  | "appointment"
  | "deadline"
  | "social"
  | "routine"
  | "rules"
  | "review";

type WorkDraft = {
  startTime: string;
  endTime: string;
  dates: string[];
};

const steps: FlowStep[] = ["welcome", "capacity", "personality", "month", "categories", "review"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const capacities: Array<{ id: CapacityMode; title: string; detail: string }> = [
  { id: "high", title: "High Capacity", detail: "A fuller week with gym, study, cleaning, errands and meal prep where they fit." },
  { id: "normal", title: "Normal Capacity", detail: "Balanced planning with realistic limits on demanding tasks." },
  { id: "tired", title: "Tired", detail: "Lighter structure, recovery space and fewer high-effort blocks." },
  { id: "survival", title: "Survival Mode", detail: "Only essentials: work, deadlines, food, sleep, basic care and recovery." }
];

const personalities: Array<{ id: NotificationPersonality; title: string; sample: string }> = [
  { id: "bestie", title: "Bestie Mode", sample: "Hey girlie pop, gym is in about an hour. Let's get ready." },
  { id: "gentle", title: "Gentle Mode", sample: "Soft reminder, gym is coming up in about an hour. Start getting ready when you can." },
  { id: "coach", title: "Coach Mode", sample: "Gym in 1 hour. Get your kit ready and follow the plan." },
  { id: "professional", title: "Professional Mode", sample: "Reminder: Gym is scheduled in 1 hour. Please prepare accordingly." },
  { id: "chaos", title: "Chaos Friend Mode", sample: "BESTIE. Gym is in an hour. Shoes. Water. Go mode." }
];

const categoryCards: Array<{ id: Category | "rules"; title: string; detail: string; step: FlowStep }> = [
  { id: "work", title: "Work", detail: "Batch-add shifts by time pattern.", step: "work-time" },
  { id: "appointment", title: "Appointments", detail: "Doctor, dentist, hair, meetings.", step: "appointment" },
  { id: "deadline", title: "Deadlines", detail: "Assignments and prep blocks.", step: "deadline" },
  { id: "social", title: "Social events", detail: "Plans with times and places.", step: "social" },
  { id: "gym", title: "Gym / routines", detail: "Repeating habits and routines.", step: "routine" },
  { id: "cleaning", title: "Cleaning", detail: "Weekly home structure.", step: "routine" },
  { id: "meal-prep", title: "Meal prep", detail: "Food routines before busy days.", step: "routine" },
  { id: "food-shop", title: "Food shop", detail: "Add your regular shop.", step: "routine" },
  { id: "self-care", title: "Self-care", detail: "Protected care and reset blocks.", step: "routine" },
  { id: "custom", title: "Custom", detail: "Anything else Future Me should know.", step: "appointment" },
  { id: "rules", title: "Personal rules", detail: "Boundaries for the planner.", step: "rules" }
];

const presetRules: Array<{ id: PresetRule; label: string }> = [
  { id: "never-gym-after-long-shift", label: "Never gym after a 12-hour shift" },
  { id: "no-study-after-8", label: "No study after 8pm" },
  { id: "protect-sunday-evenings", label: "Protect Sunday evenings" },
  { id: "recovery-after-3-shifts", label: "Recovery day after 3 consecutive shifts" },
  { id: "meal-prep-before-work", label: "Meal prep before work days" },
  { id: "avoid-more-than-2-demanding", label: "Avoid more than 2 demanding tasks per day" },
  { id: "no-high-effort-after-long-shifts", label: "No high-effort tasks after long shifts" },
  { id: "one-lighter-evening", label: "Keep one lighter evening per week" }
];

export function App() {
  const [state, setState] = useState<PlannerState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<FlowStep>("welcome");
  const [workDraft, setWorkDraft] = useState<WorkDraft>({ startTime: "07:30", endTime: "20:30", dates: [] });
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    service.load()
      .then(async (loaded) => {
        const withPlan = loaded.plannedTasks.length === 0 ? await service.generate(loaded) : loaded;
        setStep(withPlan.setupComplete ? "review" : "welcome");
        setState(withPlan);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load planner data."));
  }, []);

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

  async function generate(next = state) {
    if (!next) return;
    const generated = await service.generate(next);
    setState(generated);
  }

  async function completeSetup() {
    if (!state) return;
    const next = { ...state, setupComplete: true };
    await update(next);
    await generate(next);
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
      new Notification("Future Me reminders are on", {
        body: notificationMessage(state?.settings.notificationPersonality ?? "gentle", "Gym", "in 1 hour")
      });
    }
  }

  if (loadError) return <Loading message={loadError} />;
  if (!state) return <Loading message="Loading your planner..." />;

  if (state.setupComplete && step === "review") {
    return (
      <DailyApp
        state={state}
        installPrompt={installPrompt}
        notificationStatus={notificationStatus}
        onBack={() => setStep("categories")}
        onPlan={() => setStep("categories")}
        onWeeklyCheck={() => setStep("capacity")}
        onComplete={(task) => patchTask(task.id, { completed: true, missed: false })}
        onReschedule={(task) => patchTask(task.id, { date: isoToday(), missed: false })}
        onRequestNotifications={requestNotifications}
      />
    );
  }

  return (
    <FlowShell step={step} state={state} onBack={() => setStep(previousStep(step, state))} installPrompt={installPrompt}>
      {step === "welcome" && <Welcome onNext={() => setStep("capacity")} />}
      {step === "capacity" && <CapacityStep state={state} onUpdate={update} onNext={() => setStep(state.setupComplete ? "review" : "personality")} />}
      {step === "personality" && <PersonalityStep state={state} onUpdate={update} onNext={() => setStep("month")} />}
      {step === "month" && <MonthStep state={state} onUpdate={update} onNext={() => setStep("categories")} />}
      {step === "categories" && <CategoryStep state={state} onSelect={setStep} onFinish={completeSetup} />}
      {step === "work-time" && <WorkTimeStep draft={workDraft} onDraftChange={setWorkDraft} onNext={() => setStep("work-dates")} />}
      {step === "work-dates" && <WorkDatesStep state={state} draft={workDraft} onDraftChange={setWorkDraft} onUpdate={update} onNext={() => setStep("work-again")} />}
      {step === "work-again" && <WorkAgainStep onAdd={() => { setWorkDraft({ startTime: "07:30", endTime: "20:30", dates: [] }); setStep("work-time"); }} onDone={() => setStep("categories")} />}
      {step === "appointment" && <FixedEventStep state={state} onUpdate={update} category="appointment" onDone={() => setStep("categories")} />}
      {step === "deadline" && <DeadlineStep state={state} onUpdate={update} onDone={() => setStep("categories")} />}
      {step === "social" && <FixedEventStep state={state} onUpdate={update} category="social" onDone={() => setStep("categories")} />}
      {step === "routine" && <RoutineStep state={state} onUpdate={update} onDone={() => setStep("categories")} />}
      {step === "rules" && <RulesStep state={state} onUpdate={update} onDone={() => setStep("categories")} />}
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
  const progress = Math.max(1, steps.indexOf(step) + 1);
  const total = steps.length;
  return (
    <main className="mobile-shell flow-screen">
      <header className="flow-top">
        <button className="ghost-icon back-button" onClick={onBack} disabled={step === "welcome"} aria-label="Back">Back</button>
        <div className="progress-track" aria-label={`Step ${progress} of ${total}`}>
          <span style={{ width: `${Math.min(100, (progress / total) * 100)}%` }} />
        </div>
        <button className="ghost-icon" aria-label="Install app" onClick={() => installPrompt?.prompt()} disabled={!installPrompt}>+</button>
      </header>
      <div className="flow-content">{children}</div>
      <p className="storage-note">Saved on this device for {monthLabel(state.plannedMonth)}.</p>
    </main>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <section className="welcome-card">
      <p className="pill">FutureMe</p>
      <h1>Let's plan your month</h1>
      <p>Tell me about your life and I'll sort the rest.</p>
      <button className="bottom-action" onClick={onNext}>Get started</button>
    </section>
  );
}

function CapacityStep({ state, onUpdate, onNext }: { state: PlannerState; onUpdate: (state: PlannerState) => void; onNext: () => void }) {
  return (
    <StepCard eyebrow="Weekly reality check" title="How's your energy this week?" copy="This helps me decide how much to schedule for you this week.">
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
    <StepCard eyebrow="Reminders" title="How should I talk to you in reminders?" copy="The wording can change, even while push notifications stay basic in V1.">
      <div className="choice-stack">
        {personalities.map((personality) => (
          <button key={personality.id} className={state.settings.notificationPersonality === personality.id ? "choice selected" : "choice"} onClick={() => onUpdate({ ...state, settings: { ...state.settings, notificationPersonality: personality.id } })}>
            <strong>{personality.title}</strong>
            <span>{personality.sample}</span>
          </button>
        ))}
      </div>
      <button className="bottom-action" onClick={onNext}>Continue</button>
    </StepCard>
  );
}

function MonthStep({ state, onUpdate, onNext }: { state: PlannerState; onUpdate: (state: PlannerState) => void; onNext: () => void }) {
  return (
    <StepCard eyebrow="Plan one month" title="Which month are we planning?" copy="Future Me builds one realistic month at a time.">
      <div className="month-picker">
        <button onClick={() => onUpdate({ ...state, plannedMonth: shiftMonth(state.plannedMonth, -1) })} aria-label="Previous month">&lt;</button>
        <strong>{monthLabel(state.plannedMonth)}</strong>
        <button onClick={() => onUpdate({ ...state, plannedMonth: shiftMonth(state.plannedMonth, 1) })} aria-label="Next month">&gt;</button>
      </div>
      <button className="bottom-action" onClick={onNext}>Use this month</button>
    </StepCard>
  );
}

function CategoryStep({ state, onSelect, onFinish }: { state: PlannerState; onSelect: (step: FlowStep) => void; onFinish: () => void }) {
  return (
    <StepCard eyebrow="Life inputs" title="What do you need to add this month?" copy="Add the real-life commitments. Future Me will build the actual plan.">
      <div className="category-grid">
        {categoryCards.map((card) => (
          <button key={card.title} className="category-card" onClick={() => onSelect(card.step)}>
            <strong>{card.title}</strong>
            <span>{card.detail}</span>
          </button>
        ))}
      </div>
      <SummaryStrip state={state} />
      <button className="bottom-action" onClick={onFinish}>Build my month</button>
    </StepCard>
  );
}

function WorkTimeStep({ draft, onDraftChange, onNext }: { draft: WorkDraft; onDraftChange: (draft: WorkDraft) => void; onNext: () => void }) {
  return (
    <StepCard eyebrow="Work shifts" title="What time are you working?" copy="Set one shift pattern, then tap every date that uses it.">
      <div className="form-card two">
        <label>Start time<input type="time" value={draft.startTime} onChange={(e) => onDraftChange({ ...draft, startTime: e.target.value })} /></label>
        <label>End time<input type="time" value={draft.endTime} onChange={(e) => onDraftChange({ ...draft, endTime: e.target.value })} /></label>
      </div>
      <button className="bottom-action" onClick={onNext}>Choose work dates</button>
    </StepCard>
  );
}

function WorkDatesStep({
  state,
  draft,
  onDraftChange,
  onUpdate,
  onNext
}: {
  state: PlannerState;
  draft: WorkDraft;
  onDraftChange: (draft: WorkDraft) => void;
  onUpdate: (state: PlannerState) => void;
  onNext: () => void;
}) {
  const selected = draft.dates;
  function toggle(date: string) {
    const dates = selected.includes(date) ? selected.filter((item) => item !== date) : [...selected, date];
    onDraftChange({ ...draft, dates });
  }
  function save() {
    const inputs = selected.map((date) => ({
      id: crypto.randomUUID(),
      title: "Work shift",
      date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      category: "work" as Category,
      notes: `${draft.startTime}-${draft.endTime} shift`
    }));
    onUpdate({ ...state, monthlyInputs: [...state.monthlyInputs, ...inputs] });
    onDraftChange({ ...draft, dates: [] });
    onNext();
  }
  return (
    <StepCard eyebrow="Work dates" title="Which days are you working this shift?" copy={`${draft.startTime}-${draft.endTime}. Tap multiple days in ${monthLabel(state.plannedMonth)}.`}>
      <MonthGrid month={state.plannedMonth} selected={selected} onToggle={toggle} />
      <button className="bottom-action" onClick={save} disabled={selected.length === 0}>Save these shifts</button>
    </StepCard>
  );
}

function WorkAgainStep({ onAdd, onDone }: { onAdd: () => void; onDone: () => void }) {
  return (
    <StepCard eyebrow="Work shifts" title="Are you working any different times this month?" copy="Add another pattern for different start and end times.">
      <div className="choice-stack">
        <button className="choice selected" onClick={onAdd}><strong>Add another shift pattern</strong><span>Use a different time and select more dates.</span></button>
        <button className="choice" onClick={onDone}><strong>Done with work</strong><span>Return to monthly categories.</span></button>
      </div>
    </StepCard>
  );
}

function FixedEventStep({
  state,
  onUpdate,
  category,
  onDone
}: {
  state: PlannerState;
  onUpdate: (state: PlannerState) => void;
  category: "appointment" | "social";
  onDone: () => void;
}) {
  const [form, setForm] = useState({ title: "", date: `${state.plannedMonth}-01`, startTime: "10:00", endTime: "", location: "", notes: "" });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    onUpdate({
      ...state,
      monthlyInputs: [...state.monthlyInputs, toMonthlyInput(form, category)]
    });
    setForm({ ...form, title: "", notes: "", location: "" });
  }
  return (
    <StepCard eyebrow={categoryLabels[category]} title={category === "appointment" ? "Add an appointment" : "Add a social event"} copy="Save one, then add another if you need to.">
      <form className="form-card" onSubmit={submit}>
        <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={category === "appointment" ? "Doctor's appointment" : "Dinner with friends"} /></label>
        <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label>Start time<input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label>
        <label>End time optional<input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label>
        <label>Location optional<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <label>Notes optional<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <button type="submit">Save</button>
      </form>
      <button className="bottom-action secondary-action" onClick={onDone}>Done</button>
    </StepCard>
  );
}

function DeadlineStep({ state, onUpdate, onDone }: { state: PlannerState; onUpdate: (state: PlannerState) => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: "", date: `${state.plannedMonth}-01`, startTime: "17:00", importance: "High", effort: "Medium", notes: "" });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    onUpdate({
      ...state,
      monthlyInputs: [...state.monthlyInputs, {
        id: crypto.randomUUID(),
        title: form.title,
        date: form.date,
        startTime: form.startTime,
        endTime: addMinutes(form.startTime, 30),
        category: "deadline",
        notes: `${form.importance} importance. ${form.effort} effort. ${form.notes}`.trim()
      }]
    });
    setForm({ ...form, title: "", notes: "" });
  }
  return (
    <StepCard eyebrow="Deadlines" title="Add a deadline or assignment" copy="The planner will add preparation blocks before it depending on your capacity.">
      <form className="form-card" onSubmit={submit}>
        <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Research assignment due" /></label>
        <label>Due date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label>Due time optional<input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label>
        <label>Importance<select value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></label>
        <label>Estimated effort<select value={form.effort} onChange={(e) => setForm({ ...form, effort: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></label>
        <label>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <button type="submit">Save deadline</button>
      </form>
      <button className="bottom-action secondary-action" onClick={onDone}>Done</button>
    </StepCard>
  );
}

function RoutineStep({ state, onUpdate, onDone }: { state: PlannerState; onUpdate: (state: PlannerState) => void; onDone: () => void }) {
  const [form, setForm] = useState<Omit<Routine, "id">>({ name: "", frequency: "weekly", preferredDay: 1, preferredTime: "18:00", effort: "medium", category: "self-care", active: true });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    onUpdate({ ...state, routines: [...state.routines, { ...form, id: crypto.randomUUID() }] });
    setForm({ ...form, name: "" });
  }
  return (
    <StepCard eyebrow="Routines" title="Add repeating routines" copy="Routines stay saved until you turn them off or change them.">
      <form className="form-card" onSubmit={submit}>
        <label>Routine name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gym, food shop, clean, bedtime" /></label>
        <label>Frequency<select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as RoutineFrequency })}><option value="weekly">Weekly</option><option value="2x-weekly">2x weekly</option><option value="3x-weekly">3x weekly</option><option value="daily">Daily</option><option value="custom">Custom</option></select></label>
        <label>Preferred day<select value={form.preferredDay} onChange={(e) => setForm({ ...form, preferredDay: Number(e.target.value) })}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
        <label>Preferred time<input type="time" value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })} /></label>
        <label>Effort level<select value={form.effort} onChange={(e) => setForm({ ...form, effort: e.target.value as EffortLevel })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label>Type<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}><option value="gym">Gym</option><option value="food-shop">Food shop</option><option value="meal-prep">Meal prep</option><option value="cleaning">Cleaning</option><option value="study">Study</option><option value="self-care">Self-care</option></select></label>
        <label className="switch-row"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
        <button type="submit">Save routine</button>
      </form>
      <MiniList items={state.routines.map((routine) => `${routine.name} - ${routine.frequency}`)} />
      <button className="bottom-action secondary-action" onClick={onDone}>Done</button>
    </StepCard>
  );
}

function RulesStep({ state, onUpdate, onDone }: { state: PlannerState; onUpdate: (state: PlannerState) => void; onDone: () => void }) {
  function toggle(rule: PresetRule) {
    const selected = state.rules.selected.includes(rule)
      ? state.rules.selected.filter((item) => item !== rule)
      : [...state.rules.selected, rule];
    onUpdate({ ...state, rules: { ...state.rules, selected } });
  }
  return (
    <StepCard eyebrow="Personal rules" title="What should Future Me protect?" copy="Choose rules and add anything personal the planner should remember.">
      <div className="rule-stack">
        {presetRules.map((rule) => (
          <label key={rule.id} className="check-card">
            <input type="checkbox" checked={state.rules.selected.includes(rule.id)} onChange={() => toggle(rule.id)} />
            <span>{rule.label}</span>
          </label>
        ))}
      </div>
      <label className="form-card solo">Custom rule<textarea value={state.rules.custom} onChange={(e) => onUpdate({ ...state, rules: { ...state.rules, custom: e.target.value } })} placeholder="Type your own planning rule" /></label>
      <button className="bottom-action" onClick={onDone}>Save rules</button>
    </StepCard>
  );
}

function DailyApp({
  state,
  installPrompt,
  notificationStatus,
  onBack,
  onPlan,
  onWeeklyCheck,
  onComplete,
  onReschedule,
  onRequestNotifications
}: {
  state: PlannerState;
  installPrompt: any;
  notificationStatus: NotificationPermission | "unsupported";
  onBack: () => void;
  onPlan: () => void;
  onWeeklyCheck: () => void;
  onComplete: (task: PlannedTask) => void;
  onReschedule: (task: PlannedTask) => void;
  onRequestNotifications: () => void;
}) {
  const today = isoToday();
  const tasks = state.plannedTasks.filter((task) => task.date === today && task.sourceType !== "sleep");
  const unfinished = state.plannedTasks.filter((task) => task.sourceType !== "sleep" && !task.completed && new Date(`${task.date}T${task.endTime}`) < new Date());
  const visible = tasks.length ? tasks : unfinished.slice(0, 4);
  return (
    <main className="mobile-shell dashboard">
      <header className="dashboard-top">
        <button className="ghost-icon back-button dashboard-back" onClick={onBack} aria-label="Back">Back</button>
        <div>
          <p className="pill">FutureMe</p>
          <h1>Today</h1>
          <span>{formatDate(today)} - {capacityTitle(state.capacity)}</span>
        </div>
        <button className="ghost-icon filled" onClick={() => installPrompt?.prompt()} disabled={!installPrompt} aria-label="Install app">+</button>
      </header>

      <section className="today-card">
        <p className="eyebrow">Today only</p>
        <h2>{notificationMessage(state.settings.notificationPersonality, visible[0]?.title ?? "your next task", visible[0]?.startTime ?? "soon")}</h2>
        <button onClick={onRequestNotifications} disabled={notificationStatus === "granted" || notificationStatus === "unsupported"}>
          {notificationStatus === "granted" ? "Notifications on" : "Enable reminders"}
        </button>
      </section>

      <section className="task-section">
        <div className="section-title">
          <h2>Today's plan</h2>
          <span>{visible.length} active</span>
        </div>
        {visible.length === 0 ? <div className="empty-state">No tasks planned for today.</div> : visible.map((task) => (
          <article key={task.id} className={task.completed ? "task-card done" : "task-card"}>
            <div className={`dot ${task.category}`} />
            <div>
              <strong>{task.title}</strong>
              <span className="task-time">{task.startTime} - {task.endTime}</span>
              <span className="task-category">{categoryLabels[task.category]}</span>
              {task.notes && <p>{task.notes}</p>}
            </div>
            <button onClick={() => onComplete(task)} disabled={task.completed}>{task.completed ? "Done" : "Complete"}</button>
          </article>
        ))}
      </section>

      {unfinished.length > 0 && (
        <section className="task-section">
          <div className="section-title">
            <h2>Still active</h2>
            <span>{unfinished.length}</span>
          </div>
          {unfinished.slice(0, 5).map((task) => (
            <button key={task.id} className="unfinished-row" onClick={() => onReschedule(task)}>
              <span>{task.title}</span>
              <small>{formatDate(task.date)} - tap to reschedule</small>
            </button>
          ))}
        </section>
      )}

      <nav className="bottom-nav">
        <button className="active">Today</button>
        <button onClick={onWeeklyCheck}>Capacity</button>
        <button onClick={onPlan}>Plan month</button>
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
      {days.map((date) => date ? (
        <button key={date} className={selected.includes(date) ? "selected" : ""} onClick={() => onToggle(date)}>
          {Number(date.slice(8))}
        </button>
      ) : <span key={crypto.randomUUID()} />)}
    </div>
  );
}

function SummaryStrip({ state }: { state: PlannerState }) {
  return (
    <div className="summary-strip">
      <span>{state.monthlyInputs.length} commitments</span>
      <span>{state.routines.length} routines</span>
      <span>{state.rules.selected.length} rules</span>
    </div>
  );
}

function MiniList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return <div className="mini-list">{items.slice(-4).map((item) => <span key={item}>{item}</span>)}</div>;
}

function Loading({ message }: { message: string }) {
  return <main className="mobile-shell loading"><h1>FutureMe</h1><p>{message}</p></main>;
}

function toMonthlyInput(form: { title: string; date: string; startTime: string; endTime: string; location: string; notes: string }, category: Category): MonthlyInput {
  return {
    id: crypto.randomUUID(),
    title: form.title,
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime || addMinutes(form.startTime, 60),
    category,
    notes: [form.location, form.notes].filter(Boolean).join(" - ")
  };
}

function notificationMessage(personality: NotificationPersonality, title: string, time: string) {
  const when = time === "soon" || time.startsWith("in ") ? time : `at ${time}`;
  const messages: Record<NotificationPersonality, string> = {
    bestie: `Hey girlie pop, ${title} is ${when}. Let's get ready.`,
    gentle: `Soft reminder, ${title} is ${when}. Start getting ready when you can.`,
    coach: `${title} ${when}. Get ready and follow the plan.`,
    professional: `Reminder: ${title} is scheduled ${when}. Please prepare accordingly.`,
    chaos: `BESTIE. ${title} is ${when}. Shoes. Water. Go mode.`
  };
  return messages[personality];
}

function previousStep(step: FlowStep, state: PlannerState): FlowStep {
  if (state.setupComplete && (step === "capacity" || step === "categories")) return "review";
  const order: FlowStep[] = ["welcome", "capacity", "personality", "month", "categories"];
  const index = order.indexOf(step);
  if (index > 0) return order[index - 1];
  if (step !== "welcome" && step !== "review") return "categories";
  return "welcome";
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

function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
}

function capacityTitle(capacity: CapacityMode) {
  return capacities.find((item) => item.id === capacity)?.title ?? "Normal Capacity";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = (hours * 60 + mins + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
