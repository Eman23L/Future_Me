# FutureMe Deployment

## Deployment Stack

- GitHub repo.
- Vercel deployment.
- Production custom domain.
- Cloudflare DNS.
- Supabase database.

## Environment Variables

Frontend:

- `VITE_SUPABASE_URL`.
- `VITE_SUPABASE_ANON_KEY`.
- `VITE_VAPID_PUBLIC_KEY`.

Server:

- `SUPABASE_SERVICE_ROLE_KEY`.
- `VAPID_PUBLIC_KEY`.
- `VAPID_PRIVATE_KEY`.
- `VAPID_SUBJECT`.
- `CRON_SECRET`.

Never commit `.env` files or private keys.

## Redeploy Process

1. Commit and push changes.
2. Let Vercel build from GitHub.
3. Confirm environment variables are present in Vercel.
4. Test production PWA install and reminder flows after deployment.

## PWA Cache Warning

PWA caching can make stale assets look like broken deploys. After manifest, service worker, or iOS meta changes, remove the old Home Screen app, clear Safari website data for the domain, reopen in Safari, and add to Home Screen again.

## iPhone Testing

1. Open the production domain in Safari.
2. Add to Home Screen.
3. Open FutureMe from the Home Screen icon.
4. Confirm standalone display mode.
5. Enable reminders.
6. Send a test reminder.
7. Generate or sync scheduled reminders.
8. Check Supabase rows in `push_subscriptions` and `scheduled_reminders`.

## Reminder Testing

- Test reminder confirms subscription and Web Push.
- Pending reminder count confirms scheduled reminder rows.
- Due reminder sending confirms backend delivery.
- Production automation should call the protected cron endpoint with `Authorization: Bearer <CRON_SECRET>`.
