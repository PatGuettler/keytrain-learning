import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { updateProfile } from '@/services/users.service'

export function ProfilePage() {
  const { profile, email } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (!profile) return
    await updateProfile(profile.id, { full_name: name })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-2xl font-bold">Profile</h2>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={profile?.role ?? ''} disabled className="capitalize" />
          </div>
          <Button onClick={save}>{saved ? 'Saved!' : 'Save changes'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
