import { useEffect, useState } from 'react'
import { Briefcase, FileText, ChevronRight, AlertCircle, LogOut, Zap, Clock, UserCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getApplicationsByUser, getCandidateProfile } from '../../api/dashboard'

// ─── STATUS BADGE ─────────────────────────────────────────

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

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status?.toLowerCase()] ?? {
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
      <div className="h-4 bg-[#2d3148] rounded w-1/3" />
      <div className="h-5 bg-[#2d3148] rounded w-16 ml-auto" />
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────

export default function CandidateHome() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [applications, setApplications] = useState([])
  const [profile, setProfile] = useState(null)
  const [appsLoading, setAppsLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [appsError, setAppsError] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    getApplicationsByUser(user.id)
      .then((data) => setApplications(data))
      .catch(() => setAppsError(true))
      .finally(() => setAppsLoading(false))

    getCandidateProfile()
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false))
  }, [user?.id])

  const firstName = user?.fullName?.split(' ')[0] ?? 'there'
  const recentApps = applications.slice(0, 5)

  return (
    <div className="min-h-screen bg-[#0f1117]">

      {/* ── Top nav ── */}
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

      {/* ── Page body ── */}
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Welcome */}
        <div>
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">Candidate Dashboard</p>
          <h1 className="text-2xl font-bold text-white">Welcome back, {firstName}</h1>
          <p className="text-[#64748b] text-sm mt-1">Here's a snapshot of your job search activity.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SummaryCard
            icon={Briefcase}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-400"
            label="Total Applications"
            value={applications.length}
            loading={appsLoading}
          />
          <ProfileCard profile={profile} loading={profileLoading} onClick={() => navigate('/candidate/profile')} />
        </div>

        {/* Recent applications */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Recent Applications</h2>
            {applications.length > 5 && (
              <button
                onClick={() => navigate('/candidate/applications')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight size={12} />
              </button>
            )}
          </div>

          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl overflow-hidden">
            {appsLoading ? (
              <div className="divide-y divide-[#2d3148]">
                {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : appsError ? (
              <ErrorState message="Could not load applications." />
            ) : recentApps.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No applications yet"
                subtitle="Browse open roles and apply — your applications will appear here."
              />
            ) : (
              <ul className="divide-y divide-[#2d3148]">
                {recentApps.map((app) => (
                  <li
                    key={app.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#252838]/50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/candidate/jobs/${app.jobId}`, { state: { from: '/candidate', fromLabel: 'Back to dashboard' } })}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">{app.jobTitle ?? 'Untitled Role'}</p>
                      <p className="text-xs text-[#64748b] mt-0.5 flex items-center gap-1">
                        <Clock size={11} />
                        {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <CtaButton label="Browse Jobs" icon={Briefcase} primary onClick={() => navigate('/candidate/jobs')} />
          <CtaButton label="My Applications" icon={FileText} onClick={() => navigate('/candidate/applications')} />
        </div>

      </main>
    </div>
  )
}

// ─── PROFILE CARD ─────────────────────────────────────────
// Completion = 8 fields. Mirrors the Profile page calculation.
// Clickable — navigates to /candidate/profile.

function ProfileCard({ profile, loading, onClick }) {
  const checks = profile ? [
    !!profile.fullName,
    !!profile.email,
    !!profile.headline,
    !!profile.phone,
    !!profile.location,
    typeof profile.yearsOfExperience === 'number',
    !!profile.summary,
    profile.skills?.length > 0,
    !!profile.linkedinUrl,
    !!profile.githubUrl,
    !!profile.portfolioUrl,
  ] : []
  const pct = loading ? null : Math.round((checks.filter(Boolean).length / 11) * 100)

  const barColor = pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-yellow-500'

  return (
    <button
      onClick={onClick}
      className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-5 flex items-center gap-4 hover:border-indigo-500/50 hover:bg-[#252838] transition-all text-left w-full"
    >
      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
        <UserCircle2 size={18} className="text-indigo-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider">Profile</p>
        {loading ? (
          <div className="mt-2 space-y-1.5">
            <div className="h-3 w-16 rounded bg-[#2d3148] animate-pulse" />
            <div className="h-1.5 w-full rounded-full bg-[#2d3148] animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-white mt-0.5">{pct}%</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#2d3148] overflow-hidden">
              <div className={clsx('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </button>
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
          ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow shadow-indigo-600/20'
          : 'bg-[#1e2130] hover:bg-[#252838] text-[#94a3b8] hover:text-white border-[#2d3148] hover:border-[#3d4160]'
      )}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}
