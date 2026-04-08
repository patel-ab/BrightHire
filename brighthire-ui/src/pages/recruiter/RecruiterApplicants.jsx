import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Zap, LogOut, ArrowLeft, Users, AlertCircle, Loader2,
  Search, X, ChevronDown, MapPin, Briefcase, Link2,
  Github, ExternalLink, FileText, Star, Clock, Phone,
  UserCircle2, SlidersHorizontal, CheckCircle
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { getApplicants, getResumeSignedUrl, recruiterUpdateStatus, closeJob } from '../../api/dashboard'

// ─── APPLICATION STATUS BADGE ─────────────────────────────

const APP_STATUS_STYLES = {
  applied:             { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20'    },
  reviewing:           { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20'  },
  shortlisted:         { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20'  },
  interview:           { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20'  },
  interview_accepted:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  interview_rejected:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20'  },
  rejected:            { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20'     },
  withdrawn:           { bg: 'bg-[#2d3148]/60',   text: 'text-[#64748b]',   border: 'border-[#2d3148]'      },
}

// Statuses the recruiter can act from (non-terminal)
const RECRUITER_ACTIONABLE = ['applied', 'reviewing', 'shortlisted', 'interview']

const STATUS_LABELS = {
  applied:            'Applied',
  reviewing:          'Reviewing',
  shortlisted:        'Shortlisted',
  interview:          'Interview',
  interview_accepted: 'Accepted',
  interview_rejected: 'Declined',
  rejected:           'Rejected',
  withdrawn:          'Withdrawn',
}

function AppStatusBadge({ status }) {
  const key = status?.toLowerCase()
  const s = APP_STATUS_STYLES[key] ?? {
    bg: 'bg-[#2d3148]/60', text: 'text-[#94a3b8]', border: 'border-[#2d3148]',
  }
  const label = STATUS_LABELS[key] ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown')
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', s.bg, s.text, s.border)}>
      {label}
    </span>
  )
}

// ─── SCORE BAR ────────────────────────────────────────────

function ScoreBar({ score }) {
  if (score == null) return <span className="text-xs text-[#4b5563]">Not ranked</span>
  const pct = Math.min(Math.round(Number(score) * 100), 100)
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : pct >= 30 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-[#2d3148] overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-[#94a3b8]">{pct}%</span>
    </div>
  )
}

// ─── SKELETON ROW ─────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-[#2d3148] shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-[#2d3148] rounded w-1/3" />
        <div className="h-3 bg-[#2d3148] rounded w-1/4" />
      </div>
      <div className="h-3 bg-[#2d3148] rounded w-16" />
      <div className="h-5 bg-[#2d3148] rounded w-14" />
    </div>
  )
}

// ─── SELECT FILTER ────────────────────────────────────────

function SelectFilter({ value, onChange, options, className }) {
  return (
    <div className={clsx('relative', className)}>
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

// ─── CANDIDATE DRAWER ─────────────────────────────────────

function CandidateDrawer({ applicant, onClose, onStatusChange }) {
  const [resumeLoading, setResumeLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // 'shortlisted'|'interview'|'rejected'
  const [actionError, setActionError]     = useState(null)

  const handleViewResume = async () => {
    if (!applicant?.resumeId) return
    setResumeLoading(true)
    try {
      const url = await getResumeSignedUrl(applicant.resumeId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // ignore
    } finally {
      setResumeLoading(false)
    }
  }

  const handleAction = async (newStatus) => {
    setActionLoading(newStatus)
    setActionError(null)
    try {
      const updated = await recruiterUpdateStatus(applicant.applicationId, newStatus)
      onStatusChange(applicant.applicationId, updated.status)
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Action failed. Please try again.'
      setActionError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  if (!applicant) return null

  const currentStatus = applicant.applicationStatus?.toLowerCase()
  const canAct = RECRUITER_ACTIONABLE.includes(currentStatus)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#13151f] border-l border-[#2d3148] flex flex-col shadow-2xl shadow-black/60 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d3148] shrink-0">
          <span className="text-sm font-semibold text-white">Candidate Profile</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-white transition-colors"
          >
            <X size={14} /> Close
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Identity */}
          <div className="flex items-start gap-4">
            {applicant.avatarUrl
              ? <img src={applicant.avatarUrl} alt="" className="w-14 h-14 rounded-2xl ring-2 ring-[#2d3148] object-cover shrink-0" />
              : <div className="w-14 h-14 rounded-2xl bg-[#1e2130] border border-[#2d3148] flex items-center justify-center shrink-0">
                  <UserCircle2 size={24} className="text-[#4b5563]" />
                </div>
            }
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">{applicant.fullName}</h2>
              {applicant.headline && <p className="text-sm text-indigo-300 mt-0.5">{applicant.headline}</p>}
              <p className="text-xs text-[#64748b] mt-1">{applicant.email}</p>
            </div>
          </div>

          {/* Application metadata */}
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Application</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-[#64748b] mb-1">Status</p>
                <AppStatusBadge status={applicant.applicationStatus} />
              </div>
              <div>
                <p className="text-xs text-[#64748b] mb-1">AI Match Score</p>
                <ScoreBar score={applicant.nlpScore} />
              </div>
              <div>
                <p className="text-xs text-[#64748b] mb-1">Applied</p>
                <p className="text-xs text-[#94a3b8]">
                  {applicant.appliedAt
                    ? new Date(applicant.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </p>
              </div>
              {applicant.resumeId && (
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Resume</p>
                  <button
                    onClick={handleViewResume}
                    disabled={resumeLoading}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resumeLoading
                      ? <Loader2 size={12} className="animate-spin" />
                      : <FileText size={12} />
                    }
                    {resumeLoading ? 'Loading…' : 'View PDF'}
                    {!resumeLoading && applicant.resumeFileSizeKb && (
                      <span className="text-[#4b5563]">· {applicant.resumeFileSizeKb} KB</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* About */}
          {(applicant.location || applicant.yearsOfExperience != null || applicant.phone || applicant.summary) && (
            <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">About</p>
              <div className="space-y-2 text-sm text-[#94a3b8]">
                {applicant.location && (
                  <p className="flex items-center gap-2">
                    <MapPin size={13} className="text-[#4b5563] shrink-0" />
                    {applicant.location}
                  </p>
                )}
                {applicant.yearsOfExperience != null && (
                  <p className="flex items-center gap-2">
                    <Briefcase size={13} className="text-[#4b5563] shrink-0" />
                    {applicant.yearsOfExperience} year{applicant.yearsOfExperience !== 1 ? 's' : ''} of experience
                  </p>
                )}
                {applicant.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={13} className="text-[#4b5563] shrink-0" />
                    {applicant.phone}
                  </p>
                )}
              </div>
              {applicant.summary && (
                <p className="text-sm text-[#64748b] leading-relaxed border-t border-[#2d3148] pt-3 mt-1">
                  {applicant.summary}
                </p>
              )}
            </div>
          )}

          {/* Skills */}
          {applicant.skills?.length > 0 && (
            <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Skills</p>
              <div className="flex flex-wrap gap-2">
                {applicant.skills.map((skill) => (
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

          {/* Links */}
          {(applicant.linkedinUrl || applicant.githubUrl || applicant.portfolioUrl) && (
            <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Links</p>
              <div className="space-y-2">
                {applicant.linkedinUrl && (
                  <a href={applicant.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors truncate">
                    <Link2 size={13} className="shrink-0" />
                    <span className="truncate">LinkedIn</span>
                    <ExternalLink size={11} className="shrink-0 opacity-60" />
                  </a>
                )}
                {applicant.githubUrl && (
                  <a href={applicant.githubUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors truncate">
                    <Github size={13} className="shrink-0" />
                    <span className="truncate">GitHub</span>
                    <ExternalLink size={11} className="shrink-0 opacity-60" />
                  </a>
                )}
                {applicant.portfolioUrl && (
                  <a href={applicant.portfolioUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors truncate">
                    <ExternalLink size={13} className="shrink-0" />
                    <span className="truncate">Portfolio</span>
                    <ExternalLink size={11} className="shrink-0 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Sticky action footer ── */}
        {canAct && (
          <div className="shrink-0 border-t border-[#2d3148] px-6 py-4 bg-[#13151f] space-y-3">
            {actionError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />{actionError}
              </p>
            )}
            <div className="flex gap-2.5">
              {currentStatus !== 'shortlisted' && currentStatus !== 'interview' && (
                <button
                  onClick={() => handleAction('shortlisted')}
                  disabled={actionLoading != null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {actionLoading === 'shortlisted' ? <Loader2 size={13} className="animate-spin" /> : null}
                  Shortlist
                </button>
              )}
              {currentStatus !== 'interview' && (
                <button
                  onClick={() => handleAction('interview')}
                  disabled={actionLoading != null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-violet-600 border border-violet-500 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow shadow-violet-600/20"
                >
                  {actionLoading === 'interview' ? <Loader2 size={13} className="animate-spin" /> : null}
                  Invite to Interview
                </button>
              )}
              <button
                onClick={() => handleAction('rejected')}
                disabled={actionLoading != null}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#1e2130] border border-[#2d3148] text-[#64748b] hover:text-red-400 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {actionLoading === 'rejected' ? <Loader2 size={13} className="animate-spin" /> : null}
                Reject
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────

export default function RecruiterApplicants() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { jobId } = useParams()
  const location = useLocation()
  const jobTitle = location.state?.jobTitle ?? 'Job'

  const [applicants, setApplicants] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [selected, setSelected]     = useState(null) // applicant in drawer
  const [closing, setClosing]       = useState(false)

  const handleCloseJob = async () => {
    setClosing(true)
    try {
      await closeJob(jobId)
      navigate('/recruiter', { state: { closedJobTitle: jobTitle } })
    } catch {
      setClosing(false)
    }
  }

  // Called by drawer after a successful status update — updates both list and open drawer
  const handleStatusChange = (applicationId, newStatus) => {
    setApplicants((prev) =>
      prev.map((a) =>
        a.applicationId === applicationId
          ? { ...a, applicationStatus: newStatus }
          : a
      )
    )
    setSelected((prev) =>
      prev?.applicationId === applicationId
        ? { ...prev, applicationStatus: newStatus }
        : prev
    )
  }

  // Filters
  const [search, setSearch]         = useState('')
  const [locationFilter, setLoc]    = useState('')
  const [minScore, setMinScore]     = useState('')
  const [minYoe, setMinYoe]         = useState('')

  useEffect(() => {
    if (!jobId) return
    getApplicants(jobId)
      .then(setApplicants)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [jobId])

  // Unique locations from data
  const locationOptions = useMemo(() => {
    const locs = [...new Set(applicants.map((a) => a.location).filter(Boolean))].sort()
    return [{ value: '', label: 'All Locations' }, ...locs.map((l) => ({ value: l, label: l }))]
  }, [applicants])

  const filtered = useMemo(() => {
    return applicants.filter((a) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!a.fullName?.toLowerCase().includes(q) && !a.headline?.toLowerCase().includes(q)) return false
      }
      if (locationFilter && a.location !== locationFilter) return false
      if (minScore !== '') {
        const threshold = Number(minScore) / 100
        const score = a.nlpScore != null ? Number(a.nlpScore) : -1
        if (score < threshold) return false
      }
      if (minYoe !== '') {
        const yoe = a.yearsOfExperience ?? -1
        if (yoe < Number(minYoe)) return false
      }
      return true
    })
  }, [applicants, search, locationFilter, minScore, minYoe])

  const hasFilters = search || locationFilter || minScore !== '' || minYoe !== ''

  const clearFilters = () => { setSearch(''); setLoc(''); setMinScore(''); setMinYoe('') }

  return (
    <div className="min-h-screen bg-[#0f1117]">

      {/* Nav */}
      <header className="border-b border-[#2d3148]/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center shadow shadow-indigo-600/30">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">BrightHire</span>
          {user?.companyName && (
            <span className="hidden sm:inline text-xs text-[#4b5563] border-l border-[#2d3148] pl-3 ml-1">
              {user.companyName}
            </span>
          )}
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
            onClick={() => navigate('/recruiter')}
            className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors mb-5"
          >
            <ArrowLeft size={13} />
            Back to dashboard
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-widest mb-1">Applicants</p>
              <h1 className="text-2xl font-bold text-white truncate">{jobTitle}</h1>
              <p className="text-[#64748b] text-sm mt-1">
                {loading
                  ? 'Loading applicants…'
                  : hasFilters
                    ? `${filtered.length} of ${applicants.length} applicant${applicants.length !== 1 ? 's' : ''}`
                    : `${applicants.length} applicant${applicants.length !== 1 ? 's' : ''} total`
                }
              </p>
            </div>
            <button
              onClick={handleCloseJob}
              disabled={closing}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-emerald-500 shadow shadow-emerald-600/20 transition-all"
            >
              {closing
                ? <Loader2 size={14} className="animate-spin" />
                : <CheckCircle size={14} />
              }
              {closing ? 'Closing…' : 'Recruitment Complete'}
            </button>
          </div>
        </div>

        {/* Filters */}
        {!loading && !error && applicants.length > 0 && (
          <div className="space-y-3 mb-5">
            {/* Search */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#1e2130] border border-[#2d3148] focus-within:border-indigo-500 transition-colors">
              <Search size={14} className="text-[#4b5563] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or headline…"
                className="flex-1 bg-transparent text-sm text-white placeholder-[#4b5563] outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[#4b5563] hover:text-[#94a3b8] transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdowns + range inputs */}
            <div className="flex flex-wrap gap-2 items-center">
              <SlidersHorizontal size={13} className="text-[#4b5563] shrink-0" />

              {/* Location */}
              <SelectFilter
                value={locationFilter}
                onChange={setLoc}
                options={locationOptions}
                className="flex-1 min-w-[160px]"
              />

              {/* Min score — free-form 0-100 */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[140px] px-3 py-2.5 rounded-xl bg-[#1e2130] border border-[#2d3148] focus-within:border-indigo-500 transition-colors">
                <Star size={13} className="text-[#4b5563] shrink-0" />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) setMinScore(v)
                  }}
                  placeholder="Min score %"
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#4b5563] outline-none w-0"
                />
                {minScore !== '' && (
                  <button onClick={() => setMinScore('')} className="text-[#4b5563] hover:text-[#94a3b8] transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Min YoE — free-form */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[140px] px-3 py-2.5 rounded-xl bg-[#1e2130] border border-[#2d3148] focus-within:border-indigo-500 transition-colors">
                <Briefcase size={13} className="text-[#4b5563] shrink-0" />
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={minYoe}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || (Number(v) >= 0 && Number(v) <= 50)) setMinYoe(v)
                  }}
                  placeholder="Min years exp."
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#4b5563] outline-none w-0"
                />
                {minYoe !== '' && (
                  <button onClick={() => setMinYoe('')} className="text-[#4b5563] hover:text-[#94a3b8] transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-[#1e2130] border border-[#2d3148] text-[#64748b] hover:text-white hover:border-[#3d4160] transition-all whitespace-nowrap"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[#2d3148]">
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 px-5 py-5 text-sm text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              Could not load applicants. Please try again.
            </div>
          ) : applicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#252838] flex items-center justify-center">
                <Users size={18} className="text-[#4b5563]" />
              </div>
              <p className="text-sm font-medium text-[#94a3b8]">No applicants yet</p>
              <p className="text-xs text-[#4b5563]">Applications will appear here once candidates apply.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#252838] flex items-center justify-center">
                <Search size={18} className="text-[#4b5563]" />
              </div>
              <p className="text-sm font-medium text-[#94a3b8]">No matches</p>
              <button onClick={clearFilters} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-[#2d3148] bg-[#171923]">
                <span className="text-xs font-medium text-[#4b5563] uppercase tracking-wider">Candidate</span>
                <span className="text-xs font-medium text-[#4b5563] uppercase tracking-wider text-right">Score</span>
                <span className="text-xs font-medium text-[#4b5563] uppercase tracking-wider text-right">Status</span>
                <span className="text-xs font-medium text-[#4b5563] uppercase tracking-wider text-right">Applied</span>
              </div>
              <ul className="divide-y divide-[#2d3148]">
                {filtered.map((applicant) => (
                  <li
                    key={applicant.applicationId}
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#252838]/60 transition-colors cursor-pointer group"
                    onClick={() => setSelected(applicant)}
                  >
                    {/* Name + meta */}
                    <div className="flex items-center gap-3 min-w-0">
                      {applicant.avatarUrl
                        ? <img src={applicant.avatarUrl} alt="" className="w-8 h-8 rounded-full ring-1 ring-[#2d3148] shrink-0 object-cover" />
                        : <div className="w-8 h-8 rounded-full bg-[#252838] border border-[#2d3148] flex items-center justify-center shrink-0">
                            <UserCircle2 size={16} className="text-[#4b5563]" />
                          </div>
                      }
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                          {applicant.fullName}
                        </p>
                        <p className="text-xs text-[#64748b] truncate">
                          {applicant.headline ?? applicant.location ?? applicant.email}
                        </p>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="hidden sm:flex justify-end">
                      <ScoreBar score={applicant.nlpScore} />
                    </div>

                    {/* Status */}
                    <div className="flex justify-end">
                      <AppStatusBadge status={applicant.applicationStatus} />
                    </div>

                    {/* Applied date */}
                    <div className="hidden sm:flex justify-end">
                      <span className="text-xs text-[#64748b] flex items-center gap-1 whitespace-nowrap">
                        <Clock size={11} />
                        {applicant.appliedAt
                          ? new Date(applicant.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>

      {/* Candidate detail drawer */}
      <CandidateDrawer
        applicant={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
