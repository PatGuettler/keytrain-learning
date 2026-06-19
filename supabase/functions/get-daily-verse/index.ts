import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type VerseReference = { day: number; reference: string }

const references = JSON.parse(
  await Deno.readTextFile(new URL('./references.json', import.meta.url))
) as VerseReference[]

const verseCache = new Map<string, { reference: string; text: string; localDate: string }>()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

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

function lookupReference(day: number): string {
  const list = references as VerseReference[]
  const entry = list.find((r) => r.day === day) ?? list[(day - 1) % list.length]
  return entry.reference
}

async function fetchEsvPassage(reference: string, apiKey: string): Promise<string> {
  const params = new URLSearchParams({
    q: reference,
    'include-passage-references': 'true',
    'include-verse-numbers': 'true',
    'include-footnotes': 'false',
    'include-headings': 'false',
    'include-short-copyright': 'true',
    'include-passage-horizontal-lines': 'false',
    'horizontal-line-length': '0',
    'include-selahs': 'false',
  })

  const res = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, {
    headers: { Authorization: `Token ${apiKey}` },
  })

  const body = await res.json().catch(() => null) as { passages?: string[]; message?: string } | null
  if (!res.ok) {
    throw new Error(body?.message ?? `ESV API error (${res.status})`)
  }

  const text = body?.passages?.[0]?.trim()
  if (!text) throw new Error('ESV API returned no passage text.')
  return text
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const esvApiKey = Deno.env.get('ESV_API_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: 'Server misconfigured.' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header.' }, 401)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'Unauthorized.' }, 401)

    const body = await req.json().catch(() => ({}))
    const localDate = typeof body.local_date === 'string' ? body.local_date.trim() : ''
    if (!localDate) {
      return jsonResponse({ error: 'local_date is required (YYYY-MM-DD).' }, 400)
    }

    const cached = verseCache.get(localDate)
    if (cached) {
      return jsonResponse(cached)
    }

    const day = dayOfYear(localDate)
    const reference = lookupReference(day)

    if (!esvApiKey) {
      return jsonResponse({
        reference,
        text: `${reference} — configure ESV_API_KEY on the server to load verse text.`,
        localDate,
      })
    }

    const text = await fetchEsvPassage(reference, esvApiKey)
    const result = { reference, text, localDate }
    verseCache.set(localDate, result)
    return jsonResponse(result)
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Request failed.' }, 500)
  }
})
