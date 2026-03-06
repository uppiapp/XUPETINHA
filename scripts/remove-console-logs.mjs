/**
 * Remove console.log e console.warn das API routes.
 * Mantém console.error apenas nos blocos catch (tratamento de erros).
 * Substitui console.error por um silêncio fora de blocos catch também.
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

const API_DIR = path.resolve('/vercel/share/v0-project/app/api')

// Padrão: linhas que contêm console.log ou console.warn (não console.error)
// Também remove console.error que não estejam dentro de catch blocks
function cleanFile(filePath) {
  let content = readFileSync(filePath, 'utf-8')
  const original = content

  // Remove linhas que são só console.log(...) ou console.warn(...)
  // Regex: qualquer linha que tenha apenas whitespace + console.log/warn + qualquer coisa
  content = content.replace(/^[ \t]*console\.(log|warn)\([^)]*(\([^)]*\)[^)]*)*\)[;\s]*$/gm, '')

  // Remove linhas com console.error que estão fora de catch — identifica pelo prefixo [v0]
  // "[v0]" foi adicionado por debugging, pode ir embora
  content = content.replace(/^[ \t]*console\.error\(\s*['"`]\[v0\][^'"`]*['"`][^)]*\)[;\s]*$/gm, '')

  // Limpa linhas em branco duplicadas (mais de 2 consecutivas → máximo 1)
  content = content.replace(/\n{3,}/g, '\n\n')

  if (content !== original) {
    writeFileSync(filePath, content, 'utf-8')
    return true
  }
  return false
}

async function main() {
  const files = await glob('**/*.ts', { cwd: API_DIR, absolute: true })
  let changed = 0

  for (const file of files) {
    if (cleanFile(file)) {
      changed++
      console.log('Cleaned:', file.replace('/vercel/share/v0-project/', ''))
    }
  }

  console.log(`\nDone. ${changed} files updated out of ${files.length} scanned.`)
}

main().catch(console.error)
