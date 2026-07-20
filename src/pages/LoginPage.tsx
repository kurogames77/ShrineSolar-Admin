import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // CAPTCHA State
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState(false)
  const turnstileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Expose a global callback for the Turnstile widget
    ;(window as any).onTurnstileSuccess = (token: string) => {
      setTurnstileToken(token)
      setCaptchaError(false)
    }

    const renderWidget = () => {
      if ((window as any).turnstile && turnstileRef.current) {
        // Render explicitly
        (window as any).turnstile.render(turnstileRef.current, {
          sitekey: '0x4AAAAAAD5TN93fLM-OyEjz',
          callback: 'onTurnstileSuccess',
          theme: 'dark'
        })
      }
    }

    // If Turnstile is already loaded, render it
    if ((window as any).turnstile) {
      renderWidget()
    } else {
      // If not, wait for it to load
      let attempts = 0
      const interval = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(interval)
          renderWidget()
        }
        attempts++
        if (attempts > 50) clearInterval(interval) // Stop checking after 5 seconds
      }, 100)
      
      return () => {
        clearInterval(interval)
        delete (window as any).onTurnstileSuccess
      }
    }

    return () => {
      delete (window as any).onTurnstileSuccess
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setCaptchaError(false)

    // Ensure CAPTCHA was completed
    if (!turnstileToken) {
      setCaptchaError(true)
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: turnstileToken,
        },
      })

      if (error) throw error

      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0e1a] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-200">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
          Sign in to ShrineSolar
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Admin Control Center
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/70 backdrop-blur-md py-8 px-4 sm:rounded-2xl sm:px-10 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center">
                <span className="flex-1">{error}</span>
              </div>
            )}

            <div className="relative">
              <Input
                label="Username"
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 text-white bg-slate-900/50 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20"
              />
              <User className="absolute left-3 top-[34px] h-5 w-5 text-slate-500" />
            </div>

            <div className="relative">
              <Input
                label="Password"
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 text-white bg-slate-900/50 border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20"
              />
              <Lock className="absolute left-3 top-[34px] h-5 w-5 text-slate-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex items-center">
              <label htmlFor="remember-me" className="flex items-center group cursor-pointer">
                <div className="relative flex items-center justify-center w-5 h-5 mr-2 bg-slate-900/50 border border-slate-600 rounded transition-colors group-hover:border-amber-500">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="absolute opacity-0 w-full h-full cursor-pointer peer"
                  />
                  <svg 
                    className="w-3 h-3 text-amber-500 opacity-0 peer-checked:opacity-100 transition-opacity" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-slate-400 font-medium group-hover:text-slate-200 transition-colors">
                  Remember me
                </span>
              </label>
            </div>

            {/* Cloudflare Turnstile Widget */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div ref={turnstileRef}></div>
              {captchaError && (
                <p className="text-red-400 text-xs mt-2 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Please complete the CAPTCHA verification
                </p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                className="w-full h-12 text-base shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] group"
                isLoading={isLoading}
              >
                {!isLoading && (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
