import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { Badge, Card, Progress, State, Table } from '../components/ui'
import { weighted } from '../lib/progress'
import type { Bug, Task } from '../types'
interface DashProject { id: string; project_code: string; project_name: string; status: string; target_end_date: string | null; actual_end_date: string | null; tasks: { progress_percentage: number; estimated_hours: number | null }[] }
const colors: Record<string, string> = { Completed: '#059669', 'In Progress': '#2563eb', Blocked: '#dc2626', 'Not Started': '#94a3b8', Cancelled: '#64748b' }
export default function Dashboard() {
  const q = useQuery({ queryKey: ['dash'], queryFn: async () => {
    const [t, b, p] = await Promise.all([
      supabase.from('tasks').select('*, projects(project_name)').returns<Task[]>(),
      supabase.from('bugs').select('*, projects(project_name)').returns<Bug[]>(),
      supabase.from('projects').select('id, project_code, project_name, status, target_end_date, actual_end_date, tasks(progress_percentage, estimated_hours)').order('project_name').returns<DashProject[]>()])
    if (t.error) throw t.error
    if (b.error) throw b.error
    if (p.error) throw p.error
    return { tasks: t.data, bugs: b.data, projects: p.data }
  } })
  if (!q.data) return <State loading={q.isLoading} error={q.error} empty={false} />
  const { tasks, bugs, projects } = q.data
  const by = (s: string) => tasks.filter(t => t.status === s).length
  const stat: [string, number][] = [['Project aktif', projects.filter(x => x.status === 'In Progress').length], ['Project selesai', projects.filter(x => x.status === 'Completed').length], ['Tasks', tasks.length], ['Task selesai', by('Completed')], ['In progress', by('In Progress')], ['Blocked', by('Blocked')],
    ['Open bugs', bugs.filter(x => !['Verified', 'Closed', 'Rejected'].includes(x.status)).length], ['Critical bugs', bugs.filter(x => x.severity === 'Critical' && x.status !== 'Closed').length]]
  const status = Object.keys(colors).map(name => ({ name, value: by(name) })).filter(d => d.value > 0)
  const overall = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress_percentage, 0) / tasks.length) : 0
  const today = new Date().toISOString().slice(0, 10)
  const overdue = tasks.filter(t => t.target_end_date && t.target_end_date < today && t.status !== 'Completed')
  const sev = ['Low', 'Medium', 'High', 'Critical'].map(name => ({ name, total: bugs.filter(x => x.severity === name).length }))
  return (<>
    <h1 className="text-2xl font-semibold">Dashboard</h1>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{stat.map(([l, v]) => <Card key={l}><div className="text-2xl font-semibold">{v}</div><div className="text-sm text-slate-500">{l}</div></Card>)}</div>
    {overdue.length > 0 && <p className="rounded bg-amber-100 p-3 text-sm">⚠ {overdue.length} task melewati target selesai.</p>}
    <p className="text-sm">Progress keseluruhan QA: <b>{overall}%</b></p>
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Status task"><ResponsiveContainer height={240}><PieChart><Pie data={status} dataKey="value" nameKey="name" label>{status.map(s => <Cell key={s.name} fill={colors[s.name]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Card>
      <Card title="Bug per severity"><ResponsiveContainer height={240}><BarChart data={sev}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#2563eb" /></BarChart></ResponsiveContainer></Card>
    </div>
    <ProjectList projects={projects} /></>)
}

function ProjectList({ projects }: { projects: DashProject[] }) {
  const tabs = ['Semua', 'In Progress', 'Completed', 'On Hold', 'Planning', 'Cancelled']
  const [tab, setTab] = useState('Semua')
  const count = (t: string) => (t === 'Semua' ? projects.length : projects.filter(p => p.status === t).length)
  const rows = projects.filter(p => tab === 'Semua' || p.status === tab)
  return (<Card title="Project">
    <div className="mb-3 flex flex-wrap gap-1" role="tablist">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded px-3 py-1 text-sm ${tab === t ? 'bg-slate-900 text-white' : 'border text-slate-600'}`}>{t} ({count(t)})</button>)}</div>
    {rows.length === 0 ? <p className="text-slate-500">Belum ada data.</p> :
      <Table><thead><tr className="border-b text-slate-500"><th className="p-2">Kode</th><th>Project</th><th>Status</th><th>Progress</th><th>Target</th><th>Selesai</th></tr></thead>
        <tbody>{rows.map(p => <tr key={p.id} className="border-b"><td className="p-2">{p.project_code}</td><td><Link className="text-blue-700 underline" to={`/projects/${p.id}`}>{p.project_name}</Link></td><td><Badge v={p.status} /></td><td><Progress v={weighted(p.tasks)} /></td><td>{p.target_end_date ?? '-'}</td><td>{p.actual_end_date ?? '-'}</td></tr>)}</tbody></Table>}</Card>)
}