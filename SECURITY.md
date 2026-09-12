# 網站 C 級安全基線

本基線只適用於公開產品說明網站，不涵蓋桌面 App、安裝檔、更新服務、第三方引擎或 AI
Provider，也不代表 ISO 27001、SOC 2、政府資安分級或第三方認證。

## 必要控制

1. 網站維持純靜態，不使用後端、資料庫、登入或資料輸入表單。
2. 不執行 JavaScript，不使用第三方 CDN、字型、圖片、分析碼、廣告或追蹤像素。
3. 每頁使用 allowlist Content Security Policy，並設定 `no-referrer`。
4. 不儲存 Cookie、Local Storage、IndexedDB 或其他瀏覽器端資料。
5. 網站 Repository 與私人桌面 App Repository 分離。
6. 不得提交 API Key、Token、私鑰、簽章材料、使用者資料或安裝檔。
7. 所有網站變更在發布前執行 `node scripts/check-site.mjs`。

## 安裝檔發布現況

安裝檔已開放下載，但一律不進這個網站 repo；下載連結固定指向
[Reckoning](https://github.com/enzohuang98-crypto/Reckoning) repo 的 GitHub Releases，
維持以下項目才可繼續維持 C 級發行基線：

- 每個版本有明確版本號，並附雜湊（`SHA256SUMS.txt` 或 `latest.yml` 內的 SHA-512）供核對
- 下載連結只允許 HTTPS，且一律指向 GitHub Releases，網站本身不主機安裝檔
- `.github/workflows/sync-release.yml` 定期讀取公開 Release metadata 更新版本徽章文字，
  不下載、不快取、不重新散布安裝檔本身
- 乾淨 Windows 環境安裝測試與相依套件漏洞稽核由 Reckoning repo 的發布流程負責

尚未完成：安裝檔目前沒有受信任 CA 核發的程式碼簽章憑證，Windows SmartScreen 可能顯示
「未知發行者」警告，詳見 [`guide.html`](guide.html#smartscreen)。

## 代管與回應標頭

網站由 Cloudflare Pages 代管，強制 HTTPS。安全標頭定義在 [`_headers`](_headers)，包含
`Content-Security-Policy`（含 `frame-ancestors 'none'`）、`X-Content-Type-Options`、
`X-Frame-Options`、`Permissions-Policy`、`Referrer-Policy` 與 `Strict-Transport-Security`。

先前使用 GitHub Pages 時無法自訂回應標頭，此限制已隨這次搬遷解除。

`_headers` 內的 CSP 必須與各頁面 `<meta http-equiv="Content-Security-Policy">` 保持一致：
兩者同時存在時瀏覽器會取交集，不一致會在無錯誤訊息的情況下把政策收得更嚴、讓樣式失效。

公開網站只發布 [`scripts/build-dist.mjs`](scripts/build-dist.mjs) 產出的 `dist/`；
建置腳本、workflow 與專案文件不會出現在網站上。
