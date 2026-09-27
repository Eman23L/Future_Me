import { getSupabaseAdmin, sendJson } from "../_lib/supabase.js";
import { checkCronAuth } from "../_lib/cronAuth.js";
import { sendDueReminders } from "../_lib/sendDueReminders.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const auth = checkCronAuth(request);
  if (!auth.ok) {
    const { ok, ...details } = auth;
    sendJson(response, 401, { error: "Unauthorized", ...details });
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
