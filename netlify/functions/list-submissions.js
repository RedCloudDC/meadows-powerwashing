// List Meadows Powerwashing booking submissions, merged with stored job state.
// Requires Netlify env vars:
//   NETLIFY_API_TOKEN  — personal access token from app.netlify.com/user/applications
//   NETLIFY_SITE_ID    — site ID (available in Project configuration > General)
//   DASHBOARD_PASSWORD — passphrase (plain text) the dashboard sends via x-auth header
//
// Gate: request header `x-auth` must equal DASHBOARD_PASSWORD, or we refuse.

import { getStore } from "@netlify/blobs";

export default async (request) => {
  // --- auth gate -----------------------------------------------------------
  const expected = process.env.DASHBOARD_PASSWORD;
  const got = request.headers.get("x-auth");
  if (!expected) {
    return json(500, { error: "DASHBOARD_PASSWORD env var not set on site" });
  }
  if (got !== expected) {
    return json(401, { error: "Unauthorized" });
  }

  // --- fetch submissions from Netlify Forms API ----------------------------
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  if (!token || !siteId) {
    return json(500, {
      error: "NETLIFY_API_TOKEN and NETLIFY_SITE_ID must be set in site env",
    });
  }

  let submissions = [];
  try {
    const resp = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/submissions?per_page=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) {
      const body = await resp.text();
      return json(resp.status, { error: "Netlify API error", body });
    }
    submissions = await resp.json();
  } catch (e) {
    return json(500, { error: "Fetch failed", detail: String(e) });
  }

  // --- merge stored job state from Netlify Blobs ---------------------------
  const store = getStore("jobs");
  const out = [];
  for (const s of submissions) {
    const data = s.data || {};
    let state = null;
    try {
      state = await store.get(`job:${s.id}`, { type: "json" });
    } catch (_) {
      state = null;
    }
    out.push({
      id: s.id,
      created_at: s.created_at,
      name: data.name || "",
      phone: data.phone || "",
      email: data.email || "",
      address: data.address || "",
      service: data.service || "",
      preferred_date: data.preferred_date || "",
      notes_from_customer: data.notes || "",
      state: state || {
        status: "new",
        confirmedAt: null,
        durationMinutes: 60,
        notes: "",
        priceQuoted: null,
        paid: false,
        updatedAt: null,
      },
    });
  }

  return json(200, { jobs: out });
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
