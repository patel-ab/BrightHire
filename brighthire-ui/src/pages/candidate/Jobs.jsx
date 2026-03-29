import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, LogOut, Search, Briefcase, MapPin, ChevronRight, AlertCircle, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { getAllJobs } from '../../api/dashboard'

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
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize', s.bg, s.text, s.border)}>
      {seniority ?? 'N/A'}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-5 animate-pulse space-y-3">
      <div className="h-4 bg-[#2d3148] rounded w-2/3" />
      <div className="h-3 bg-[#2d3148] rounded w-1/3" />
      <div className="flex gap-2 mt-2">
        <div className="h-5 bg-[#2d3148] rounded w-14" />
        <div className="h-5 bg-[#2d3148] rounded w-20" />
      </div>
    </div>
  )
}

export default function Jobs() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    getAllJobs()
      .then(setJobs)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const filtered = jobs.filter((j) =>
    j.title?.toLowerCase().includes(search.toLowerCase())
  )

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
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">Open Roles</p>
          <h1 className="text-2xl font-bold text-white">Browse Jobs</h1>
          <p className="text-[#64748b] text-sm mt-1">
            {loading ? 'Loading available roles…' : `${jobs.length} active role${jobs.length !== 1 ? 's' : ''} available`}
          </p>
        </div>

        {/* Search */}
        {!loading && !error && jobs.length > 0 && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#1e2130] border border-[#2d3148] focus-within:border-indigo-500 transition-colors mb-6">
            <Search size={14} className="text-[#4b5563] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title…"
              className="flex-1 bg-transparent text-sm text-white placeholder-[#4b5563] outline-none"
            />
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            Could not load jobs. Please try again later.
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1e2130] border border-[#2d3148] flex items-center justify-center">
              <Briefcase size={20} className="text-[#4b5563]" />
            </div>
            <p className="text-sm font-medium text-[#94a3b8]">
              {search ? `No jobs match "${search}"` : 'No open roles right now'}
            </p>
            <p className="text-xs text-[#4b5563]">Check back soon — new roles are posted regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((job) => (
              <button
                key={job.id}
                onClick={() => navigate(`/candidate/jobs/${job.id}`)}
                className="group text-left bg-[#1e2130] border border-[#2d3148] rounded-xl p-5 hover:border-indigo-500/50 hover:bg-[#252838] transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Briefcase size={16} className="text-indigo-400" />
                  </div>
                  <ChevronRight size={15} className="text-[#4b5563] mt-0.5 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>

                <p className="text-sm font-semibold text-white leading-snug mb-1 line-clamp-2">{job.title}</p>

                {job.companyName && (
                  <p className="text-xs text-[#64748b] mb-2">{job.companyName}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <SeniorityBadge seniority={job.seniority} />
                  {job.location && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#64748b]">
                      <MapPin size={11} />
                      {job.location}
                    </span>
                  )}
                </div>

                {job.requiredSkills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.requiredSkills.slice(0, 3).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 rounded-md bg-[#252838] border border-[#2d3148] text-xs text-[#94a3b8]">
                        {skill}
                      </span>
                    ))}
                    {job.requiredSkills.length > 3 && (
                      <span className="px-2 py-0.5 rounded-md bg-[#252838] border border-[#2d3148] text-xs text-[#64748b]">
                        +{job.requiredSkills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
