import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const errors = []
const htmlFiles = []
const allFiles = []

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (name === '.git') continue
    const fullPath = join(directory, name)
    if (statSync(fullPath).isDirectory()) {
      walk(fullPath)
    } else {
      allFiles.push(fullPath)
      if (extname(name) === '.html') htmlFiles.push(fullPath)
    }
  }
}

function fail(file, message) {
  errors.push(`${relative(root, file)}: ${message}`)
}

walk(root)

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8')

  if (!html.includes('Content-Security-Policy')) {
    fail(file, '缺少 Content Security Policy')
  }
  if (!html.includes('name="referrer" content="no-referrer"')) {
    fail(file, '缺少 no-referrer')
  }
  if (/<script\b/i.test(html)) {
    fail(file, '禁止使用 JavaScript')
  }
  if (/<form\b/i.test(html)) {
    fail(file, '禁止使用表單')
  }
  if (/\sstyle\s*=/i.test(html) || /<style\b/i.test(html)) {
    fail(file, '禁止內嵌樣式')
  }
  if (/\son\w+\s*=/i.test(html)) {
    fail(file, '禁止內嵌事件處理器')
  }
  if (/http:\/\//i.test(html)) {
    fail(file, '禁止不安全 HTTP URL')
  }
  if (/<(iframe|object|embed)\b/i.test(html)) {
    fail(file, '禁止 iframe、object 或 embed')
  }

  const resourcePattern = /(?:href|src)="([^"]+)"/g
  for (const match of html.matchAll(resourcePattern)) {
    const target = match[1]
    if (
      target.startsWith('#') ||
      target.startsWith('https://') ||
      target.startsWith('mailto:')
    ) {
      continue
    }
    const cleanTarget = target.split('#')[0].split('?')[0]
    const resolved =
      cleanTarget === './'
        ? join(root, 'index.html')
        : resolve(file, '..', cleanTarget)
    if (!resolved.startsWith(root) || !existsSync(resolved)) {
      fail(file, `找不到本機資源 ${target}`)
    }
  }
}

const forbiddenExtensions = new Set([
  '.exe',
  '.msi',
  '.dmg',
  '.pkg',
  '.appx',
  '.zip',
  '.7z',
  '.rar',
  '.key',
  '.pfx',
  '.p12',
  '.pem'
])

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /gh[opusr]_[A-Za-z0-9_]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
]

for (const file of allFiles) {
  if (forbiddenExtensions.has(extname(file).toLowerCase())) {
    fail(file, '網站 Repository 禁止包含安裝檔、壓縮檔或私鑰')
  }
  if (statSync(file).size > 2 * 1024 * 1024) {
    fail(file, '單一網站檔案不得超過 2 MiB')
  }
  if (['.html', '.css', '.js', '.mjs', '.md', '.xml', '.txt', '.svg'].includes(extname(file))) {
    const content = readFileSync(file, 'utf8')
    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        fail(file, '偵測到疑似秘密或私鑰格式')
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`網站檢查失敗（${errors.length} 項）`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`網站檢查通過：${htmlFiles.length} 個 HTML、${allFiles.length} 個檔案`)
