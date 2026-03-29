import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, LogOut, ArrowLeft, Briefcase, Clock, AlertCircle,
  ChevronRight, Search, X, ChevronDown, Loader2, CheckCircle2, XCircle
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { getApplicationsByUser, candidateRespondToInterview } from '../../api/dashboard'

// ─── STATUS CONFIG ─────────────────────────────────────────

const STATUS_STYLES = {
  applied:             { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    label: 'Applied'          },
  reviewing:           { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20',  label: 'Reviewing'        },
  shortlisted:         { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20',  label: 'Shortlisted'      },
  interview:           { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20',  label: 'Interview Invite' },
  interview_accepted:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Accepted'         },
  interview_rejected:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20',  label: 'Declined'         },
  rejected:            { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     label: 'Rejected'         },
  withdrawn:           { bg: 'bg-[#2d3148]/60',   text: 'text-[#64748b]',   border: 'border-[#2d3148]',      label: 'Withdrawn'        },
}

const STATUS_OPTIONS = [
  { value: '',                   label: 'All Statuses'     },
  { value: 'applied',            label: 'Applied'          },
  { value: 'reviewing',          label: 'Reviewing'        },
  { value: 'shortlisted',        label: 'Shortlisted'      },
  { value: 'interview',          label: 'Interview Invite' },
  { value: 'interview_accepted', label: 'Accepted'         },
  { value: 'interview_rejected', label: 'Declined'         },
  { value: 'rejected',           label: 'Rejected'         },
  { value: 'withdrawn',          label: 'Withdrawn'        },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Most Recent'  },
  { value: 'oldest', label: 'Oldest First' },
]

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status?.toLowerCase()] ?? {
    bg: 'bg-[#2d3148]/60', text: 'text-[#94a3b8]', border: 'border-[#2d3148]', label: status ?? 'Unknown',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap', s.bg, s.text, s.border)}>
      {s.label}
    </span>
  )
}

// ─── SELECT DROPDOWN ──────────────────────────────────────

function SelectFilter({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-xl bg-[#1e2130] border border-[#2d3148] focus:border-indigo-500 text-sm text-[#94a3b8] outline-none transition-colors cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4b5563] pointer-events-none" />
    </div>
  )
}

// ─── INTERVIEW RESPONSE ACTIONS ───────────────────────────

function InterviewActions({ applicationId, onRespond }) {
  const [loading, setLoading] = useState(null) // 'interview_accepted' | 'interview_rejected'
  const [error, setError]     = useState(null)

  const handleRespond = async (response) => {
    setLoading(response)
    setError(null)
    try {
      const updated = await candidateRespondToInterview(applicationId, response)
      onRespond(applicationId, updated.status)
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to respond. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        Interview invite — respond below
      </p>
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={11} className="shrink-0" />{error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => handleRespond('interview_accepted')}
          disabled={loading != null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading === 'interview_accepted'
            ? <Loader2 size={11} className="animate-spin" />
            : <CheckCircle2 size={11} />
          }
          Accept
        </button>
        <button
          onClick={() => handleRespond('interview_rejected')}
          disabled={loading != null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading === 'interview_rejected'
            ? <Loader2 size={11} className="animate-spin" />
            : <XCircle size={11} />
          }
          Decline
        </button>
      </div>
    </div>
  )
}

// ─── SKELETON ─────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-[#2d3148] rounded w-1/3" />
        <div className="h-3 bg-[#2d3148] rounded w-1/4" />
      </div>
      <div className="h-4 bg-[#2d3148] rounded w-20" />
      <div className="h-5 bg-[#2d3148] rounded w-16" />
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────

export default function MyApplications() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [applications, setApplications] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(false)

  // Filters
  const [search, setSearch]       = useState('') // job title or company name
  const [statusFilter, setStatus] = useState('')
  const [locationFilter, setLoc]  = useState('')
  const [sortOrder, setSort]      = useState('newest')

  useEffect(() => {
    if (!user?.id) return
    getApplicationsByUser(user.id)
      .then(setApplications)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [user?.id])

  // Optimistically update a single application's status after candidate responds
  const handleInterviewResponse = (applicationId, newStatus) => {
    setApplications((prev) =>
      prev.map((a) => a.id === applicationId ? { ...a, status: newStatus } : a)
    )
  }

  // Unique locations from data for the location dropdown
  const locationOptions = useMemo(() => {
    const locs = [...new Set(
      applications.map((a) => a.jobLocation).filter(Boolean)
    )].sort()
    return [{ value: '', label: 'All Locations' }, ...locs.map((l) => ({ value: l, label: l }))]
  }, [applications])

  const filtered = useMemo(() => {
    let result = [...applications]

    // Search: job title OR company name
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.jobTitle?.toLowerCase().includes(q) ||
          a.companyName?.toLowerCase().includes(q)
      )
    }

    // Status
    if (statusFilter) {
      result = result.filter((a) => a.status?.toLowerCase() === statusFilter)
    }

    // Location
    if (locationFilter) {
      result = result.filter((a) => a.jobLocation === locationFilter)
    }

    // Sort
    result.sort((a, b) => {
      const ta = a.appliedAt ? new Date(a.appliedAt).getTime() : 0
      const tb = b.appliedAt ? new Date(b.appliedAt).getTime() : 0
      return sortOrder === 'newest' ? tb - ta : ta - tb
    })

    return result
  }, [applications, search, statusFilter, locationFilter, sortOrder])

  const hasActiveFilters = search || statusFilter || locationFilter

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setLoc('')
    setSort('newest')
  }

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
          {user?.avatarUrl && <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full ring-1 ring-[#2d3148]" />}
          <span className="text-sm text-[#94a3b8] hidden sm:block">{user?.fullName ?? user?.email}</span>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors">
            <LogOut size={13} />Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Back + heading */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/candidate')}
            className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors mb-5"
          >
            <ArrowLeft size={13} />
            Back to dashboard
          </button>
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">My Applications</p>
          <h1 className="text-2xl font-bold text-white">Application History</h1>
          <p className="text-[#64748b] text-sm mt-1">
            {loading
              ? 'Loading…'
              : hasActiveFilters
                ? `${filtered.length} of ${applications.length} application${applications.length !== 1 ? 's' : ''}`
                : `${applications.length} application${applications.length !== 1 ? 's' : ''} total`
            }
          </p>
        </div>

        {/* Filters — only shown when we have data */}
        {!loading && !error && applications.length > 0 && (
          <div className="space-y-3 mb-5">
            {/* Row 1: Search */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#1e2130] border border-[#2d3148] focus-within:border-indigo-500 transition-colors">
              <Search size={14} className="text-[#4b5563] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job title or company…"
                className="flex-1 bg-transparent text-sm text-white placeholder-[#4b5563] outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[#4b5563] hover:text-[#94a3b8] transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Row 2: Status + Location + Sort + Clear */}
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[160px]">
                <SelectFilter value={statusFilter} onChange={setStatus} options={STATUS_OPTIONS} />
              </div>
              <div className="flex-1 min-w-[160px]">
                <SelectFilter value={locationFilter} onChange={setLoc} options={locationOptions} />
              </div>
              <div className="flex-1 min-w-[140px]">
                <SelectFilter value={sortOrder} onChange={setSort} options={SORT_OPTIONS} />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-[#1e2130] border border-[#2d3148] text-[#64748b] hover:text-white hover:border-[#3d4160] transition-all whitespace-nowrap"
                >
                  <X size={12} />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[#2d3148]">
              {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 px-5 py-5 text-sm text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              Could not load your applications. Please try again.
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#252838] flex items-center justify-center">
                <Briefcase size={18} className="text-[#4b5563]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#94a3b8]">No applications yet</p>
                <p className="text-xs text-[#4b5563] mt-1">Browse open roles and submit your first application.</p>
              </div>
              <button
                onClick={() => navigate('/candidate/jobs')}
                className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow shadow-indigo-600/20 transition-all"
              >
                <Briefcase size={14} />
                Browse Jobs
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#252838] flex items-center justify-center">
                <Search size={18} className="text-[#4b5563]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#94a3b8]">No matches</p>
                <p className="text-xs text-[#4b5563] mt-1">Try adjusting your filters.</p>
              </div>
              <button onClick={clearFilters} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#2d3148]">
              {filtered.map((app) => {
                const isInterview = app.status?.toLowerCase() === 'interview'
                return (
                  <li
                    key={app.id}
                    className={clsx(
                      'px-5 py-4 transition-colors group',
                      isInterview
                        ? 'bg-violet-500/5 border-l-2 border-violet-500/40'
                        : 'hover:bg-[#252838]/50 cursor-pointer'
                    )}
                    onClick={isInterview ? undefined : () => navigate(`/candidate/jobs/${app.jobId}`, { state: { from: '/candidate/applications', fromLabel: 'Back to applications' } })}
                  >
                    <div className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p
                          className={clsx(
                            'text-sm font-medium text-white truncate transition-colors',
                            !isInterview && 'group-hover:text-indigo-300'
                          )}
                        >
                          {app.jobTitle ?? 'Untitled Role'}
                        </p>
                        <p className="text-xs text-[#64748b] mt-0.5 flex items-center gap-2 flex-wrap">
                          {app.companyName && <span>{app.companyName}</span>}
                          {app.companyName && app.jobLocation && <span className="text-[#3d4160]">·</span>}
                          {app.jobLocation && <span>{app.jobLocation}</span>}
                          {(app.companyName || app.jobLocation) && app.appliedAt && <span className="text-[#3d4160]">·</span>}
                          {app.appliedAt && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </p>
                      </div>
                      <StatusBadge status={app.status} />
                      {!isInterview && (
                        <ChevronRight size={14} className="text-[#4b5563] group-hover:text-indigo-400 transition-colors shrink-0" />
                      )}
                    </div>
                    {isInterview && (
                      <InterviewActions
                        applicationId={app.id}
                        onRespond={handleInterviewResponse}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </main>
    </div>
  )
}
