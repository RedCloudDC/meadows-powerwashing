// Cheap password check — only needs DASHBOARD_PASSWORD env var.
// Used by dashboard.html's unlock flow so Eoin can sign in even before the
// other env vars (NETLIFY_API_TOKEN, RESEND_API_KEY, etc.) are wired up.
//
// GET or POST with header `x-auth: <password>` → 200 { ok: true } if matches, 401 otherwise.

export default async (request) => {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    return json(500, { error: "DASHBOARD_PASSWORD env var not set on site" });
  }
  const got = request.headers.get("x-auth");
  if (got !== expected) {
    return json(401, { error: "Unauthorized" });
  }
  return json(200, { ok: true });
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
