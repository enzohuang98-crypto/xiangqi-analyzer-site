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

## 安裝檔發布門檻

目前不允許上傳安裝檔。未來開放下載前，必須增加：

- 程式碼簽章
- SHA-256 雜湊
- HTTPS 受控下載來源
- 惡意程式與依賴漏洞檢查
- 乾淨 Windows 環境安裝測試
- 不可變版本與發布紀錄

## 代管限制

GitHub Pages 無法由此 Repository 自訂所有 HTTP 回應標頭。未來若需要完整
`Permissions-Policy`、`X-Content-Type-Options` 與 `frame-ancestors`，應改用可設定安全標頭的
代管服務。
