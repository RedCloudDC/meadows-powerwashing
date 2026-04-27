// Send a price quote to the customer with a one-click "accept" link.
// POST JSON { id, customer: { name, email }, priceQuoted, notes, serviceDescription }
//
// Auth: x-auth header must equal DASHBOARD_PASSWORD.
// Email transport: Resend (RESEND_API_KEY). If unset, persists "quote sent" state without
//   actually emailing — useful for local dev.
//
// Persists to Netlify Blobs (jobs/job:<id>): status='quoted', priceQuoted, quoteSentAt.

import { getStore } from "@netlify/blobs";

export default async (request) => {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return json(500, { error: "DASHBOARD_PASSWORD not set" });
  if (request.headers.get("x-auth") !== expected) return json(401, { error: "Unauthorized" });
  if (request.method !== "POST") return json(405, { error: "POST required" });

  let body;
  try { body = await request.json(); }
  catch { return json(400, { error: "Invalid JSON" }); }

  const { id, customer = {}, priceQuoted, notes = "", serviceDescription = "your job" } = body || {};
  if (!id) return json(400, { error: "Required: { id, customer.email, priceQuoted }" });
  if (!customer.email) return json(400, { error: "Customer needs an email" });
  if (priceQuoted == null || isNaN(Number(priceQuoted))) return json(400, { error: "priceQuoted must be a number" });

  const siteOrigin =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://meadows-powerwashing.netlify.app";
  const acceptLink = `${siteOrigin}/confirm-quote.html?id=${encodeURIComponent(id)}`;

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
  const eoinEmail = process.env.EOIN_EMAIL || "eoinmeadows@icloud.com";

  const firstName = (customer.name || "there").split(" ")[0];
  const subject = `Your Meadows Powerwashing quote: $${Number(priceQuoted).toFixed(0)}`;
  const text =
    `Hi ${firstName},\n\n` +
    `Thanks for letting me look at your job. Here's your quote:\n\n` +
    `  $${Number(priceQuoted).toFixed(0)} — ${serviceDescription}\n\n` +
    (notes ? `Note from Eoin:\n  ${notes}\n\n` : "") +
    `If this looks good, accept it with one tap:\n${acceptLink}\n\n` +
    `Or reply to this email / text me at 571-230-7746 if you have any questions.\n\n` +
    `Thanks,\nEoin Meadows`;

  let emailResult = { skipped: "no RESEND_API_KEY" };
  if (resendKey) {
    emailResult = await sendResend({
      apiKey: resendKey,
      from: `Meadows Powerwashing <${fromEmail}>`,
      to: [customer.email],
      replyTo: eoinEmail,
      subject,
      text,
    });
  }

  // Persist — including customer-facing fields the confirm page needs
  try {
    const store = getStore("jobs");
    const prev = (await store.get(`job:${id}`, { type: "json" })) || {};
    await store.setJSON(`job:${id}`, {
      ...prev,
      status: "quoted",
      priceQuoted: Number(priceQuoted),
      quoteSentAt: new Date().toISOString(),
      quoteNotes: notes || prev.quoteNotes || "",
      // Snapshot for fetch-quote.js (public read of confirm page)
      customerName: customer.name || prev.customerName || "",
      customerAddress: customer.address || prev.customerAddress || "",
      customerEmail: customer.email || prev.customerEmail || "",
      serviceDescription: serviceDescription || prev.serviceDescription || "your job",
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return json(500, { error: "Persist failed", detail: String(e) });
  }

  return json(200, { ok: true, emailResult, acceptLink });
};

async function sendResend({ apiKey, from, to, replyTo, subject, text }) {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to, reply_to: replyTo, subject, text }),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
