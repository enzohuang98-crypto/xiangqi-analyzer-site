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

## 代管限制

GitHub Pages 無法由此 Repository 自訂所有 HTTP 回應標頭。未來若需要完整
`Permissions-Policy`、`X-Content-Type-Options` 與 `frame-ancestors`，應改用可設定安全標頭的
代管服務。
