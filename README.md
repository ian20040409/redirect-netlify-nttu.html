# Netlify ngrok Proxy

這個專案讓你能在 Netlify Functions 上建立中介代理（proxy），
自動加上必要的 HTTP 標頭來繞過 ngrok 免費版的警告頁面，
並同時支援 Message API / Webhook 回呼。

---

🚀 專案特色

✅ 自動加上
- ngrok-skip-browser-warning: true
- User-Agent: lnu-proxy/1.0（非標準 UA，可避開瀏覽器偵測）

✅ 支援 /callback 路由，用於：
- LINE Message API Webhook
- Discord / Telegram / 自訂 Bot 回呼端點
- OAuth 或第三方回呼（Callback URL）

✅ 適用於「ngrok URL 經常更換」的情境：
由於 ngrok 免費版每次啟動 URL 都不同，
此專案讓你僅需在 Netlify 後台修改環境變數 NGROK_TARGET 即可，
不必修改前端程式或重新部署。

---

📦 專案結構

```
your-site/
├─ netlify.toml
└─ netlify/
   └─ functions/
      └─ proxy.js
```

---

⚙️ netlify/functions/proxy.js

```js
const TARGET = process.env.NGROK_TARGET || "https://your-ngrok-url.ngrok-free.dev";

exports.handler = async (event) => {
  try {
    const path = event.path === "/" ? "" : event.path;
    const qs = event.rawQuery ? `?${event.rawQuery}` : "";
    const url = TARGET + path + qs;

    // 加入繞過 ngrok 警告與非標準 UA
    const headers = { ...event.headers };
    headers["ngrok-skip-browser-warning"] = "true";
    headers["User-Agent"] = "lnu-proxy/1.0";

    const init = {
      method: event.httpMethod,
      headers,
    };

    // 保留原始 webhook body
    if (event.body && event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
      init.body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;
    }

    // 對 ngrok 發送代理請求
    const resp = await fetch(url, init);
    const buffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get("content-type") || "application/json";

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
```

---

⚙️ netlify.toml

```toml
[build]
  functions = "netlify/functions"

# /callback for Message API or Webhook
[[redirects]]
  from = "/callback"
  to = "/.netlify/functions/proxy"
  status = 200

# All other routes
[[redirects]]
  from = "/*"
  to = "/.netlify/functions/proxy"
  status = 200
```

---

💡 為什麼要這樣設計？

1️⃣ ngrok 免費方案限制

ngrok 會攔截標準瀏覽器訪問，顯示警告頁。
透過非標準 User-Agent，可讓代理請求被視為「安全伺服器呼叫」。

2️⃣ 頻繁變動的 ngrok URL

每次啟動 ngrok 會獲得不同 URL，若你的系統要穩定對外回呼，
可在 Netlify 環境變數（Site Settings → Environment Variables）中設定：

```
NGROK_TARGET=https://new-session-url.ngrok-free.dev
```

不需重新部署程式。

3️⃣ Message API / Webhook 需求

像 LINE、Discord、Slack、Telegram 的 webhook 需要靜態 HTTPS URL。
利用 Netlify 網址（如 https://your-bot.netlify.app/callback）作為 Webhook endpoint，
可讓 ngrok 後端靜動態整合，避免重新設定 webhook。

---

🧩 LINE Message API 範例設定

Webhook URL：

https://your-bot.netlify.app/callback

LINE Bot 設定範例：
- Verify Webhook: ✅ 成功
- 當 LINE 傳送事件 → Netlify 轉發 → ngrok → 你的本地伺服器
完整流程如下：

LINE → Netlify (proxy) → ngrok → localhost:3000

---

🚀 部署步驟
1. 安裝 CLI

```bash
npm install -g netlify-cli
netlify login
```

2. 本地測試

```bash
netlify dev
```

3. 部署

```bash
netlify deploy --prod
```

---

✅ 驗證是否成功
- 使用 curl 測試：

```bash
curl -H "User-Agent: lnu-proxy/1.0" https://your-site.netlify.app
```

若能正確回傳 ngrok 內容，即繞過成功。

- 測試 LINE Webhook：
在 LINE Developer Console → 點擊「Verify」，應顯示 Success。

---

🧭 總結

| 功能 | 狀態 |
|---|---:|
| 跳過 ngrok 警告頁 | ✅ |
| 支援 Message API Webhook | ✅ |
| 可透過環境變數改 ngrok URL | ✅ |
| 保留原始 headers 與 body | ✅ |
| 免費 Netlify 方案可用 | ✅ |

---

作者：林恩佑
最後更新：2025-11-05
適用環境：ngrok Free + Netlify Functions + Message API Webhook
