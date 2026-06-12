import { allowPostOnly, getRequestBody, getSupabaseAdmin, sendJson } from "../_lib/supabase.js";
import { getWebPush, toPushSubscription } from "../_lib/webPush.js";

export default async function handler(request, response) {
  if (!allowPostOnly(request, response)) return;

  try {
    const body = await getRequestBody(request);
    const supabase = getSupabaseAdmin();
    let query = supabase.from("push_subscriptions").select("*").limit(1);

    if (body.endpoint) {
      query = query.eq("endpoint", body.endpoint);
    } else if (body.userId) {
      query = query.eq("user_id", body.userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    const subscription = data?.[0];

    if (!subscription) {
      sendJson(response, 404, { error: "No push subscription found." });
      return;
    }

    await getWebPush().sendNotification(toPushSubscription(subscription), JSON.stringify({
      title: "FutureMe reminder",
      body: "Your reminders are working",
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: {
        url: "/"
      }
    }));

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to send test push." });
  }
}
