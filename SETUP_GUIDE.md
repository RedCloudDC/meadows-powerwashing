# Meadows Powerwashing — Setup Guide

Everything below is a one-time setup. Most of this takes an hour total, all of it is free to start.

## What's in this folder

```
meadows-powerwashing/
├── index.html              ← the website (single file)
├── favicon.svg             ← icon shown in browser tabs
├── favicon.png             ← icon for iOS/Android home screen
├── og-image.jpg            ← preview image when site is shared (Facebook/iMessage)
├── images/                 ← before/after photos
│   ├── driveway-before.jpg
│   ├── driveway-after.jpg
│   ├── walkway-before.jpg
│   └── walkway-after.jpg
├── qr-code-plain.png       ← black/white QR — best for print
├── qr-code-branded.png     ← blue, rounded dots — nicer for digital
├── qr-code-yardsign.png    ← QR with "Scan to Book" label — ready to print
├── qr-code.svg             ← scalable QR for large-format signs
└── SETUP_GUIDE.md          ← this file
```

---

## 1 — Set up the booking form (Formspree)

The website form POSTs to Formspree. You need to create a free account and wire it up.

1. Go to **https://formspree.io** and sign up with `eoinmeadows@icloud.com`.
2. Click **+ New Form**, name it "Meadows Powerwashing — Quotes".
3. Copy the form endpoint — it looks like `https://formspree.io/f/abcd1234`.
4. Open `index.html` and find this line (near the booking form):
   ```html
   <form id="book-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```
   Replace `YOUR_FORM_ID` with the ID you copied (keep the `f/` prefix). Save.
5. In Formspree's dashboard for that form, under **Settings → Notifications**, confirm
   the notification email is `eoinmeadows@icloud.com`. Optionally add a second
   recipient — see "Getting the text message" below.

The free Formspree plan gives 50 submissions/month, which is plenty for a summer business.

---

## 2 — Get the text message when a new customer books

You have two options. Pick whichever is easier.

### Option A — Email push notifications on iPhone (free, good enough for most)
Eoin's email is `eoinmeadows@icloud.com`. If he enables push notifications for the Mail app
on his iPhone for that account, Formspree submissions hit his lock screen within seconds.

1. On the iPhone: **Settings → Notifications → Mail → iCloud**.
2. Turn on **Allow Notifications**, **Lock Screen**, **Banners**, **Sounds**.
3. Optional: set a **custom alert sound** for iCloud mail so he notices it during yard work.

### Option B — Real SMS via Email-to-SMS gateway (actual text messages)
Most US carriers offer a free email-to-SMS gateway. Email to that address → a real text
arrives. You add it as a secondary recipient on the Formspree form.

Find Eoin's carrier, then the address is:
- **Verizon**: `5712307746@vtext.com`
- **AT&T**: `5712307746@txt.att.net`
- **T-Mobile**: `5712307746@tmomail.net`
- **Sprint/T-Mobile**: `5712307746@messaging.sprintpcs.com`
- **Google Fi**: `5712307746@msg.fi.google.com`

Not sure of the carrier? Run a free lookup at **https://freecarrierlookup.com** with his number.

In Formspree → form settings → **add recipient** → paste the gateway address above.
Formspree will send a verification email to it (it arrives as an SMS); click the link on
the phone to confirm. After that, every form submission lands as an SMS.

### Option C — Upgrade path: Zapier or Formspree + Twilio
If he outgrows the free options (50 submissions/month Formspree cap, or wants richer SMS),
set up **Zapier** (free tier: 100 tasks/month):
- Trigger: new Formspree submission
- Action: send SMS via Zapier-built-in SMS (free within US) or Twilio

Only worth doing if the business takes off.

---

## 3 — Deploy the site for free (Netlify)

1. Go to **https://app.netlify.com/drop** in a browser on the Mac.
2. Drag the entire `meadows-powerwashing` folder onto the drop zone.
3. Netlify deploys in about 10 seconds and gives you a URL like
   `https://random-words-12345.netlify.app`.
