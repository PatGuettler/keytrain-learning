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

export const EDGE_FUNCTION_DEPLOY_HINT =
  'The manage-users Edge Function is not deployed (or CORS is blocked). From your project folder run: supabase login && supabase link --project-ref YOUR_REF && supabase secrets set INVITE_REDIRECT_URL=https://patguettler.github.io/guardian-md/login && supabase functions deploy manage-users. Also add https://patguettler.github.io/guardian-md/** under Supabase → Authentication → URL configuration → Redirect URLs.'
