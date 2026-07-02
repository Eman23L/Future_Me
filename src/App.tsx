import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LocalPlannerRepository } from "./data/LocalPlannerRepository";
import { createSeedState } from "./data/seed";
import { PlannerService } from "./services/PlannerService";
import { getBrowserSupabase, identityFromSession, resolveInitialAccount, type AccountIdentity } from "./services/auth";
import type {
  CapacityMode,
  Category,
  EffortLevel,
  MonthlyInput,
  NotificationPersonality,
  PlannedTask,
  PlannerState,
  Routine
} from "./models/types";
import { categoryLabels } from "./models/types";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallControls = {
  isStandalone: boolean;
  onInstall: () => void;
};

type ScheduledReminderPayload = {
  taskId: string;
  title: string;
  body: string;
  scheduledFor: string;
  notificationVibe: NotificationPersonality;
  taskDate: string;
  taskCategory: Category;
};

type ReminderDebugState = {
  permission: NotificationPermission | "unsupported" | "unknown";
  serviceWorkerReady: boolean;
  pushSubscriptionCreated: boolean;
  backendStatus: string;
  backendError: string;
};

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
  effort: EffortLevel;
  preferredDay: number;
  preferredTime: string;
  priority: Routine["priority"];
};

const setupSteps: FlowStep[] = ["start", "loading", "month", "flexible", "capacity", "personality", "generating", "review"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const USER_ID_KEY = "future-me:user-id";
const NOTIFICATIONS_ENABLED_KEY = "future-me:notifications-enabled";
const PUSH_ENDPOINT_KEY = "future-me:push-endpoint";
const emptyReminderDebug: ReminderDebugState = {
  permission: "unknown",
  serviceWorkerReady: false,
  pushSubscriptionCreated: false,
  backendStatus: "",
  backendError: ""
};

const capacities: Array<{ id: CapacityMode; title: string; detail: string }> = [
  { id: "high", title: "I have plenty in me", detail: "Plan a fuller week." },
  { id: "normal", title: "I feel steady", detail: "Keep things balanced." },
  { id: "tired", title: "I need a softer week", detail: "Reduce the pressure." },
  { id: "survival", title: "Just the essentials", detail: "Only what really needs doing." }
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
    effort: "high",
    preferredDay: 1,
    preferredTime: "09:00",
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
    effort: "medium",
    preferredDay: 6,
    preferredTime: "10:00",
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
    effort: "medium",
    preferredDay: 0,
    preferredTime: "15:00",
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
    effort: "medium",
    preferredDay: 6,
    preferredTime: "14:00",
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
    effort: "low",
    preferredDay: 2,
    preferredTime: "20:00",
    priority: "high"
  }
];

