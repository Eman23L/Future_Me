import { allowPostOnly, formatServerError, getRequestBody, getSupabaseAdmin, sendJson } from "../_lib/supabase.js";
import { checkCronAuth } from "../_lib/cronAuth.js";
import { sendDueReminders } from "../_lib/sendDueReminders.js";

export default async function handler(request, response) {
  if (!allowPostOnly(request, response)) return;

  const auth = checkCronAuth(request);
  if (!auth.ok) {
    const { ok, ...details } = auth;
    sendJson(response, 401, { error: "Unauthorized", ...details });
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
