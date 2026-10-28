# SelfVibe v1.0: Deployment Guide

How to put SelfVibe on the internet: the web app on **Vercel**, the API and background worker on **Render**, the database on **MongoDB Atlas**, and jobs and rate limits on **Upstash Redis**.

Follow the steps in order. Each one says where to click and which value to copy. Nothing here needs a code change.

```
Phone / desktop ──https──▶ Vercel (Next.js web app, region Mumbai)
                              │  /api/* is forwarded (same domain, so login cookies work on iPhone)
                              ▼
                         Render: selfvibe-api (Express, Singapore) ──▶ MongoDB Atlas (Mumbai)
                         Render: selfvibe-worker (jobs: audio, stats, similar songs)
                              │
                              ├──▶ Upstash Redis (jobs queue + rate limits + cache)
                              ├──▶ Cloudinary accounts (songs + covers)
                              ├──▶ Resend (email)
                              └──▶ Sentry (errors, optional)
```

---

## 0. Before you start

You need accounts on GitHub, Vercel, Render, MongoDB Atlas, Upstash, Cloudinary and Resend. Google Cloud and Sentry are optional.

Generate three secrets on your computer, and keep them in a password manager:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # STAFF_JWT_SECRET (a different one)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"         # TOTP_ENCRYPTION_KEY
```

> `TOTP_ENCRYPTION_KEY` is still required by the API. Staff now use one login with no authenticator, but keep this value stable in case 2FA is switched back on.

The code must be on GitHub, which means the local commits need pushing first.

---

## 1. MongoDB Atlas (database)

1. Create a cluster in the region **Mumbai (ap-south-1)**.
   - **Flex** or **M10** is recommended for launch, because they include **automatic daily backups**.
   - The free **M0** tier has **no backups**. If you start on M0, use `npm run db:backup` (step 8).
2. **Database Access** → add a user with a long random password and the role "Read and write to any database".
3. **Network Access** → the IP access list:
   - Render's free and Starter plans have **no fixed outgoing IP**, so add `0.0.0.0/0`. The strong database password is then what protects the cluster.
   - Stricter option: Render's paid **static outbound IPs**. Add only those, and remove `0.0.0.0/0`.
   - Add your own IP too, so you can run scripts from your computer.
4. **Backups** (Flex / M10): Cluster → Backup → turn on, keep daily snapshots for at least 7 days.
5. Copy the connection string, then put the database name `selfvibe` before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/selfvibe?retryWrites=true&w=majority`

## 2. Upstash Redis

Create a Redis database in region **ap-south-1** (or the nearest one). Copy the **`rediss://`** URL; it starts with `rediss`, with two s's, which means TLS.

## 3. Cloudinary storage pool

Create the accounts you planned (e.g. 3 Official + 1 Community + 1 spare). Check Cloudinary's terms on multiple free accounts first, as the roadmap's risk table notes. Build `CLOUDINARY_ACCOUNTS`:

```
off1|official|cloud1|key1|secret1|10,off2|official|cloud2|key2|secret2|10,com1|community|cloud3|key3|secret3|10
```

Also fill in the single `CLOUDINARY_*` account, which is used for avatars and covers.

## 4. Resend (email)

Add and verify your domain in Resend, create an API key, and set `EMAIL_FROM`, e.g. `SelfVibe <hello@yourdomain.com>`.

Without email in production:
- Password reset doesn't work.
- Staff invites show a link for you to share by hand.
- Lockout and new-device alerts aren't sent.

## 4b. Razorpay (subscriptions)

1. Sign up at razorpay.com and start in **Test mode**. Settings → API Keys → generate a key. Put the key id and secret in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (Render group `selfvibe-shared`).
2. Settings → **Webhooks** → Add New Webhook:
   - URL: `https://<your-domain>/api/billing/webhook`
   - Secret: a long random string; put the same value in `RAZORPAY_WEBHOOK_SECRET`
   - Active events: every `subscription.*` event (authenticated, activated, charged, pending, halted, cancelled, completed, paused, resumed, updated)
3. Make sure **Subscriptions** is enabled on your Razorpay account.
4. Test end to end with Razorpay's test UPI ID and test cards: upgrade, check Profile → Plan & billing, then cancel.
5. Going live:
   1. Finish Razorpay **KYC**: PAN and bank account, plus GST if you're registered.
   2. Make sure `/refunds`, `/terms` and `/privacy` open. Razorpay checks them.
   3. Switch to the **live** keys and add the webhook again in Live mode.

   Razorpay plans are created automatically the first time each price is sold.
6. Prices are set in Console → Settings → Plans & prices. The "Subscriptions checkout" switch under Settings → Features pauses new sales; existing subscribers keep renewing.

## 5. Render (API + worker)

1. Render → **New → Blueprint** → choose the GitHub repo. Render reads [`render.yaml`](../render.yaml) and creates:
   - `selfvibe-api` (web service, health check `/api/health`)
   - `selfvibe-worker` (background worker)
   - the env group `selfvibe-shared`, used by both
