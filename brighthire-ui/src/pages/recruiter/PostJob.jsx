import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, LogOut, ArrowLeft, Plus, X, CheckCircle2, AlertCircle, Loader2, ChevronDown, Search } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { createJob } from '../../api/dashboard'
import { US_CITIES } from '../../data/locations'
import { SKILLS } from '../../data/skills'

const SENIORITIES = ['junior', 'mid', 'senior', 'lead']
const SENIORITY_LABEL = { junior: 'Junior', mid: 'Mid-level', senior: 'Senior', lead: 'Lead' }

// ─── SHARED FIELD PRIMITIVES ──────────────────────────────

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  )
}

function Input({ error, className, ...props }) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border text-sm text-white placeholder-[#4b5563] outline-none transition-colors',
        error ? 'border-red-500/60 focus:border-red-500' : 'border-[#2d3148] focus:border-indigo-500',
        className
      )}
    />
  )
}

function Textarea({ error, ...props }) {
  return (
    <textarea
      {...props}
      className={clsx(
        'w-full px-3.5 py-2.5 rounded-xl bg-[#0f1117] border text-sm text-white placeholder-[#4b5563] outline-none transition-colors resize-none',
        error ? 'border-red-500/60 focus:border-red-500' : 'border-[#2d3148] focus:border-indigo-500'
      )}
    />
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-red-400">{message}</p>
}

// ─── LOCATION COMBOBOX ────────────────────────────────────

function LocationCombobox({ value, onChange, disabled }) {
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const containerRef          = useRef(null)
  const inputRef              = useRef(null)

  const filtered = query.trim()
    ? US_CITIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : US_CITIES

  // Close on outside click
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
          className="flex-1 bg-transparent text-white placeholder-[#4b5563] outline-none"
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

// ─── SKILLS MULTI-SELECT ──────────────────────────────────

function SkillsSelect({ selected, onChange, disabled }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef(null)
  const inputRef            = useRef(null)

  const filtered = query.trim()
    ? SKILLS.filter(
        (s) =>
          s.toLowerCase().includes(query.toLowerCase()) &&
          !selected.includes(s)
      )
    : SKILLS.filter((s) => !selected.includes(s))

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const add = (skill) => {
    onChange([...selected, skill])
    setQuery('')
    inputRef.current?.focus()
  }

  const remove = (skill) => onChange(selected.filter((s) => s !== skill))

  return (
    <div ref={containerRef} className={clsx('relative', disabled && 'opacity-50 pointer-events-none')}>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-medium"
            >
              {skill}
              <button
                type="button"
                onClick={() => remove(skill)}
                className="text-indigo-400 hover:text-indigo-200 transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div
        className={clsx(
          'flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0f1117] border text-sm transition-colors',
          open ? 'border-indigo-500' : 'border-[#2d3148]'
        )}
      >
        <Search size={14} className="text-[#4b5563] shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search skills…"
          className="flex-1 bg-transparent text-white placeholder-[#4b5563] outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="text-[#4b5563] hover:text-[#94a3b8] transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <ul className="absolute z-50 mt-1.5 w-full max-h-52 overflow-y-auto rounded-xl bg-[#1e2130] border border-[#2d3148] shadow-xl shadow-black/40 py-1">
          {filtered.length > 0
            ? filtered.map((skill) => (
                <li
                  key={skill}
                  onMouseDown={() => add(skill)}
                  className="px-3.5 py-2.5 text-sm text-[#cbd5e1] hover:bg-[#252838] hover:text-white cursor-pointer transition-colors"
                >
                  {skill}
                </li>
              ))
            : (
              <li className="px-4 py-3 text-sm text-[#4b5563]">
                {query ? `No results for "${query}"` : 'All skills selected'}
              </li>
            )
          }
        </ul>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────

const EMPTY_FORM = {
  title: '',
  description: '',
  location: '',
  seniority: '',
  requiredSkills: [],
}

export default function PostJob() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]           = useState(EMPTY_FORM)
  const [errors, setErrors]       = useState({})
  const [submitState, setSubmitState] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [serverError, setServerError] = useState(null)

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim())       e.title       = 'Job title is required.'
    if (!form.description.trim()) e.description = 'Job description is required.'
    if (!form.seniority)          e.seniority   = 'Please select a seniority level.'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length > 0) { setErrors(e2); return }

    setSubmitState('loading')
    setServerError(null)

    try {
      await createJob({
        companyId:      user.companyId,
        postedById:     user.id,
        title:          form.title.trim(),
        description:    form.description.trim(),
        location:       form.location || null,
        seniority:      form.seniority,
        requiredSkills: form.requiredSkills,
      })
      setSubmitState('success')
      setTimeout(() => navigate('/recruiter', { replace: true }), 1800)
    } catch (err) {
      setSubmitState('error')
      const msg = err?.response?.data?.message ?? err?.response?.data ?? null
      setServerError(typeof msg === 'string' ? msg : 'Something went wrong. Please try again.')
    }
  }

  const isLoading = submitState === 'loading'
  const isSuccess = submitState === 'success'

  return (
    <div className="min-h-screen bg-[#0f1117]">

      {/* ── Nav ── */}
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
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-2xl mx-auto px-6 py-10">

        {/* Back + heading */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/recruiter')}
            className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors mb-5"
          >
            <ArrowLeft size={13} />
            Back to dashboard
          </button>
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-widest mb-1">New Listing</p>
          <h1 className="text-2xl font-bold text-white">Post a Job</h1>
          <p className="text-[#64748b] text-sm mt-1">Fill in the details below. The role will go live immediately after posting.</p>
        </div>

        {/* Success banner */}
        {isSuccess && (
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Job posted successfully! Redirecting to your dashboard…</span>
          </div>
        )}

        {/* Server error banner */}
        {submitState === 'error' && serverError && (
          <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-2xl p-6 space-y-6">

            {/* Title */}
            <div>
              <Label required>Job Title</Label>
              <Input
                type="text"
                placeholder="e.g. Senior Backend Engineer"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                error={errors.title}
                disabled={isLoading || isSuccess}
              />
              <FieldError message={errors.title} />
            </div>

            {/* Seniority */}
            <div>
              <Label required>Seniority</Label>
              <div className="grid grid-cols-4 gap-2">
                {SENIORITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isLoading || isSuccess}
                    onClick={() => set('seniority', s)}
                    className={clsx(
                      'py-2.5 rounded-xl text-sm font-medium border transition-all duration-150',
                      form.seniority === s
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow shadow-indigo-600/20'
                        : 'bg-[#0f1117] border-[#2d3148] text-[#64748b] hover:border-[#3d4160] hover:text-[#94a3b8]'
                    )}
                  >
                    {SENIORITY_LABEL[s]}
                  </button>
                ))}
              </div>
              <FieldError message={errors.seniority} />
            </div>

            {/* Location */}
            <div>
              <Label>Location</Label>
              <LocationCombobox
                value={form.location}
                onChange={(v) => set('location', v)}
                disabled={isLoading || isSuccess}
              />
            </div>

            {/* Required Skills */}
            <div>
              <Label>Required Skills</Label>
              <SkillsSelect
                selected={form.requiredSkills}
                onChange={(skills) => set('requiredSkills', skills)}
                disabled={isLoading || isSuccess}
              />
            </div>

            {/* Description */}
            <div>
              <Label required>Job Description</Label>
              <Textarea
                rows={7}
                placeholder="Describe the role, responsibilities, requirements, and what makes this opportunity compelling…"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                error={errors.description}
                disabled={isLoading || isSuccess}
              />
              <FieldError message={errors.description} />
            </div>

          </div>

          {/* Submit */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => navigate('/recruiter')}
              disabled={isLoading || isSuccess}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#1e2130] border border-[#2d3148] text-[#94a3b8] hover:text-white hover:border-[#3d4160] transition-all disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow shadow-emerald-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 size={15} className="animate-spin" /> Posting…</>
              ) : isSuccess ? (
                <><CheckCircle2 size={15} /> Posted!</>
              ) : (
                <><Plus size={15} /> Post Job</>
              )}
            </button>
          </div>
        </form>

      </main>
    </div>
  )
}
