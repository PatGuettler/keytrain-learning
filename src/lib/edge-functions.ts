export function isEdgeFunctionUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('FunctionsRelayError') ||
    message.includes('FunctionsFetchError') ||
    message.includes('CORS') ||
    message.includes('NOT_FOUND') ||
    message.includes('not deployed') ||
    message.includes('404')
  )
}

export const EDGE_FUNCTION_DEPLOY_HINT = [
  'The manage-users Edge Function is not deployed on your Supabase project (the API returns 404 NOT_FOUND).',
  'Browsers report this as a CORS error, but the function simply does not exist yet.',
  '',
  'Deploy once — easiest from WSL in your project folder:',
  '',
  '  npx supabase@latest login',
  '  export SUPABASE_PROJECT_REF=rzrsudrdpnabpseatclm',
  '  bash scripts/deploy-manage-users.sh',
  '',
  'Or in Supabase Dashboard → Edge Functions → deploy a function named manage-users',
  '(copy supabase/functions/manage-users/index.ts), and turn OFF "Enforce JWT verification".',
  '',
  'Or add GitHub secrets SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF and run the',
  '"Deploy Edge Functions" workflow.',
  '',
  'Also add this redirect URL in Supabase → Authentication → URL configuration:',
  '  https://patguettler.github.io/guardian-md/**',
].join('\n')
