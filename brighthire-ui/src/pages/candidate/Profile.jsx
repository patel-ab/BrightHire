import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, LogOut, ArrowLeft, User, MapPin, Link2, Briefcase,
  Phone, FileText, CheckCircle2, AlertCircle, Loader2, X, Search,
  Save, ChevronDown, Upload, Eye, EyeOff
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { getCandidateProfile, upsertCandidateProfile, uploadResume } from '../../api/dashboard'
import { SKILLS } from '../../data/skills'
import { US_CITIES } from '../../data/locations'

// ─── COMPLETION ───────────────────────────────────────────
// 11 tracked fields. Rounded to nearest whole.

function calcCompletion(profile) {
  if (!profile) return 0
  const checks = [
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
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

// ─── FIELD PRIMITIVES ─────────────────────────────────────

function Label({ children }) {
  return (
    <label className="block text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-1.5">
      {children}
    </label>
  )
}

function Field({ label, value, placeholder, name, onChange, type = 'text', disabled }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#2d3148] focus:border-indigo-500 text-sm text-white placeholder-[#4b5563] outline-none transition-colors disabled:opacity-50"
      />
    </div>
  )
}

function TextareaField({ label, value, placeholder, name, onChange, disabled }) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#2d3148] focus:border-indigo-500 text-sm text-white placeholder-[#4b5563] outline-none transition-colors resize-none disabled:opacity-50"
      />
    </div>
  )
}

// ─── LOCATION COMBOBOX ────────────────────────────────────

