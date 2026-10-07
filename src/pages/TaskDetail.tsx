import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Badge, Card, Progress, State } from '../components/ui'
import TestExecution from '../components/TestExecution'
import type { Task } from '../types'
interface Act { id: string; activity_date: string; activity_type: string; description: string | null; hours_spent: number }
const acts = ['Requirement Review', 'Test Case Preparation', 'Test Data Preparation', 'Functional Testing', 'Regression Testing', 'API Testing', 'Bug Reporting', 'Bug Retest', 'Automation', 'Documentation', 'Meeting', 'Other']
export default function TaskDetail() {
  const { id = '' } = useParams(); const qc = useQueryClient()
  const task = useQuery({ queryKey: ['task', id], queryFn: async () => { const { data, error } = await supabase.from('tasks').select('*, projects(project_name)').eq('id', id).single<Task>(); if (error) throw error; return data } })
  const list = useQuery({ queryKey: ['acts', id], queryFn: async () => { const { data, error } = await supabase.from('task_activities').select('*').eq('task_id', id).order('activity_date', { ascending: false }).returns<Act[]>(); if (error) throw error; return data } })
  const [f, setF] = useState({ activity_date: new Date().toISOString().slice(0, 10), activity_type: acts[0], description: '', hours_spent: 1 }); const [err, setErr] = useState('')
  const add = async () => {
    if (f.hours_spent < 0) return setErr('Jam tidak boleh negatif.')
    const { error } = await supabase.from('task_activities').insert({ ...f, task_id: id })
    if (error) return setErr(error.message)
    setErr(''); setF({ ...f, description: '' }); qc.invalidateQueries({ queryKey: ['acts', id] })
  }
  if (!task.data) return <State loading={task.isLoading} error={task.error} empty />
  const t = task.data; const hours = (list.data ?? []).reduce((s, a) => s + Number(a.hours_spent), 0)
  return (<>
    <Link to="/tasks" className="text-sm text-blue-700">← Semua task</Link>
    <h1 className="text-2xl font-semibold">{t.task_code} · {t.task_name}</h1>
    <Card><div className="grid gap-3 text-sm md:grid-cols-4"><div>Project<br /><b>{t.projects?.project_name}</b></div><div>Tipe<br /><b>{t.task_type}</b></div><div>Status<br /><Badge v={t.status} /></div><div>Prioritas<br /><Badge v={t.priority} /></div>
      <div>Mulai<br /><b>{t.start_date ?? '-'}</b></div><div>Target<br /><b>{t.target_end_date ?? '-'}</b></div><div>Jam tercatat<br /><b>{hours}</b></div><div>Progress<br /><Progress v={t.progress_percentage} /></div></div></Card>
    <Card title="Tambah aktivitas"><div className="grid gap-2 md:grid-cols-5">
      <label className="text-sm text-slate-600">Tanggal aktivitas<input aria-label="Tanggal" type="date" className="w-full rounded border p-2" value={f.activity_date} onChange={e => setF({ ...f, activity_date: e.target.value })} /></label>
      <label className="text-sm text-slate-600">Tipe aktivitas<select aria-label="Tipe" className="w-full rounded border p-2" value={f.activity_type} onChange={e => setF({ ...f, activity_type: e.target.value })}>{acts.map(a => <option key={a}>{a}</option>)}</select></label>
      <label className="text-sm text-slate-600 md:col-span-2">Deskripsi<input aria-label="Deskripsi" className="w-full rounded border p-2" placeholder="Deskripsi" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
      <label className="text-sm text-slate-600">Jam dihabiskan<input aria-label="Jam" type="number" min={0} step={0.5} className="w-full rounded border p-2" value={f.hours_spent} onChange={e => setF({ ...f, hours_spent: Number(e.target.value) })} /></label></div>
      <button onClick={add} className="mt-2 rounded bg-slate-900 px-4 py-2 text-white">Simpan aktivitas</button>{err && <p className="mt-2 text-sm text-red-700">{err}</p>}</Card>
    <Card title="Timeline aktivitas"><State loading={list.isLoading} error={list.error} empty={!list.isLoading && !list.data?.length} />
      <ol className="space-y-3 border-l-2 border-slate-200 pl-4">{list.data?.map(a => <li key={a.id}><div className="text-xs text-slate-500">{a.activity_date} · {a.hours_spent} jam</div><div className="font-medium">{a.activity_type}</div><div className="text-sm">{a.description}</div></li>)}</ol></Card>
    <TestExecution taskId={id} /></>)
}