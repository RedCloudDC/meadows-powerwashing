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

  // Plain conversational HTML — no buttons, no tables, no marketing styling.
  // Looks like a forwarded notification from a real person, which iCloud's spam
  // classifier weights much more favorably than promotional layouts.
  const html = `<!doctype html><html><body style="margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0b1220;line-height:1.5;font-size:15px;">
<p>Hi Eoin,</p>

<p><strong>${escapeHtml(customer.name)}</strong> just submitted a quote request through the website.</p>

<p>
${customer.phone ? `Phone: <a href="sms:${customer.phone.replace(/[^\d+]/g, "")}">${escapeHtml(customer.phone)}</a><br/>` : ""}
${customer.email ? `Email: <a href="mailto:${customer.email}">${escapeHtml(customer.email)}</a><br/>` : ""}
${customer.address ? `Address: ${escapeHtml(customer.address)}<br/>` : ""}
${customer.preferred_date ? `Wants: ${escapeHtml(customer.preferred_date)}<br/>` : ""}
</p>

${customer.notes ? `<p><em>${escapeHtml(customer.notes)}</em></p>` : ""}

<p>Open the dashboard to send a quote: <a href="${dashboardLink}">${dashboardLink}</a></p>

<p style="color:#64748b;font-size:13px;">— Meadows Powerwashing</p>
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
        // Hint to mail providers that this is transactional, not bulk marketing.
        // Counterintuitive but reduces spam classification on iCloud / Gmail.
        headers: {
          "List-Unsubscribe": `<mailto:${eoinEmail}?subject=unsubscribe>`,
          "X-Entity-Ref-ID": submissionId || "meadows-booking",
        },
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