function LocationCombobox({ value, onChange, disabled }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const containerRef      = useRef(null)
  const inputRef          = useRef(null)

  const filtered = query.trim()
    ? US_CITIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : US_CITIES

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (city) => {
    onChange(city)
    setQuery('')
    setOpen(false)
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    inputRef.current?.focus()
  }

  const displayValue = open ? query : (value || query)

  return (
    <div ref={containerRef} className="relative">
      <div
        className={clsx(
          'flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0f1117] border text-sm transition-colors',
          open ? 'border-indigo-500' : 'border-[#2d3148]',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search city…"
          className="flex-1 bg-transparent text-white placeholder-[#4b5563] outline-none text-sm"
        />
        {value && !open
          ? <button type="button" onClick={clear} className="text-[#4b5563] hover:text-[#94a3b8] transition-colors"><X size={14} /></button>
          : <ChevronDown size={14} className={clsx('text-[#4b5563] transition-transform', open && 'rotate-180')} />
        }
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1.5 w-full max-h-52 overflow-y-auto rounded-xl bg-[#1e2130] border border-[#2d3148] shadow-xl shadow-black/40 py-1">
          {filtered.map((city) => (
            <li
              key={city}
              onMouseDown={() => select(city)}
              className={clsx(
                'px-3.5 py-2.5 text-sm cursor-pointer transition-colors',
                city === value
                  ? 'text-indigo-300 bg-indigo-500/10'
                  : 'text-[#cbd5e1] hover:bg-[#252838]'
              )}
            >
              {city}
            </li>
          ))}
        </ul>
      )}

      {open && filtered.length === 0 && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-[#1e2130] border border-[#2d3148] shadow-xl shadow-black/40 px-4 py-3 text-sm text-[#4b5563]">
          No cities match "{query}"
        </div>
      )}
    </div>
  )
}

// ─── SKILLS SELECT ────────────────────────────────────────

function SkillsEditor({ skills, onChange, disabled }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)
  const inputRef          = useRef(null)

  const filtered = SKILLS.filter(
    (s) =>
      s.toLowerCase().includes(query.toLowerCase()) &&
      !skills.includes(s)
  )

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const add = (skill) => { onChange([...skills, skill]); setQuery(''); inputRef.current?.focus() }
  const remove = (skill) => onChange(skills.filter((s) => s !== skill))

  return (
    <div ref={ref} className={clsx(disabled && 'opacity-50 pointer-events-none')}>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {skills.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-medium">
              {s}
              <button type="button" onClick={() => remove(s)} className="text-indigo-400 hover:text-white transition-colors">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <div className={clsx(
          'flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0f1117] border text-sm transition-colors',
          open ? 'border-indigo-500' : 'border-[#2d3148]'
        )}>
          <Search size={13} className="text-[#4b5563] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search and add skills…"
            className="flex-1 bg-transparent text-sm text-white placeholder-[#4b5563] outline-none"
          />
          {query && <button type="button" onClick={() => setQuery('')}><X size={13} className="text-[#4b5563]" /></button>}
        </div>
        {open && (
          <ul className="absolute z-50 mt-1.5 w-full max-h-48 overflow-y-auto rounded-xl bg-[#1e2130] border border-[#2d3148] shadow-xl shadow-black/40 py-1">
            {filtered.length > 0
              ? filtered.map((s) => (
                <li key={s} onMouseDown={() => add(s)} className="px-3.5 py-2.5 text-sm text-[#cbd5e1] hover:bg-[#252838] hover:text-white cursor-pointer transition-colors">
                  {s}
                </li>
              ))
              : <li className="px-4 py-3 text-sm text-[#4b5563]">{query ? `No results for "${query}"` : 'All skills added'}</li>
            }
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── COMPLETION BAR ───────────────────────────────────────

function CompletionBar({ pct }) {
  const color = pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-yellow-500'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#64748b]">Profile completeness</span>
        <span className={clsx('text-xs font-semibold', pct === 100 ? 'text-emerald-400' : pct >= 60 ? 'text-indigo-400' : 'text-yellow-400')}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#2d3148] overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── RESUME SECTION ───────────────────────────────────────

function ResumeSection({ resume, userId, onUploaded }) {
  const fileInputRef             = useRef(null)
  const [uploadState, setUploadState] = useState('idle') // 'idle' | 'uploading' | 'error'
  const [uploadError, setUploadError] = useState(null)
  const [previewUrl, setPreviewUrl]   = useState(null)
  const [localFile, setLocalFile]     = useState(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so the same file can be re-selected
    e.target.value = ''

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are accepted.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File must be under 5 MB.')
      return
    }

    setLocalFile(file)
    setUploadError(null)
    setUploadState('uploading')

    try {
      const data = await uploadResume(userId, file)
      onUploaded(data)
      setUploadState('idle')
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data
      setUploadError(typeof msg === 'string' ? msg : 'Upload failed. Please try again.')
      setUploadState('idle')
      setLocalFile(null)
    }
  }

  const openPreview = () => {
    const url = localFile ? URL.createObjectURL(localFile) : resume?.fileUrl
    if (url) setPreviewUrl(url)
  }

  const closePreview = () => {
    if (localFile && previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  const isUploading = uploadState === 'uploading'

  return (
    <div className="space-y-3">
      {/* Status row */}
      {resume ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          <CheckCircle2 size={15} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Resume uploaded</p>
            {resume.fileSizeKb && (
              <p className="text-xs text-[#64748b] mt-0.5">
                {resume.fileSizeKb} KB · Last updated {new Date(resume.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={openPreview}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
          >
            <Eye size={13} />
            Preview
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400">
          <AlertCircle size={15} className="shrink-0" />
          No resume uploaded yet. Upload your resume to apply for jobs.
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle size={13} className="shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#0f1117] border border-[#2d3148] text-[#94a3b8] hover:border-indigo-500/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading
          ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
          : <><Upload size={13} /> {resume ? 'Replace Resume' : 'Upload Resume'} (PDF, max 5 MB)</>
        }
      </button>

      {/* In-browser PDF preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2d3148] bg-[#1e2130]">
            <span className="text-sm font-medium text-white">Resume Preview</span>
            <button
              type="button"
              onClick={closePreview}
              className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-white transition-colors"
            >
              <X size={14} />
              Close
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <iframe
              src={previewUrl}
              title="Resume Preview"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────

const EMPTY_FORM = {
  phone: '', headline: '', summary: '', location: '',
  yearsOfExperience: '', linkedinUrl: '', githubUrl: '', portfolioUrl: '',
  skills: [],
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile]     = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [loadState, setLoadState] = useState('loading') // 'loading' | 'ready' | 'error'
  const [saveState, setSaveState] = useState('idle')    // 'idle' | 'saving' | 'saved' | 'error'
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    getCandidateProfile()
      .then((data) => {
        setProfile(data)
        setForm({
          phone:             data.phone             ?? '',
          headline:          data.headline          ?? '',
          summary:           data.summary           ?? '',
          location:          data.location          ?? '',
          yearsOfExperience: data.yearsOfExperience ?? '',
          linkedinUrl:       data.linkedinUrl       ?? '',
          githubUrl:         data.githubUrl         ?? '',
          portfolioUrl:      data.portfolioUrl      ?? '',
          skills:            data.skills            ?? [],
        })
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveState('saving')
    setSaveError(null)
    try {
      const payload = {
        ...form,
        yearsOfExperience: form.yearsOfExperience === '' ? null : Number(form.yearsOfExperience),
      }
      const updated = await upsertCandidateProfile(payload)
      setProfile(updated)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveError('Failed to save profile. Please try again.')
      setSaveState('error')
    }
  }

  const liveProfile = profile
    ? { ...profile, ...form, yearsOfExperience: form.yearsOfExperience === '' ? null : Number(form.yearsOfExperience) }
    : null
  const pct = calcCompletion(liveProfile)
  const isSaving = saveState === 'saving'

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

      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* Back */}
        <button onClick={() => navigate('/candidate')} className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors mb-8">
          <ArrowLeft size={13} />Back to dashboard
        </button>

        {/* Loading */}
        {loadState === 'loading' && (
          <div className="flex items-center justify-center py-24 gap-3 text-[#64748b]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading your profile…</span>
          </div>
        )}

        {/* Error */}
        {loadState === 'error' && (
          <div className="flex items-center gap-3 p-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            Could not load your profile. Please try again.
          </div>
        )}

        {/* Ready */}
        {loadState === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Header */}
            <div className="flex items-start gap-5">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-2xl ring-2 ring-[#2d3148] shrink-0 object-cover" />
                : <div className="w-16 h-16 rounded-2xl bg-[#1e2130] border border-[#2d3148] flex items-center justify-center shrink-0">
                    <User size={24} className="text-[#4b5563]" />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-1">Candidate Profile</p>
                <h1 className="text-xl font-bold text-white truncate">{user?.fullName ?? 'Your Profile'}</h1>
                <p className="text-sm text-[#64748b] mt-0.5">{user?.email}</p>
                <div className="mt-3 max-w-xs">
                  <CompletionBar pct={pct} />
                </div>
              </div>
            </div>

            {/* Save feedback */}
            {saveState === 'saved' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                <CheckCircle2 size={15} className="shrink-0" />
                Profile saved successfully.
              </div>
            )}
            {saveState === 'error' && saveError && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                {saveError}
              </div>
            )}

            {/* ── Section: About ── */}
            <div className="bg-[#1e2130] border border-[#2d3148] rounded-2xl p-6 space-y-5">
              <SectionHeading icon={User} label="About" />
              <Field label="Headline" name="headline" value={form.headline} onChange={handleChange} placeholder="e.g. Senior Full-Stack Engineer" disabled={isSaving} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" disabled={isSaving} />
                <div>
                  <Label>Location</Label>
                  <LocationCombobox
                    value={form.location}
                    onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <Label>Years of Experience</Label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  value={form.yearsOfExperience}
                  onChange={handleChange}
                  min={0}
                  max={50}
                  placeholder="e.g. 5"
                  disabled={isSaving}
                  className="w-full sm:w-32 px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-[#2d3148] focus:border-indigo-500 text-sm text-white placeholder-[#4b5563] outline-none transition-colors disabled:opacity-50"
                />
              </div>
              <TextareaField label="Professional Summary" name="summary" value={form.summary} onChange={handleChange} placeholder="A brief overview of your background, strengths, and what you're looking for…" disabled={isSaving} />
            </div>

            {/* ── Section: Links ── */}
            <div className="bg-[#1e2130] border border-[#2d3148] rounded-2xl p-6 space-y-5">
              <SectionHeading icon={Link2} label="Links" />
              <Field label="LinkedIn URL" name="linkedinUrl" value={form.linkedinUrl} onChange={handleChange} placeholder="https://linkedin.com/in/yourname" disabled={isSaving} />
              <Field label="GitHub URL" name="githubUrl" value={form.githubUrl} onChange={handleChange} placeholder="https://github.com/yourname" disabled={isSaving} />
              <Field label="Portfolio / Website" name="portfolioUrl" value={form.portfolioUrl} onChange={handleChange} placeholder="https://yoursite.com" disabled={isSaving} />
            </div>

            {/* ── Section: Skills ── */}
            <div className="bg-[#1e2130] border border-[#2d3148] rounded-2xl p-6 space-y-4">
              <SectionHeading icon={Briefcase} label="Skills" />
              <SkillsEditor skills={form.skills} onChange={(s) => setForm((f) => ({ ...f, skills: s }))} disabled={isSaving} />
            </div>

            {/* ── Section: Resume ── */}
            <div className="bg-[#1e2130] border border-[#2d3148] rounded-2xl p-6 space-y-4">
              <SectionHeading icon={FileText} label="Resume" />
              <ResumeSection
                resume={profile?.resume}
                userId={user?.id}
                onUploaded={(data) => setProfile((p) => ({ ...p, resume: data }))}
              />
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow shadow-indigo-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving
                  ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                  : <><Save size={15} /> Save Profile</>
                }
              </button>
            </div>

          </form>
        )}
      </main>
    </div>
  )
}

// ─── SECTION HEADING ──────────────────────────────────────

function SectionHeading({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-[#2d3148]">
      <Icon size={14} className="text-indigo-400" />
      <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">{label}</span>
    </div>
  )
}
