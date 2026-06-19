import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type VerseEntry = { day: number; reference: string; text: string }

const references = JSON.parse(
  await Deno.readTextFile(new URL('./references.json', import.meta.url))
) as VerseEntry[]

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

function lookupVerse(day: number): VerseEntry {
  const entry = references.find((r) => r.day === day) ?? references[(day - 1) % references.length]
  if (!entry?.text) throw new Error('Daily verse text is missing.')
  return entry
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

    const day = dayOfYear(localDate)
    const { reference, text } = lookupVerse(day)
    return jsonResponse({ reference, text, localDate })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Request failed.' }, 500)
  }
})
