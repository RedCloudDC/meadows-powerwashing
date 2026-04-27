// Update stored job state for a Meadows Powerwashing booking.
// POST JSON { id, state: { status, confirmedAt, durationMinutes, notes, priceQuoted, paid } }
// Gated by DASHBOARD_PASSWORD via x-auth header, same as list-submissions.

import { getStore } from "@netlify/blobs";

export default async (request) => {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return json(500, { error: "DASHBOARD_PASSWORD not set" });
  if (request.headers.get("x-auth") !== expected) {
    return json(401, { error: "Unauthorized" });
  }
  if (request.method !== "POST") {
    return json(405, { error: "POST required" });
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json(400, { error: "Invalid JSON" });
  }
  const { id, state } = body || {};
  if (!id || !state || typeof state !== "object") {
    return json(400, { error: "Required: { id, state }" });
  }

  const allowed = [
    "status",
    "confirmedAt",
    "durationMinutes",
    "notes",
    "priceQuoted",
    "paid",
  ];
  const clean = {};
  for (const k of allowed) {
    if (k in state) clean[k] = state[k];
  }
  clean.updatedAt = new Date().toISOString();

  const store = getStore("jobs");
  await store.setJSON(`job:${id}`, clean);

  return json(200, { ok: true, state: clean });
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
