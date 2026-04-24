# Admin Guide — Portfolio Uploads from the iPhone

This is the one-time setup that lets Eoin add before/after photos directly from his phone.
Once it's wired up, the flow is: **open admin page → pick two photos → type title → tap Upload → photo appears on the site within a minute.**

All services below have free tiers that will easily cover a summer business.

---

## The 10-minute setup

### Step 1 — Create a free Cloudinary account (3 min)

Cloudinary hosts the photos and serves them fast, resized, and optimized.

1. Go to **https://cloudinary.com/users/register_free** and sign up with `eoinmeadows@icloud.com`.
2. When asked for a **Cloud name**, pick something short. Suggested: `meadows-pw`. Write it down.
3. Land on the dashboard — leave the tab open.

### Step 2 — Create an "unsigned" upload preset (2 min)

This is what lets the iPhone upload without exposing any secret credentials.

1. In Cloudinary, go to **Settings (gear icon top-right) → Upload → Upload presets**.
2. Click **Add upload preset**.
3. Set these values:
   - **Preset name**: `meadows_unsigned`
   - **Signing Mode**: **Unsigned**
   - **Folder**: `meadows-portfolio` (keeps things tidy)
4. Open **Upload Manipulations** and add a quick incoming transformation so huge iPhone
   photos don't eat your bandwidth:
   - Width: `2000`, Quality: `auto`, Format: `auto`
5. **Save**.

### Step 3 — Enable the public "Resource list" endpoint (1 min)

This is what lets the website and admin page read the list of uploaded photos.

1. In Cloudinary: **Settings → Security**.
2. Find **Restricted media types** (also called "Resource list" in some dashboards).
3. Make sure **Resource list** is **NOT** in the restricted list.
   (If it is, remove it and save.)

> Cloudinary sometimes hides this under **Settings → Security → Restricted media types**.
> If you can't find it, search their help for "enable resource list".

### Step 4 — Paste the Cloud name into the site files (1 min)

Open these two files and find the line `YOUR_CLOUD_NAME`. Replace it with your actual
cloud name (e.g., `meadows-pw`):

- `index.html` — one place near the bottom, in a `<script>` block (look for `CLOUDINARY_CLOUD_NAME`).
- `admin.html` — near the top, in a `<script>` block inside the container.

Save both.

### Step 5 — Change the admin passphrase (2 min)

The admin page ships locked with the passphrase **`change-me-now`**. Change it before
anything real goes live.

1. Pick a passphrase. Something like `MeadowsSummer26!` — easy for Eoin to remember,
   annoying to guess.
2. Generate its SHA-256 hash. Easiest way:
   - On Mac Terminal: `echo -n "MeadowsSummer26!" | shasum -a 256`
   - Or paste the passphrase into **https://emn178.github.io/online-tools/sha256.html**
3. Copy the 64-character hex output.
4. In `admin.html` find the line:
   ```js
   const PASSPHRASE_HASH = 'ccc0b903...ca4beb42'; // "change-me-now"
   ```
   Replace the hash (not the passphrase itself — the **hash**).
5. Save.

### Step 6 — Deploy

Drag the whole folder onto Netlify again (or use the Netlify Drop menu-bar app).

### Step 7 — Bookmark on iPhone

On Eoin's iPhone:

1. Open Safari → navigate to `https://meadows-powerwashing.netlify.app/admin.html`
2. Tap the **Share** icon → **Add to Home Screen** → name it **"Meadows Upload"**.
3. Now it lives on his home screen as an icon; launches in full-screen mode.
4. On first launch, type the passphrase once. Safari/Keychain will offer to save it.

Done. Uploads now flow from phone → Cloudinary → website automatically.

---

## The daily flow

1. Finish a job. Take matched before/after photos (same angle, same framing).
2. Tap the **Meadows Upload** icon on the home screen.
3. Type project title (e.g., "McLean driveway").
4. Tap **Before** → **Photo Library** → pick the before shot.
5. Tap **After** → pick the after shot.
6. Tap **Upload to portfolio**.

Within about a minute, the new before/after pair shows up in the gallery section of the
main site. Neighbors tapping the QR code see the latest work.

---

