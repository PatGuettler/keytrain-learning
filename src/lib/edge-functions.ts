export function isEdgeFunctionUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('FunctionsRelayError') ||
    message.includes('FunctionsFetchError') ||
    message.includes('CORS') ||
    message.includes('NOT_FOUND') ||
    message.includes('404')
  )
}

export const EDGE_FUNCTION_DEPLOY_HINT = [
  'User invites require the manage-users Edge Function on Supabase.',
  '',
  'The CORS error usually means the function is missing or was deployed with JWT verification enabled at the gateway (browser preflight fails before your code runs).',
  '',
  'One-time setup from your machine:',
  '1. supabase login',
  '2. export SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=rzrsudrdpnabpseatclm',
  '3. ./scripts/deploy-manage-users.sh',
  '',
  'Or in GitHub: Settings → Secrets → add SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF, then run the "Deploy Edge Functions" workflow.',
  '',
  'Also add https://patguettler.github.io/guardian-md/** under Supabase → Authentication → URL configuration → Redirect URLs.',
].join('\n')