export function App() {
  const [authReady, setAuthReady] = useState(false);
  const [accountIdentity, setAccountIdentity] = useState<AccountIdentity | null>(null);
  const [state, setState] = useState<PlannerState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<FlowStep>("start");
  const [workDraft, setWorkDraft] = useState<WorkDraft>({ startTime: "07:30", endTime: "20:30", dates: [] });
  const [fixedDraft, setFixedDraft] = useState<FixedDraft>(emptyFixedDraft(""));
  const [flexibleConfigs, setFlexibleConfigs] = useState<FlexibleConfig[]>(defaultFlexibleConfigs);
  const [realToday, setRealToday] = useState(isoToday());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [showReminderInstructions, setShowReminderInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(isStandaloneMode());
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true");
  const [notificationNotice, setNotificationNotice] = useState("");
  const [reminderDebug, setReminderDebug] = useState<ReminderDebugState>(emptyReminderDebug);
  const [showReminderDebug, setShowReminderDebug] = useState(false);
  const [scheduledReminderCount, setScheduledReminderCount] = useState<number | null>(null);
  const [pushEndpoint, setPushEndpoint] = useState(localStorage.getItem(PUSH_ENDPOINT_KEY) ?? "");
  const stepRef = useRef(step);
  const lastHistoryStep = useRef<FlowStep | null>(null);
  const storageNamespace = accountIdentity ? `future-me:account:${accountIdentity.userId}` : "";
  const service = useMemo(
    () => new PlannerService(new LocalPlannerRepository(storageNamespace)),
    [storageNamespace]
  );

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let mounted = true;

    resolveInitialAccount()
      .then((identity) => {
        if (!mounted) return;
        setAccountIdentity(identity);
        setAuthReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : "Unable to verify sign-in link.");
        setAuthReady(true);
      });

    const authSubscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAccountIdentity(identityFromSession(session));
      setState(null);
      setSelectedDate(null);
    }).data.subscription;

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    const today = isoToday();
    const monthKey = today.slice(0, 7);
    const requestedDate = new URLSearchParams(window.location.search).get("date");
    setRealToday(today);
    service.load(monthKey)
      .then(async (loaded) => {
        const withCurrentMonth = loaded.plannedMonth === monthKey ? loaded : { ...loaded, plannedMonth: monthKey, setupComplete: false };
        const withPlan = withCurrentMonth.setupComplete ? await service.generate(withCurrentMonth) : withCurrentMonth;
        setFlexibleConfigs(configsFromRoutines(withPlan.routines));
        setSelectedDate(requestedDate && withPlan.setupComplete ? requestedDate : null);
        setStep(requestedDate && withPlan.setupComplete ? "review" : "start");
        setState(withPlan);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load planner data."));
  }, [authReady, service]);

  useEffect(() => {
    stepRef.current = step;
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));

    if (lastHistoryStep.current !== step) {
      window.history.pushState({ futureMe: true, step }, "", window.location.href);
      lastHistoryStep.current = step;
    }
  }, [step, selectedDate]);

  useEffect(() => {
    window.history.replaceState({ futureMe: true, step: stepRef.current }, "", window.location.href);
    window.history.pushState({ futureMe: true, step: stepRef.current, guard: true }, "", window.location.href);
    lastHistoryStep.current = stepRef.current;

    const onPopState = () => {
      const currentStep = stepRef.current;
      if (currentStep === "start") {
        window.history.pushState({ futureMe: true }, "", window.location.href);
        return;
      }

      const targetStep = currentStep === "review"
        ? "month"
        : currentStep === "calendar"
          ? "review"
          : previousStep(currentStep);

      if (currentStep === "review") {
        setStep(targetStep);
      } else if (currentStep === "calendar") {
        setStep(targetStep);
      } else {
        setStep(targetStep);
      }
      lastHistoryStep.current = targetStep;
      window.history.pushState({ futureMe: true, step: targetStep, guard: true }, "", window.location.href);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const today = isoToday();
      if (today === realToday) return;
      setRealToday(today);
      void handleDateRollover(today);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [realToday, state, selectedDate, step]);

  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const appInstalledListener = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", listener);
    window.addEventListener("appinstalled", appInstalledListener);
    setIsStandalone(isStandaloneMode());
    return () => {
      window.removeEventListener("beforeinstallprompt", listener);
      window.removeEventListener("appinstalled", appInstalledListener);
    };
  }, []);

  async function update(next: PlannerState) {
    setState(next);
    await service.save(next);
  }

  function getActiveUserId() {
    return accountIdentity?.userId ?? getLocalUserId();
  }

  async function handleDateRollover(today: string) {
    const monthKey = today.slice(0, 7);
    if (!state || state.plannedMonth !== monthKey) {
      const loaded = await service.load(monthKey);
      const withPlan = loaded.setupComplete ? await service.generate(loaded) : loaded;
      setState(withPlan);
      setFlexibleConfigs(configsFromRoutines(withPlan.routines));
      setSelectedDate(null);
      if (step !== "start") setStep(initialStepForPlan(withPlan, today));
      return;
    }

    if (step !== "start" && !selectedDate && state.setupComplete) {
      setStep(initialStepForPlan(state, today));
    }
  }

  function beginSetup() {
    setStep("loading");
    window.setTimeout(() => setStep("month"), 850);
  }

  function continueCurrentPlan() {
    if (!state) return;
    setSelectedDate(null);
    setStep(initialStepForPlan(state, realToday));
  }

  function goHome() {
    setSelectedDate(null);
    setStep("start");
  }

  function startNewMonth() {
    const fresh = createSeedState(realToday.slice(0, 7));
    setState(fresh);
    setFlexibleConfigs(defaultFlexibleConfigs);
    setFixedDraft(emptyFixedDraft(fresh.plannedMonth));
    setWorkDraft({ startTime: "07:30", endTime: "20:30", dates: [] });
    setSelectedDate(null);
    setStep("loading");
    window.setTimeout(() => setStep("month"), 850);
  }

  async function changePlanMonth(monthKey: string, completedStep: FlowStep = "review") {
    const loaded = await service.load(monthKey);
    const withPlan = loaded.setupComplete ? await service.generate(loaded) : loaded;
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
    const timeWasDefaulted = !fixedDraft.startTime;
    const fallbackStart = category === "social" ? "18:00" : category === "appointment" ? "12:00" : "09:00";
    const startTime = fixedDraft.startTime || fallbackStart;
    const endTime =
      category === "social" && timeWasDefaulted
        ? "20:00"
        : fixedDraft.endTime || addMinutes(startTime, category === "deadline" ? 30 : 60);
    const input: MonthlyInput = category === "deadline"
      ? {
        id: crypto.randomUUID(),
        title: fixedDraft.title,
        date: fixedDraft.date,
        startTime,
        endTime: addMinutes(startTime, 30),
        category,
        fixed: true,
        effort: effortFromLabel(fixedDraft.effort),
        priority: "essential",
        notes: `${fixedDraft.importance} importance. ${fixedDraft.effort} effort. ${timeWasDefaulted ? "Due time not set." : ""} ${fixedDraft.notes}`.trim(),
        timeWasDefaulted
      }
      : {
        id: crypto.randomUUID(),
        title: fixedDraft.title,
        date: fixedDraft.date,
        startTime,
        endTime,
        category,
        fixed: true,
        effort: category === "appointment" ? "medium" : "low",
        priority: "essential",
        notes: [fixedDraft.location, timeWasDefaulted ? "Time estimated" : "", fixedDraft.notes].filter(Boolean).join(" - "),
        timeWasDefaulted
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
        frequency: "weekly",
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
    void syncScheduledReminders(generated);
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
    void syncScheduledReminders(generated);
    setState(generated);
    setSelectedDate(null);
    setStep("review");
  }

  async function patchTask(taskId: string, patch: Partial<PlannedTask>) {
    if (!state) return;
    setState(await service.updateTask(state, taskId, patch));
  }

  async function requestNotifications() {
    setNotificationNotice("");
    setShowReminderDebug(false);
    setReminderDebug(emptyReminderDebug);

    if (isIosSafari() && !isStandaloneMode()) {
      const nextDebug = { ...emptyReminderDebug, backendError: "iPhone Home Screen install required." };
      console.info("[FutureMe reminders] iOS Safari is not standalone.", nextDebug);
      setReminderDebug(nextDebug);
      setShowReminderDebug(true);
      setShowReminderInstructions(true);
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      const nextDebug = { ...emptyReminderDebug, permission: "unsupported" as const, backendError: "Notification, service worker, or PushManager is not supported." };
      console.info("[FutureMe reminders] Browser support check failed.", nextDebug);
      setReminderDebug(nextDebug);
      setShowReminderDebug(true);
      setNotificationStatus("unsupported");
      setShowReminderInstructions(true);
      return;
    }

    const permission = await Notification.requestPermission();
    console.info("[FutureMe reminders] Notification permission:", permission);
    setNotificationStatus(permission);
    setReminderDebug((current) => ({ ...current, permission }));

    if (permission !== "granted") {
      setReminderDebug({ ...emptyReminderDebug, permission, backendError: "Permission denied" });
      setShowReminderDebug(true);
      setNotificationNotice("Permission denied. Notifications are not enabled yet.");
      return;
    }

    let reminderStage = "Reminder setup";
    try {
      reminderStage = "VAPID public key";
      const vapidPublicKey = await getVapidPublicKey();
      console.info("[FutureMe reminders] VAPID public key loaded.");
      reminderStage = "Service worker registration";
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.info("[FutureMe reminders] Service worker registration succeeded.", registration.scope);
      const readyRegistration = await navigator.serviceWorker.ready.then((ready) => ready ?? registration);
      setReminderDebug((current) => ({ ...current, serviceWorkerReady: true }));
      console.info("[FutureMe reminders] Service worker ready.");
      reminderStage = "Push subscription";
      const existingSubscription = await readyRegistration.pushManager.getSubscription();
      const subscription = existingSubscription ?? await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      setReminderDebug((current) => ({ ...current, pushSubscriptionCreated: true }));
      console.info("[FutureMe reminders] Push subscription ready.", {
        reused: Boolean(existingSubscription),
        endpoint: subscription.endpoint
      });

      reminderStage = "Backend save";
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getActiveUserId(),
          userAgent: navigator.userAgent,
          subscription: subscription.toJSON()
        })
      });
      const responseText = await response.text();
      console.info("[FutureMe reminders] Subscription save response.", {
        status: response.status,
        body: responseText
      });

      if (!response.ok) {
        const backendError = parseBackendError(responseText);
        setReminderDebug((current) => ({
          ...current,
          backendStatus: String(response.status),
          backendError
        }));
        setShowReminderDebug(true);
        throw new Error(`Backend save failed: ${backendError || response.status}`);
      }

      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");
      localStorage.setItem(PUSH_ENDPOINT_KEY, subscription.endpoint);
      setPushEndpoint(subscription.endpoint);
      setNotificationsEnabled(true);
      setNotificationNotice("Reminders are on. FutureMe can now nudge you from your schedule.");
      setReminderDebug((current) => ({ ...current, backendStatus: String(response.status), backendError: "" }));
      if (state) await syncScheduledReminders(state);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Reminder setup did not finish.";
      const message =
        rawMessage.startsWith("Backend save failed")
          ? rawMessage
          : reminderStage === "Service worker registration"
            ? `Service worker registration failed: ${rawMessage}`
            : reminderStage === "Push subscription"
              ? `Push subscription failed: ${rawMessage}`
              : reminderStage === "VAPID public key"
                ? `VAPID public key failed: ${rawMessage}`
                : rawMessage;
      console.error("[FutureMe reminders] Reminder setup failed.", error);
      setReminderDebug((current) => ({ ...current, backendError: current.backendError || message }));
      setShowReminderDebug(true);
      setNotificationNotice(message);
    }
  }

  async function sendTestReminder() {
    setNotificationNotice("");
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getActiveUserId(),
          endpoint: pushEndpoint || localStorage.getItem(PUSH_ENDPOINT_KEY)
        })
      });

      if (!response.ok) throw new Error("The test reminder could not be sent yet.");
      setNotificationNotice("Test reminder sent.");
    } catch (error) {
      setNotificationNotice(error instanceof Error ? error.message : "The test reminder could not be sent yet.");
    }
  }

  async function sendDueRemindersNow() {
    setNotificationNotice("");
    try {
      const response = await fetch("/api/reminders/send-due", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getActiveUserId() })
      });
      const responseText = await response.text();

      if (!response.ok) throw new Error(parseBackendError(responseText));

      const result = JSON.parse(responseText) as { checked?: number; sent?: number; failed?: number };
      setNotificationNotice(`Due reminders checked: ${result.checked ?? 0}. Sent: ${result.sent ?? 0}. Failed: ${result.failed ?? 0}.`);
    } catch (error) {
      setNotificationNotice(error instanceof Error ? error.message : "Due reminders could not be sent yet.");
    }
  }

  function dismissReminderPrompt() {
    setNotificationNotice("No problem. You can enable reminders here later.");
  }

  async function syncScheduledReminders(nextState: PlannerState) {
    if (!nextState.setupComplete) return;

    try {
      const response = await fetch("/api/reminders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getActiveUserId(),
          monthKey: nextState.plannedMonth,
          reminders: buildScheduledReminders(nextState)
        })
      });
      const responseText = await response.text();
      if (!response.ok) throw new Error(parseBackendError(responseText));
      const result = JSON.parse(responseText) as { pendingCount?: number; count?: number };
      setScheduledReminderCount(result.pendingCount ?? result.count ?? null);
    } catch {
      // Reminder sync is best-effort; the local planner should keep working offline.
    }
  }

  async function handleInstallApp() {
    if (isStandaloneMode()) {
      setIsStandalone(true);
      return;
    }

    if (installPrompt && !isIosSafari()) {
      await installPrompt.prompt();
      await installPrompt.userChoice?.catch(() => undefined);
      setInstallPrompt(null);
      return;
    }

    setShowInstallInstructions(true);
  }

  const installControls = {
    isStandalone,
    onInstall: handleInstallApp
  };

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
        installControls={installControls}
        notificationStatus={notificationStatus}
        notificationsEnabled={notificationsEnabled}
        notificationNotice={notificationNotice}
        reminderDebug={reminderDebug}
        showReminderDebug={showReminderDebug}
        onDateChange={setSelectedDate}
        onToday={() => setSelectedDate(null)}
        onBack={() => setStep("month")}
        onHome={goHome}
        onPlan={() => setStep("calendar")}
        onWeeklyCheck={() => setStep("capacity")}
        onComplete={(task) => patchTask(task.id, { completed: true, missed: false })}
        onRequestNotifications={requestNotifications}
        onDismissNotifications={dismissReminderPrompt}
        onTestReminder={sendTestReminder}
        onSendDueReminders={sendDueRemindersNow}
        scheduledReminderCount={scheduledReminderCount}
      >
        <InstallInstructionsModal open={showInstallInstructions} onClose={() => setShowInstallInstructions(false)} />
        <ReminderInstructionsModal open={showReminderInstructions} onClose={() => setShowReminderInstructions(false)} />
      </DailyApp>
    );
  }

  if (state.setupComplete && step === "calendar") {
    return (
      <MonthCalendarApp
        state={state}
        realToday={realToday}
        installControls={installControls}
        onBack={() => setStep("review")}
        onHome={goHome}
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
      >
        <InstallInstructionsModal open={showInstallInstructions} onClose={() => setShowInstallInstructions(false)} />
        <ReminderInstructionsModal open={showReminderInstructions} onClose={() => setShowReminderInstructions(false)} />
      </MonthCalendarApp>
    );
  }

  return (
    <FlowShell step={step} state={state} installControls={installControls} onBack={() => setStep(previousStep(step))} onHome={goHome}>
      {step === "start" && <StartScreen hasSavedData={hasSavedData(state)} onSetup={beginSetup} onContinue={continueCurrentPlan} onStartNewMonth={startNewMonth} />}
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
      <InstallInstructionsModal open={showInstallInstructions} onClose={() => setShowInstallInstructions(false)} />
      <ReminderInstructionsModal open={showReminderInstructions} onClose={() => setShowReminderInstructions(false)} />
    </FlowShell>
  );
}