## Optional: iOS Shortcut for one-tap upload from the camera roll

If the admin page feels like too many taps, here's an iOS Shortcut that does the same thing
from the Share Sheet in the Photos app.

### Create the shortcut

Open the **Shortcuts** app on the iPhone → **+** → build this flow. The action names
are exactly what they show up as in the Shortcuts app.

1. **Receive** Images from **Share Sheet** (set to 2 items max).
2. **Ask for Input** — Prompt: "Project title?", Type: Text. Save as variable **Title**.
3. **Text**: `p{Current Date}` (format: Unix timestamp). Save as **PairID**.
4. **Repeat with Each** image from the input:
   - Get **Repeat Index** (1 = before, 2 = after). Save as **Idx**.
   - **If** Idx is 1 → set **Role** to `before`. Otherwise → `after`.
   - **Get Contents of URL**:
     - URL: `https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload`
     - Method: **POST**
     - Request Body: **Form**
     - Fields:
       - `upload_preset` → `meadows_unsigned`
       - `tags` → `portfolio`
       - `context` → `pair_id={PairID}|role={Role}|title={Title}`
       - `file` → the Repeat Item (image)
5. (End Repeat)
6. **Show Notification**: "Uploaded to portfolio!"

Name it **Meadows Upload**. Enable **Use with Share Sheet**. In the Photos app, select a
before + after photo → Share → **Meadows Upload** → done.

> If you want, I can generate the `.shortcut` file itself — just ask and I'll build
> one you can AirDrop to Eoin.

---

## How the homepage gallery updates

The homepage (`index.html`) fetches the list of `portfolio`-tagged images from
Cloudinary every time someone loads the page. New pairs appear automatically under the
two hard-coded demo pairs that ship with the site.

There's no deploy step needed when Eoin uploads a new project. The site URL stays the
same; Cloudinary serves the new images directly.

Cloudinary caches the list endpoint for ~60 seconds, so expect up to a minute of delay
on brand-new uploads.

---

## Managing / deleting uploads

Cloudinary's free dashboard has a **Media Library** view with thumbnails, search, and
delete. Two ways to get there:

- Open **https://cloudinary.com/console/media_library**, or
- From the admin page, scroll down and click the "Cloudinary → Media Library" link.

Select a photo, click **Delete**. It disappears from the site within a minute.

### Hiding a pair without deleting it
In Media Library, select the image and change its tag from `portfolio` to anything else.
The site stops showing it but the file stays.

---

## If something goes wrong

**"Upload failed: 401"** — The upload preset isn't set to **Unsigned**. Go back to
Settings → Upload → Upload presets, open `meadows_unsigned`, and flip Signing Mode.

**"Can't load the list yet"** on admin page — Cloudinary's Resource list is restricted.
Go to Settings → Security, remove `Resource list` from restricted media types.

**Passphrase stuck / forgot it** — Open `admin.html` and replace `PASSPHRASE_HASH` with a
fresh hash (see Step 5 above). Redeploy. Any browsers that had the old passphrase saved
will prompt again.

**Huge photos from the iPhone taking forever to upload** — The incoming transformation
you set in Step 2 (max width 2000, quality auto) should keep uploads under 1 MB each.
If you skipped it, go back and add it — uploads will be 5-10x faster.

**Images not appearing after Cloudinary cache window** — Force a hard refresh with
Shift+Cmd+R in Chrome or pull-down-to-refresh on Safari. Cloudinary's list endpoint
usually refreshes within 60 seconds but can take up to 5 minutes.

---

## Security notes (honest assessment)

The admin page's passphrase is **client-side only**. A determined attacker who finds the
admin URL can read the source, extract the hash, and try to crack it offline. In
practice:

- The URL is not linked from anywhere, not indexed (robots noindex), and not discoverable.
- The upload preset is scoped to one folder and one tag. Worst case someone finds the page
  and uploads a weird photo; Eoin sees it in the gallery within a minute and deletes it
  from the Cloudinary dashboard.
- The passphrase stops casual snoops and web crawlers. That's all it's meant to do.

If this ever needs real auth, swap to Netlify Identity (free) or a Netlify Function +
token — but that's overkill for a one-person summer business.
