import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

const GATE_PASSWORD = 'visa-claw-lobster-beach'

interface GatePageProps {
  onSuccess: () => void
}

export function GatePage({ onSuccess }: GatePageProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === GATE_PASSWORD) {
      localStorage.setItem('dashboard_gate', 'passed')
      onSuccess()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Authorized Access Only</CardTitle>
          <CardDescription>
            Enter the project access code to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gate-password">Access Code</Label>
              <Input
                id="gate-password"
                type="password"
                placeholder="Enter access code"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false) }}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">Incorrect access code. Please try again.</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Continue
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Visa CLI Dashboard &middot; Internal Use Only
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
