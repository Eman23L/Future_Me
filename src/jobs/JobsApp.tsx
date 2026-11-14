import { useCallback, useEffect, useMemo, useState } from "react";
import { callHelper, helperInstalled, onHelperPush, type HelperJob, type HelperState, type JobDetails } from "./helper";
import { writeStatement, type CriterionResult } from "./statementWriter";

// Jobs: a daily list of new NHS jobs (found by the Chrome helper on her laptop), a preview of
// everything that will go into the application, and one tap to have it filled in on Trac.

const STORAGE_KEY = "future-me:jobs:v1";
const WORD_LIMIT = 1500;

type Profile = { previousStatement: string; aboutMe: string; alwaysMention: string };
type JobsStore = { profile: Profile; skipped: Record<string, true>; drafts: Record<string, string> };

const emptyStore: JobsStore = { profile: { previousStatement: "", aboutMe: "", alwaysMention: "" }, skipped: {}, drafts: {} };

function loadStore(): JobsStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return parsed ? { ...emptyStore, ...parsed, profile: { ...emptyStore.profile, ...parsed.profile } } : emptyStore;
  } catch {
    return emptyStore;
  }
}

const wordCount = (value: string) => (value.trim() ? value.trim().split(/\s+/).length : 0);
const hasPlaceholders = (value: string) => /\[[^\]]{3,}\]/.test(value);

type View = { name: "list" } | { name: "profile" } | { name: "apply"; job: HelperJob };
type Filter = "new" | "applying" | "skipped";

