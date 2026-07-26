import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = 'enzohuang98-crypto/Reckoning'
const START_MARK = '<!-- RELEASE_INFO_START -->'
const END_MARK = '<!-- RELEASE_INFO_END -->'
const TARGET_FILES = ['index.html', 'guide.html']

function authHeaders(extra = {}) {
  const headers = {
    'User-Agent': 'xiangqi-analyzer-site-release-sync',
    ...extra
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return headers
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: authHeaders({ Accept: 'application/vnd.github+json' })
  })
  if (!res.ok) {
    throw new Error(`GET ${url} failed with ${res.status} ${res.statusText}`)
  }
  return res.json()
}

async function fetchText(url) {
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    throw new Error(`GET ${url} failed with ${res.status} ${res.statusText}`)
  }
  return res.text()
}

// electron-builder's latest.yml is a small, fixed-shape YAML file. A full
// YAML parser is unnecessary for the handful of top-level scalars we need.
function parseTopLevelYaml(text) {
  const values = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    values[key] = rawValue.trim().replace(/^['"]|['"]$/g, '')
  }
  return values
}

function parseSha256Sums(text, fileName) {
  const line = text.split(/\r?\n/).find((entry) => entry.trim().endsWith(fileName))
  if (!line) return null
  const hash = line.trim().split(/\s+/)[0]
  return /^[a-f0-9]{64}$/i.test(hash) ? hash.toLowerCase() : null
}

function formatDate(iso) {
  const date = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function formatSize(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

function shortenHash(hex) {
  return hex.length > 28 ? `${hex.slice(0, 12)}…${hex.slice(-12)}` : hex
}

function applyMarker(html, replacement) {
  const start = html.indexOf(START_MARK)
  const end = html.indexOf(END_MARK)
  if (start === -1 || end === -1 || end < start) return html
  return html.slice(0, start + START_MARK.length) + replacement + html.slice(end)
}

async function main() {
  const release = await fetchJson(`https://api.github.com/repos/${REPO}/releases/latest`)
  const version = release.tag_name.replace(/^v/, '')
  const setupAsset = release.assets.find((asset) => /-setup\.exe$/i.test(asset.name))
  const yamlAsset = release.assets.find((asset) => asset.name === 'latest.yml')

  if (!setupAsset || !yamlAsset) {
    throw new Error(`Latest release ${release.tag_name} is missing the installer or latest.yml asset.`)
  }

  const yamlText = await fetchText(yamlAsset.browser_download_url)
  const yamlValues = parseTopLevelYaml(yamlText)
  const releaseDate = yamlValues.releaseDate || release.published_at

  const sha256SumsAsset = release.assets.find((asset) => asset.name === 'SHA256SUMS.txt')
  let hashLabel = null
  let hashHex = null

  if (sha256SumsAsset) {
    const sumsText = await fetchText(sha256SumsAsset.browser_download_url)
    const sha256 = parseSha256Sums(sumsText, setupAsset.name)
    if (sha256) {
      hashLabel = 'SHA-256'
      hashHex = sha256
    }
  }

  if (!hashHex && yamlValues.sha512) {
    hashLabel = 'SHA-512'
    hashHex = Buffer.from(yamlValues.sha512, 'base64').toString('hex')
  }

  if (!hashHex) {
    throw new Error('Could not determine an installer hash from SHA256SUMS.txt or latest.yml.')
  }

  const data = {
    repo: REPO,
    tag: release.tag_name,
    version,
    publishedAt: releaseDate,
    fileName: setupAsset.name,
    fileSizeBytes: setupAsset.size,
    hashAlgorithm: hashLabel,
    hashHex,
    releaseUrl: release.html_url,
    checkedAt: new Date().toISOString()
  }

  const dataDir = resolve(root, 'data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  writeFileSync(resolve(dataDir, 'release.json'), `${JSON.stringify(data, null, 2)}\n`)

  const replacement =
    `\n              目前版本 <strong>v${version}</strong>・${formatSize(data.fileSizeBytes)}・` +
    `${formatDate(data.publishedAt)} 發布・${hashLabel} <code>${shortenHash(hashHex)}</code>` +
    `（<a class="inline-link" href="${data.releaseUrl}">於 GitHub Releases 核對完整雜湊 →</a>）。` +
    `此區塊由自動化流程每 6 小時與最新發布同步。\n              `

  let changedFiles = 0
  for (const relativePath of TARGET_FILES) {
    const filePath = resolve(root, relativePath)
    if (!existsSync(filePath)) continue
    const html = readFileSync(filePath, 'utf8')
    const updated = applyMarker(html, replacement)
    if (updated !== html) {
      writeFileSync(filePath, updated)
      changedFiles += 1
    }
  }

  console.log(
    `Synced release info: v${version} (${formatDate(data.publishedAt)}, ${formatSize(data.fileSizeBytes)}, ` +
      `${hashLabel} ${shortenHash(hashHex)}) — updated ${changedFiles} file(s).`
  )
}

main().catch((error) => {
  console.error('sync-release failed:', error)
  process.exit(1)
})
