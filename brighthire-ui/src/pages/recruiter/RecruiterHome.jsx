import { useEffect, useState } from 'react'
import { Briefcase, Users, AlertCircle, LogOut, Zap, Clock, PlusCircle, Search, ChevronDown, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAllJobsByCompany } from '../../api/dashboard'

// ─── FILTER CONFIG ────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: 'all',    label: 'All Statuses' },
  { value: 'active', label: 'Active'       },
  { value: 'closed', label: 'Closed'       },
]

const STATUS_FILTER_LABELS = Object.fromEntries(
  STATUS_FILTER_OPTIONS.map(({ value, label }) => [value, label])
)

// ─── STATUS BADGE ─────────────────────────────────────────

const JOB_STATUS_STYLES = {
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Active' },
  closed: { bg: 'bg-[#2d3148]/60',   text: 'text-[#64748b]',   border: 'border-[#2d3148]',      label: 'Closed' },
}

function JobStatusBadge({ status }) {
  const s = JOB_STATUS_STYLES[status?.toLowerCase()] ?? {
    bg: 'bg-[#2d3148]/60', text: 'text-[#94a3b8]', border: 'border-[#2d3148]', label: status ?? 'Unknown',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', s.bg, s.text, s.border)}>
      {s.label}
    </span>
  )
}

// ─── SUMMARY CARD ─────────────────────────────────────────

function SummaryCard({ icon: Icon, iconColor, iconBg, label, value, loading }) {
  return (
    <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-5 flex items-center gap-4">
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider">{label}</p>
        {loading
          ? <div className="mt-1 h-6 w-10 rounded bg-[#2d3148] animate-pulse" />
          : <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        }
      </div>
    </div>
  )
}

// ─── SKELETON ROW ─────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      <div className="space-y-1.5 flex-1">
        <div className="h-4 bg-[#2d3148] rounded w-2/5" />
        <div className="h-3 bg-[#2d3148] rounded w-1/4" />
      </div>
      <div className="h-5 bg-[#2d3148] rounded w-14" />
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────

export default function RecruiterHome() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!user?.companyId) { setLoading(false); return }
    getAllJobsByCompany(user.companyId)
      .then((data) => setJobs(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [user?.companyId])

  const firstName = user?.fullName?.split(' ')[0] ?? 'there'
  const activeJobs = jobs.filter((j) => j.status?.toLowerCase() === 'active')

  const filteredJobs = jobs.filter((j) => {
    const matchesName = j.title?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || j.status?.toLowerCase() === statusFilter
    return matchesName && matchesStatus
  })

  return (
    <div className="min-h-screen bg-[#0f1117]">

      {/* ── Top nav ── */}
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

      {/* ── Page body ── */}
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Welcome */}
        <div>
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-widest mb-1">Recruiter Dashboard</p>
          <h1 className="text-2xl font-bold text-white">Welcome back, {firstName}</h1>
          <p className="text-[#64748b] text-sm mt-1">Here's an overview of your hiring activity.</p>
        </div>

        {/* No company warning */}
        {!user?.companyId && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Your account is not linked to a company. Contact support if this is unexpected.</span>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SummaryCard
            icon={Briefcase}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-400"
            label="Total Jobs"
            value={jobs.length}
            loading={loading}
          />
          <SummaryCard
            icon={Users}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-400"
            label="Active Jobs"
            value={activeJobs.length}
            loading={loading}
          />
        </div>

        {/* Jobs section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Your Job Listings</h2>
          </div>

          {/* Filter bar */}
          {!loading && !error && jobs.length > 0 && (
            <div className="flex gap-3 mb-3">
              {/* Name search */}
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1e2130] border border-[#2d3148] focus-within:border-indigo-500 transition-colors">
                <Search size={13} className="text-[#4b5563] shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by job title…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#4b5563] outline-none"
                />
              </div>

              {/* Status dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1e2130] border border-[#2d3148] hover:border-[#3d4160] text-sm text-[#94a3b8] transition-colors whitespace-nowrap"
                >
                  {statusFilter === 'all' ? 'All Statuses' : STATUS_FILTER_LABELS[statusFilter]}
                  <ChevronDown size={13} className={clsx('transition-transform', dropdownOpen && 'rotate-180')} />
                </button>
                {dropdownOpen && (
                  <ul className="absolute right-0 z-50 mt-1.5 w-40 rounded-xl bg-[#1e2130] border border-[#2d3148] shadow-xl shadow-black/40 py-1">
                    {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                      <li
                        key={value}
                        onMouseDown={() => { setStatusFilter(value); setDropdownOpen(false) }}
                        className={clsx(
                          'px-3.5 py-2.5 text-sm cursor-pointer transition-colors',
                          statusFilter === value
                            ? 'text-indigo-300 bg-indigo-500/10'
                            : 'text-[#cbd5e1] hover:bg-[#252838]'
                        )}
                      >
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl overflow-hidden">
            {loading ? (
              <div className="divide-y divide-[#2d3148]">
                {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : error ? (
              <ErrorState message="Could not load job listings." />
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No jobs posted yet"
                subtitle="Post your first role and start receiving AI-ranked candidates."
              />
            ) : filteredJobs.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No jobs match your filters"
                subtitle="Try a different title or status."
              />
            ) : (
              <ul className="divide-y divide-[#2d3148]">
                {filteredJobs.map((job) => (
                  <li key={job.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#252838]/50 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{job.title}</p>
                      <p className="text-xs text-[#64748b] mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {job.createdAt
                            ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </span>
                        {job.location && <span>{job.location}</span>}
                        <span className="flex items-center gap-1 text-indigo-400/70">
                          <Users size={11} />
                          {job.applicationCount ?? 0} applicant{job.applicationCount !== 1 ? 's' : ''}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <JobStatusBadge status={job.status} />
                      <button
                        onClick={() => navigate(`/recruiter/jobs/${job.id}/applicants`, { state: { jobTitle: job.title } })}
                        className="flex items-center gap-1 text-xs text-[#64748b] hover:text-indigo-400 transition-colors"
                        title="View applicants"
                      >
                        <Users size={13} />
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <CtaButton label="Post a Job" icon={PlusCircle} primary onClick={() => navigate('/recruiter/post-job')} />
        </div>

      </main>
    </div>
  )
}

// ─── SHARED SMALL COMPONENTS ──────────────────────────────

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#252838] flex items-center justify-center">
        <Icon size={18} className="text-[#4b5563]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#94a3b8]">{title}</p>
        <p className="text-xs text-[#4b5563] mt-1 max-w-xs">{subtitle}</p>
      </div>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="flex items-center gap-3 px-5 py-5 text-sm text-red-400">
      <AlertCircle size={16} className="shrink-0" />
      {message}
    </div>
  )
}

function CtaButton({ label, icon: Icon, primary = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border',
        primary
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow shadow-emerald-600/20'
          : 'bg-[#1e2130] hover:bg-[#252838] text-[#94a3b8] hover:text-white border-[#2d3148] hover:border-[#3d4160]'
      )}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}
