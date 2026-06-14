import { allowPostOnly, formatServerError, getRequestBody, getSupabaseAdmin, sendJson } from "../_lib/supabase.js";

export default async function handler(request, response) {
  if (!allowPostOnly(request, response)) return;

  try {
    const body = await getRequestBody(request);
    const subscription = body.subscription ?? body;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      sendJson(response, 400, {
        error: "Push subscription failed",
        details: "Invalid PushSubscription JSON. Expected endpoint, keys.p256dh and keys.auth.",
        received: {
          endpoint: Boolean(endpoint),
          p256dh: Boolean(p256dh),
          auth: Boolean(auth)
        }
      });
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

    if (error) {
      sendJson(response, 500, formatServerError(error));
      return;
    }

    sendJson(response, 200, { ok: true, endpoint });
  } catch (error) {
    sendJson(response, 500, formatServerError(error));
  }
}