function FlowShell({
  children,
  step,
  state,
  installControls,
  onBack,
  onHome
}: {
  children: React.ReactNode;
  step: FlowStep;
  state: PlannerState;
  installControls: InstallControls;
  onBack: () => void;
  onHome: () => void;
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
          <InstallButton controls={installControls} />
        </header>
      )}
      <div className="flow-content">{children}</div>
      {showHeader && (
        <footer className="flow-footer">
          <button type="button" className="home-action" onClick={onHome} disabled={step === "start"}>Home</button>
          <p className="storage-note">Saved on this device for {monthLabel(state.plannedMonth)}. UI fix v2</p>
        </footer>
      )}
    </main>
  );
}

function StartScreen({
  hasSavedData,
  onSetup,
  onContinue,
  onStartNewMonth
}: {
  hasSavedData: boolean;
  onSetup: () => void;
  onContinue: () => void;
  onStartNewMonth: () => void;
}) {
  return (
    <section className="welcome-card">
      <p className="pill">FutureMe</p>
      <h1>Welcome to your gentle plan</h1>
      <p>Tell me what is already in your month, and I will shape the rest around your time, energy and care.</p>
      <button className="bottom-action" onClick={onSetup}>Set up</button>
      <div className="welcome-actions">
        <button className="secondary-action" onClick={onContinue} disabled={!hasSavedData}>Continue current plan</button>
        <button className="secondary-action" onClick={onStartNewMonth}>Start new month</button>
      </div>
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
      <p className="sleep-fix-marker">Sleep oval spacing fix v6</p>
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
                <p className="capacity-helper">I'll decide how often to fit this in based on your weekly capacity.</p>
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
  installControls,
  notificationStatus,
  notificationsEnabled,
  notificationNotice,
  reminderDebug,
  showReminderDebug,
  onDateChange,
  onToday,
  onBack,
  onHome,
  onPlan,
  onWeeklyCheck,
  onComplete,
  onRequestNotifications,
  onDismissNotifications,
  onTestReminder,
  onSendDueReminders,
  scheduledReminderCount,
  children
}: {
  state: PlannerState;
  visibleDate: string;
  realToday: string;
  isViewingToday: boolean;
  installControls: InstallControls;
  notificationStatus: NotificationPermission | "unsupported";
  notificationsEnabled: boolean;
  notificationNotice: string;
  reminderDebug: ReminderDebugState;
  showReminderDebug: boolean;
  onDateChange: (date: string) => void;
  onToday: () => void;
  onBack: () => void;
  onHome: () => void;
  onPlan: () => void;
  onWeeklyCheck: () => void;
  onComplete: (task: PlannedTask) => void;
  onRequestNotifications: () => void;
  onDismissNotifications: () => void;
  onTestReminder: () => void;
  onSendDueReminders: () => void;
  scheduledReminderCount: number | null;
  children?: React.ReactNode;
}) {
  const tasks = daySchedule(state, visibleDate);
  const dueToday = dueTodayItems(state, visibleDate);
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
        <InstallButton controls={installControls} filled />
      </header>

      <section className="today-card">
        <p className="eyebrow">A note from FutureMe</p>
        <h2>{notificationMessage(state.settings.notificationPersonality, nextTask?.title ?? "your next task", nextTask?.startTime ?? "soon")}</h2>
        <p className="reminder-copy">I can remind you before work, gym, appointments, deadlines and prep tasks.</p>
        {notificationsEnabled && (
          <p className="reminder-copy">
            Reminders are on. FutureMe will nudge you from your schedule.
            {scheduledReminderCount !== null ? ` ${scheduledReminderCount} scheduled reminders are pending.` : ""}
          </p>
        )}
        <div className="reminder-actions">
          <button onClick={onRequestNotifications} disabled={notificationsEnabled && notificationStatus === "granted"}>
            {notificationsEnabled && notificationStatus === "granted" ? "Reminders are on" : "Enable reminders"}
          </button>
          {!notificationsEnabled && <button className="secondary-action" onClick={onDismissNotifications}>Not now</button>}
          {notificationsEnabled && <button className="secondary-action" onClick={onTestReminder}>Send test reminder</button>}
          {notificationsEnabled && <button className="secondary-action" onClick={onSendDueReminders}>Send due reminders now</button>}
        </div>
        {notificationNotice && <p className="reminder-status">{notificationNotice}</p>}
        {showReminderDebug && <ReminderDebugPanel debug={reminderDebug} />}
      </section>

      {dueToday.length > 0 && (
        <section className="task-section due-section">
          <div className="section-title">
            <h2>Due today</h2>
            <span>{dueToday.length} item{dueToday.length === 1 ? "" : "s"}</span>
          </div>
          {dueToday.map((task) => (
            <article key={task.id} className="due-row">
              <strong>{task.title}</strong>
              <small>Due today - Set by you</small>
              {task.notes && <span>{task.notes.replace("Due time not set.", "").trim()}</span>}
            </article>
          ))}
        </section>
      )}

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
              <span>{scheduleTimeText(task)}</span>
              <small>{scheduleSourceLabel(task)} - {displayCategoryLabel(task)}</small>
              {task.timeWasDefaulted && <small>Time estimated</small>}
            </div>
            {isCompletableTask(task) && <button onClick={() => onComplete(task)} disabled={task.completed}>{task.completed ? "Done" : "Complete"}</button>}
          </article>
        ))}
      </section>

      <nav className="bottom-nav">
        <button className={isViewingToday ? "active" : ""} onClick={onToday}>{isViewingToday ? "Today" : "Current day"}</button>
        <button onClick={onWeeklyCheck}>Energy</button>
        <button onClick={onPlan}>Month</button>
        <button onClick={onHome}>Home</button>
      </nav>
      {children}
    </main>
  );
}

