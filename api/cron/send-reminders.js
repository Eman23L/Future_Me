import { getSupabaseAdmin, sendJson } from "../_lib/supabase.js";
import { sendDueReminders } from "../_lib/sendDueReminders.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!isAllowedCronRequest(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const result = await sendDueReminders(supabase);
    sendJson(response, 200, { ok: true, ...result });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to send reminders." });
  }
}

function isAllowedCronRequest(request) {
  if (process.env.VERCEL_ENV !== "production") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.authorization === `Bearer ${secret}`;
}
