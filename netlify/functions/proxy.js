const TARGET = process.env.NGROK_TARGET || "https://unfederative-buoyantly-bo.ngrok-free.dev";

exports.handler = async (event) => {
  try {
    const path = event.path === "/" ? "" : event.path;
    const qs = event.rawQuery ? `?${event.rawQuery}` : "";
    const url = TARGET + path + qs;

    const headers = { ...event.headers, "ngrok-skip-browser-warning": "true" };
    const resp = await fetch(url, { method: event.httpMethod, headers });

    const body = await resp.text();
    return {
      statusCode: resp.status,
      headers: { "content-type": resp.headers.get("content-type") || "text/html" },
      body,
    };
  } catch (err) {
    return { statusCode: 500, body: `Proxy error: ${err.message}` };
  }
};
