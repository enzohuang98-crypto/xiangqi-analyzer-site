# 象棋 AI 分析講解網站

象棋 AI 分析講解的公開產品網站。網站與桌面 App（[Reckoning](https://github.com/enzohuang98-crypto/Reckoning)）
原始碼分開管理，提供產品介紹、新手教學、相容性資訊、資安基線與隱私說明。網站本身不主機安裝檔，
下載連結一律指向該 repo 的 GitHub Releases，並由 GitHub Pages 以 HTTPS 代管。

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

另外可離線檢查頁面上的版本徽章是否與 `data/release.json` 一致：

```powershell
node scripts/verify-release-markers.mjs
```

以上兩個檢查都由 `.github/workflows/ci.yml` 在每次 push 與 PR 時自動執行。

## 安裝檔版本自動同步

`.github/workflows/sync-release.yml` 每 6 小時（也可手動觸發）執行
[`scripts/sync-release.mjs`](scripts/sync-release.mjs)：向 Reckoning repo 查詢最新
Release，讀出版本號、發布日期、檔案大小與雜湊（優先用 `SHA256SUMS.txt`，否則退回
`latest.yml` 內的 SHA-512），寫回 `data/release.json`，並覆寫 `index.html`／`guide.html`
裡 `<!-- RELEASE_INFO_START -->`／`<!-- RELEASE_INFO_END -->` 之間的版本徽章文字，
有變更才會 commit。安裝檔本身仍完全不進這個 repo，下載按鈕永遠連到
`Reckoning/releases/latest`，由 GitHub 自動導向最新版本。

徽章文字的產生規則集中在 [`scripts/release-info.mjs`](scripts/release-info.mjs)，
同步腳本與離線驗證腳本共用同一份實作。`data/release.json` 內**不得**加入任何每次執行都
會變動的欄位（例如檢查時間戳），否則 workflow 的 `git diff --quiet` 判斷會失效，
變成每 6 小時都產生一次無意義的 commit 並重新部署 Pages；
`scripts/verify-release-markers.mjs` 會擋下這種情況。

## GitHub Pages（HTTPS）

網站設計為以 GitHub Pages 代管於 `https://enzohuang98-crypto.github.io/xiangqi-analyzer-site/`，
`*.github.io` 網域一律強制 HTTPS。若尚未啟用，需要 repo 管理員在 **Settings → Pages** 設定
Source 為 `main` 分支（root）；這個設定無法透過本 repo 的檔案變更或自動化開啟，須手動確認一次。

## C 級安全基線

「C 級」是本專案自行定義的靜態產品網站安全基線，不代表政府或第三方認證。完整說明見
[`security.html`](security.html)。
