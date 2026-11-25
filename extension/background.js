// FutureMe Job Helper: finds new jobs once a day, keeps her approved applications and
// remembered answers, and opens Trac when she says "Looks good, apply".
// Everything stays in this browser (chrome.storage). Nothing is sent anywhere else.

const DEFAULT_SEARCH =
  "https://www.healthjobsuk.com/job_list?JobSearch_q=&JobSearch_d=&JobSearch_g=305&JobSearch_re=_POST&JobSearch_re_0=1&JobSearch_re_1=1-_-_-&JobSearch_re_2=1-_-_--_-_-&JobSearch_Submit=Search&_tr=JobSearch";
const FUTUREME_URLS = ["https://futureme.thetechbuilder.co.uk/*", "http://127.0.0.1/*", "http://localhost/*"];
const REFRESH_EVERY_HOURS = 20;

// ---------- storage ----------
async function load() {
  const data = await chrome.storage.local.get(["settings", "jobs", "answers", "applications", "lastRefresh"]);
  return {
    settings: data.settings || { searchUrl: DEFAULT_SEARCH },
    jobs: data.jobs || {},
    answers: data.answers || {},
    applications: data.applications || {},
    lastRefresh: data.lastRefresh || null
  };
}

const save = (patch) => chrome.storage.local.set(patch);

async function publicState() {
  const state = await load();
  return {
    version: chrome.runtime.getManifest().version,
    settings: state.settings,
    lastRefresh: state.lastRefresh,
    answers: state.answers,
    applications: state.applications,
    jobs: Object.values(state.jobs).sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || ""))
  };
}

async function mergeJobs(found) {
  const { jobs } = await load();
  const now = new Date().toISOString();
  for (const job of found) {
    const existing = jobs[job.vacancyId];
    jobs[job.vacancyId] = { ...existing, ...job, firstSeen: existing?.firstSeen || now, lastSeen: now, details: existing?.details };
  }
  // Keep the list from growing forever: drop jobs not seen for 45 days.
  const cutoff = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString();
  for (const [id, job] of Object.entries(jobs)) if ((job.lastSeen || "") < cutoff) delete jobs[id];
  await save({ jobs });
}

// ---------- parsing (service workers have no DOMParser) ----------
async function parse(type, html, baseUrl) {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (!contexts.length) {
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["DOM_PARSER"], justification: "Read job listings" });
  }
  return chrome.runtime.sendMessage({ target: "offscreen", type, html, baseUrl });
}

// ---------- finding jobs ----------
let refreshTabId = null;

async function refreshJobs() {
  const { settings } = await load();
  const url = settings.searchUrl || DEFAULT_SEARCH;
  let found = [];
  try {
    const response = await fetch(url, { credentials: "include" });
    if (response.ok) found = await parse("parse-list", await response.text(), url);
  } catch {
    found = [];
  }
  if (found.length) {
    await mergeJobs(found);
    sweepClosed().catch(() => {});
  } else {
    // Some sites only show results to a normal page load, so load it in a quiet background tab;
    // the HealthJobsUK script reads it and we close the tab again.
    const tab = await chrome.tabs.create({ url, active: false });
    refreshTabId = tab.id;
    setTimeout(() => closeRefreshTab(), 45000);
    return;
  }
  await save({ lastRefresh: new Date().toISOString() });
  await pushToFutureMe("jobs", await publicState());
}

function closeRefreshTab() {
  if (refreshTabId === null) return;
  chrome.tabs.remove(refreshTabId).catch(() => {});
  refreshTabId = null;
}

async function refreshIfStale() {
  const { lastRefresh } = await load();
  if (!lastRefresh || Date.now() - Date.parse(lastRefresh) > REFRESH_EVERY_HOURS * 3600 * 1000) await refreshJobs();
}

async function jobDetails(vacancyId) {
  const { jobs } = await load();
  const job = jobs[vacancyId];
  if (!job) throw new Error("That job isn't in your list any more.");
  if (job.details?.text) return job.details;
  const response = await fetch(job.url, { credentials: "include" });
  if (!response.ok) throw new Error("Couldn't open the job page. Try again in a minute.");
  const details = await parse("parse-job", await response.text(), job.url);
  const latest = await load();
  if (latest.jobs[vacancyId]) {
    latest.jobs[vacancyId].details = details;
    if (details.closed) latest.jobs[vacancyId].closed = true;
    await save({ jobs: latest.jobs });
  }
  return details;
}

async function markClosed({ vacancyId }) {
  const { jobs, applications } = await load();
  if (jobs[vacancyId]) jobs[vacancyId].closed = true;
  if (applications[vacancyId] && applications[vacancyId].status !== "submitted") applications[vacancyId].status = "closed";
  await save({ jobs, applications });
  await pushToFutureMe("jobs", await publicState());
  return true;
}

