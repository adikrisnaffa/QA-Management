import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Badge, Card, Progress, State, Table } from '../components/ui'
import { weighted } from '../lib/progress'
import { MilestoneForm, StakeholderForm, removeRow, useRefresh } from '../components/ProjectForms'
interface D { project_code: string; project_name: string; description: string | null; status: string; priority: string; start_date: string | null; target_end_date: string | null
  tasks: { id: string; task_code: string; task_name: string; status: string; priority: string; progress_percentage: number; estimated_hours: number | null }[]
  bugs: { id: string; bug_number: string; title: string; severity: string; status: string }[]
  blockers: { id: string; title: string; severity: string; status: string; identified_date: string }[]
  project_users: { id: string; name: string; role: string | null; department: string | null; email: string | null }[]
  project_milestones: { id: string; milestone_name: string; target_date: string | null; status: string }[] }
const tabs = ['Overview', 'Tasks', 'Bugs', 'Blockers', 'Stakeholders', 'Milestones'] as const
export default function ProjectDetail() {
  const { id = '' } = useParams(); const [tab, setTab] = useState<(typeof tabs)[number]>('Overview')
  const q = useQuery({ queryKey: ['project', id], queryFn: async () => { const { data, error } = await supabase.from('projects').select('*, tasks(*), bugs(*), blockers(*), project_users(*), project_milestones(*)').eq('id', id).single<D>(); if (error) throw error; return data } })
  if (!q.data) return <State loading={q.isLoading} error={q.error} empty />
  const refresh = useRefresh(id)
  const p = q.data; const openB = p.blockers.filter(b => ['Open', 'In Progress'].includes(b.status)).length
  const list = <T extends { id: string }>(rows: T[], cols: [string, (r: T) => React.ReactNode][]) => rows.length === 0 ? <p className="text-slate-500">Belum ada data.</p> :
    <Table><thead><tr className="border-b text-slate-500">{cols.map(c => <th key={c[0]} className="p-2">{c[0]}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b">{cols.map(c => <td key={c[0]} className="p-2">{c[1](r)}</td>)}</tr>)}</tbody></Table>
  return (<>
    <Link to="/projects" className="text-sm text-blue-700">← Semua project</Link>
    <h1 className="text-2xl font-semibold">{p.project_code} · {p.project_name}</h1>
    <div className="flex gap-1 overflow-x-auto border-b" role="tablist">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm ${tab === t ? 'border-b-2 border-slate-900 font-semibold' : 'text-slate-500'}`}>{t}</button>)}</div>
    <Card>
      {tab === 'Overview' && <div className="grid gap-3 text-sm md:grid-cols-4"><div>Status<br /><Badge v={p.status} /></div><div>Prioritas<br /><Badge v={p.priority} /></div><div>Mulai<br /><b>{p.start_date ?? '-'}</b></div><div>Target<br /><b>{p.target_end_date ?? '-'}</b></div>
        <div className="md:col-span-2">Progress<br /><Progress v={weighted(p.tasks)} /></div><div>Task<br /><b>{p.tasks.length}</b> ({p.tasks.filter(t => t.status === 'Completed').length} selesai)</div><div>Bug aktif / Blocker aktif<br /><b>{p.bugs.filter(b => !['Verified', 'Closed', 'Rejected'].includes(b.status)).length} / {openB}</b></div>
        {p.description && <p className="md:col-span-4">{p.description}</p>}</div>}
      {tab === 'Tasks' && list(p.tasks, [['Kode', r => r.task_code], ['Task', r => <Link className="text-blue-700 underline" to={`/tasks/${r.id}`}>{r.task_name}</Link>], ['Progress', r => <Progress v={r.progress_percentage} />], ['Status', r => <Badge v={r.status} />]])}
      {tab === 'Bugs' && list(p.bugs, [['ID', r => r.bug_number], ['Judul', r => r.title], ['Severity', r => <Badge v={r.severity} />], ['Status', r => <Badge v={r.status} />]])}
      {tab === 'Blockers' && list(p.blockers, [['Blocker', r => r.title], ['Severity', r => <Badge v={r.severity} />], ['Sejak', r => r.identified_date], ['Status', r => <Badge v={r.status} />]])}
      {tab === 'Stakeholders' && <><StakeholderForm projectId={id} />{list(p.project_users, [['Nama', r => r.name], ['Role', r => r.role], ['Departemen', r => r.department], ['Email', r => r.email], ['', r => <button className="text-red-700" onClick={() => removeRow('project_users', r.id, r.name, refresh)}>Hapus</button>]])}</>}
      {tab === 'Milestones' && <><MilestoneForm projectId={id} />{list(p.project_milestones, [['Milestone', r => r.milestone_name], ['Target', r => r.target_date], ['Status', r => <Badge v={r.status} />], ['', r => <button className="text-red-700" onClick={() => removeRow('project_milestones', r.id, r.milestone_name, refresh)}>Hapus</button>]])}</>}
    </Card></>)
}
