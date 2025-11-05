const TARGET = process.env.NGROK_TARGET || "https://unfederative-buoyantly-bo.ngrok-free.dev";

exports.handler = async (event) => {
  try {
    const path = event.path === "/" ? "" : event.path;
    const qs = event.rawQuery ? `?${event.rawQuery}` : "";
    const url = TARGET + path + qs;

    const headers = { ...event.headers };
    headers["ngrok-skip-browser-warning"] = "true";
    headers["User-Agent"] = "lnu-proxy/1.0"; 

    const init = {
      method: event.httpMethod,
      headers,
    };

    if (event.body && event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
      init.body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;
    }

    const resp = await fetch(url, init);
    const contentType = resp.headers.get("content-type") || "text/html";
    const buffer = Buffer.from(await resp.arrayBuffer());

    return {
      statusCode: resp.status,
      headers: { "content-type": contentType },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: `Proxy error: ${err.message}` };
  }
};
