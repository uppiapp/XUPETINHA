import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const API_DIR = path.join(PROJECT_ROOT, 'app', 'api')

function walkSync(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walkSync(full))
    } else if (full.endsWith('.ts')) {
      files.push(full)
    }
  }
  return files
}

function cleanFile(filePath) {
  let content = readFileSync(filePath, 'utf-8')
  const original = content

  // Remove standalone console.log(...) and console.warn(...) lines
  content = content.replace(/^[ \t]*console\.(log|warn)\(.*\);?\s*$/gm, '')

  // Remove console.error lines that have the [v0] debug prefix (safe to remove)
  content = content.replace(/^[ \t]*console\.error\(\s*['"`]\[v0\][^'"`;]*['"`].*\);?\s*$/gm, '')

  // Collapse 3+ blank lines into 1
  content = content.replace(/\n{3,}/g, '\n\n')

  if (content !== original) {
    writeFileSync(filePath, content, 'utf-8')
    return true
  }
  return false
}

const files = walkSync(API_DIR)
let changed = 0

for (const file of files) {
  if (cleanFile(file)) {
    changed++
    console.log('Cleaned:', file.replace(PROJECT_ROOT + '/', ''))
  }
}

console.log(`\nDone. ${changed} files updated out of ${files.length} scanned.`)
