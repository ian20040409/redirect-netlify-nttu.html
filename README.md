# Netlify ngrok Proxy
[![Netlify Status](https://api.netlify.com/api/v1/badges/084726a5-3a50-4989-8246-94b1093c5901/deploy-status)](https://app.netlify.com/projects/teal-pegasus-2cdc7c/deploys)

這個專案讓你能在 Netlify 上部署一個中介代理（proxy），自動幫瀏覽器加上 `ngrok-skip-browser-warning` 標頭（header），以跳過 ngrok 免費版的瀏覽器警告頁面。

## 為什麼需要這個專案？

當你使用 ngrok 免費方案時，如果使用者透過瀏覽器（或轉址頁面）打開 ngrok URL，
ngrok 會顯示如下的警告頁面：

> “You are about to visit... unfederative-buoyantly-bo.ngrok-free.dev”  
> “Set and send an ngrok-skip-browser-warning request header with any value.”

這是因為 ngrok 為了防止濫用，會攔截「瀏覽器直接造訪」的請求。
但我們可以藉由 Netlify Functions 或 Edge Functions 代為轉發請求、加上必要 header，
從而讓使用者不再看到這個警告頁面。

## 專案結構

```
your-site/
├─ netlify.toml
└─ netlify/
   └─ functions/
      └─ proxy.js
```

## 實作說明

### netlify/functions/proxy.js

這個 Netlify Function 會攔截所有進入的請求，
然後幫你向 ngrok 伺服器發出新的請求，並加入這個 header：

```
ngrok-skip-browser-warning: true
```

程式碼如下：

```js
const TARGET = "https://unfederative-buoyantly-bo.ngrok-free.dev";

exports.handler = async (event) => {
  const path = event.path.replace(/^\/$/, "");
  const qs = event.rawQuery ? `?${event.rawQuery}` : "";
  const url = TARGET + path + qs;

  const init = {
    method: event.httpMethod,
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...event.headers,
    },
    body:
      event.httpMethod !== "GET" && event.httpMethod !== "HEAD"
        ? event.body
        : undefined,
  };

  const resp = await fetch(url, init);
  const body = await resp.text();

  return {
    statusCode: resp.status,
    headers: {
      "content-type": resp.headers.get("content-type") || "text/html; charset=utf-8",
    },
    body,
  };
};
```

### netlify.toml

這份設定會把所有路徑都重寫（rewrite）到這個 Function：

```toml
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/proxy"
  status = 200
```

## 部署步驟

1. 安裝 Netlify CLI
```bash
npm install -g netlify-cli
```

2. 登入帳號
```bash
netlify login
```

3. 本地測試
```bash
netlify dev
```
這會在 `http://localhost:8888` 啟動開發伺服器。
打開它就會自動代理到你的 ngrok 網址，而不會出現警告頁。

4. 部署到 Netlify
```bash
netlify deploy
# 或
netlify deploy --prod
```

部署完成後，你會得到一個網址，例如：
```
https://your-project-name.netlify.app/
```

所有訪問都會自動轉發到：
```
https://unfederative-buoyantly-bo.ngrok-free.dev
```
而且完全不會再看到 ngrok 的警告頁。

## 工作原理

1. 使用者造訪你的 Netlify 網址。  
2. Netlify Functions 收到請求，代替瀏覽器向 ngrok 發出請求。  
3. 在這個請求中自動加入 `ngrok-skip-browser-warning: true`。  
4. ngrok 因此不會顯示警告頁，而是直接回傳真實內容。  
5. Function 再將內容原封不動回傳給使用者。

## 其他進階用法

### 指定多個 ngrok 目標
你可以修改 `TARGET` 為環境變數，根據需求代理不同 ngrok URL：

```js
const TARGET = process.env.NGROK_TARGET;
```

然後在 Netlify 後台（Site Settings → Environment Variables）設定：
```
NGROK_TARGET=https://your-ngrok-url.ngrok-free.dev
```

## 常見問題（FAQ）

**Q:** 為什麼我用 `<meta refresh>` 或 `window.location.replace()` 還是出現警告？  
**A:** 因為那是「瀏覽器端轉址」，無法加上 header，ngrok 會直接攔截。必須用伺服器端（這個專案）代理。

**Q:** 能不能改用 Cloudflare？  
**A:** 可以。Cloudflare Workers 同樣可以加上 header，效果相同，延遲甚至更低。

**Q:** 免費 Netlify 方案可以用嗎？  
**A:** 可以，Netlify Free 就支援 Functions，不需升級。

## 結語

這個專案讓你能：
- 無痛跳過 ngrok 警告頁  
- 無需升級 ngrok 帳號  
- 依然使用免費的 Netlify 方案  

非常適合測試、展示、或教學用途。

作者：林恩佑  
最後更新：2025-11-05  
適用環境：ngrok Free + Netlify Functions
