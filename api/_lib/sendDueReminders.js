import { getWebPush, toPushSubscription } from "./webPush.js";
import { reminderWindows } from "./reminderWindows.js";

export async function sendDueReminders(supabase, userId = undefined) {
  const { windowStart, windowEnd, staleBefore } = reminderWindows();

  let reminderQuery = supabase
    .from("scheduled_reminders")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", windowEnd)
    .gte("scheduled_for", windowStart)
    .order("scheduled_for", { ascending: true })
    .limit(100);

  if (userId !== undefined) {
    reminderQuery = userId ? reminderQuery.eq("user_id", userId) : reminderQuery.is("user_id", null);
  }

  const { data: reminders, error: reminderError } = await reminderQuery;
  if (reminderError) throw reminderError;

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
        const statusCode = pushError?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        }
      }
    }

    const updatedAt = new Date().toISOString();
    if (reminderSent) {
      sent += 1;
      await supabase
        .from("scheduled_reminders")
        .update({ status: "sent", sent_at: updatedAt, updated_at: updatedAt })
        .eq("id", reminder.id);
    } else {
      failed += 1;
      await supabase
        .from("scheduled_reminders")
        .update({ status: "failed", updated_at: updatedAt })
        .eq("id", reminder.id);
    }
  }

  let staleQuery = supabase
    .from("scheduled_reminders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("status", "pending")
    .lt("scheduled_for", staleBefore);

  if (userId !== undefined) {
    staleQuery = userId ? staleQuery.eq("user_id", userId) : staleQuery.is("user_id", null);
  }

  const { count: staleCount, error: staleError } = await staleQuery;
  if (staleError) throw staleError;

  return {
    checked: reminders?.length ?? 0,
    sent,
    failed,
    stale: staleCount ?? 0
  };
}
