import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !url ? "VITE_SUPABASE_URL" : "",
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : ""
  ].filter(Boolean);

  if (missing.length > 0) {
    const error = new Error(`Supabase env missing: ${missing.join(", ")}`);
    error.code = "SUPABASE_ENV_MISSING";
    throw error;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

export function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

export function formatServerError(error) {
  const message = error instanceof Error ? error.message : "Server error.";
  const code = error?.code;
  const details = error?.details;
  const hint = error?.hint;

  if (code === "42P01" || code === "PGRST205" || /relation .* does not exist/i.test(message)) {
    return {
      error: "Supabase table missing",
      code,
      details: details || "Run supabase.sql and make sure public.push_subscriptions exists.",
      hint
    };
  }

  if (code === "42501" || /permission denied|row-level security/i.test(message)) {
    return {
      error: "Permission denied",
      code,
      details: details || "The API route should use SUPABASE_SERVICE_ROLE_KEY so RLS is bypassed.",
      hint
    };
  }

  if (code === "SUPABASE_ENV_MISSING") {
    return {
      error: "Supabase env missing",
      code,
      details: message,
      hint: "Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel."
    };
  }

  return {
    error: message,
    code,
    details,
    hint
  };
}

export function allowPostOnly(request, response) {
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return false;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return false;
  }

  return true;
}
