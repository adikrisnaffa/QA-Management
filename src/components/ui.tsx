import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'

// Warna semantik: success = selesai, info = berjalan, warning = berisiko, danger = terblokir/kritis, neutral = belum mulai
const T = {
  success: ['bg-emerald-50 text-emerald-700 ring-emerald-600/15', 'bg-emerald-500'],
  info: ['bg-sky-50 text-sky-700 ring-sky-600/15', 'bg-sky-500'],
  warning: ['bg-amber-50 text-amber-800 ring-amber-600/20', 'bg-amber-500'],
  danger: ['bg-red-50 text-red-700 ring-red-600/15', 'bg-red-500'],
  neutral: ['bg-slate-100 text-slate-600 ring-slate-500/15', 'bg-slate-400'],
} as const
const tone: Record<string, keyof typeof T> = {
  Completed: 'success', Verified: 'success', Resolved: 'success', 'In Progress': 'info',
  High: 'warning', Delayed: 'warning', 'On Hold': 'warning', 'Ready for Retest': 'warning',
  Blocked: 'danger', Critical: 'danger', Open: 'danger',
}
export const Badge = ({ v }: { v: string }) => {
  const [cls, dot] = T[tone[v] ?? 'neutral']
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}><span className={`size-1.5 rounded-full ${dot}`} aria-hidden />{v}</span>
}

export const Progress = ({ v }: { v: number }) => (
  <div className="flex items-center gap-2.5">
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <div className={`h-full rounded-full transition-[width] duration-500 ${v >= 100 ? 'bg-emerald-500' : 'bg-brand-600'}`} style={{ width: `${v}%` }} />
    </div>
    <span className="w-9 text-xs tabular-nums text-slate-500">{v}%</span>
  </div>
)

export const Card = ({ title, children }: { title?: string; children: ReactNode }) => (
  <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
    {title && <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>}{children}
  </section>
)

const variants = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700 shadow-sm',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'text-red-700 hover:bg-red-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
} as const
export const Button = ({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) => (
  <button {...p} className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-50 ${variants[variant]} ${className}`} />
)

export const PageHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-semibold text-slate-900">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>{action}
  </div>
)

export const State = ({ loading, error, empty, onRetry }: { loading: boolean; error: unknown; empty: boolean; onRetry?: () => void }) => {
  if (loading) return <div className="space-y-2.5" aria-busy="true" aria-label="Memuat data">{[0, 1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" style={{ opacity: 1 - i * 0.2 }} />)}</div>
  if (error) return (
    <div role="alert" className="flex flex-col items-center gap-2 py-10 text-center">
      <AlertTriangle className="text-red-500" size={28} strokeWidth={1.5} />
      <p className="text-sm font-medium text-slate-900">Data gagal dimuat</p>
      <p className="max-w-sm text-sm text-slate-500">{(error as Error).message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Coba lagi</Button>}
    </div>)
  if (empty) return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Inbox className="text-slate-300" size={32} strokeWidth={1.5} />
      <p className="text-sm font-medium text-slate-900">Belum ada data</p>
      <p className="text-sm text-slate-500">Data akan muncul di sini setelah ditambahkan.</p>
    </div>)
  return null
}

export const Table = ({ children }: { children: ReactNode }) => <div className="overflow-x-auto"><table className="w-full text-left text-sm">{children}</table></div>
