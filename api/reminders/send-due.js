import { allowPostOnly, formatServerError, getRequestBody, getSupabaseAdmin, sendJson } from "../_lib/supabase.js";
import { sendDueReminders } from "../_lib/sendDueReminders.js";

export default async function handler(request, response) {
  if (!allowPostOnly(request, response)) return;

  if (!isAllowedCronRequest(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await getRequestBody(request);
    const userId = body.userId ?? null;
    const supabase = getSupabaseAdmin();
    const result = await sendDueReminders(supabase, userId);
    sendJson(response, 200, { ok: true, ...result });
  } catch (error) {
    sendJson(response, 500, formatServerError(error));
  }
}

function isAllowedCronRequest(request) {
  if (process.env.VERCEL_ENV !== "production") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.authorization === `Bearer ${secret}`;
}
