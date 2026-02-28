import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Login.css'

// Configuration for lockout mechanism
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes in milliseconds

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTime, setLockoutTime] = useState(null)
  const navigate = useNavigate()

  // Load login attempts from localStorage on mount
  useEffect(() => {
    const storedAttempts = localStorage.getItem('loginAttempts')
    const storedLockoutTime = localStorage.getItem('lockoutTime')
    
    if (storedAttempts) {
      setLoginAttempts(parseInt(storedAttempts, 10))
    }
    
    if (storedLockoutTime) {
      const lockoutTimestamp = parseInt(storedLockoutTime, 10)
      const now = Date.now()
      
      if (now < lockoutTimestamp) {
        setIsLocked(true)
        setLockoutTime(lockoutTimestamp)
      } else {
        // Lockout expired, reset
        localStorage.removeItem('loginAttempts')
        localStorage.removeItem('lockoutTime')
      }
    }
  }, [])

  // Check lockout status periodically
  useEffect(() => {
    if (isLocked && lockoutTime) {
      const interval = setInterval(() => {
        const now = Date.now()
        if (now >= lockoutTime) {
          setIsLocked(false)
          setLockoutTime(null)
          setLoginAttempts(0)
          localStorage.removeItem('loginAttempts')
          localStorage.removeItem('lockoutTime')
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isLocked, lockoutTime])

  const handleLogin = async (e) => {
    e.preventDefault()
    
    // Check if account is locked
    if (isLocked) {
      const remainingTime = Math.ceil((lockoutTime - Date.now()) / 1000 / 60)
      setError(`Account temporarily locked. Please try again in ${remainingTime} minute(s).`)
      return
    }

    setLoading(true)
    setError('')

    // Basic input validation
    if (!email || !password) {
      setError('Please enter both email and password')
      setLoading(false)
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
      setLoading(false)
      return
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        // Increment login attempts on failure
        const newAttempts = loginAttempts + 1
        setLoginAttempts(newAttempts)
        localStorage.setItem('loginAttempts', newAttempts.toString())

        // Lock account after max attempts
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          const lockoutTimestamp = Date.now() + LOCKOUT_DURATION
          setIsLocked(true)
          setLockoutTime(lockoutTimestamp)
          localStorage.setItem('lockoutTime', lockoutTimestamp.toString())
          setError(`Too many failed attempts. Account locked for 15 minutes.`)
        } else {
          const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts
          setError(`Invalid credentials. ${remainingAttempts} attempt(s) remaining.`)
        }
        return
      }

      // Successful login - reset attempts
      if (data.user) {
        localStorage.removeItem('loginAttempts')
        localStorage.removeItem('lockoutTime')
        setLoginAttempts(0)
        navigate('/role-selection')
      }
    } catch (err) {
      // Handle network errors more gracefully
      if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch')) {
        setError('Unable to connect to authentication service. Please check your Supabase configuration.')
      } else {
        setError(err.message || 'An error occurred during login')
      }
    } finally {
      setLoading(false)
    }
  }

  const getRemainingLockoutTime = () => {
    if (!isLocked || !lockoutTime) return 0
    return Math.ceil((lockoutTime - Date.now()) / 1000 / 60)
  }

  return (
    <div className="login-container" role="main" aria-label="Login page">
      <div className="login-card">
        <h1 className="logo" aria-label="LevelUp Learning">LevelUp Learning</h1>
        <p className="welcome-text">Welcome back!</p>
        
        <form onSubmit={handleLogin} className="login-form" noValidate>
          {error && (
            <div className="error-message" role="alert" aria-live="polite">
              {error}
            </div>
          )}
          
          {isLocked && (
            <div className="lockout-message" role="alert" aria-live="polite">
              Account locked. Please try again in {getRemainingLockoutTime()} minute(s).
            </div>
          )}
          
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <svg 
                className="input-icon" 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M2.5 6.66667L10 11.6667L17.5 6.66667M3.33333 15H16.6667C17.5871 15 18.3333 14.2538 18.3333 13.3333V6.66667C18.3333 5.74619 17.5871 5 16.6667 5H3.33333C2.41286 5 1.66667 5.74619 1.66667 6.66667V13.3333C1.66667 14.2538 2.41286 15 3.33333 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-required="true"
                aria-invalid={error && error.includes('email') ? 'true' : 'false'}
                disabled={isLocked || loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <svg 
                className="input-icon" 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.83333 9.16667V5.83333C5.83333 4.72876 6.27281 3.66895 7.05372 2.88805C7.83462 2.10714 8.89443 1.66667 9.99999 1.66667C11.1056 1.66667 12.1654 2.10714 12.9463 2.88805C13.7272 3.66895 14.1667 4.72876 14.1667 5.83333V9.16667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={error && error.includes('password') ? 'true' : 'false'}
                disabled={isLocked || loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="sign-in-button" 
            disabled={loading || isLocked}
            aria-label="Sign in to your account"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-links">
          <Link to="/forgot-password" className="link" aria-label="Reset your password">
            Forgot your password?
          </Link>
          <Link to="/signup" className="link" aria-label="Create a new account">
            Don't have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login

