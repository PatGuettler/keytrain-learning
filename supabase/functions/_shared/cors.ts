const ALLOWED_ORIGINS = new Set([
  'https://keytrainlearning.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
])

/** Keep in sync with @supabase/supabase-js/cors — used by Edge Functions on Deno. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://keytrainlearning.com',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function corsHeadersForRequest(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : corsHeaders['Access-Control-Allow-Origin']
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowOrigin,
  }
}