function MonthCalendarApp({
  state,
  realToday,
  installControls,
  onBack,
  onHome,
  onMonthChange,
  onSelectDate,
  onToday,
  onWeeklyCheck,
  children
}: {
  state: PlannerState;
  realToday: string;
  installControls: InstallControls;
  onBack: () => void;
  onHome: () => void;
  onMonthChange: (monthKey: string) => void;
  onSelectDate: (date: string) => void;
  onToday: () => void;
  onWeeklyCheck: () => void;
  children?: React.ReactNode;
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
        <InstallButton controls={installControls} filled />
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
        <button onClick={onHome}>Home</button>
      </nav>
      {children}
    </main>
  );
}

function InstallButton({ controls, filled = false }: { controls: InstallControls; filled?: boolean }) {
  if (controls.isStandalone) return null;

  return (
    <button
      type="button"
      className={filled ? "ghost-icon filled install-button" : "ghost-icon install-button"}
      aria-label="Install FutureMe"
      onClick={controls.onInstall}
    >
      +
    </button>
  );
}

function InstallInstructionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="install-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="install-modal" role="dialog" aria-modal="true" aria-labelledby="install-modal-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="install-modal-title">Add FutureMe to your Home Screen</h2>
        <ol>
          <li>Tap the Share button in Safari</li>
          <li>Scroll down</li>
          <li>Tap "Add to Home Screen"</li>
          <li>Tap "Add"</li>
        </ol>
        <button type="button" className="bottom-action" onClick={onClose}>Got it</button>
      </section>
    </div>
  );
}

function ReminderInstructionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="install-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="install-modal" role="dialog" aria-modal="true" aria-labelledby="reminder-modal-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="reminder-modal-title">Add FutureMe to your Home Screen</h2>
        <p className="modal-copy">To enable reminders on iPhone:</p>
        <ol>
          <li>Tap the Share button in Safari</li>
          <li>Tap Add to Home Screen</li>
          <li>Open FutureMe from your Home Screen</li>
          <li>Then tap Enable reminders</li>
        </ol>
        <StandaloneDebugLine />
        <button type="button" className="bottom-action" onClick={onClose}>Got it</button>
      </section>
    </div>
  );
}

function StandaloneDebugLine() {
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const standalone = navigatorStandalone || displayModeStandalone;

  return (
    <p className="standalone-debug">
      standalone: {String(standalone)} | navigator.standalone: {String(navigatorStandalone)} | display-mode standalone: {String(displayModeStandalone)}
    </p>
  );
}

function ReminderDebugPanel({ debug }: { debug: ReminderDebugState }) {
  return (
    <div className="reminder-debug" role="status">
      <span>permission: {debug.permission}</span>
      <span>serviceWorkerReady: {String(debug.serviceWorkerReady)}</span>
      <span>pushSubscriptionCreated: {String(debug.pushSubscriptionCreated)}</span>
      <span>backendStatus: {debug.backendStatus || "n/a"}</span>
      <span>backendError: {debug.backendError || "n/a"}</span>
    </div>
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
        preferredDay: routine.preferredDay,
        preferredTime: routine.preferredTime,
        effort: routine.effort,
        priority: routine.priority ?? config.priority
      }
      : config;
  });
}

