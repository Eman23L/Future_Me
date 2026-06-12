import { allowPostOnly, getRequestBody, getSupabaseAdmin, sendJson } from "../_lib/supabase.js";

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

    const monthStart = `${monthKey}-01`;
    const [year, month] = monthKey.split("-").map(Number);
    const nextMonthDate = new Date(Date.UTC(year, month, 1));
    const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const supabase = getSupabaseAdmin();

    let deleteQuery = supabase
      .from("scheduled_reminders")
      .delete()
      .eq("status", "pending")
      .gte("task_date", monthStart)
      .lt("task_date", nextMonth);

    deleteQuery = userId ? deleteQuery.eq("user_id", userId) : deleteQuery.is("user_id", null);
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;

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
        updated_at: new Date().toISOString()
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("scheduled_reminders").insert(rows);
      if (insertError) throw insertError;
    }

    sendJson(response, 200, { ok: true, count: rows.length });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to sync reminders." });
  }
}
