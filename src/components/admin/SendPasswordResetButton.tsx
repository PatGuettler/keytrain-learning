import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendUserPasswordReset } from '@/services/user-management.service'

type SendPasswordResetButtonProps = {
  orgId: string
  userId: string
  disabled?: boolean
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function SendPasswordResetButton({
  orgId,
  userId,
  disabled,
  onSuccess,
  onError,
}: SendPasswordResetButtonProps) {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleClick = async () => {
    setPending(true)
    try {
      const result = await sendUserPasswordReset(orgId, userId)
      setSent(true)
      onSuccess?.(result.message)
      window.setTimeout(() => setSent(false), 3000)
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not send reset email')
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || pending}
      onClick={() => void handleClick()}
    >
      <KeyRound className="h-3.5 w-3.5 mr-1" />
      {pending ? 'Sending…' : sent ? 'Email sent' : 'Reset password'}
    </Button>
  )
}
