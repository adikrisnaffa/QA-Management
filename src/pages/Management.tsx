import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Progress, State } from '../components/ui'
import { weighted } from '../lib/progress'
import type { ProjectRow, Task } from '../types'
export default function Management() {
  const q = useQuery({ queryKey: ['mgmt'], queryFn: async () => {
    const [p, t, b] = await Promise.all([supabase.from('projects').select('*, tasks(progress_percentage, estimated_hours)').returns<ProjectRow[]>(), supabase.from('tasks').select('*, projects(project_name)').returns<Task[]>(), supabase.from('bugs').select('severity,status')])
    if (p.error) throw p.error; if (t.error) throw t.error; if (b.error) throw b.error
    return { p: p.data, t: t.data, b: b.data } } })
  if (!q.data) return <State loading={q.isLoading} error={q.error} empty={false} />
  const { p, t, b } = q.data; const n = (s: string) => t.filter(x => x.status === s).length
  const openBugs = b.filter(x => !['Verified', 'Closed', 'Rejected'].includes(x.status)); const crit = openBugs.filter(x => x.severity === 'Critical').length
  const upcoming = t.filter(x => x.status !== 'Completed' && x.target_end_date).sort((a, c) => a.target_end_date!.localeCompare(c.target_end_date!)).slice(0, 5)
  const kpi: [string, number, string][] = [['Project aktif', p.filter(x => x.status === 'In Progress').length, ''], ['Task selesai', n('Completed'), 'text-emerald-700'], ['In progress', n('In Progress'), 'text-blue-700'], ['Blocked', n('Blocked'), 'text-red-700'], ['Bug terbuka', openBugs.length, ''], ['Critical', crit, 'text-red-700']]
  return (<div className="space-y-6"><h1 className="text-3xl font-semibold">Ringkasan QA</h1>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-6">{kpi.map(([l, v, c]) => <div key={l} className="rounded-xl bg-white p-5"><div className={`text-5xl font-semibold ${c}`}>{v}</div><div className="mt-1 text-slate-500">{l}</div></div>)}</div>
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl bg-white p-5"><h2 className="mb-3 text-lg font-semibold">Progress per project</h2>{p.map(x => <div key={x.id} className="mb-3 flex items-center justify-between gap-3"><span>{x.project_name}</span><Progress v={weighted(x.tasks)} /></div>)}</section>
      <section className="rounded-xl bg-white p-5"><h2 className="mb-3 text-lg font-semibold">Deadline terdekat</h2>{upcoming.map(x => <div key={x.id} className="mb-2 flex justify-between"><span>{x.task_name} <span className="text-slate-500">({x.projects?.project_name})</span></span><b>{x.target_end_date}</b></div>)}</section></div></div>)
}
