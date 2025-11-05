// Netlify Functions 內建 fetch，無需額外安裝 node-fetch
const TARGET = "https://unfederative-buoyantly-bo.ngrok-free.dev";

exports.handler = async (event) => {
  // 轉發路徑與查詢參數（可選）
  const path = event.path.replace(/^\/$/, ""); // 根路徑就空字串
  const qs = event.rawQuery ? `?${event.rawQuery}` : "";

  const url = TARGET + path + qs;

  // 建立要轉發的 request（保留使用者原本的方法與 body）
  const init = {
    method: event.httpMethod,
    headers: {
      // 加上關鍵 header 以跳過 ngrok 警告
      "ngrok-skip-browser-warning": "true",
      // 將原請求的其他 header 覆寫進來（可按需挑選）
      ...event.headers,
    },
    body:
      event.httpMethod !== "GET" && event.httpMethod !== "HEAD"
        ? event.body
        : undefined,
  };

  // 送去 ngrok
  const resp = await fetch(url, init);

  // 回傳給瀏覽器（簡單處理 content-type 與狀態碼）
  const body = await resp.text();
  const contentType = resp.headers.get("content-type") || "text/html; charset=utf-8";

  return {
    statusCode: resp.status,
    headers: {
      "content-type": contentType,
      // 如需 CORS，可開啟（依你的應用調整）
      // "access-control-allow-origin": "*",
    },
    body,
  };
};
