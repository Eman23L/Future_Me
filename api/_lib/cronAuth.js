import { timingSafeEqual } from "node:crypto";

// Checks the CRON_SECRET sent by a scheduler. Formatting is forgiving (any "Bearer" casing, extra
// spaces, the British "Authorisation" header, or the bare secret) but the secret must match exactly.
// On failure it returns a reason that helps set up a scheduler without revealing the secret.
export function checkCronAuth(request) {
  if (process.env.VERCEL_ENV !== "production") return { ok: true };

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return { ok: false, reason: "CRON_SECRET is not set on the server." };

  const header = request.headers.authorization ?? request.headers.authorisation;
  if (!header) return { ok: false, reason: "No Authorization header was sent. Add a header with key Authorization and value Bearer <your secret>." };

  const token = String(header).trim().replace(/^bearer\s+/i, "").trim();
  if (!safeEqual(token, secret)) {
    return {
      ok: false,
      reason: "The secret in the Authorization header does not match CRON_SECRET.",
      receivedSecretLength: token.length,
      expectedSecretLength: secret.length
    };
  }

  return { ok: true };
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
