// Public endpoint where the customer accepts (or declines) Eoin's quote.
// POST JSON { id, accepted: true|false }
//
// No DASHBOARD_PASSWORD auth — the link is sent only to the customer. The
// job ID is a 24-char Netlify submission ID, which is not guessable.
//
// Updates Blobs (jobs/job:<id>): status='accepted' or 'declined', acceptedAt.
// Optionally pings Eoin via email if RESEND_API_KEY is set.

import { getStore } from "@netlify/blobs";

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "POST required" });

  let body;
  try { body = await request.json(); }
  catch { return json(400, { error: "Invalid JSON" }); }

  const { id, accepted } = body || {};
  if (!id || typeof accepted !== "boolean") {
    return json(400, { error: "Required: { id, accepted: true|false }" });
  }

  const store = getStore("jobs");
  const prev = await store.get(`job:${id}`, { type: "json" });
  if (!prev) return json(404, { error: "Job not found" });
  if (prev.status !== "quoted" && prev.status !== "accepted" && prev.status !== "declined") {
    return json(409, { error: `Job is in ${prev.status} state — quote cannot be accepted` });
  }

  const now = new Date().toISOString();
  const next = {
    ...prev,
    status: accepted ? "accepted" : "declined",
    acceptedAt: accepted ? now : null,
    declinedAt: accepted ? null : now,
    updatedAt: now,
  };
  await store.setJSON(`job:${id}`, next);

  // Best-effort notify Eoin
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
  const eoinEmail = process.env.EOIN_EMAIL || "eoinmeadows@icloud.com";
  if (resendKey && eoinEmail) {
    const subject = accepted
      ? `✅ Quote accepted: ${prev.customerName || "customer"} ($${prev.priceQuoted || "?"})`
      : `❌ Quote declined: ${prev.customerName || "customer"}`;
    const text = accepted
      ? `${prev.customerName || "Customer"} just accepted your $${prev.priceQuoted || "?"} quote for ${prev.serviceDescription || "their job"}.\n\nOpen the dashboard to schedule a date.\n${process.env.URL || "https://meadows-powerwashing.netlify.app"}/dashboard.html`
      : `${prev.customerName || "Customer"} declined the quote.`;
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: `Meadows Powerwashing <${fromEmail}>`, to: [eoinEmail], subject, text }),
    }).catch(() => {});
  }

  return json(200, { ok: true, status: next.status });
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