function hasSavedData(state: PlannerState) {
  return state.setupComplete || state.monthlyInputs.length > 0 || state.routines.length > 0 || state.plannedTasks.length > 0;
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
    .filter((task) => !(task.category === "deadline" && task.timeWasDefaulted))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return [
    {
      id: `wake-${date}`,
      sourceId: `sleep-${date}`,
      sourceType: "sleep" as const,
      title: "Wake up",
      date,
      startTime: state.settings.wakeTime,
      endTime: state.settings.wakeTime,
      category: "self-care" as Category,
      notes: "Start the day gently",
      effort: "low" as EffortLevel,
      lock: "fixed" as const,
      priority: "essential" as const,
      completed: false,
      missed: false
    },
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
      notes: "Wind down for the night",
      effort: "low" as EffortLevel,
      lock: "fixed" as const,
      priority: "essential" as const,
      completed: false,
      missed: false
    }
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function dueTodayItems(state: PlannerState, date: string) {
  return state.plannedTasks
    .filter((task) => task.date === date && task.category === "deadline" && task.timeWasDefaulted)
    .sort((a, b) => a.title.localeCompare(b.title));
}

function tasksForCalendarDay(state: PlannerState, date: string) {
  return state.plannedTasks
    .filter((task) => task.date === date && task.sourceType !== "sleep")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function scheduleTimeText(task: PlannedTask) {
  if (task.sourceType === "sleep") return task.notes ?? (task.title === "Bedtime" ? "Wind down for the night" : "Daily anchor");
  if (task.category === "deadline" && task.timeWasDefaulted) return "Due today";
  return `${task.startTime} - ${task.endTime}`;
}

function scheduleSourceLabel(task: PlannedTask) {
  if (task.sourceType === "sleep") return "Daily anchor";
  if (task.category === "deadline" && task.timeWasDefaulted) return "Due today";
  return task.lock === "fixed" ? "Set by you" : "Placed by FutureMe";
}

function displayCategoryLabel(task: PlannedTask) {
  if (task.sourceType === "sleep") return task.title === "Bedtime" ? "Sleep" : "Daily anchor";
  return categoryLabels[task.category];
}

function isCompletableTask(task: PlannedTask) {
  if (task.sourceType === "sleep") return false;
  if (task.category === "deadline" || task.category === "appointment" || task.category === "social") return false;
  return task.sourceType === "routine" || task.sourceType === "prep" || task.category === "study" || task.category === "work";
}

function emptyFixedDraft(month: string): FixedDraft {
  return {
    title: "",
    startTime: "",
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
  const when = time === "soon" || time === "now" || time.startsWith("in ") ? time : `at ${time}`;
  const messages: Record<NotificationPersonality, string> = {
    bestie: `Hey girlie pop, ${title} is ${when}. Let's get ready.`,
    gentle: `Soft reminder, ${title} is coming up ${when}. Start getting ready when you can.`,
    coach: `${title} ${when}. Get your kit ready and follow the plan.`,
    professional: `Reminder: ${title} is scheduled ${when}. Please prepare accordingly.`,
    chaos: `BESTIE. ${title} is ${when}. Shoes. Water. Go mode.`
  };
  return messages[personality];
}

function buildScheduledReminders(state: PlannerState): ScheduledReminderPayload[] {
  const now = Date.now();
  const reminders: ScheduledReminderPayload[] = [];

  state.plannedTasks
    .filter((task) => task.sourceType !== "sleep" && !task.completed)
    .forEach((task) => {
      const vibe = state.settings.notificationPersonality;
      const addReminder = (kind: ReminderKind, scheduledFor: string) => {
        if (new Date(scheduledFor).getTime() <= now) return;
        reminders.push({
          taskId: task.id,
          title: "FutureMe reminder",
          body: reminderBody(vibe, task, kind),
          scheduledFor,
          notificationVibe: vibe,
          taskDate: task.date,
          taskCategory: task.category
        });
      };

      if (task.category === "work") {
        addReminder("work-evening-before", localDateTimeToIso(offsetDate(task.date, -1), "20:00"));
        addReminder("work-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
        return;
      }

      if (task.category === "appointment") {
        addReminder("appointment-day-before", addMinutesToLocalDateTime(task.date, task.startTime, -24 * 60));
        addReminder("appointment-two-hours", addMinutesToLocalDateTime(task.date, task.startTime, -120));
        return;
      }

      if (task.category === "social") {
        if (task.timeWasDefaulted) {
          addReminder("social-untimed-morning", localDateTimeToIso(task.date, "10:00"));
        } else {
          addReminder("social-morning-of", localDateTimeToIso(task.date, "10:00"));
          addReminder("social-two-hours", addMinutesToLocalDateTime(task.date, task.startTime, -120));
        }
        return;
      }

      if (task.category === "deadline") {
        if (task.timeWasDefaulted) {
          addReminder("deadline-untimed-day-before", localDateTimeToIso(offsetDate(task.date, -1), "18:00"));
          addReminder("deadline-morning-of", localDateTimeToIso(task.date, "09:00"));
        } else {
          addReminder("deadline-day-before", addMinutesToLocalDateTime(task.date, task.startTime, -24 * 60));
          if (timeToMinutes(task.startTime) > timeToMinutes("09:00")) {
            addReminder("deadline-morning-of", localDateTimeToIso(task.date, "09:00"));
          }
        }
        return;
      }

      if (task.category === "gym") {
        addReminder("gym-evening-before", localDateTimeToIso(offsetDate(task.date, -1), "20:00"));
        addReminder("gym-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
        return;
      }

      if (task.category === "self-care") {
        addReminder("self-care-thirty-minutes", addMinutesToLocalDateTime(task.date, task.startTime, -30));
        return;
      }

      if (task.category === "cleaning") addReminder("cleaning-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
      if (task.category === "meal-prep") addReminder("meal-prep-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
      if (task.category === "food-shop") addReminder("food-shop-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
      if (task.sourceType === "prep" && task.category !== "meal-prep") addReminder("prep-one-hour", addMinutesToLocalDateTime(task.date, task.startTime, -60));
    });

  return reminders;
}

type ReminderKind =
  | "work-evening-before"
  | "work-one-hour"
  | "appointment-day-before"
  | "appointment-two-hours"
  | "social-morning-of"
  | "social-two-hours"
  | "social-untimed-morning"
  | "deadline-day-before"
  | "deadline-untimed-day-before"
  | "deadline-morning-of"
  | "gym-evening-before"
  | "gym-one-hour"
  | "cleaning-one-hour"
  | "meal-prep-one-hour"
  | "food-shop-one-hour"
  | "self-care-thirty-minutes"
  | "prep-one-hour";

function reminderBody(personality: NotificationPersonality, task: PlannedTask, kind: ReminderKind) {
  const title = task.title;

  if (kind === "work-evening-before") {
    const messages: Record<NotificationPersonality, string> = {
      bestie: "Work tomorrow. Uniform, lunch, water bottle — future you says thanks.",
      gentle: "Gentle reminder: work is tomorrow. Uniform, lunch and water bottle when you can.",
      coach: "Work tomorrow. Prep uniform, lunch and water bottle tonight.",
      professional: "Reminder: work is scheduled tomorrow. Please prepare your essentials.",
      chaos: "BESTIE. Work tomorrow. Uniform. Lunch. Water bottle. Future you says thanks."
    };
    return messages[personality];
  }

  if (kind === "work-one-hour") {
    const messages: Record<NotificationPersonality, string> = {
      bestie: "Work starts in 1 hour. Time to get ready.",
      gentle: "Soft reminder: work starts in 1 hour. Start getting ready when you can.",
      coach: "Work starts in 1 hour. Get ready and follow the plan.",
      professional: "Reminder: work starts in 1 hour. Please prepare accordingly.",
      chaos: "WORK IN 1 HOUR. Shoes. Bag. Water. Go mode."
    };
    return messages[personality];
  }

  if (kind === "appointment-day-before") {
    return vibeLine(personality, `${title} is tomorrow.`, `${title} is tomorrow. Check the time, place and anything you need.`);
  }

  if (kind === "appointment-two-hours") {
    return vibeLine(personality, `${title} is in 2 hours.`, `${title} is in 2 hours. Leave yourself enough time to get ready.`);
  }

  if (kind === "social-morning-of") {
    return vibeLine(personality, `${title} is today.`, `${title} is today. Check plans and give yourself space to get ready.`);
  }

  if (kind === "social-two-hours") {
    return vibeLine(personality, `${title} is in 2 hours.`, `${title} is in 2 hours. Time to start easing into it.`);
  }

  if (kind === "social-untimed-morning") {
    return vibeLine(personality, `${title} is today.`, `${title} is today. The time was not set, so check the plan when you can.`);
  }

  if (kind === "deadline-day-before") {
    const messages: Record<NotificationPersonality, string> = {
      bestie: `Hey girlie pop, ${title} is due tomorrow. Tiny steady steps now.`,
      gentle: `Soft reminder, ${title} is due tomorrow. Give yourself a calm check-in today.`,
      coach: `${title} is due tomorrow. Review the final pieces today.`,
      professional: `Reminder: ${title} is due tomorrow. Please review your preparation.`,
      chaos: `BESTIE. ${title} is tomorrow. Open the thing. Finish the thing.`
    };
    return messages[personality];
  }

  if (kind === "deadline-untimed-day-before") {
    return vibeLine(personality, `${title} is due tomorrow.`, `${title} is due tomorrow. No due time was set, so give it some attention today.`);
  }

  if (kind === "deadline-morning-of") {
    const messages: Record<NotificationPersonality, string> = {
      bestie: `Hey girlie pop, ${title} is today. Let's keep it simple and steady.`,
      gentle: `Soft reminder, ${title} is today. Start with the next kind step.`,
      coach: `${title} is today. Check the plan and move early.`,
      professional: `Reminder: ${title} is scheduled for today.`,
      chaos: `BESTIE. ${title} is today. Main character admin mode.`
    };
    return messages[personality];
  }

  if (kind === "gym-evening-before") return vibeLine(personality, "Gym is tomorrow.", "Gym is tomorrow. Put your kit, water and shoes somewhere easy.");
  if (kind === "gym-one-hour") return notificationMessage(personality, "Gym", "in about an hour");
  if (kind === "cleaning-one-hour") return vibeLine(personality, "Cleaning is in 1 hour.", "Cleaning is in 1 hour. Keep it simple and start with one reset.");
  if (kind === "meal-prep-one-hour") return vibeLine(personality, "Meal prep is in 1 hour.", "Meal prep is in 1 hour. Future you will be grateful.");
  if (kind === "food-shop-one-hour") return vibeLine(personality, "Food shop is in 1 hour.", "Food shop is in 1 hour. Check your list before you go.");
  if (kind === "self-care-thirty-minutes") return vibeLine(personality, "Self-care is in 30 minutes.", "Self-care is in 30 minutes. Protect the reset.");
  if (kind === "prep-one-hour") return vibeLine(personality, `${title} is in 1 hour.`, `${title} is in 1 hour. A small prep block now will help later.`);

  return notificationMessage(personality, title, "soon");
}

function vibeLine(personality: NotificationPersonality, shortLine: string, gentleLine: string) {
  const messages: Record<NotificationPersonality, string> = {
    bestie: `Hey girlie pop, ${shortLine} You've got this.`,
    gentle: `Soft reminder: ${gentleLine}`,
    coach: `${shortLine} Get ready and follow the plan.`,
    professional: `Reminder: ${shortLine}`,
    chaos: `BESTIE. ${shortLine} Do the thing.`
  };
  return messages[personality];
}

function localDateTimeToIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

function addMinutesToLocalDateTime(date: string, time: string, minutes: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, mins] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hours, mins);
  value.setMinutes(value.getMinutes() + minutes);
  return value.toISOString();
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

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
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

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/.test(ua);
  return isIos && isSafari;
}

function getLocalUserId() {
  const existing = localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const userId = crypto.randomUUID();
  localStorage.setItem(USER_ID_KEY, userId);
  return userId;
}

async function getVapidPublicKey() {
  const viteEnv = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;
  const viteKey = viteEnv?.VITE_VAPID_PUBLIC_KEY;

  if (viteKey && typeof viteKey === "string") {
    return viteKey;
  }

  const response = await fetch("/api/push/public-key");
  if (!response.ok) throw new Error("Unable to load VAPID public key");
  const data = await response.json() as { publicKey?: string };
  if (!data.publicKey) throw new Error("VAPID public key missing from API response");
  return data.publicKey;
}

function parseBackendError(responseText: string) {
  if (!responseText) return "Backend save failed with an empty response.";
  try {
    const parsed = JSON.parse(responseText) as { error?: string; code?: string; details?: string; hint?: string };
    return [parsed.error, parsed.code, parsed.details, parsed.hint].filter(Boolean).join(" - ") || responseText;
  } catch {
    return responseText;
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
