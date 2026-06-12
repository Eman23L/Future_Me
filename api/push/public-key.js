import { sendJson } from "../_lib/supabase.js";

export default function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!process.env.VAPID_PUBLIC_KEY) {
    sendJson(response, 500, { error: "Missing VAPID public key." });
    return;
  }

  sendJson(response, 200, { publicKey: process.env.VAPID_PUBLIC_KEY });
}
