import { allowPostOnly, formatServerError, getRequestBody, getSupabaseAdmin, sendJson } from "../_lib/supabase.js";

export default async function handler(request, response) {
  if (!allowPostOnly(request, response)) return;

  try {
    const body = await getRequestBody(request);
    const reminders = Array.isArray(body.reminders) ? body.reminders : [];
    const monthKey = body.monthKey;
    const userId = body.userId ?? null;

    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      sendJson(response, 400, { error: "Missing monthKey." });
      return;
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const monthStart = `${monthKey}-01`;
    const [year, month] = monthKey.split("-").map(Number);
    const nextMonthDate = new Date(Date.UTC(year, month, 1));
    const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

    let cancelQuery = supabase
      .from("scheduled_reminders")
      .update({ status: "cancelled", updated_at: now })
      .eq("status", "pending")
      .gte("task_date", monthStart)
      .lt("task_date", nextMonth);

    cancelQuery = userId ? cancelQuery.eq("user_id", userId) : cancelQuery.is("user_id", null);
    const { error: cancelError } = await cancelQuery;
    if (cancelError) throw cancelError;

    const rows = reminders
      .filter((reminder) => reminder.taskId && reminder.title && reminder.body && reminder.scheduledFor)
      .map((reminder) => ({
        task_id: reminder.taskId,
        user_id: userId,
        title: reminder.title,
        body: reminder.body,
        scheduled_for: reminder.scheduledFor,
        status: "pending",
        notification_vibe: reminder.notificationVibe ?? null,
        task_date: reminder.taskDate ?? null,
        task_category: reminder.taskCategory ?? null,
        updated_at: now
      }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("scheduled_reminders")
        .upsert(rows, { onConflict: "task_id,scheduled_for" });
      if (upsertError) throw upsertError;
    }

    let countQuery = supabase
      .from("scheduled_reminders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    countQuery = userId ? countQuery.eq("user_id", userId) : countQuery.is("user_id", null);
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    sendJson(response, 200, { ok: true, count: rows.length, pendingCount: count ?? 0 });
  } catch (error) {
    sendJson(response, 500, formatServerError(error));
  }
}
