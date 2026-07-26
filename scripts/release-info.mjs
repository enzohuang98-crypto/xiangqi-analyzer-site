import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO = 'enzohuang98-crypto/Reckoning'
export const START_MARK = '<!-- RELEASE_INFO_START -->'
export const END_MARK = '<!-- RELEASE_INFO_END -->'
export const TARGET_FILES = ['index.html', 'guide.html']

export function formatDate(iso) {
  const date = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function formatSize(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

export function shortenHash(hex) {
  return hex.length > 28 ? `${hex.slice(0, 12)}…${hex.slice(-12)}` : hex
}

/** The single source of truth for the on-page version badge text. */
export function buildBlock(data) {
  return (
    `目前版本 <strong>v${data.version}</strong>・${formatSize(data.fileSizeBytes)}・` +
    `${formatDate(data.publishedAt)} 發布・${data.hashAlgorithm} ` +
    `<code>${shortenHash(data.hashHex)}</code>` +
    `（<a class="inline-link" href="${data.releaseUrl}">於 GitHub Releases 核對完整雜湊 →</a>）。` +
    `此區塊由自動化流程每 6 小時與最新發布同步。`
  )
}

/** Reads the current block between the markers, or null when absent. */
export function readMarker(html) {
  const start = html.indexOf(START_MARK)
  const end = html.indexOf(END_MARK)
  if (start === -1 || end === -1 || end < start) return null
  return html.slice(start + START_MARK.length, end).trim()
}

// Indentation is taken from whatever line the start marker sits on, so the
// rewritten block keeps the surrounding file's shape instead of assuming a
// fixed nesting depth.
export function applyMarker(html, block) {
  const start = html.indexOf(START_MARK)
  const end = html.indexOf(END_MARK)
  if (start === -1 || end === -1 || end < start) return html
  const lineStart = html.lastIndexOf('\n', start) + 1
  const indent = /^[ \t]*/.exec(html.slice(lineStart, start))[0]
  return html.slice(0, start + START_MARK.length) + `\n${indent}${block}\n${indent}` + html.slice(end)
}
