#!/usr/bin/env node
/**
 * Set passwords for test Auth users (no email reset needed).
 *
 * Usage:
 *   export SUPABASE_URL='https://YOUR_PROJECT.supabase.co'
 *   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'   # Dashboard → Settings → API → service_role
 *   node scripts/set-test-passwords.mjs
 *
 * Optional:
 *   TEST_PASSWORD='your-password'
 *   TEST_EMAILS='employee@test.com,management@test.com'
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadDotEnv() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnv()

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.TEST_PASSWORD ?? 'asdf1234ASDF!@#$'
const emails = (process.env.TEST_EMAILS ?? 'employee@test.com,management@test.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Get the service role key from Supabase Dashboard → Settings → API (keep it secret).'
  )
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email) {
  let page = 1
  const perPage = 200
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < perPage) break
    page++
  }
  return null
}

async function clearProfileLockout(userId) {
  const { error } = await admin
    .from('profiles')
    .update({
      password_upgrade_required: false,
      failed_login_attempts: 0,
      login_locked_at: null,
    })
    .eq('id', userId)
  if (error) console.warn(`  profile cleanup warning: ${error.message}`)
}

let failed = 0

for (const email of emails) {
  process.stdout.write(`${email} … `)
  try {
    const user = await findUserByEmail(email)
    if (!user) {
      console.log('NOT FOUND (create user in Auth first)')
      failed++
      continue
    }

    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    })
    if (error) throw error

    await clearProfileLockout(user.id)
    console.log(`OK (${user.id})`)
  } catch (err) {
    console.log(`FAILED: ${err instanceof Error ? err.message : err}`)
    failed++
  }
}

console.log('\nDone. Sign in with the new password (min 10 characters).')
process.exit(failed > 0 ? 1 : 0)
