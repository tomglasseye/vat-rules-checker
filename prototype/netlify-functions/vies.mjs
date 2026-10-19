// Live VAT number check for the VAT Rules Checker prototype.
// Browsers can't call the EU's VIES service directly (it doesn't allow cross-site requests),
// so the page posts to /api/vies and this function asks VIES on its behalf.
//
// Optional environment variables (Netlify > Site configuration > Environment variables):
//   VIES_REQUESTER_COUNTRY  e.g. NL
//   VIES_REQUESTER_NUMBER   your client's own VAT number without the country prefix
// When both are set, VIES returns a consultation number for each check, which is the
// evidence an auditor will ask for.

const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
const BUSY = new Set(["MS_UNAVAILABLE", "MS_MAX_CONCURRENT_REQ", "GLOBAL_MAX_CONCURRENT_REQ", "SERVICE_UNAVAILABLE", "TIMEOUT"]);

const clean = v => (v && String(v).trim() !== "---" ? String(v).trim() : "");

export default async (req) => {
  if (req.method === "GET") return Response.json({ ok: true, service: "vies" });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let input;
  try { input = await req.json(); } catch { return Response.json({ state: "error", code: "BAD_JSON" }, { status: 400 }); }

  const countryCode = String(input.countryCode || "").toUpperCase();
  const vatNumber = String(input.vatNumber || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (!/^[A-Z]{2}$/.test(countryCode) || !/^[0-9A-Z]{2,12}$/.test(vatNumber)) {
    return Response.json({ state: "error", code: "BAD_INPUT" }, { status: 400 });
  }

  const payload = { countryCode, vatNumber };
  const rc = Netlify.env.get("VIES_REQUESTER_COUNTRY"), rn = Netlify.env.get("VIES_REQUESTER_NUMBER");
  if (rc && rn) { payload.requesterMemberStateCode = rc.toUpperCase(); payload.requesterNumber = rn; }

  try {
    const r = await fetch(VIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000)
    });
    const data = await r.json().catch(() => null);
    const code = data && (data.userError || (Array.isArray(data.errorWrappers) && data.errorWrappers[0] && data.errorWrappers[0].error));
    if (!r.ok || !data || (code && BUSY.has(code))) {
      // A member state's system being down is not the same as the number being invalid
      return Response.json({ state: "unavailable", code: code || `HTTP_${r.status}` });
    }
    if (typeof data.valid !== "boolean") return Response.json({ state: "unavailable", code: code || "NO_RESULT" });
    return Response.json({
      state: data.valid ? "valid" : "invalid",
      name: clean(data.name),
      address: clean(data.address),
      requestIdentifier: clean(data.requestIdentifier),
      requestDate: data.requestDate || null
    });
  } catch (e) {
    return Response.json({ state: "unavailable", code: e && e.name === "TimeoutError" ? "TIMEOUT" : "NETWORK" });
  }
};

export const config = { path: "/api/vies" };
