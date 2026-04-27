// Send confirmation email to customer + Eoin with a .ics calendar invite.
// POST JSON { id, customer: { name, email, phone, address, service }, confirmedAt, durationMinutes, notes }
// Env vars required:
//   DASHBOARD_PASSWORD — gate via x-auth header
//   RESEND_API_KEY     — resend.com API key (free tier: 100 emails/day)
//   FROM_EMAIL         — sender (e.g. "Meadows Powerwashing <bookings@...>" or "onboarding@resend.dev")
//   EOIN_EMAIL         — where Eoin's copy + .ics goes

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

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
  const eoinEmail = process.env.EOIN_EMAIL || "eoinmeadows@icloud.com";

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json(400, { error: "Invalid JSON" });
  }

  const { id, customer, confirmedAt, durationMinutes = 60, notes = "" } = body || {};
  if (!id || !customer || !confirmedAt) {
    return json(400, {
      error: "Required: { id, customer, confirmedAt }",
    });
  }
  if (!customer.email && !customer.phone) {
    return json(400, {
      error: "Customer needs at least email or phone to confirm",
    });
  }

  const start = new Date(confirmedAt);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  // Build .ics file (RFC 5545 subset, works with iOS Calendar/Google/Outlook)
  const ics = buildIcs({
    uid: `meadows-${id}@meadows-powerwashing.netlify.app`,
    start,
    end,
    summary: `Meadows Powerwashing: ${customer.service || "service"}`,
    description: [
      `Customer: ${customer.name || "?"}`,
      customer.phone ? `Phone: ${customer.phone}` : null,
      customer.address ? `Address: ${customer.address}` : null,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\\n"),
    location: customer.address || "",
    organizerEmail: eoinEmail,
    organizerName: "Eoin Meadows",
  });

  if (!resendKey) {
    // Resend not configured — persist that we tried and return a gentle 200 so the UI can still
    // mark the job as Scheduled. Eoin can re-send once the key is set up.
    const store = getStore("jobs");
    const prev = (await store.get(`job:${id}`, { type: "json" })) || {};
    await store.setJSON(`job:${id}`, {
      ...prev,
      status: "scheduled",
      confirmedAt,
      durationMinutes,
      notes,
      lastSendSkipped: "RESEND_API_KEY not set",
      updatedAt: new Date().toISOString(),
    });
    return json(200, {
      ok: true,
      emailSent: false,
      reason: "RESEND_API_KEY not set — job marked Scheduled, no email sent yet",
    });
  }

  const prettyTime = start.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });

  const customerSubject = "Your Meadows Powerwashing job is scheduled";
  const customerText =
    `Hi ${customer.name ? customer.name.split(" ")[0] : "there"},\n\n` +
    `Your powerwash is scheduled for ${prettyTime}.\n` +
    (customer.address ? `Address: ${customer.address}\n` : "") +
    (customer.service ? `Service: ${customer.service}\n` : "") +
    `\nReply to this email or text 571-230-7746 if you need to change anything.\n` +
    `The attached calendar invite will add it to your phone.\n\n— Eoin`;

  const eoinSubject = `Scheduled: ${customer.name || "customer"} — ${prettyTime}`;
  const eoinText =
    `Job confirmed for ${customer.name || "?"} at ${prettyTime}.\n` +
    (customer.phone ? `Customer phone: ${customer.phone}\n` : "") +
    (customer.email ? `Customer email: ${customer.email}\n` : "") +
    (customer.address ? `Address: ${customer.address}\n` : "") +
    (customer.service ? `Service: ${customer.service}\n` : "") +
    (notes ? `Notes: ${notes}\n` : "") +
    `\nThe .ics attachment will drop this on your iPhone Calendar.`;

  // Send both emails. Resend accepts `attachments: [{ filename, content (base64) }]`
  const icsB64 = Buffer.from(ics, "utf8").toString("base64");

  const sends = await Promise.all([
    customer.email
      ? sendResend({
          apiKey: resendKey,
          from: fromEmail,
          to: [customer.email],
          subject: customerSubject,
          text: customerText,
          attachment: { filename: "meadows-job.ics", contentB64: icsB64 },
        })
      : Promise.resolve({ ok: true, skipped: "no customer email" }),
    sendResend({
      apiKey: resendKey,
      from: fromEmail,
      to: [eoinEmail],
      subject: eoinSubject,
      text: eoinText,
      attachment: { filename: "meadows-job.ics", contentB64: icsB64 },
    }),
  ]);

  const anyFailed = sends.some((s) => !s.ok && !s.skipped);

  // Persist scheduled state regardless of email outcome
  const store = getStore("jobs");
  const prev = (await store.get(`job:${id}`, { type: "json" })) || {};
  await store.setJSON(`job:${id}`, {
    ...prev,
    status: "scheduled",
    confirmedAt,
    durationMinutes,
    notes,
    lastSendAt: new Date().toISOString(),
    lastSendOk: !anyFailed,
    updatedAt: new Date().toISOString(),
  });

  return json(anyFailed ? 207 : 200, {
    ok: !anyFailed,
    customerSend: sends[0],
    eoinSend: sends[1],
  });
};

async function sendResend({ apiKey, from, to, subject, text, attachment }) {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        attachments: attachment
          ? [{ filename: attachment.filename, content: attachment.contentB64 }]
          : undefined,
      }),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function buildIcs({ uid, start, end, summary, description, location, organizerEmail, organizerName }) {
  const fmt = (d) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const esc = (s) =>
    String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meadows Powerwashing//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    location ? `LOCATION:${esc(location)}` : null,
    `ORGANIZER;CN=${esc(organizerName)}:mailto:${organizerEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
