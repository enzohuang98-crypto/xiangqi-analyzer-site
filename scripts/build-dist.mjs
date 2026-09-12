import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { root } from './release-info.mjs'

// Cloudflare Pages serves whatever is in the output directory, so the site is
// assembled explicitly rather than publishing the repository root. Repo
// machinery (scripts, workflows, README, release metadata) stays out of the
// public site. There is no bundler or dependency here — this only copies.

const OUT_DIR = 'dist'

// _headers is Cloudflare Pages configuration and must sit at the output root.
const ENTRIES = [
  'index.html',
  'guide.html',
  'security.html',
  'privacy.html',
  '404.html',
  'styles.css',
  'robots.txt',
  'sitemap.xml',
  '_headers',
  'assets'
]

const outPath = resolve(root, OUT_DIR)
rmSync(outPath, { recursive: true, force: true })
mkdirSync(outPath, { recursive: true })

const missing = []
for (const entry of ENTRIES) {
  const from = resolve(root, entry)
  if (!existsSync(from)) {
    missing.push(entry)
    continue
  }
  cpSync(from, resolve(outPath, entry), { recursive: true })
}

if (missing.length > 0) {
  console.error(`建置失敗：找不到 ${missing.length} 個必要檔案`)
  for (const entry of missing) console.error(`- ${entry}`)
  process.exit(1)
}

console.log(`建置完成：${ENTRIES.length} 個項目已輸出到 ${OUT_DIR}/`)
