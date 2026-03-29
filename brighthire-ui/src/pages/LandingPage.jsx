import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Briefcase, Users, Zap, ArrowRight, Github, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import FullPageSpinner from '../components/FullPageSpinner'

const BACKEND = 'http://localhost:8080'

function GoogleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function GithubIcon({ size = 20 }) {
  return <Github size={size} />
}

const ROLES = [
  {
    id: 'candidate',
    label: 'Candidate',
    subtitle: 'Find your next role',
    icon: Users,
    gradient: 'from-violet-600/20 to-indigo-600/20',
    borderActive: 'border-indigo-500',
    ringActive: 'ring-indigo-500/30',
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    subtitle: 'Hire smarter with AI',
    icon: Briefcase,
    gradient: 'from-emerald-600/20 to-teal-600/20',
    borderActive: 'border-emerald-500',
    ringActive: 'ring-emerald-500/30',
  },
]

export default function LandingPage() {
  const { user, status } = useAuth()
  const { state } = useLocation()
  const [role, setRole] = useState('candidate')

  if (status === 'loading') return <FullPageSpinner />
  if (user) {
    const dest = user.role === 'recruiter' ? '/recruiter' : '/candidate'
    return <Navigate to={dest} replace />
  }

  const errorMessage = state?.errorMessage ?? null

  const handleOAuth = (provider) => {
    // Persist intended role so AuthCallback can verify it after redirect
    sessionStorage.setItem('intendedRole', role)
    const url = `${BACKEND}/auth/login/${role}/${provider}`
    window.location.href = url
  }

  const isCandidate = role === 'candidate'

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col overflow-hidden">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-indigo-900/5 blur-[80px]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Zap size={16} className="text-white" fill="white" />
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">BrightHire</span>
        </div>
        <span className="text-xs text-[#94a3b8] border border-[#2d3148] rounded-full px-3 py-1 bg-[#1e2130]/60">
          AI-Powered Hiring
        </span>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Hero text */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1.5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Semantic AI Matching
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight leading-tight mb-3">
              Hire with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400"> intelligence</span>
            </h1>
            <p className="text-[#94a3b8] text-base leading-relaxed">
              Beyond keywords. NLP-powered matching that understands skills,
              context, and culture fit.
            </p>
          </div>

          {/* Card */}
          <div className="bg-[#1e2130]/80 backdrop-blur-xl border border-[#2d3148] rounded-2xl p-7 shadow-2xl shadow-black/40">

            {/* Auth error */}
            {errorMessage && (
              <div className="flex items-start gap-3 mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Role selector */}
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-widest mb-3">
              I am a
            </p>
            <div className="grid grid-cols-2 gap-3 mb-7">
              {ROLES.map(({ id, label, subtitle, icon: Icon, gradient, borderActive, ringActive }) => (
                <button
                  key={id}
                  onClick={() => setRole(id)}
                  className={clsx(
                    'relative flex flex-col items-start gap-1 p-4 rounded-xl border transition-all duration-200 text-left group',
                    role === id
                      ? clsx('bg-gradient-to-br', gradient, borderActive, 'ring-2', ringActive, 'shadow-lg')
                      : 'border-[#2d3148] bg-[#252838]/50 hover:bg-[#252838] hover:border-[#3d4160]',
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-colors',
                    role === id ? 'bg-white/10' : 'bg-[#2d3148] group-hover:bg-[#363b5e]'
                  )}>
                    <Icon size={16} className={role === id ? 'text-white' : 'text-[#94a3b8]'} />
                  </div>
                  <span className={clsx('text-sm font-semibold', role === id ? 'text-white' : 'text-[#94a3b8]')}>
                    {label}
                  </span>
                  <span className="text-xs text-[#64748b]">{subtitle}</span>
                  {role === id && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/60" />
                  )}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#2d3148]" />
              <span className="text-xs text-[#4b5563]">Continue with</span>
              <div className="flex-1 h-px bg-[#2d3148]" />
            </div>

            {/* OAuth buttons — provider is fixed per role */}
            <div className="flex flex-col gap-3">
              {isCandidate ? (
                <button
                  onClick={() => handleOAuth('github')}
                  className="group flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-[#24292e] hover:bg-[#2d3339] text-white font-medium text-sm transition-all duration-150 border border-white/10 shadow-md shadow-black/20 hover:shadow-lg hover:shadow-black/30 active:scale-[0.98]"
                >
                  <GithubIcon size={18} />
                  Continue with GitHub
                  <ArrowRight size={14} className="ml-auto text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => handleOAuth('google')}
                  className="group flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-medium text-sm transition-all duration-150 shadow-md shadow-black/20 hover:shadow-lg hover:shadow-black/30 active:scale-[0.98]"
                >
                  <GoogleIcon size={18} />
                  Continue with Google
                  <ArrowRight size={14} className="ml-auto text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-[#4b5563] mt-6 leading-relaxed">
            By continuing, you agree to our{' '}
            <span className="text-[#6366f1] hover:text-[#818cf8] cursor-pointer transition-colors">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#6366f1] hover:text-[#818cf8] cursor-pointer transition-colors">Privacy Policy</span>
          </p>
        </div>
      </main>

      {/* Bottom feature strip */}
      <footer className="relative z-10 border-t border-white/5 py-5 px-8">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {[
            ['Semantic NLP Matching', '🧠'],
            ['Real-time Shortlisting', '⚡'],
            ['AI-Ranked Candidates', '🎯'],
          ].map(([label, emoji]) => (
            <div key={label} className="flex items-center gap-2 text-xs text-[#4b5563]">
              <span>{emoji}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}
