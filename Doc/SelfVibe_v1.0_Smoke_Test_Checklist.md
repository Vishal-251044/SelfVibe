# SelfVibe v1.0: Smoke Test & Real-Device QA Checklist

Run this on the **live URL** before tagging the release, and again after every production deploy. Use one **Android phone (Chrome)** and one **iPhone (Safari)**, plus a desktop browser.

Tick each box. If anything marked **P0** fails, don't release; fix it first.

Tester: ____________  Date: ____________  Build / commit: ____________

---

## A. Install → sign up → listen → voice → feed (the "done when" path)

| # | Step | Android | iPhone | Desktop |
|---|---|---|---|---|
| A1 **P0** | Open the URL. The landing page loads, nothing scrolls sideways, and "Start listening free" works | ☐ | ☐ | ☐ |
| A2 **P0** | Sign up with email; the taste quiz appears; finish it | ☐ | ☐ | ☐ |
| A3 | "Continue with Google" works (if set up) | ☐ | ☐ | ☐ |
| A4 **P0** | **Install:** Android shows the "Install SelfVibe" card (after ~20 s) and the app installs. On iPhone, Profile → App & privacy → Install shows the Add to Home Screen steps; follow them | ☐ | ☐ | n/a |
| A5 **P0** | Open the installed app from its icon: full screen, black status bar, still signed in | ☐ | ☐ | n/a |
| A6 **P0** | Home shows For You rows, Daily Mix and "Because you liked" (after a few likes) | ☐ | ☐ | ☐ |
| A7 **P0** | Play a song: it starts in under ~1 s; the mini player appears; seek works | ☐ | ☐ | ☐ |
| A8 **P0** | **Background play:** lock the screen, and music continues for **30 minutes** across several songs (the queue moves on by itself) | ☐ | ☐ | n/a |
| A9 **P0** | Lock-screen / notification controls show the cover, title and artist; play/pause, next and previous work | ☐ | ☐ | n/a |
| A10 | Headphone / Bluetooth buttons: play/pause and next | ☐ | ☐ | ☐ |
| A11 | A call or unplugging the headphones pauses the music; it resumes correctly afterwards | ☐ | ☐ | n/a |
| A12 **P0** | **Voice:** tap the mic → "next", "pause", "play", "volume down", "like this song" | ☐ | ☐ | ☐ |
| A13 | Voice: "play Arijit Singh" (play by name), and the same in Hindi ("agla gaana") | ☐ | ☐ | ☐ |
| A14 | Keyboard (desktop): Space play/pause, ←/→ seek, Shift+←/→ previous/next, M mute | n/a | n/a | ☐ |
| A15 | Swipe gestures on the mini player / Now Playing | ☐ | ☐ | n/a |
| A16 | Turn on airplane mode and open the app: the offline screen appears (not an error) | ☐ | ☐ | ☐ |

## B. Core features

| # | Step | ✓ |
|---|---|---|
| B1 **P0** | Search finds songs and artists as you type; Browse → a genre and a vibe show songs | ☐ |
| B2 | Like a song → it shows up in Liked Songs; create a playlist, add songs, reorder them | ☐ |
| B3 | Comments: post, reply, like, report | ☐ |
| B4 **P0** | **Share a song** (⋯ menu or Now Playing): the phone share sheet opens. Paste the link into WhatsApp: the preview shows the cover, title and the SelfVibe look | ☐ |
| B5 | Open the shared link while signed out: the song page shows "Sign up free to listen". After signing up, you land back on the song | ☐ |
| B6 | Share a public playlist and an artist page: both previews look right | ☐ |
| B7 **P0** | Creator: upload a song (audio + cover) → it's processed → plays for others → it appears in creator analytics the next hour | ☐ |
| B8 | Profile → Download my data gives a JSON file with your likes, playlists and history | ☐ |
| B9 | Profile → Delete my account (test account only): the wrong password is refused; the right one deletes the account and returns you to the home page; you can't log in again | ☐ |
| B10 | Forgot password: the email arrives and the reset link works once | ☐ |
| B11 | /privacy, /terms and /refunds open from the footer; /privacy and /terms also from the sign-up form | ☐ |
| B12 **P0** | **Payments (test mode first):** Upgrade → Premium monthly → pay with a Razorpay test UPI ID → "Welcome to Premium". Profile shows Premium, the renewal date and the payment | ☐ |
| B13 | Cancel plan → still Premium until the end date; the Razorpay dashboard shows the subscription cancelling at the end of the cycle | ☐ |
| B14 | Razorpay → Webhooks shows deliveries answered with 200; Console → Subscriptions shows the subscriber and revenue | ☐ |

## C. Owner Console (live and secured)

| # | Step | ✓ |
|---|---|---|
| C1 **P0** | `/admin/login` → password → 2FA code → the dashboard loads with real numbers | ☐ |
| C2 **P0** | 10 wrong passwords (use a test staff account) lock the account. The Owner and the person get the "account locked" email; Team shows "Locked"; Security → Unlock now works | ☐ |
| C3 **P0** | Sign in from a new browser or phone: the Owner gets the "New console sign-in" email | ☐ |
| C4 | Team → Security → Reset 2FA: that person must scan a new QR code at their next sign-in | ☐ |
| C5 | Idle for 30 min in the console: you're signed out | ☐ |
| C6 | A Moderator gets "not allowed" on Music, Settings and Team | ☐ |
| C7 | Song performance → open a song: charts, sources and devices show (including "Shared links" after B4); CSV export downloads | ☐ |
| C8 | Settings → maintenance mode ON: the listener app shows the maintenance screen and the console still works. Turn it OFF again | ☐ |
| C9 | Settings → Console IP allowlist: "Your IP" is your real IP (see deployment guide step 7) | ☐ |
| C10 **P0** | Audit log shows the actions from C2–C8 with who, what and when | ☐ |

## D. Platform checks

| # | Check | ✓ |
|---|---|---|
| D1 **P0** | `https://<render-api>/api/health` → `{"status":"ok"}` | ☐ |
| D2 | A Sentry test error appears in Sentry (if set up) | ☐ |
| D3 | Lighthouse (Chrome DevTools, mobile) on the live landing page: Accessibility, Best Practices and SEO at 90+; Performance target 80+; LCP under 2.5 s on Wi-Fi | ☐ |
| D4 | No horizontal scroll at 360 px (small Android) on Home, Search, Library, Profile, a song page and the console | ☐ |
| D5 | Atlas: backups ON (or `npm run db:backup` done today); IP access list as planned | ☐ |
| D6 | CI is green on the commit being released | ☐ |

---

**Result:** ☐ Release v1.0.0 ☐ Fix first: ____________________________
