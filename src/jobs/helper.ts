// Talks to the FutureMe Job Helper Chrome extension (on her laptop) through window messages.

export type HelperJob = {
  vacancyId: string;
  title: string;
  employer: string;
  location: string;
  speciality: string;
  salary: string;
  band: string;
  url: string;
  firstSeen?: string;
  lastSeen?: string;
};

export type HelperApplication = {
  vacancyId: string;
  title: string;
  employer: string;
  status: "filling" | "ready" | "submitted";
  updatedAt: string;
};

export type HelperState = {
  version: string;
  settings: { searchUrl?: string };
  lastRefresh: string | null;
  answers: Record<string, string>;
  applications: Record<string, HelperApplication>;
  jobs: HelperJob[];
};

export type JobDetails = { text: string; applyUrl: string; closingDate: string };

type Reply = { source: "futureme-extension"; id?: string; ok?: boolean; result?: unknown; error?: string; push?: string };

export function helperInstalled() {
  return Boolean(document.documentElement.dataset.futuremeHelper);
}

let counter = 0;

export function callHelper<T>(type: string, payload?: unknown, timeoutMs = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = `fm-${Date.now()}-${(counter += 1)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("The job helper didn't answer. Is it switched on in Chrome?"));
    }, timeoutMs);
    function onMessage(event: MessageEvent<Reply>) {
      if (event.source !== window || event.data?.source !== "futureme-extension" || event.data.id !== id) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (event.data.ok) resolve(event.data.result as T);
      else reject(new Error(event.data.error || "Something went wrong."));
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "futureme-page", id, type, payload }, window.location.origin);
  });
}

export function onHelperPush(listener: (push: string, result: unknown) => void) {
  function onMessage(event: MessageEvent<Reply>) {
    if (event.source !== window || event.data?.source !== "futureme-extension" || !event.data.push) return;
    listener(event.data.push, event.data.result);
  }
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}
