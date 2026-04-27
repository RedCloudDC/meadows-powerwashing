# Meadows Powerwashing — Setup Guide

This guide walks through everything that's set up and the one-time config still
needed. The site is live at **https://meadows-powerwashing.netlify.app**.

## What's in this folder

```
meadows-powerwashing/
├── index.html                  ← the public website
├── admin.html                  ← Eoin's photo upload page (Cloudinary)
├── dashboard.html              ← Eoin's customer + schedule dashboard  [NEW]
├── netlify/
│   └── functions/              ← serverless functions powering the dashboard
│       ├── list-submissions.js
│       ├── update-job.js
│       └── send-confirmation.js
├── netlify.toml                ← Netlify build config
├── package.json                ← Node deps for the functions
├── images/                     ← before/after + logo + action photos
├── favicon.*                   ← browser/home-screen icons
├── qr-code-*.png/.svg          ← QR codes for signs + cards
├── SETUP_GUIDE.md              ← this file
├── ADMIN_GUIDE.md              ← admin.html photo upload notes
└── GROWTH_RECOMMENDATIONS.md   ← customer-acquisition playbook
```

## Status summary (what's already done)

- Site deployed at `meadows-powerwashing.netlify.app` via GitHub auto-deploy.
  Any `git push` to `main` triggers a Netlify build in ~4 seconds.
- Booking form is Netlify Forms native (no third-party service). Form
  detection is enabled; submissions land at Netlify → Forms → `booking`.
- Three notifications are live in Netlify → Project configuration → Notifications:
  - Email to **eoinmeadows@icloud.com** on new submission
  - Email to **5712307746@vtext.com** → lands as SMS on Eoin's Verizon phone
  - Email to **7038509857@vtext.com** → lands as SMS on Greg's Verizon phone
    (temporary — remove when handing off fully)

## 1 — iPhone notification tuning (Eoin)

The SMS gateway email sends a plain text to Eoin's phone number, which Verizon
converts to a real SMS. To make sure he sees each booking *fast* during business
hours, tune the iPhone's notification behavior.

### Make the Mail app push immediately for iCloud
1. **Settings → Mail → Accounts → Fetch New Data**. Turn on **Push** at the top.
2. Under that account list, tap **iCloud** → set to **Push**.

### Make iCloud mail notifications loud + lockscreen-visible
1. **Settings → Notifications → Mail → iCloud**.
2. Turn on **Allow Notifications**, **Lock Screen**, **Banners**, **Sounds**, **Badges**.
3. Pick a distinct sound (Chime or Tri-tone cuts through outdoor noise).

