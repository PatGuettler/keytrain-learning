import { useState } from 'react'
import { KeyRound, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  generateUserAccessLink,
  sendUserPasswordReset,
} from '@/services/user-management.service'

type SendPasswordResetButtonProps = {
  orgId: string
  userId: string
  invitationPending?: boolean
  disabled?: boolean
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function SendPasswordResetButton({
  orgId,
  userId,
  invitationPending = false,
  disabled,
  onSuccess,
  onError,
}: SendPasswordResetButtonProps) {
  const [pending, setPending] = useState<'email' | 'link' | null>(null)
  const [sent, setSent] = useState(false)

  const handleEmailReset = async () => {
    setPending('email')
    try {
      const result = await sendUserPasswordReset(orgId, userId)
      setSent(true)
      if (result.access_link) {
        try {
          await navigator.clipboard.writeText(result.access_link)
          onSuccess?.(
            `${result.message} Access link copied to clipboard — paste it to the user (Outlook often breaks emailed links).`
          )
        } catch {
          onSuccess?.(`${result.message} Access link: ${result.access_link}`)
        }
      } else {
        onSuccess?.(result.message)
      }
      window.setTimeout(() => setSent(false), 3000)
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not send reset email')
    } finally {
      setPending(null)
    }
  }

  const handleCopyLink = async () => {
    setPending('link')
    try {
      const result = await generateUserAccessLink(
        orgId,
        userId,
        invitationPending ? 'invite' : 'recovery'
      )
      try {
        await navigator.clipboard.writeText(result.access_link)
        onSuccess?.(
          `${result.message} Copied to clipboard.`
        )
      } catch {
        onSuccess?.(`${result.message} ${result.access_link}`)
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not create access link')
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || pending !== null}
        onClick={() => void handleEmailReset()}
      >
        <KeyRound className="h-3.5 w-3.5 mr-1" />
        {pending === 'email' ? 'Sending…' : sent ? 'Email sent' : 'Reset password'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || pending !== null}
        onClick={() => void handleCopyLink()}
        title="Copy a sign-in/setup link that works when Outlook Safe Links burns the email"
      >
        <Link2 className="h-3.5 w-3.5 mr-1" />
        {pending === 'link' ? 'Creating…' : 'Copy access link'}
      </Button>
    </>
  )
}
