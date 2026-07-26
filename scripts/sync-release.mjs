import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  REPO,
  TARGET_FILES,
  applyMarker,
  buildBlock,
  formatDate,
  formatSize,
  root,
  shortenHash
} from './release-info.mjs'

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

  // Every field here must be derived from the release itself. Anything that
  // changes per run (a "checked at" timestamp, say) would defeat the
  // workflow's `git diff --quiet` guard and commit on every schedule tick.
  const data = {
    repo: REPO,
    tag: release.tag_name,
    version,
    publishedAt: releaseDate,
    fileName: setupAsset.name,
    fileSizeBytes: setupAsset.size,
    hashAlgorithm: hashLabel,
    hashHex,
    releaseUrl: release.html_url
  }

  const dataDir = resolve(root, 'data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  writeFileSync(resolve(dataDir, 'release.json'), `${JSON.stringify(data, null, 2)}\n`)

  const block = buildBlock(data)

  let changedFiles = 0
  for (const relativePath of TARGET_FILES) {
    const filePath = resolve(root, relativePath)
    if (!existsSync(filePath)) continue
    const html = readFileSync(filePath, 'utf8')
    const updated = applyMarker(html, block)
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
