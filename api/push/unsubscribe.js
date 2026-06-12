import { allowPostOnly, getRequestBody, getSupabaseAdmin, sendJson } from "../_lib/supabase.js";

export default async function handler(request, response) {
  if (!allowPostOnly(request, response)) return;

  try {
    const body = await getRequestBody(request);
    if (!body.endpoint) {
      sendJson(response, 400, { error: "Missing endpoint." });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", body.endpoint);

    if (error) throw error;

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to remove subscription." });
  }
}