// Checks a few open jobs per refresh (oldest first) and marks any that have closed,
// so her list doesn't fill with jobs she can't apply for.
async function sweepClosed(limit = 15) {
  const { jobs, applications } = await load();
  const open = Object.values(jobs)
    .filter((job) => !job.closed && applications[job.vacancyId]?.status !== "submitted")
    .sort((a, b) => (a.checkedAt || a.firstSeen || "").localeCompare(b.checkedAt || b.firstSeen || ""))
    .slice(0, limit);
  let changed = false;
  for (const job of open) {
    try {
      const response = await fetch(job.url, { credentials: "include" });
      const latest = await load();
      const entry = latest.jobs[job.vacancyId];
      if (!entry) continue;
      entry.checkedAt = new Date().toISOString();
      if (response.status === 404 || response.status === 410) entry.closed = true;
      else if (response.ok) {
        const details = await parse("parse-job", await response.text(), job.url);
        entry.details = details;
        if (details.closed) entry.closed = true;
      }
      if (entry.closed && latest.applications[job.vacancyId] && latest.applications[job.vacancyId].status !== "submitted") latest.applications[job.vacancyId].status = "closed";
      await save({ jobs: latest.jobs, applications: latest.applications });
      changed = true;
    } catch {
      // try again next time
    }
  }
  if (changed) await pushToFutureMe("jobs", await publicState());
}

// ---------- applying ----------
async function startApplication({ vacancyId, statement }) {
  const { jobs, applications } = await load();
  const job = jobs[vacancyId];
  if (!job) throw new Error("That job isn't in your list any more.");
  const details = await jobDetails(vacancyId).catch(() => ({}));
  const applyUrl = details.applyUrl || `https://apps.trac.jobs/job-advert/${vacancyId}`;
  applications[vacancyId] = {
    vacancyId,
    title: job.title,
    employer: job.employer,
    statement,
    applyUrl,
    status: "filling",
    updatedAt: new Date().toISOString()
  };
  await save({ applications });
  const tab = await chrome.tabs.create({ url: applyUrl, active: true });
  const { tabApps = {} } = await chrome.storage.session.get("tabApps");
  tabApps[tab.id] = vacancyId;
  await chrome.storage.session.set({ tabApps });
  return { opened: true };
}

async function setApplicationStatus({ vacancyId, status }) {
  if (!vacancyId) return;
  const { applications } = await load();
  if (!applications[vacancyId]) return;
  applications[vacancyId] = { ...applications[vacancyId], status, updatedAt: new Date().toISOString() };
  await save({ applications });
  await pushToFutureMe("jobs", await publicState());
}

async function pushToFutureMe(push, payload) {
  const tabs = await chrome.tabs.query({ url: FUTUREME_URLS });
  for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { push, payload }).catch(() => {});
}

// ---------- messages ----------
const handlers = {
  async getState() {
    refreshIfStale().catch(() => {});
    return publicState();
  },
  async refreshJobs() {
    await refreshJobs();
    return publicState();
  },
  getJobDetails: ({ vacancyId }) => jobDetails(vacancyId),
  startApplication: (payload) => startApplication(payload),
  async saveAnswers(learned) {
    const { answers } = await load();
    await save({ answers: { ...answers, ...learned } });
    await pushToFutureMe("jobs", await publicState());
    return true;
  },
  async setAnswers(answers) {
    await save({ answers: answers || {} });
    return publicState();
  },
  async getSettings() {
    return (await load()).settings;
  },
  async saveSettings(patch) {
    const { settings } = await load();
    await save({ settings: { ...settings, ...patch } });
    if (patch.searchUrl) refreshJobs().catch(() => {});
    return true;
  },
  async jobsSeen({ jobs }, sender) {
    await mergeJobs(jobs);
    if (sender.tab?.id === refreshTabId) {
      closeRefreshTab();
      await save({ lastRefresh: new Date().toISOString() });
    }
    await pushToFutureMe("jobs", await publicState());
    return true;
  },
  async getApplicationForTab(_payload, sender) {
    const { tabApps = {} } = await chrome.storage.session.get("tabApps");
    const vacancyId = tabApps[sender.tab?.id];
    if (!vacancyId) return null;
    const { applications, answers } = await load();
    return { application: applications[vacancyId] || null, answers };
  },
  applicationStatus: (payload) => setApplicationStatus(payload),
  markClosed: (payload) => markClosed(payload),
  async checkClosed() {
    await sweepClosed(40);
    return publicState();
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target === "offscreen") return false;
  const handler = handlers[message?.type];
  if (!handler) return false;
  // FutureMe's page may only use the FutureMe-facing messages.
  const pageOnly = ["checkClosed", "getState", "refreshJobs", "getJobDetails", "startApplication", "setAnswers", "saveSettings"];
  if (message.fromFutureMe && !pageOnly.includes(message.type)) return false;
  Promise.resolve(handler(message.payload || {}, sender))
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ error: String(error?.message || error) }));
  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { tabApps = {} } = await chrome.storage.session.get("tabApps");
  if (tabApps[tabId]) {
    delete tabApps[tabId];
    await chrome.storage.session.set({ tabApps });
  }
});

// Daily check while Chrome is open.
chrome.runtime.onInstalled.addListener(() => chrome.alarms.create("refresh", { periodInMinutes: 180 }));
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("refresh", { periodInMinutes: 180 });
  refreshIfStale().catch(() => {});
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refresh") refreshIfStale().catch(() => {});
});

// Clicking the toolbar icon opens FutureMe's Jobs page.
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: "https://futureme.thetechbuilder.co.uk/?view=jobs" }));
