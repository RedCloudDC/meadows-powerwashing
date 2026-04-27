// Public read-only endpoint for the customer's confirm-quote.html page.
// GET ?id=<job-id> → { id, name, address, priceQuoted, serviceDescription, status }
//
// Returns ONLY the customer-safe fields — no internal notes, no email/phone.
// Returns 404 if no quote has been sent yet (status must be "quoted" or "accepted").

import { getStore } from "@netlify/blobs";

export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return json(400, { error: "Missing id" });

  let state;
  try {
    const store = getStore("jobs");
    state = await store.get(`job:${id}`, { type: "json" });
  } catch (e) {
    return json(500, { error: "Lookup failed", detail: String(e) });
  }

  if (!state || (state.status !== "quoted" && state.status !== "accepted")) {
    return json(404, { error: "Quote not found or not yet sent" });
  }

  // Pull the customer's name + service description from the original Netlify Forms
  // submission. We don't want to require NETLIFY_API_TOKEN here (this is a public
  // endpoint), so we rely on what the dashboard persisted into the blob alongside
  // the quote. Fall back to generic strings if missing.
  return json(200, {
    id,
    name: state.customerName || "",
    address: state.customerAddress || "",
    priceQuoted: state.priceQuoted,
    serviceDescription: state.serviceDescription || "the job",
    status: state.status,
    acceptedAt: state.acceptedAt || null,
  });
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
