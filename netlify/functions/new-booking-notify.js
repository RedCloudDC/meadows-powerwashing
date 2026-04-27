// Outgoing webhook target — Netlify calls this when the booking form gets a new
// submission. We send Eoin a custom email (via Resend) that links straight to
// the dashboard, so he can quote the customer in one tap.
//
// Configure in Netlify: Project configuration → Notifications → Form submission
//   notifications → Add notification → HTTP POST request →
//   URL: https://meadows-powerwashing.netlify.app/.netlify/functions/new-booking-notify
//   Form: booking
//
// Auth: Netlify signs outbound webhooks with NETLIFY_WEBHOOK_TOKEN if you set it.
// We don't enforce that here — the body must look like a Netlify form payload
// and we don't do anything destructive, just send Eoin an email.
//
// Env vars:
//   RESEND_API_KEY — required to actually send. Logs and 200s if unset.
//   FROM_EMAIL     — sender for the email (default: onboarding@resend.dev)
//   EOIN_EMAIL     — recipient (default: eoinmeadows@icloud.com)

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "POST required" });

  let payload;
  try { payload = await request.json(); }
  catch { return json(400, { error: "Invalid JSON" }); }

  // Netlify webhook payload shape: { id, form_id, form_name, data: { name, email, ... }, ... }
  const data = payload.data || payload;
  const customer = {
    name: data.name || "(no name)",
    phone: data.phone || "",
    email: data.email || "",
    address: data.address || "",
    preferred_date: data.preferred_date || "",
    notes: data.notes || "",
  };

  const submissionId = payload.id || "";
  const siteOrigin =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://meadows-powerwashing.netlify.app";
  const dashboardLink = `${siteOrigin}/dashboard.html#customers`;

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
  const eoinEmail = process.env.EOIN_EMAIL || "eoinmeadows@icloud.com";

  // Subject is what shows up in iOS lock-screen previews — pack the high-signal stuff first.
  const shortAddress = customer.address ? " · " + truncate(customer.address, 40) : "";
  const subject = `New booking · ${customer.name}${shortAddress}`;
  // First body line shows in the notification preview when "Show Previews: When Unlocked" — keep
  // the most actionable info up top.
  const text =
    `📞 ${customer.phone || "no phone"}` +
    (customer.email ? `  ·  ✉ ${customer.email}` : "") +
    `\n${customer.address || "(no address)"}` +
    (customer.notes ? `\n\nNotes: ${customer.notes}` : "") +
    (customer.preferred_date ? `\nWants: ${customer.preferred_date}` : "") +
    `\n\n—\nOpen in Dashboard:\n${dashboardLink}\n\n` +
    `Quick actions:\n` +
    (customer.phone ? `  Text customer: sms:${customer.phone.replace(/[^\d+]/g, "")}\n` : "") +
    (customer.email ? `  Email customer: mailto:${customer.email}\n` : "") +
    `\nMeadows Powerwashing`;

  const html = `<!doctype html><html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f7fafc;color:#0b1220;">
    <div style="max-width:520px;margin:0 auto;padding:20px;">
      <h2 style="margin:0 0 8px;color:#0c4a6e;">New booking 🎉</h2>
      <p style="color:#64748b;margin:0 0 16px;">${escapeHtml(customer.name)} just submitted a quote request.</p>

      <table cellpadding="0" cellspacing="0" style="width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:0 0 16px;">
        ${customer.phone ? row("Phone", `<a href="sms:${customer.phone.replace(/[^\d+]/g, "")}" style="color:#0369a1;text-decoration:none;">${escapeHtml(customer.phone)}</a>`) : ""}
        ${customer.email ? row("Email", `<a href="mailto:${customer.email}" style="color:#0369a1;text-decoration:none;">${escapeHtml(customer.email)}</a>`) : ""}
        ${customer.address ? row("Address", escapeHtml(customer.address)) : ""}
        ${customer.preferred_date ? row("Wants", escapeHtml(customer.preferred_date)) : ""}
        ${customer.notes ? row("Notes", escapeHtml(customer.notes)) : ""}
      </table>

      <a href="${dashboardLink}" style="display:block;background:#0c4a6e;color:#fff;text-align:center;padding:14px 18px;border-radius:999px;font-weight:700;text-decoration:none;font-size:16px;">
        Open in Dashboard →
      </a>

      <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;text-align:center;">
        Submission ID: ${escapeHtml(submissionId)} • Meadows Powerwashing
      </p>
    </div>
  </body></html>`;

  if (!resendKey) {
    return json(200, { ok: true, emailSkipped: "RESEND_API_KEY not set" });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: `Meadows Powerwashing <${fromEmail}>`,
        to: [eoinEmail],
        reply_to: customer.email || undefined,
        subject,
        text,
        html,
      }),
    });
    const body = await r.json().catch(() => ({}));
    return json(200, { ok: r.ok, status: r.status, resend: body });
  } catch (e) {
    return json(500, { error: "Send failed", detail: String(e) });
  }
};

function row(label, value) {
  return `<tr>
    <td style="padding:6px 0;color:#64748b;font-size:13px;width:80px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#0b1220;font-size:14px;">${value}</td>
  </tr>`;
}
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
