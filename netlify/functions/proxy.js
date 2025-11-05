// netlify/functions/proxy.js
// Proxy to ngrok with bypass headers, non-standard UA, and redirect absorption.
const TARGET = process.env.NGROK_TARGET || "https://unfederative-buoyantly-bo.ngrok-free.dev";

function getOriginFromEvent(event) {
  const proto = (event.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = (event.headers.host || event.headers["x-forwarded-host"] || "").split(",")[0].trim();
  return `${proto}://${host}`;
}

function isHtml(contentType) {
  return (contentType || "").toLowerCase().includes("text/html");
}

exports.handler = async (event) => {
  try {
    const origin = getOriginFromEvent(event);
    const targetBase = new URL(TARGET).origin;

    // Compose initial upstream URL (preserve path & query)
    const path = event.path === "/" ? "" : event.path;
    const qs = event.rawQuery ? `?${event.rawQuery}` : "";
    let upstream = TARGET + path + qs;

    // Prepare headers: non-standard UA + bypass header
    const headers = { ...event.headers };
    headers["ngrok-skip-browser-warning"] = "true";
    headers["User-Agent"] = "lnu-proxy/1.0";

    // Build initial fetch init
    const init = {
      method: event.httpMethod,
      headers,
      redirect: "manual", // absorb redirects
    };
    if (event.body && event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
      init.body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
    }

    // Follow up to 5 redirects internally
    let resp;
    for (let i = 0; i < 5; i++) {
      resp = await fetch(upstream, init);
      const status = resp.status;
      const loc = resp.headers.get("location");
      if ([301, 302, 303, 307, 308].includes(status) && loc) {
        const next = new URL(loc, upstream).href;
        upstream = next;
        continue; // fetch again; never expose Location to browser
      }
      break;
    }

    if (!resp) {
      return { statusCode: 502, body: "Upstream did not respond." };
    }

    const contentType = resp.headers.get("content-type") || "application/octet-stream";
    const ab = await resp.arrayBuffer();
    let body;
    let isBase64Encoded = false;

    if (isHtml(contentType)) {
      let text = Buffer.from(ab).toString("utf-8");
      // Rewrite absolute links pointing to ngrok origin back to Netlify origin
      text = text.split(targetBase).join(origin);
      body = text;
      isBase64Encoded = false;
    } else {
      body = Buffer.from(ab).toString("base64");
      isBase64Encoded = true;
    }

    return {
      statusCode: resp.status,
      headers: { "content-type": contentType },
      body,
      isBase64Encoded,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: `Proxy error: ${err?.message || err}`,
    };
  }
};