4. On the site's dashboard → **Site configuration → Change site name** → set to
   `meadows-powerwashing`. The URL becomes `https://meadows-powerwashing.netlify.app`.
5. Sign up for a free Netlify account when prompted (use the iCloud email). This
   locks in the site name and lets you update it later.

That URL is already what the QR codes in this folder point to — no regeneration needed.

### Updating the site later
Drag the folder onto Netlify again (Site → **Deploys** → drop zone). It replaces the live
version. Or install **Netlify Drop** on the Mac and drag to the menu bar icon.

### Want a custom domain? (optional, ~$12/year)
- Buy `meadowspowerwashing.com` at Namecheap, Porkbun, or Cloudflare.
- In Netlify → **Domain management → Add custom domain** → follow the DNS steps.
- Netlify gives you a free HTTPS certificate automatically.

If you go this route, **regenerate the QR codes** so they point to the new domain.
See "Regenerating the QR code" below.

---

## 4 — Set up the professional Gmail (optional but recommended)

`eoinmeadows@icloud.com` works fine, but a dedicated business email looks more professional
and keeps business mail out of his personal inbox.

1. Go to **https://accounts.google.com/signup/v2/createaccount** and create
   `meadowspowerwashing@gmail.com` (or similar).
2. In that Gmail → **Settings → Forwarding and POP/IMAP** → forward to
   `eoinmeadows@icloud.com` so he sees everything in one place.
3. In that Gmail → **Settings → Accounts → Send mail as** → add
   `eoinmeadows@icloud.com` (or vice versa) so replies come from the business address.
4. Update `index.html`: find `eoinmeadows@icloud.com` (three places) and replace with
   the new address. Also update the JSON-LD schema at the top of the file.

---

## 5 — Google Business Profile (biggest lever for local customers)

This is the single highest-ROI thing you can do for a local service business.

1. Go to **https://www.google.com/business** and sign in with the business Gmail.
2. Create a profile: **Meadows Powerwashing**, category: **Pressure washing service**.
3. Service area business — **no storefront**. Add Northern VA as the service area.
4. Phone: 571-230-7746. Website: the Netlify URL (or custom domain).
5. Upload the before/after photos. Google rewards listings with frequent new photos.
6. Verification: Google will mail a postcard with a code. Usually 5–14 days. Enter the
   code to go live.
7. Once verified, your listing shows up in Google Maps and the local "3-pack" when
   neighbors search "power washing near me".

**Weekly habit**: add 1–2 new photos and respond to every review within 24 hours.

---

## 6 — Print materials

### Yard signs (corrugated plastic, $5–10 each at Vistaprint / Signs.com)
Leave one by the curb after every job (ask first). Include:
- Big: **"Just Cleaned by Meadows Powerwashing"**
- QR code: use `qr-code-yardsign.png`
- Phone: 571-230-7746

### Door hangers ($0.20–0.40 each, Vistaprint or 4over)
Hit the 5–10 houses on either side of every completed job. They saw the work, they want
the same result. Include a "New neighbor discount — $25 off" to create urgency.

### Car magnets / rear window decal
One per vehicle. Driving to and from jobs = free advertising. ~$30 at Staples or Vistaprint.

### Business cards (Moo or Vistaprint, ~$20)
Handful in his wallet. Leave one with every completed job.

---

## Regenerating the QR code (if the URL changes)

If you switch to a custom domain or change the Netlify subdomain:

1. Open `/tmp/make_qr.py` (or ask Claude to run it again).
2. Change the `URL` variable at the top to the new address.
3. Run `python3 /tmp/make_qr.py`.
4. The three PNGs and SVG regenerate in place.

Or use any free generator like **https://qr.io** or **https://www.qr-code-generator.com**
— just encode the new URL with high error correction.

---

## Smoke test before you go live

Open the deployed Netlify URL on:
- [ ] iPhone Safari — does the before/after slider work? Sticky "Text" button at bottom?
- [ ] Desktop Chrome — does the form submit and land in Formspree?
- [ ] One more device — scan the QR code — does it open the right URL?

Fill the form out once as a test customer to confirm Eoin gets the email (and SMS if set up).
