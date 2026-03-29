import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Zap, LogOut, ArrowLeft, MapPin, Briefcase, Calendar,
  AlertCircle, Loader2, CheckCircle2, Send, UserCircle2
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { getJobById, getCandidateProfile, getApplicationsByUser, createApplication } from '../../api/dashboard'

// ─── SENIORITY BADGE ──────────────────────────────────────

const SENIORITY_STYLES = {
  junior: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  mid:    { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  senior: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20'   },
  lead:   { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   border: 'border-cyan-500/20'   },
}

function SeniorityBadge({ seniority }) {
  const s = SENIORITY_STYLES[seniority?.toLowerCase()] ?? {
    bg: 'bg-[#2d3148]/60', text: 'text-[#94a3b8]', border: 'border-[#2d3148]',
  }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border capitalize', s.bg, s.text, s.border)}>
      {seniority ?? 'N/A'}
    </span>
  )
}

// ─── SKELETON ─────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-7 bg-[#2d3148] rounded w-1/2" />
        <div className="h-4 bg-[#2d3148] rounded w-1/4" />
        <div className="flex gap-2">
          <div className="h-6 bg-[#2d3148] rounded w-16" />
          <div className="h-6 bg-[#2d3148] rounded w-24" />
        </div>
      </div>
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 space-y-3">
        <div className="h-4 bg-[#2d3148] rounded w-full" />
        <div className="h-4 bg-[#2d3148] rounded w-5/6" />
        <div className="h-4 bg-[#2d3148] rounded w-4/6" />
        <div className="h-4 bg-[#2d3148] rounded w-full" />
        <div className="h-4 bg-[#2d3148] rounded w-3/4" />
      </div>
    </div>
  )
}

// ─── APPLY BUTTON AREA ────────────────────────────────────

