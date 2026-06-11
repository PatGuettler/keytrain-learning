export function isEdgeFunctionUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('FunctionsRelayError') ||
    message.includes('FunctionsFetchError') ||
    message.includes('NOT_FOUND') ||
    message.includes('404')
  )
}

export const EDGE_FUNCTION_DEPLOY_HINT =
  'Deploy the manage-users Edge Function: supabase functions deploy manage-users (see README).'
