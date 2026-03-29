import { Zap } from 'lucide-react'

export default function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40 animate-pulse">
          <Zap size={22} className="text-white" fill="white" />
        </div>
        <p className="text-[#94a3b8] text-sm">Loading…</p>
      </div>
    </div>
  )
}
