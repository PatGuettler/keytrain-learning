import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const source = process.argv[2]
if (!source) {
  console.error('Usage: node scripts/install-logos.mjs <path-to-combined-logo.png>')
  process.exit(1)
}

if (!existsSync(source)) {
  console.error(`Source not found: ${source}`)
  process.exit(1)
}

const assetsDir = join(root, 'src', 'assets')
mkdirSync(assetsDir, { recursive: true })

const dest = join(assetsDir, 'logo-source.png')
copyFileSync(source, dest)
console.log(`Copied logo to ${dest}`)