export function JobsApp({ nav }: { nav: React.ReactNode }) {
  const [installed, setInstalled] = useState(helperInstalled());
  const [helper, setHelper] = useState<HelperState | null>(null);
  const [store, setStore] = useState<JobsStore>(loadStore);
  const [view, setView] = useState<View>({ name: "list" });
  const [filter, setFilter] = useState<Filter>("new");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const saveStore = useCallback((next: JobsStore) => {
    setStore(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked: keep working in memory.
    }
  }, []);

  const loadHelper = useCallback(async () => {
    try {
      setHelper(await callHelper<HelperState>("getState"));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, []);

  useEffect(() => {
    const stop = onHelperPush((push, result) => {
      if (push === "ready") setInstalled(true);
      if (push === "jobs") setHelper(result as HelperState);
    });
    const check = window.setTimeout(() => setInstalled(helperInstalled()), 400);
    return () => {
      stop();
      window.clearTimeout(check);
    };
  }, []);

  useEffect(() => {
    if (installed) loadHelper();
  }, [installed, loadHelper]);

  async function refresh() {
    setBusy("Checking for new jobs…");
    try {
      setHelper(await callHelper<HelperState>("refreshJobs", undefined, 120000));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy("");
    }
  }

  const lists = useMemo(() => {
    const jobs = helper?.jobs ?? [];
    const applications = helper?.applications ?? {};
    return {
      new: jobs.filter((job) => !store.skipped[job.vacancyId] && !applications[job.vacancyId]),
      applying: jobs.filter((job) => applications[job.vacancyId]),
      skipped: jobs.filter((job) => store.skipped[job.vacancyId] && !applications[job.vacancyId])
    };
  }, [helper, store.skipped]);

  if (view.name === "profile") {
    return (
      <ProfileScreen
        profile={store.profile}
        answers={helper?.answers ?? {}}
        nav={nav}
        onBack={() => setView({ name: "list" })}
        onSave={(profile) => {
          saveStore({ ...store, profile });
          setView({ name: "list" });
        }}
        onForget={async (question) => {
          const answers = { ...(helper?.answers ?? {}) };
          delete answers[question];
          setHelper(await callHelper<HelperState>("setAnswers", answers));
        }}
      />
    );
  }

  if (view.name === "apply") {
    return (
      <ApplyScreen
        job={view.job}
        profile={store.profile}
        answers={helper?.answers ?? {}}
        draft={store.drafts[view.job.vacancyId] ?? ""}
        nav={nav}
        onDraftChange={(statement) => saveStore({ ...store, drafts: { ...store.drafts, [view.job.vacancyId]: statement } })}
        onBack={() => setView({ name: "list" })}
        onEditProfile={() => setView({ name: "profile" })}
        onApplied={() => {
          setFilter("applying");
          setView({ name: "list" });
          loadHelper();
        }}
      />
    );
  }

  const shown = lists[filter];
  const profileMissing = !store.profile.previousStatement.trim() && !store.profile.aboutMe.trim();

  return (
    <main className="mobile-shell dashboard jobs-app">
      <header className="dashboard-top">
        <div>
          <p className="pill">FutureMe</p>
          <h1>Jobs</h1>
          <span>
            {helper?.lastRefresh ? `Checked ${relativeTime(helper.lastRefresh)}` : "New NHS jobs, picked out for you each day."}
          </span>
        </div>
      </header>

      {!installed ? (
        <SetupCard />
      ) : (
        <>
          <div className="jobs-toolbar">
            <button className="secondary-action" onClick={refresh} disabled={Boolean(busy)}>{busy || "Check for new jobs"}</button>
            <button className="secondary-action" onClick={() => setView({ name: "profile" })}>Your details</button>
          </div>
          {profileMissing && (
            <section className="reminder-banner" role="status">
              <strong>Add your details first</strong>
              <span>Paste your last supporting statement so FutureMe can write each new one in your voice.</span>
              <div className="reminder-banner-actions">
                <button onClick={() => setView({ name: "profile" })}>Add my details</button>
              </div>
            </section>
          )}
          {error && <p className="jobs-error" role="alert">{error}</p>}

          <div className="pill-row jobs-filter" role="tablist">
            {(["new", "applying", "skipped"] as Filter[]).map((key) => (
              <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? "option-pill selected" : "option-pill"} onClick={() => setFilter(key)}>
                {key === "new" ? `New (${lists.new.length})` : key === "applying" ? `Applied (${lists.applying.length})` : `Skipped (${lists.skipped.length})`}
              </button>
            ))}
          </div>

          <section className="jobs-list">
            {shown.length === 0 && (
              <div className="empty-state">
                {filter === "new" ? "No new jobs right now. FutureMe checks every day while Chrome is open." : "Nothing here yet."}
              </div>
            )}
            {shown.map((job) => {
              const application = helper?.applications[job.vacancyId];
              return (
                <article key={job.vacancyId} className="job-card">
                  <div className="job-card-main">
                    <strong>{job.title}</strong>
                    <span>{[job.employer, job.location].filter(Boolean).join(" · ")}</span>
                    <small>{[job.band, job.speciality].filter(Boolean).join(" · ")}</small>
                    {job.salary && <small>{job.salary}</small>}
                    {application && <small className="ready-chip">{statusLabel(application.status)}</small>}
                  </div>
                  <div className="job-card-actions">
                    <a className="secondary-action" href={job.url} target="_blank" rel="noreferrer">View advert</a>
                    {filter === "new" && (
                      <button className="secondary-action" onClick={() => saveStore({ ...store, skipped: { ...store.skipped, [job.vacancyId]: true } })}>Skip</button>
                    )}
                    {filter === "skipped" && (
                      <button className="secondary-action" onClick={() => {
                        const skipped = { ...store.skipped };
                        delete skipped[job.vacancyId];
                        saveStore({ ...store, skipped });
                      }}>Bring back</button>
                    )}
                    {application?.status !== "submitted" && (
                      <button className="bottom-action" onClick={() => setView({ name: "apply", job })}>
                        {application ? "Carry on applying" : "Apply now"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
      {nav}
    </main>
  );
}

function SetupCard() {
  const onLaptop = !/iPhone|iPad|iPod|Android|Mobile/.test(navigator.userAgent);
  if (!onLaptop) {
    return (
      <section className="task-section jobs-setup">
        <h2>Jobs works on your laptop</h2>
        <p>Open FutureMe in Chrome on your laptop to see your job list and apply. Everything else stays here on your phone.</p>
      </section>
    );
  }
  return (
    <section className="task-section jobs-setup">
      <h2>Set up the job helper (once)</h2>
      <ol>
        <li><a href="/downloads/futureme-job-helper.zip" download>Download the FutureMe Job Helper</a> and double-click the file to unzip it.</li>
        <li>In Chrome, go to <code>chrome://extensions</code> and switch on <strong>Developer mode</strong> (top right).</li>
        <li>Click <strong>Load unpacked</strong> and choose the unzipped <strong>futureme-job-helper</strong> folder.</li>
        <li>Come back to this page and refresh it.</li>
      </ol>
      <p>Then go to HealthJobsUK, search for the jobs you want (e.g. Nursing &amp; Midwifery, Band 5, sorted by Newest) and tap <strong>Yes, use it</strong> on the FutureMe box. FutureMe checks that search every day.</p>
    </section>
  );
}

function ProfileScreen({
  profile,
  answers,
  nav,
  onBack,
  onSave,
  onForget
}: {
  profile: Profile;
  answers: Record<string, string>;
  nav: React.ReactNode;
  onBack: () => void;
  onSave: (profile: Profile) => void;
  onForget: (question: string) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const remembered = Object.entries(answers);
  return (
    <main className="mobile-shell dashboard jobs-app">
      <header className="dashboard-top">
        <button className="ghost-icon back-button dashboard-back" onClick={onBack} aria-label="Back">Back</button>
        <div>
          <p className="pill">Jobs</p>
          <h1>Your details</h1>
          <span>Used to write each supporting statement in your voice. Saved on this laptop only.</span>
        </div>
      </header>
      <section className="task-section jobs-form">
        <label>
          Your last supporting statement
          <textarea rows={12} value={draft.previousStatement} onChange={(event) => setDraft({ ...draft, previousStatement: event.target.value })} placeholder="Paste the supporting information from a recent application" />
        </label>
        <label>
          Your experience in your own words
          <textarea rows={8} value={draft.aboutMe} onChange={(event) => setDraft({ ...draft, aboutMe: event.target.value })} placeholder="Placements, roles, skills, training, examples you're proud of" />
        </label>
        <label>
          Anything to always mention (optional)
          <textarea rows={3} value={draft.alwaysMention} onChange={(event) => setDraft({ ...draft, alwaysMention: event.target.value })} placeholder="e.g. qualifying January 2027, NIPE training" />
        </label>
        <button className="bottom-action" onClick={() => onSave(draft)}>Save my details</button>
      </section>

      <section className="task-section jobs-form">
        <h2>Answers FutureMe remembers</h2>
        <p className="capacity-helper">When Trac asks something new, FutureMe asks you once on the page and fills it in after that. Remove any answer to be asked again.</p>
        {remembered.length === 0 ? (
          <div className="empty-state">Nothing yet. These appear after your first application.</div>
        ) : (
          <ul className="added-list">
            {remembered.map(([question, answer]) => (
              <li key={question}>
                <span><strong>{question}</strong><br />{answer}</span>
                <button type="button" onClick={() => onForget(question)} aria-label={`Forget answer to ${question}`}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {nav}
    </main>
  );
}

function ApplyScreen({
  job,
  profile,
  answers,
  draft,
  nav,
  onDraftChange,
  onBack,
  onEditProfile,
  onApplied
}: {
  job: HelperJob;
  profile: Profile;
  answers: Record<string, string>;
  draft: string;
  nav: React.ReactNode;
  onDraftChange: (statement: string) => void;
  onBack: () => void;
  onEditProfile: () => void;
  onApplied: () => void;
}) {
  const [details, setDetails] = useState<JobDetails | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const profileMissing = !profile.previousStatement.trim() && !profile.aboutMe.trim();

  const [criteria, setCriteria] = useState<CriterionResult[]>([]);

  // Written on this device from her own sentences: free and instant.
  const writeDraft = useCallback((jobDetails: JobDetails, replace = true) => {
    const result = writeStatement({ title: job.title, employer: job.employer, speciality: job.speciality, text: jobDetails.text }, profile);
    setCriteria(result.criteria);
    if (replace) onDraftChange(result.statement);
  }, [job, profile, onDraftChange]);

  useEffect(() => {
    let cancelled = false;
    setStatus("Reading the job advert…");
    callHelper<JobDetails>("getJobDetails", { vacancyId: job.vacancyId })
      .then((result) => {
        if (cancelled) return;
        setDetails(result);
        setStatus("");
        if (!profileMissing) writeDraft(result, !draft);
      })
      .catch((reason) => {
        if (cancelled) return;
        setStatus("");
        setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
    };
    // Load once per job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.vacancyId]);

  const words = wordCount(draft);
  const placeholders = hasPlaceholders(draft);
  const canApply = Boolean(draft.trim()) && !placeholders && words <= WORD_LIMIT && !opening;

  async function apply() {
    setOpening(true);
    setError("");
    try {
      await callHelper("startApplication", { vacancyId: job.vacancyId, statement: draft.trim() });
      onApplied();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setOpening(false);
    }
  }

  const remembered = Object.entries(answers);

  return (
    <main className="mobile-shell dashboard jobs-app">
      <header className="dashboard-top">
        <button className="ghost-icon back-button dashboard-back" onClick={onBack} aria-label="Back">Back</button>
        <div>
          <p className="pill">Preview</p>
          <h1>{job.title}</h1>
          <span>{[job.employer, job.location, job.band, details?.closingDate ? `Closes ${details.closingDate}` : ""].filter(Boolean).join(" · ")}</span>
        </div>
      </header>

      {status && <p className="jobs-status" role="status">{status}</p>}
      {error && <p className="jobs-error" role="alert">{error}</p>}
      {profileMissing && (
        <section className="reminder-banner" role="status">
          <strong>Add your details first</strong>
          <span>FutureMe needs your last supporting statement or some notes to write this one.</span>
          <div className="reminder-banner-actions"><button onClick={onEditProfile}>Add my details</button></div>
        </section>
      )}

      <section className="task-section jobs-form">
        <div className="jobs-section-head">
          <h2>Supporting information</h2>
          {details && !profileMissing && (
            <button className="secondary-action" onClick={() => { if (!draft.trim() || window.confirm("Start again from your details? Your edits to this statement will be replaced.")) writeDraft(details); }} disabled={Boolean(status)}>Start again</button>
          )}
        </div>
        <p className="capacity-helper">Built from your own sentences, matched to this job's person specification. Read it through and change anything that isn't quite right.</p>
        {criteria.length > 0 && <CoverageList criteria={criteria} />}
        <textarea className="jobs-statement" rows={18} value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder={status ? "" : "Your supporting statement for this job"} />
        <small className={words > WORD_LIMIT ? "jobs-error" : "capacity-helper"}>{words} / {WORD_LIMIT} words</small>
        {placeholders && <p className="jobs-error">Fill in the parts in [square brackets] before applying.</p>}
      </section>

      <section className="task-section jobs-form">
        <h2>Everything else</h2>
        <p className="capacity-helper">Trac copies your personal details, education, training, registration, employment history and references from your most recent application. FutureMe goes through each section, saves it and marks it complete.</p>
        {remembered.length > 0 && (
          <>
            <p className="capacity-helper">It will also use these answers you gave before:</p>
            <ul className="added-list">
              {remembered.map(([question, answer]) => (
                <li key={question}><span><strong>{question}</strong><br />{answer}</span></li>
              ))}
            </ul>
          </>
        )}
        <p className="capacity-helper">Anything new, it asks you on the page. It never presses Submit. You do that.</p>
      </section>

      <button className="bottom-action jobs-apply" onClick={apply} disabled={!canApply}>
        {opening ? "Opening Trac…" : "Looks good, apply"}
      </button>
      {nav}
    </main>
  );
}

function CoverageList({ criteria }: { criteria: CriterionResult[] }) {
  const essential = criteria.filter((criterion) => criterion.essential);
  const covered = essential.filter((criterion) => criterion.covered).length;
  const missing = criteria.filter((criterion) => !criterion.covered);
  return (
    <details className="jobs-coverage">
      <summary>Covers {covered} of {essential.length} essential criteria{missing.length ? ` · ${missing.length} not mentioned` : ""}</summary>
      <ul>
        {criteria.map((criterion) => (
          <li key={criterion.text} className={criterion.covered ? "covered" : "missing"}>
            <span aria-hidden="true">{criterion.covered ? "✓" : "○"}</span> {criterion.text}{criterion.essential ? "" : " (desirable)"}
          </li>
        ))}
      </ul>
      {missing.length > 0 && <p className="capacity-helper">Add a line about any of the ○ ones you can honestly show, or add them to Your details so they're used next time.</p>}
    </details>
  );
}

function statusLabel(status: string) {
  if (status === "submitted") return "Submitted ✓";
  if (status === "ready") return "Filled in. Check and submit on Trac";
  return "Filling in on Trac";
}

function relativeTime(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
