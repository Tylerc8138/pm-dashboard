/** @purpose Login page with sign in, sign up, and forgot password flows */
import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password)

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await resetPassword(email)

    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  const backToSignIn = () => {
    setShowForgotPassword(false)
    setResetSent(false)
    setError(null)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            V
          </div>
          <CardTitle className="text-2xl">Visa AEO Strategy Dashboard</CardTitle>
          <CardDescription>
            {showForgotPassword ? 'Reset your password' : 'Agentic Payments & Developer Growth Initiative'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Forgot Password Flow */}
          {showForgotPassword ? (
            resetSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Check your email</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={backToSignIn}>
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@visa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button type="button" className="underline hover:text-foreground" onClick={backToSignIn}>
                    Back to Sign In
                  </button>
                </p>
              </form>
            )
          ) : (
            /* Sign In / Sign Up Flow */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@visa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                      onClick={() => { setShowForgotPassword(true); setError(null) }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
