#!/usr/bin/env node
/**
 * Bundles World English Bible (public domain) text into daily-verse JSON files.
 * Downloads ENGWEBP once from bible.helloao.org, then maps each reference locally.
 *
 * Usage: node scripts/generate-daily-verse-text.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, 'scripts/.cache')
const cachePath = join(cacheDir, 'engwebp-complete.json')
const inputPath = join(root, 'src/data/daily-verse-references.json')
const outputPaths = [
  join(root, 'src/data/daily-verse-references.json'),
  join(root, 'supabase/functions/get-daily-verse/references.json'),
]

const BOOK_ALIASES = { Psalm: 'Psalms' }

function flattenContent(content) {
  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object' && typeof part.text === 'string') return part.text
      return ''
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseReference(reference, bookNames) {
  for (const name of bookNames) {
    if (!reference.startsWith(`${name} `)) continue
    const rest = reference.slice(name.length + 1)
    const match = /^(\d+):(\d+)(?:-(\d+))?$/.exec(rest)
    if (!match) throw new Error(`Invalid reference suffix: ${reference}`)
    const chapter = Number(match[1])
    const startVerse = Number(match[2])
    const endVerse = Number(match[3] ?? match[2])
    const bookName = BOOK_ALIASES[name] ?? name
    return { bookName, chapter, startVerse, endVerse }
  }
  throw new Error(`Unknown book in reference: ${reference}`)
}

async function loadCompleteBible() {
  mkdirSync(cacheDir, { recursive: true })
  try {
    return JSON.parse(readFileSync(cachePath, 'utf8'))
  } catch {
    console.log('Downloading World English Bible (ENGWEBP)…')
    const res = await fetch('https://bible.helloao.org/api/ENGWEBP/complete.json')
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
    const data = await res.json()
    writeFileSync(cachePath, `${JSON.stringify(data)}\n`)
    console.log(`Cached at ${cachePath}`)
    return data
  }
}

function buildLookup(complete) {
  const byBookName = new Map()
  for (const book of complete.books) {
    const chapters = new Map()
    for (const entry of book.chapters) {
      const verses = new Map()
      for (const item of entry.chapter.content) {
        if (item.type !== 'verse') continue
        verses.set(item.number, flattenContent(item.content))
      }
      chapters.set(entry.chapter.number, verses)
    }
    byBookName.set(book.name, chapters)
  }
  return byBookName
}

function formatPassage(verses, startVerse, endVerse) {
  const lines = []
  for (let verse = startVerse; verse <= endVerse; verse++) {
    if (!verses.has(verse)) throw new Error(`Missing verse ${verse}`)
    const text = verses.get(verse) ?? ''
    lines.push(startVerse === endVerse ? text : `${verse} ${text}`)
  }
  return lines.join('\n')
}

function lookupText(reference, bookNames, bible) {
  const { bookName, chapter, startVerse, endVerse } = parseReference(reference, bookNames)
  const chapters = bible.get(bookName)
  if (!chapters) throw new Error(`Book not found: ${bookName}`)
  const verses = chapters.get(chapter)
  if (!verses) throw new Error(`Chapter not found: ${bookName} ${chapter}`)
  return formatPassage(verses, startVerse, endVerse)
}

const references = JSON.parse(readFileSync(inputPath, 'utf8'))
const complete = await loadCompleteBible()
const bible = buildLookup(complete)
const bookNames = [
  ...complete.books.map((book) => book.name),
  ...Object.keys(BOOK_ALIASES),
].sort((a, b) => b.length - a.length)

const results = []
const failures = []

for (const { day, reference } of references) {
  try {
    const text = lookupText(reference, bookNames, bible)
    results.push({ day, reference, text })
  } catch (err) {
    failures.push({
      day,
      reference,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

if (failures.length) {
  console.error('Failed references:')
  for (const failure of failures) {
    console.error(`  day ${failure.day}: ${failure.reference} — ${failure.error}`)
  }
  process.exit(1)
}

const json = `${JSON.stringify(results, null, 2)}\n`
for (const path of outputPaths) {
  writeFileSync(path, json)
  console.log(`Wrote ${path}`)
}