function ApplyCta({ applyState, hasResume, isExpired, onApply, onGoToProfile }) {
  // applyState: 'idle' | 'loading' | 'applied' | 'error'
  // hasResume: bool — false means no resume on file yet

  if (isExpired) {
    return (
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">This role has closed</p>
          <p className="text-xs text-[#64748b] mt-0.5">Applications are no longer being accepted.</p>
        </div>
        <span className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          Expired
        </span>
      </div>
    )
  }

  if (applyState === 'applied') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-300">Application submitted!</p>
          <p className="text-xs text-emerald-500/70 mt-0.5">Your resume has been sent. We'll notify you of any updates.</p>
        </div>
        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={15} />
          Applied
        </span>
      </div>
    )
  }

  if (!hasResume) {
    return (
      <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Upload a resume to apply</p>
          <p className="text-xs text-[#64748b] mt-0.5">You need a resume on file before submitting an application.</p>
        </div>
        <button
          onClick={onGoToProfile}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow shadow-indigo-600/20 transition-all whitespace-nowrap"
        >
          <UserCircle2 size={15} />
          Complete Profile
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-white">Interested in this role?</p>
        <p className="text-xs text-[#64748b] mt-0.5">Submit your resume and let our AI rank your fit.</p>
      </div>

      <div className="flex flex-col items-end gap-2">
        {applyState === 'error' && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle size={12} />
            Something went wrong — please try again.
          </p>
        )}
        <button
          onClick={onApply}
          disabled={applyState === 'loading'}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow shadow-indigo-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {applyState === 'loading'
            ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
            : <><Send size={14} /> Apply Now</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────

export default function JobDetail() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { jobId } = useParams()
  const location = useLocation()
  const backTo   = location.state?.from ?? '/candidate/jobs'
  const backLabel = location.state?.fromLabel ?? 'Back to jobs'

  const [job, setJob]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError]       = useState(false)

  // Apply state — derived from profile + existing applications
  const [resumeId, setResumeId]     = useState(null)   // null = no resume
  const [applyState, setApplyState] = useState('idle') // 'idle' | 'loading' | 'applied' | 'error'

  useEffect(() => {
    if (!jobId || !user?.id) { setNotFound(true); setLoading(false); return }

    // Load all three in parallel — job detail, candidate profile, existing applications
    Promise.all([
      getJobById(jobId),
      getCandidateProfile(),
      getApplicationsByUser(user.id),
    ])
      .then(([jobData, profile, applications]) => {
        setJob(jobData)

        // Store resume ID for apply payload
        if (profile?.resume?.resumeId) {
          setResumeId(profile.resume.resumeId)
        }

        // Check if already applied to this job
        const alreadyApplied = applications.some(
          (a) => a.jobId === jobData.id || a.jobId?.toString() === jobId
        )
        if (alreadyApplied) setApplyState('applied')
      })
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true)
        else setError(true)
      })
      .finally(() => setLoading(false))
  }, [jobId, user?.id])

  const handleApply = async () => {
    if (!resumeId || !user?.id || !jobId) return
    setApplyState('loading')
    try {
      await createApplication({ jobId, userId: user.id, resumeId })
      setApplyState('applied')
    } catch (err) {
      // Backend returns 400 with "You have already applied to this job" for duplicates
      const msg = err?.response?.data?.message ?? ''
      if (err?.response?.status === 400 && msg.toLowerCase().includes('already applied')) {
        setApplyState('applied')
      } else {
        setApplyState('error')
      }
    }
  }

  const expiresAt = job?.expiresAt ? new Date(job.expiresAt) : null
  const isExpired = expiresAt && expiresAt < new Date()
  const daysLeft  = expiresAt && !isExpired
    ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="min-h-screen bg-[#0f1117]">

      {/* Nav */}
      <header className="border-b border-[#2d3148]/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center shadow shadow-indigo-600/30">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">BrightHire</span>
        </div>
        <div className="flex items-center gap-4">
          {user?.avatarUrl && (
            <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full ring-1 ring-[#2d3148]" />
          )}
          <span className="text-sm text-[#94a3b8] hidden sm:block">{user?.fullName ?? user?.email}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* Back */}
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors mb-8"
        >
          <ArrowLeft size={13} />
          {backLabel}
        </button>

        {/* States */}
        {loading && <Skeleton />}

        {!loading && notFound && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1e2130] border border-[#2d3148] flex items-center justify-center">
              <Briefcase size={20} className="text-[#4b5563]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#94a3b8]">Job not found</p>
              <p className="text-xs text-[#4b5563] mt-1">This role may have been removed or the link is invalid.</p>
            </div>
            <button
              onClick={() => navigate('/candidate/jobs')}
              className="mt-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#1e2130] border border-[#2d3148] text-[#94a3b8] hover:text-white hover:border-[#3d4160] transition-all"
            >
              Browse all jobs
            </button>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 p-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            Could not load this job. Please try again.
          </div>
        )}

        {!loading && job && (
          <div className="space-y-6">

            {/* Header */}
            <div>
              <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-2">{job.companyName ?? 'Company'}</p>
              <h1 className="text-2xl font-bold text-white leading-snug mb-3">{job.title}</h1>

              <div className="flex flex-wrap items-center gap-3">
                <SeniorityBadge seniority={job.seniority} />

                {job.location && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-[#64748b]">
                    <MapPin size={13} />
                    {job.location}
                  </span>
                )}

                {daysLeft !== null && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-[#64748b]">
                    <Calendar size={13} />
                    {daysLeft === 1 ? 'Closes tomorrow' : `Closes in ${daysLeft} days`}
                  </span>
                )}

                {isExpired && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border bg-red-500/10 text-red-400 border-red-500/20">
                    Expired
                  </span>
                )}
              </div>
            </div>

            {/* Skills */}
            {job.requiredSkills?.length > 0 && (
              <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-5">
                <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6">
              <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">About the Role</p>
              <div className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">{job.description}</div>
            </div>

            {/* Apply CTA */}
            <ApplyCta
              applyState={applyState}
              hasResume={!!resumeId}
              isExpired={!!isExpired}
              onApply={handleApply}
              onGoToProfile={() => navigate('/candidate/profile')}
            />

          </div>
        )}
      </main>
    </div>
  )
}
