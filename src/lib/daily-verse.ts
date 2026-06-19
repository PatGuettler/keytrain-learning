import dailyVerseReferences from '@/data/daily-verse-references.json'

type VerseEntry = { day: number; reference: string; text: string }

const verses = dailyVerseReferences as VerseEntry[]

function dayOfYear(localDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate)
  if (!match) throw new Error('Invalid local_date format. Use YYYY-MM-DD.')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  const start = new Date(Date.UTC(year, 0, 1))
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1
}

export function lookupDailyVerse(localDate: string): { reference: string; text: string } {
  const day = dayOfYear(localDate)
  const entry = verses.find((row) => row.day === day) ?? verses[(day - 1) % verses.length]
  if (!entry?.text) throw new Error('Daily verse text is missing.')
  return { reference: entry.reference, text: entry.text }
}
