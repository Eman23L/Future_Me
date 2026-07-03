import { allowPostOnly, formatServerError, getRequestBody, getSupabaseAdmin, sendJson } from "../_lib/supabase.js";
import { getWebPush, toPushSubscription } from "../_lib/webPush.js";
import { reminderWindows } from "../_lib/reminderWindows.js";

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
    const { windowStart, windowEnd, staleBefore } = reminderWindows();

    let reminderQuery = supabase
      .from("scheduled_reminders")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", windowEnd)
      .gte("scheduled_for", windowStart)
      .order("scheduled_for", { ascending: true })
      .limit(100);

    reminderQuery = userId ? reminderQuery.eq("user_id", userId) : reminderQuery.is("user_id", null);
    const { data: reminders, error: reminderError } = await reminderQuery;
    if (reminderError) throw reminderError;

    let checked = 0;
    let sent = 0;
    let failed = 0;
    let stale = 0;

    for (const reminder of reminders ?? []) {
      checked += 1;
      let subscriptionQuery = supabase.from("push_subscriptions").select("*");
      subscriptionQuery = reminder.user_id
        ? subscriptionQuery.eq("user_id", reminder.user_id)
        : subscriptionQuery.is("user_id", null);

      const { data: subscriptions, error: subscriptionError } = await subscriptionQuery;
      if (subscriptionError) throw subscriptionError;

      let reminderSent = false;
      for (const subscription of subscriptions ?? []) {
        try {
          await getWebPush().sendNotification(toPushSubscription(subscription), JSON.stringify({
            title: reminder.title,
            body: reminder.body,
            icon: "/icons/icon.svg",
            badge: "/icons/icon.svg",
            data: {
              task_id: reminder.task_id,
              task_date: reminder.task_date,
              url: reminder.task_date ? `/?date=${reminder.task_date}` : "/"
            }
          }));
          reminderSent = true;
        } catch (pushError) {
          const statusCode = pushError?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
          }
        }
      }

      if (reminderSent) {
        sent += 1;
        await supabase
          .from("scheduled_reminders")
          .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", reminder.id);
      } else {
        failed += 1;
        await supabase
          .from("scheduled_reminders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", reminder.id);
      }
    }

    let staleQuery = supabase
      .from("scheduled_reminders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("status", "pending")
      .lt("scheduled_for", staleBefore);

    staleQuery = userId ? staleQuery.eq("user_id", userId) : staleQuery;
    const { count: staleCount, error: staleError } = await staleQuery;
    if (staleError) throw staleError;
    stale = staleCount ?? 0;

    sendJson(response, 200, { ok: true, checked, sent, failed, stale });
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
