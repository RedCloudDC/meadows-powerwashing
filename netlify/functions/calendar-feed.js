// Public-but-token-protected calendar feed.
//
// Eoin subscribes to:
//   webcal://meadows-powerwashing.netlify.app/.netlify/functions/calendar-feed?token=<TOKEN>
// in iOS Calendar (Settings → Calendar → Accounts → Add Subscribed Calendar).
//
// Every job with status = scheduled (or accepted with a confirmed date) appears
// as a calendar event. iOS pulls updates every ~15-60 min, so newly-scheduled
// jobs sync automatically. Cancelling/declining a job removes it on next sync.
//
// Auth: query string `?token=…` must match CALENDAR_FEED_TOKEN env var.
// (Calendar apps can't send custom headers, so the token has to be in the URL.)
//
// Env vars: CALENDAR_FEED_TOKEN, NETLIFY_API_TOKEN, NETLIFY_SITE_ID.

import { getStore } from "@netlify/blobs";

export default async (request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expected = process.env.CALENDAR_FEED_TOKEN;
  if (!expected) return text(500, "CALENDAR_FEED_TOKEN env var not set");
  if (token !== expected) return text(401, "Unauthorized");

  const apiToken = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  if (!apiToken || !siteId) return text(500, "NETLIFY_API_TOKEN and NETLIFY_SITE_ID must be set");

  let submissions = [];
  try {
    const resp = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/submissions?per_page=200`,
      { headers: { Authorization: `Bearer ${apiToken}` } }
    );
    if (!resp.ok) return text(502, "Netlify API error " + resp.status);
    submissions = await resp.json();
  } catch (e) {
    return text(500, "Fetch failed: " + String(e));
  }

  const store = getStore("jobs");
  const events = [];
  for (const s of submissions) {
    const data = s.data || {};
    let state;
    try {
      state = (await store.get(`job:${s.id}`, { type: "json" })) || {};
    } catch (_) {
      state = {};
    }
    if (!state.confirmedAt) continue;
    if (state.status === "declined" || state.status === "cancelled") continue;

    const start = new Date(state.confirmedAt);
    if (isNaN(start.getTime())) continue;
    const duration = Number(state.durationMinutes) || 60;
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const customerName = data.name || "(unnamed)";
    const address = data.address || "";
    const phone = data.phone || "";
    const email = data.email || "";
    const notes = data.notes || "";
    const status = state.status || "scheduled";

    // Title that fits on a calendar block: name + first part of address
    const shortAddr = address.split(",")[0] || "";
    const summary = (status === "done" ? "[Done] " : "") +
      `${customerName}${shortAddr ? " · " + shortAddr : ""}`;

    const desc = [
      `Status: ${status.toUpperCase()}`,
      phone ? `Phone: ${phone}` : null,
      email ? `Email: ${email}` : null,
      address ? `Address: ${address}` : null,
      state.priceQuoted ? `Price: $${state.priceQuoted}` : null,
      notes ? `Notes: ${notes}` : null,
      state.notes ? `Internal: ${state.notes}` : null,
    ].filter(Boolean).join("\n");

    events.push(buildVEvent({
      uid: `meadows-${s.id}@meadows-powerwashing.netlify.app`,
      start,
      end,
      summary,
      description: desc,
      location: address,
      lastModified: state.updatedAt || state.confirmedAt,
    }));
  }

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meadows Powerwashing//Calendar Feed//EN",
    "X-WR-CALNAME:Meadows Powerwashing Jobs",
    "X-WR-TIMEZONE:America/New_York",
    "X-PUBLISHED-TTL:PT15M",
    "METHOD:PUBLISH",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(calendar, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      // Tell calendar clients to refresh every 15 min
      "cache-control": "public, max-age=900",
      "content-disposition": "inline; filename=meadows-jobs.ics",
    },
  });
};

function buildVEvent({ uid, start, end, summary, description, location, lastModified }) {
  const fmt = (d) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s) =>
    String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const lastMod = lastModified ? new Date(lastModified) : new Date();
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    location ? `LOCATION:${esc(location)}` : null,
    `LAST-MODIFIED:${fmt(lastMod)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function text(status, body) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });
}
