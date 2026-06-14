import { sendJson } from "../_lib/supabase.js";

export default function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    sendJson(response, 500, {
      error: "VAPID env missing",
      details: "Missing VITE_VAPID_PUBLIC_KEY or VAPID_PUBLIC_KEY."
    });
    return;
  }

  sendJson(response, 200, { publicKey });
}
