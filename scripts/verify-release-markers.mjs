import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TARGET_FILES, buildBlock, readMarker, root } from './release-info.mjs'

// Offline counterpart to sync-release.mjs: proves the committed pages already
// match data/release.json, so a scheduled sync only ever commits when a new
// release actually shipped — never a drift or reformat.

const errors = []
const dataPath = resolve(root, 'data', 'release.json')

if (!existsSync(dataPath)) {
  console.error('data/release.json is missing; run scripts/sync-release.mjs.')
  process.exit(1)
}

const data = JSON.parse(readFileSync(dataPath, 'utf8'))

for (const field of ['version', 'publishedAt', 'fileSizeBytes', 'hashAlgorithm', 'hashHex', 'releaseUrl']) {
  if (data[field] === undefined || data[field] === null || data[field] === '') {
    errors.push(`data/release.json is missing "${field}"`)
  }
}

if (Object.prototype.hasOwnProperty.call(data, 'checkedAt')) {
  errors.push(
    'data/release.json must not contain a per-run timestamp such as "checkedAt";' +
      ' it would make the sync workflow commit on every scheduled run'
  )
}

if (errors.length === 0) {
  const expected = buildBlock(data)

  for (const relativePath of TARGET_FILES) {
    const filePath = resolve(root, relativePath)
    if (!existsSync(filePath)) {
      errors.push(`${relativePath} is missing`)
      continue
    }
    const actual = readMarker(readFileSync(filePath, 'utf8'))
    if (actual === null) {
      errors.push(`${relativePath} has no RELEASE_INFO markers`)
    } else if (actual !== expected) {
      errors.push(
        `${relativePath} release badge is out of sync with data/release.json\n` +
          `    expected: ${expected}\n` +
          `    actual:   ${actual}`
      )
    }
  }
}

if (errors.length > 0) {
  console.error(`發行資訊標記檢查失敗（${errors.length} 項）`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`發行資訊標記檢查通過：v${data.version}，${TARGET_FILES.length} 個頁面同步`)
