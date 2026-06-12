import { allowPostOnly, getRequestBody, getSupabaseAdmin, sendJson } from "../_lib/supabase.js";

export default async function handler(request, response) {
  if (!allowPostOnly(request, response)) return;

  try {
    const body = await getRequestBody(request);
    const subscription = body.subscription ?? body;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      sendJson(response, 400, { error: "Invalid push subscription." });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: body.userId ?? null,
        endpoint,
        p256dh,
        auth,
        user_agent: body.userAgent ?? request.headers["user-agent"] ?? null,
        updated_at: new Date().toISOString()
      }, { onConflict: "endpoint" });

    if (error) throw error;

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to save subscription." });
  }
}
