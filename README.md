# 象棋 AI 分析講解網站

象棋 AI 分析講解的公開產品網站。網站與桌面 App 原始碼分開管理，目前只提供產品介紹、
使用說明、相容性資訊、資安基線與隱私說明，不含安裝檔。

## 本機預覽

```powershell
node scripts/serve.mjs
```

再開啟 `http://127.0.0.1:4173/`。

## 驗證

```powershell
node scripts/check-site.mjs
```

驗證項目包括：

- HTML 必須包含 Content Security Policy 與 `no-referrer`
- 禁止 JavaScript、表單、內嵌樣式、遠端資源與不安全 HTTP URL
- 本機連結與靜態資源必須存在
- Repository 不得包含安裝檔、API Key 或常見秘密格式

## C 級安全基線

「C 級」是本專案自行定義的靜態產品網站安全基線，不代表政府或第三方認證。完整說明見
[`security.html`](security.html)。