2. Fill in every value Render asks for in the group. Use placeholders for the two app addresses for now; step 6 gives you the real Vercel address.

   | Variable | Value |
   |---|---|
   | `APP_URL` | `https://<your-vercel-domain>` |
   | `CLIENT_URL` | the same `https://` address (comma-separate extra domains) |
   | `DATABASE_URL` | Atlas string from step 1 |
   | `REDIS_URL` | `rediss://…` from step 2 |
   | `JWT_SECRET`, `STAFF_JWT_SECRET`, `TOTP_ENCRYPTION_KEY` | from step 0 |
   | `RESEND_API_KEY`, `EMAIL_FROM` | step 4 |
   | `CLOUDINARY_*`, `CLOUDINARY_ACCOUNTS` | step 3 |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional (step 7) |
   | `GOOGLE_CALLBACK_URL` | `https://<your-vercel-domain>/api/auth/google/callback` |
   | `SENTRY_DSN` | optional (step 9) |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | step 4b |

   Already set by the blueprint: `NODE_ENV=production`, `COOKIE_SECURE=true`, `TRUST_PROXY=2`, `NODE_VERSION=22`.
3. **Plans:** Starter for both services.
   - The free web plan sleeps after 15 minutes, so the first request then takes about a minute.
   - Workers have no free plan.
4. Deploy. The API refuses to start if a production setting is unsafe (for example an `http://` address, insecure cookies or no Redis), and the log says exactly which variable to fix.
5. Copy the API address, e.g. `https://selfvibe-api.onrender.com`.

## 6. Vercel (web app)

1. Vercel → **Add New → Project** → import the repo → set **Root Directory: `frontend`**. [`frontend/vercel.json`](../frontend/vercel.json) sets the region to Mumbai.
2. Environment variables (Production):

   | Variable | Value |
   |---|---|
   | `API_PROXY_TARGET` | the Render API address from step 5, e.g. `https://selfvibe-api.onrender.com` |
   | `NEXT_PUBLIC_API_URL` | `/api` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-vercel-domain>` (link previews need it) |
   | `NEXT_PUBLIC_SENTRY_DSN` | optional (step 9) |

3. Deploy. Then go back to Render and make sure `APP_URL`, `CLIENT_URL` and `GOOGLE_CALLBACK_URL` hold this exact Vercel address. Redeploy the API if you changed them.
4. **Custom domain** (optional): add it in Vercel, then update the three Render variables and `NEXT_PUBLIC_SITE_URL` to the new domain.

## 7. First-time setup (from your computer)

Put the **production** `DATABASE_URL`, `OWNER_EMAIL` and `OWNER_PASSWORD` into `backend/.env` temporarily, then run:

```bash
cd backend
npm run create-owner        # the Owner account (only once)
npm run seed:taxonomy       # genres and vibes
npm run db:sync-indexes     # database indexes
npm run search:setup        # Atlas Search indexes (needs an M10 / Flex cluster or the Atlas UI on M0)
npm run import:catalog      # optional: royalty-free starter catalog
```

**Songs uploaded before the AAC update (Oct 2026):** new uploads are stored as 64 / 128 / 256 kbps AAC copies (plus the original). Songs processed earlier still have one 192 kbps MP3 and keep playing it. To give them the smaller copies and the slow-internet mode, run once (safe to stop and run again):

```bash
npm run audio:reencode -- --dry-run      # how many songs, and the storage estimate
npm run audio:reencode                   # re-encode them (most played first)
npm run db:sync-indexes                  # the faster indexes for a 5,000+ song catalog
```

Then log in at `https://<domain>/login` with `OWNER_EMAIL` / `OWNER_PASSWORD` (or "Continue with Google" with the same email). Open **Admin panel** from the account menu. Staff use one login, with no separate console password and no authenticator code.

- **Google sign-in (optional):** in Google Cloud → Credentials → your OAuth client, add `https://<domain>/api/auth/google/callback` under "Authorized redirect URIs".
- **Check the client IP:** Console → Settings → "Console IP allowlist" shows "Your IP". It should be your real public IP. If it shows a Vercel or Render address, change `TRUST_PROXY` (2 is right for Vercel → Render). Only then use the allowlist.

## 8. Backups

| Cluster | What to do |
|---|---|
| Flex / M10+ | Atlas backups ON (step 1). Test a restore once, into a new cluster. |
| Free M0 | Run `npm run db:backup` at least daily from a trusted computer. Files go to `backend/backups/` (git-ignored, contains personal data, so keep it private). Restore one collection with `mongoimport` (see the comment at the top of `backend/scripts/backupDb.js`). |

## 9. Monitoring

- **Sentry:**
  1. Create two projects, "Node.js" for the API and "Next.js" for the web app.
  2. Put the DSNs in `SENTRY_DSN` (Render) and `NEXT_PUBLIC_SENTRY_DSN` (Vercel).
  3. Only unexpected errors are sent, with no personal data, and each event is tagged with the request id from the API logs.
- **Logs:**
  - Render shows the API logs as structured JSON, one line per request with `reqId`, `status`, `durationMs` and `userId`.
  - Search by the `X-Request-Id` a user reports.
- **Uptime:** point a free monitor (e.g. UptimeRobot) at `https://<render-api>/api/health` every 5 minutes.

## 10. CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every pull request and on pushes to `main` and `dev`:
- backend: lint, format check, unit tests
- frontend: lint, format check, production build

Protect `main` on GitHub (Settings → Branches) so merges need CI to pass.

## 11. Release

1. Run the [smoke test checklist](SelfVibe_v1.0_Smoke_Test_Checklist.md) on the live URL with a real Android phone and a real iPhone.
2. When everything passes, push the tag `v1.0.0`. It's already created locally; push it only when you're happy.
3. Updates later: merge to `main` → Vercel deploys the web app automatically → press "Manual Deploy" on Render for the API and worker. Auto-deploy is off on purpose.
