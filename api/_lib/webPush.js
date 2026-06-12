import webPush from "web-push";

let configured = false;

export function getWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@futureme.app";

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID environment variables.");
  }

  if (!configured) {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return webPush;
}

export function toPushSubscription(row) {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth
    }
  };
}
