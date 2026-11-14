import Anthropic from "@anthropic-ai/sdk";
import { allowPostOnly, getRequestBody, sendJson } from "../_lib/supabase.js";

// Drafts an NHS supporting statement for one job from her own previous statement and notes.
// She always reads and edits it in FutureMe before anything is sent to Trac.

const ALLOWED_ORIGINS = [/^https:\/\/futureme\.thetechbuilder\.co\.uk$/, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/];
const MAX_JOB_CHARS = 30000;
const MAX_PROFILE_CHARS = 20000;
const recentByIp = new Map(); // light abuse guard; resets when the function cold-starts

const SYSTEM = `You write supporting statements (the "Supporting information" section) for NHS job applications on Trac, for a UK nurse/midwife.

Write in her own voice. Her previous supporting statement and notes show how she writes; keep her tone, phrasing and warmth, and reuse her real examples.

Rules:
- Use only facts from her notes and previous statement. Never invent experience, placements, employers, dates, qualifications, training, skills or results.
- Show how she meets the essential (and, where she genuinely can, desirable) criteria in this job's person specification, in a natural order, using her real examples.
- Say why she wants this particular role and organisation, drawing on the job advert (service, values, what the role involves).
- If an essential criterion has no evidence in her material, do not claim it. Instead add a short bracketed prompt for her to fill in, like "[add an example of …]". Use at most two of these.
- Do not include personal details (address, phone, email, NI number) or repeat her employment history line by line.
- UK English, first person, plain paragraphs. No headings, bullet points or markdown. About 600-900 words, and never more than the word limit given.
- Output only the statement text.`;

function originAllowed(request) {
  const origin = request.headers.origin || "";
  return ALLOWED_ORIGINS.some((pattern) => pattern.test(origin));
}

function tooFrequent(request) {
  const ip = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (recentByIp.get(ip) || []).filter((time) => now - time < 60 * 60 * 1000);
  recent.push(now);
  recentByIp.set(ip, recent);
  return recent.length > 30;
}

const clip = (value, limit) => String(value || "").slice(0, limit);

export default async function handler(request, response) {
  if (!allowPostOnly(request, response)) return;
  if (!originAllowed(request)) {
    sendJson(response, 403, { error: "Not allowed" });
    return;
  }
  if (tooFrequent(request)) {
    sendJson(response, 429, { error: "Too many drafts this hour. Try again later." });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    sendJson(response, 503, { error: "Statement drafting isn't switched on yet (ANTHROPIC_API_KEY is missing in Vercel)." });
    return;
  }

  let body;
  try {
    body = await getRequestBody(request);
  } catch {
    sendJson(response, 400, { error: "Invalid request" });
    return;
  }
  const job = body.job || {};
  const profile = body.profile || {};
  const wordLimit = Math.min(Number(body.wordLimit) || 1500, 1500);
  if (!job.title || !job.text) {
    sendJson(response, 400, { error: "The job details are missing." });
    return;
  }
  if (!profile.previousStatement && !profile.aboutMe) {
    sendJson(response, 400, { error: "Add your previous statement or some notes about your experience first." });
    return;
  }

  const userContent = [
    `<job>\nTitle: ${clip(job.title, 300)}\nEmployer: ${clip(job.employer, 300)}\n\n${clip(job.text, MAX_JOB_CHARS)}\n</job>`,
    `<her_previous_statement>\n${clip(profile.previousStatement, MAX_PROFILE_CHARS)}\n</her_previous_statement>`,
    `<her_notes>\n${clip(profile.aboutMe, MAX_PROFILE_CHARS)}\n</her_notes>`,
    profile.alwaysMention ? `<always_mention>\n${clip(profile.alwaysMention, 4000)}\n</always_mention>` : "",
    `Word limit: ${wordLimit}. Write the supporting statement for this job.`
  ].filter(Boolean).join("\n\n");

  try {
    const client = new Anthropic();
    const message = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }]
    });

    if (message.stop_reason === "refusal") {
      sendJson(response, 422, { error: "Couldn't draft a statement for this job. Please write this one yourself." });
      return;
    }
    const statement = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    if (!statement) {
      sendJson(response, 502, { error: "The draft came back empty. Please try again." });
      return;
    }
    sendJson(response, 200, { statement });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      sendJson(response, 429, { error: "Busy right now. Try again in a minute." });
    } else if (error instanceof Anthropic.AuthenticationError) {
      sendJson(response, 503, { error: "Statement drafting key isn't valid. Check ANTHROPIC_API_KEY in Vercel." });
    } else if (error instanceof Anthropic.APIError) {
      sendJson(response, 502, { error: `Drafting failed (${error.status}). Please try again.` });
    } else {
      sendJson(response, 500, { error: "Drafting failed. Please try again." });
    }
  }
}
