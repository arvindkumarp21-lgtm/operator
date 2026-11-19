export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const rc = String(req.query.rc || "").replace(/\D/g, "");
  if (rc.length !== 15) {
    return res.status(400).json({ ok: false, error: "15-digit Ration Card Number required" });
  }

  const targetUrl = "https://dcs-dof.gujarat.gov.in/preview/TransparencyPortalAPI/RationCardsMembersDetailseKYC";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    // Step 1: GET page to collect session cookie & CSRF token
    let cookieHeader = "";
    let csrfToken = "";
    try {
      const initRes = await fetch(targetUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const setCookie = initRes.headers.get("set-cookie");
      if (setCookie) {
        cookieHeader = setCookie.split(",").map(c => c.split(";")[0].trim()).join("; ");
      }
      const initHtml = await initRes.text();
      const tokenMatch = initHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/i);
      if (tokenMatch && tokenMatch[1]) {
        csrfToken = tokenMatch[1];
      }
    } catch (_) {}

    // Step 2: POST Ration Card search
    const form = new URLSearchParams();
    form.append("DistrictCode", "00");
    form.append("taluka", "");
    form.append("RationCardNumber", rc);
    if (csrfToken) {
      form.append("__RequestVerificationToken", csrfToken);
    }

    const postHeaders = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Origin": "https://dcs-dof.gujarat.gov.in",
      "Referer": targetUrl
    };
    if (cookieHeader) {
      postHeaders["Cookie"] = cookieHeader;
    }

    const govRes = await fetch(targetUrl, {
      method: "POST",
      signal: controller.signal,
      headers: postHeaders,
      body: form.toString()
    });

    clearTimeout(timer);
    const html = await govRes.text();
    return res.status(200).json({ ok: govRes.ok, status: govRes.status, card_number: rc, html });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || "Request failed" });
  }
}