### Mark Netlify as a VIP sender (so notifications bypass Mail filters)
1. Open Mail → find a notification email from `notifications@netlify.com` (or
   from Netlify's sending domain).
2. Tap the sender's name → **Add to VIP**. Future emails from this sender will
   ring even with generic filters quieting things down.

### Focus mode that still lets bookings through
If Eoin runs Focus modes (Sleep, School, Do Not Disturb):
1. **Settings → Focus → [your mode] → People & Apps → Apps → Add Mail**.
2. In Mail exceptions, allow notifications. If you want only booking alerts
   to punch through, use VIP (above) and allow only **Time-Sensitive** alerts.

### Texts from the SMS gateway
The Verizon SMS arrives from a numeric shortcode. That thread gets used for
every booking — you can pin it in Messages and turn on the ringer override:
**Messages app → long-press thread → Info → Pin**, and
**Settings → Notifications → Messages → Customize Notifications → [thread] → Time Sensitive**.

## 2 — Texting customers back

**Important:** replying to the SMS notification on the phone will *not* reach
the customer. That text came from Verizon's gateway, and a reply routes back
to Netlify's noreply address.

### The right workflow
Each booking notification contains the customer's phone number in the body.
When you want to text them:
1. Read the notification (SMS or email).
2. Tap-and-hold the customer's phone number; iPhone offers **Send Message**.
3. That opens a new thread in your Messages app. Text from there.

### Optional: free Google Voice business number
If Eoin wants a dedicated business number so personal and business texts don't
mix:
1. Install **Google Voice** (free app) and sign in with `eoinmeadows@icloud.com`.
2. Pick a local 571/703 number. Free.
3. Update `index.html` to use that number (find `571-230-7746`, replace). Push.
4. He replies from the Google Voice app; customers text that number; his
   personal number stays private.

Only worth it once volume gets real (10+ jobs/month).

## 3 — The customer & schedule dashboard (NEW)

Eoin has a private dashboard at **https://meadows-powerwashing.netlify.app/dashboard.html**
with two tabs:

- **Customers** — every booking from the form, filterable by status (New,
  Quoted, Scheduled, Done). Tap a card to quote, schedule, add notes, mark paid.
- **Schedule** — month calendar. Each booking appears on its confirmed date
  (or the customer's preferred date until confirmed). Color-coded by status.

Tapping a job opens a detail sheet with a **Confirm & send** button. That
button sends the customer a confirmation email with a calendar invite (.ics),
sends Eoin a matching invite for his own iPhone Calendar, and marks the job
Scheduled.

### One-time setup (required for the dashboard to work)

The dashboard calls three Netlify Functions that need these environment
variables set in Netlify → Project configuration → Environment variables:

| Variable | Where to get it | Notes |
|---|---|---|
| `DASHBOARD_PASSWORD` | Pick one | Eoin types this to unlock the dashboard |
| `NETLIFY_API_TOKEN` | See step A below | Personal access token for the Forms API |
| `NETLIFY_SITE_ID` | See step B below | The site's API ID |
| `RESEND_API_KEY` | See step C below | For sending customer confirmation emails |
| `FROM_EMAIL` | See step C below | Sender email for confirmations |
| `EOIN_EMAIL` | `eoinmeadows@icloud.com` | Where Eoin's own calendar-invite copy goes |

#### A. Create a Netlify personal access token
1. Go to **https://app.netlify.com/user/applications#personal-access-tokens**.
2. Click **New access token**, name it "Meadows dashboard", set it to never expire
   (or 1 year — you can rotate).
3. Copy the token value (you won't see it again).
4. In Netlify → project **meadows-powerwashing** → **Project configuration** →
   **Environment variables** → **Add a variable** → key `NETLIFY_API_TOKEN`,
   value = the token. Scope: All deploy contexts.

#### B. Get the site ID
1. In Netlify → project **meadows-powerwashing** → **Project configuration** →
   **General** → **Project details**. Copy the **Project ID** (UUID-looking string).
2. Add env var `NETLIFY_SITE_ID` = that value.

#### C. Set up Resend (for confirmation emails)
Resend has a generous free tier (100 emails/day, 3,000/month). More than
enough for a summer business.

1. Go to **https://resend.com/signup** and sign up with `eoinmeadows@icloud.com`.
2. Go to **API Keys** → **Create API Key** → name "meadows-dashboard",
   permission: **Full access**. Copy the key (starts with `re_`).
3. Add env var `RESEND_API_KEY` = that key.
4. For the `FROM_EMAIL`:
   - **Easy path (no domain needed):** use `onboarding@resend.dev`. Works
     immediately but some customers' inboxes may flag it as unfamiliar.
   - **Better path (if you have a custom domain like meadowspowerwashing.com):**
     in Resend → **Domains** → **Add domain** → follow DNS steps → once
     verified, use `bookings@meadowspowerwashing.com`.
5. Add env var `FROM_EMAIL` = one of the values above.

#### D. Set the dashboard passphrase
1. Pick a memorable passphrase (something like `LetsCleanNow2026!`).
2. Add env var `DASHBOARD_PASSWORD` = that passphrase. This is what Eoin types
   to unlock the dashboard.
3. Also add `EOIN_EMAIL` = `eoinmeadows@icloud.com`.

### Trigger a redeploy after adding env vars
Netlify applies env vars on next deploy. Make an empty commit and push:
```
git commit --allow-empty -m "pick up dashboard env vars"
git push
```

Or in the Netlify UI: **Deploys** → **Trigger deploy** → **Clear cache and deploy site**.

### Confirming it works
1. Open `https://meadows-powerwashing.netlify.app/dashboard.html`.
2. Enter the passphrase. The Customers tab should load (empty if no bookings).
3. Submit a test booking from the site's form. Refresh the dashboard — the
   booking appears. Tap it, pick a date/time, click **Confirm & send**.
4. Check that the customer email (use your own address) receives the invite,
   and that `eoinmeadows@icloud.com` also receives a matching one. Tap the .ics
   attachment on iPhone — it offers to add to Calendar.

## 4 — Uploading before/after photos

Two paths. Pick whichever is easier in the moment.

### Path A — From phone while on-site (fastest): Cloudinary via admin.html
This is already set up and covered in `ADMIN_GUIDE.md`. Summary:
1. On the phone, open **https://meadows-powerwashing.netlify.app/admin.html**.
2. Unlock with the admin passphrase (separate from the dashboard passphrase).
3. Pick before + after photos from the camera roll, add a caption, hit upload.
4. The pair lands in Cloudinary and the `Before & After` section of the site
   picks it up automatically on next page load.

Requires Eoin to finish Cloudinary setup (free tier) — see `ADMIN_GUIDE.md`.

### Path B — From a laptop or phone via git (slower but no service needed)
This drops the photo straight into the repo. Good for photos that need light
editing first, or as a backup path if Cloudinary isn't set up yet.

#### From a laptop (git CLI)
1. Open Terminal and `cd` into the project folder (where this file lives).
2. Copy the photo(s) into `images/` with descriptive filenames:
   ```
   cp ~/Desktop/my-driveway-after.jpg images/driveway-herndon-after.jpg
   ```
3. If the file is huge (>1 MB), shrink it first. iPhone photos can be 5 MB+.
   The site loads way faster if each image is 150–400 KB. One-liner using
   `sips` (built into macOS) to resize to 1600px wide and compress:
   ```
   sips -Z 1600 -s format jpeg -s formatOptions 80 images/driveway-herndon-after.jpg --out images/driveway-herndon-after.jpg
   ```
4. Edit `index.html` — find the `beforeAfterPairs` (or the `images/...` references
   in the Before/After grid) and add/update the filename.
5. Commit and push:
   ```
   git add images/ index.html
   git commit -m "Add driveway photo from Herndon job"
   git push
   ```
6. Netlify auto-deploys in ~5 seconds. Refresh the live site to see it.

#### From iPhone via GitHub mobile app (no laptop needed)
1. Install **GitHub** app from the App Store.
2. Sign in; open the `RedCloudDC/meadows-powerwashing` repo.
3. Tap **Files** → navigate into `images/`.
4. Tap **+** → **Upload files** → pick photo(s) from camera roll.
5. Tap **Commit** → message: "Add job photos" → commit directly to `main`.
6. To reference them in `index.html`, tap the file, tap **Edit** (pencil icon),
   add/update the `<img>` reference, commit.

Netlify auto-deploys on each commit.

#### From iPhone via Working Copy (for power users)
Working Copy is a paid app (~$20) but gives real git workflows on iPhone
including branches, diffs, and bulk commits. Worth it only if Eoin ends up
doing lots of photo uploads and wants control.

### Tips for good before/after photos
- **Same angle** for both shots. Stand in the same spot, same phone tilt.
- **Same lighting.** Ideal: cloudy day, no harsh shadows.
- **Landscape orientation** (wider than tall) looks better in the grid.
- **1600px wide, ~300 KB** is the sweet spot for sharpness + load time.

## 5 — Professional Gmail (optional but recommended)

`eoinmeadows@icloud.com` works fine for now. A dedicated business Gmail keeps
business mail separate and looks a bit more pro on invoices/receipts.

1. Sign up for `meadowspowerwashing@gmail.com` at
   **https://accounts.google.com/signup/v2/createaccount**.
2. In that Gmail → **Settings → Forwarding and POP/IMAP** → forward to
   `eoinmeadows@icloud.com` so he sees everything in one place.
3. In that Gmail → **Settings → Accounts → Send mail as** → add
   `eoinmeadows@icloud.com` so replies come from the business address.
4. When ready to switch, update `index.html` (three places) and the two
   Netlify notifications (replace the `icloud.com` recipient). Also update
   `FROM_EMAIL` + `EOIN_EMAIL` env vars.

## 6 — Google Business Profile (biggest local-SEO lever)

Single highest-ROI activity for a local service business. Still to do:

1. Go to **https://www.google.com/business** and sign in with the business Gmail.
2. Create a profile: **Meadows Powerwashing**, category: **Pressure washing service**.
3. Service area business — **no storefront**. Add Northern VA as the service area.
4. Phone: 571-230-7746. Website: the Netlify URL (or custom domain).
5. Upload the before/after photos. Google rewards listings with frequent photos.
6. Verification: Google mails a postcard with a code. Usually 5–14 days. Enter
   the code to go live.

**Weekly habit once live:** add 1–2 new photos, respond to every review within
24 hours.

## 7 — Print materials

### Yard signs (corrugated plastic, $5–10 each at Vistaprint / Signs.com)
Leave one by the curb after every job (ask first):
- **"Just Cleaned by Meadows Powerwashing"** — big
- `qr-code-yardsign.png` — scans to the site
- Phone: 571-230-7746

### Door hangers ($0.20–0.40 each)
After every completed job, hit the 5–10 houses on either side. Include a
"New neighbor discount — $25 off" for urgency.

### Car magnets / rear window decal
~$30 at Staples or Vistaprint. Driving = free advertising.

### Business cards (Moo or Vistaprint, ~$20)
Leave one with every completed job.

## 8 — Smoke test before you hand off to Eoin

- [ ] iPhone Safari: site loads, before/after slider works, sticky Text button visible.
- [ ] Desktop Chrome: form submits → Netlify → all three notifications fire.
- [ ] `dashboard.html`: passphrase unlocks, bookings list populates, tapping a
      job opens details, **Confirm & send** delivers both emails with `.ics`.
- [ ] `admin.html`: photo upload works (requires Cloudinary setup first).
- [ ] QR codes scan to the live URL.

## Regenerating the QR code (only if the URL changes)

If you switch to a custom domain (e.g. `meadowspowerwashing.com`), regenerate:
1. Open `/tmp/make_qr.py` (or ask Claude to run it again).
2. Change the `URL` variable to the new address.
3. `python3 /tmp/make_qr.py` — regenerates the three PNGs + SVG in place.

Or use any free generator like **https://qr.io** — encode the new URL with
high error correction.
