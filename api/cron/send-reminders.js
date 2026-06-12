import { getSupabaseAdmin, sendJson } from "../_lib/supabase.js";
import { getWebPush, toPushSubscription } from "../_lib/webPush.js";

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
    const now = new Date();
    const windowStart = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const windowEnd = now.toISOString();

    const { data: reminders, error } = await supabase
      .from("scheduled_reminders")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", windowEnd)
      .gte("scheduled_for", windowStart)
      .order("scheduled_for", { ascending: true })
      .limit(100);

    if (error) throw error;

    let sent = 0;
    let failed = 0;

    for (const reminder of reminders ?? []) {
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
          failed += 1;
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
        await supabase
          .from("scheduled_reminders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", reminder.id);
      }
    }

    sendJson(response, 200, { ok: true, checked: reminders?.length ?? 0, sent, failed });
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
