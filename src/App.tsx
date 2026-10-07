import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Bug, CalendarDays, ChevronRight, Clock, FileBarChart, FolderKanban, GanttChart, History, LayoutDashboard, ListChecks, LogOut, Menu, OctagonAlert, PanelLeftClose, PanelLeftOpen, Presentation, Shield, ShieldCheck, Users } from 'lucide-react'
import { configured, supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Blockers from './pages/Blockers'
import Bugs from './pages/Bugs'
import TaskDetail from './pages/TaskDetail'
import DailyReport from './pages/DailyReport'
import Workload from './pages/Workload'
import Timeline from './pages/Timeline'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Reports from './pages/Reports'
import Management from './pages/Management'
import AuditLog from './pages/AuditLog'
import UsersPage from './pages/Users'
import Attendance from './pages/Attendance'

const groups = [
  { label: 'Workspace', items: [['/dashboard', 'Dashboard', LayoutDashboard], ['/projects', 'Projects', FolderKanban], ['/tasks', 'Tasks', ListChecks], ['/attendance', 'Absensi', Clock], ['/workload', 'Workload', Users], ['/bugs', 'Bugs', Bug], ['/blockers', 'Blockers', OctagonAlert], ['/timeline', 'Timeline', GanttChart]] },
  { label: 'Insight', items: [['/reports', 'Reports', FileBarChart], ['/management', 'Management View', Presentation]] },
  { label: 'Administrasi', items: [['/audit', 'Audit Log', History], ['/users', 'Pengguna', Shield]] },
] as const
const labels: Record<string, string> = {}
groups.forEach(g => g.items.forEach(([to, l]) => { labels[to] = l }))

const Brand = ({ compact }: { compact: boolean }) => (
  <div className={`flex h-14 shrink-0 items-center gap-2.5 border-b px-4 ${compact ? 'justify-center px-0' : ''}`}>
    <span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-white"><ShieldCheck size={18} strokeWidth={1.75} /></span>
    {!compact && <span className="text-[15px] font-semibold text-slate-900">QA Tracker</span>}
  </div>
)

function SideNav({ compact }: { compact: boolean }) {
  return (
    <nav aria-label="Navigasi utama" className={`flex-1 space-y-5 px-3 py-4 ${compact ? '' : 'overflow-y-auto'}`}>
      {groups.map(g => (
        <div key={g.label}>
          {!compact && <p className="mb-1.5 px-3 text-xs font-medium text-slate-400">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map(([to, label, Icon]) => (
              <li key={to}>
                <NavLink to={to} aria-label={label} className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${compact ? 'justify-center' : 'px-3'} ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  {({ isActive }) => (<>
                    <Icon size={18} strokeWidth={1.75} className={isActive ? 'text-brand-600' : ''} />
                    {!compact && <span className="truncate">{label}</span>}
                    {compact && <span role="tooltip" className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-elevated group-hover:block group-focus-visible:block">{label}</span>}
                  </>)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function Shell({ email }: { email: string }) {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false); const [drawer, setDrawer] = useState(false); const [menu, setMenu] = useState(false)
  useEffect(() => { setDrawer(false); setMenu(false) }, [pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawer(false); setMenu(false) } }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [])
  const [root, sub] = pathname.split('/').filter(Boolean)
  const crumbs = ['QA Tracker', labels[`/${root ?? 'dashboard'}`], sub ? 'Detail' : ''].filter(Boolean)
  return (
    <div className="flex min-h-screen">
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-white transition-[width] duration-200 md:flex ${collapsed ? 'w-16' : 'w-60'}`}>
        <Brand compact={collapsed} /><SideNav compact={collapsed} />
        <div className="border-t p-3">
          <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'} className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 ${collapsed ? 'justify-center' : 'px-3'}`}>
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.75} /> : <><PanelLeftClose size={18} strokeWidth={1.75} /><span>Ciutkan</span></>}
          </button>
        </div>
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Tutup menu" className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawer(false)} />
          <aside className="relative flex h-full w-64 animate-slide-in flex-col bg-white shadow-elevated"><Brand compact={false} /><SideNav compact={false} /></aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur md:px-8">
          <button onClick={() => setDrawer(true)} aria-label="Buka menu" className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"><Menu size={20} /></button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 truncate text-sm text-slate-500">
              {crumbs.map((c, i) => <li key={c} className="flex items-center gap-1.5">{i > 0 && <ChevronRight size={14} aria-hidden />}<span className={i === crumbs.length - 1 ? 'font-medium text-slate-900' : ''}>{c}</span></li>)}
            </ol>
          </nav>
          <div className="relative">
            <button onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu} aria-label="Menu pengguna" className="grid size-8 place-items-center rounded-full bg-slate-900 text-xs font-medium text-white hover:bg-slate-700">{(email[0] ?? '?').toUpperCase()}</button>
            {menu && (<>
              <button aria-label="Tutup menu pengguna" tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
              <div role="menu" className="absolute right-0 top-10 z-20 w-60 rounded-xl border bg-white p-1 shadow-elevated">
                <p className="truncate px-3 py-2 text-xs text-slate-500">{email}</p>
                <button role="menuitem" onClick={() => supabase.auth.signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><LogOut size={16} strokeWidth={1.75} />Keluar</button>
              </div>
            </>)}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 p-4 md:p-8">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} /><Route path="/tasks" element={<Tasks />} />
            <Route path="/blockers" element={<Blockers />} /><Route path="/bugs" element={<Bugs />} />
            <Route path="/tasks/:id" element={<TaskDetail />} /><Route path="/daily-report" element={<DailyReport />} /><Route path="/workload" element={<Workload />} /><Route path="/timeline" element={<Timeline />} />
            <Route path="/projects" element={<Projects />} /><Route path="/projects/:id" element={<ProjectDetail />} /><Route path="/reports" element={<Reports />} /><Route path="/management" element={<Management />} />
            <Route path="/audit" element={<AuditLog />} /><Route path="/users" element={<UsersPage />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!configured) return <p className="p-8">Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.</p>
  if (!ready) return null
  if (!session) return <Login />
  return <Shell email={session.user.email ?? ''} />
}