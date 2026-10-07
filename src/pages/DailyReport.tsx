import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Card, State, Table } from '../components/ui'
import { useRole } from '../hooks/useRole'
const acts = ['Requirement Review', 'Test Case Preparation', 'Test Data Preparation', 'Functional Testing', 'Regression Testing', 'API Testing', 'Bug Reporting', 'Bug Retest', 'Automation', 'Documentation', 'Meeting', 'Other']
interface A { id: string; activity_type: string; description: string | null; hours_spent: number; tasks: { task_name: string; progress_percentage: number; status: string; projects: { project_name: string } | null } | null; profiles: { full_name: string | null } | null }
interface U { id: string; project_id: string | null; summary: string; progress: number | null; tomorrow_plan: string | null; blocker_summary: string | null; projects: { project_name: string } | null; profiles: { full_name: string | null } | null }
export default function DailyReport() {
  const { canWrite } = useRole(); const [editId, setEditId] = useState<string | null>(null); const [editA, setEditA] = useState<{ id: string; activity_type: string; description: string; hours_spent: number } | null>(null)
  const qc = useQueryClient(); const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const a = useQuery({ queryKey: ['d-acts', date], queryFn: async () => { const { data, error } = await supabase.from('task_activities').select('*, tasks(task_name, progress_percentage, status, projects(project_name)), profiles:created_by(full_name)').eq('activity_date', date).returns<A[]>(); if (error) throw error; return data } })
  const u = useQuery({ queryKey: ['d-upd', date], queryFn: async () => { const { data, error } = await supabase.from('daily_updates').select('*, projects(project_name), profiles(full_name)').eq('update_date', date).returns<U[]>(); if (error) throw error; return data } })
  const projects = useQuery({ queryKey: ['project-opts'], queryFn: async () => (await supabase.from('projects').select('id, project_name')).data ?? [] })
  const [f, setF] = useState({ project_id: '', summary: '', progress: 0, blocker_summary: '', tomorrow_plan: '' }); const [err, setErr] = useState('')
  const save = async () => {
    if (!f.summary.trim()) return setErr('Isi apa yang dikerjakan hari ini.')
    let error: { message: string } | null
    if (editId) { const r = await supabase.from('daily_updates').update({ ...f, project_id: f.project_id || null }).eq('id', editId).select('id'); error = r.error ?? (r.data?.length ? null : { message: 'Anda hanya bisa mengubah update milik Anda.' }) }
    else error = (await supabase.from('daily_updates').insert({ ...f, project_id: f.project_id || null, update_date: date })).error
    if (error) return setErr(error.message)
    setErr(''); setEditId(null); setF({ ...f, summary: '', blocker_summary: '', tomorrow_plan: '' }); qc.invalidateQueries({ queryKey: ['d-upd', date] })
  }
  const startEdit = (x: U) => { setEditId(x.id); setF({ project_id: x.project_id ?? '', summary: x.summary, progress: x.progress ?? 0, blocker_summary: x.blocker_summary ?? '', tomorrow_plan: x.tomorrow_plan ?? '' }); document.getElementById('form-update')?.scrollIntoView({ behavior: 'smooth' }) }
  const delU = async (x: U) => {
    if (!confirm('Hapus daily update ini?')) return
    const { data, error } = await supabase.from('daily_updates').delete().eq('id', x.id).select('id')
    if (error || !data?.length) alert(`Gagal menghapus. ${error?.message ?? 'Anda hanya bisa menghapus update milik Anda.'}`); else qc.invalidateQueries({ queryKey: ['d-upd', date] })
  }
  const saveA = async () => {
    if (!editA) return
    if (editA.hours_spent < 0) return alert('Jam tidak boleh negatif.')
    const { data, error } = await supabase.from('task_activities').update({ activity_type: editA.activity_type, description: editA.description, hours_spent: editA.hours_spent }).eq('id', editA.id).select('id')
    if (error || !data?.length) return alert(`Gagal menyimpan aktivitas. ${error?.message ?? 'Anda hanya bisa mengubah aktivitas milik Anda.'}`)
    setEditA(null); qc.invalidateQueries({ queryKey: ['d-acts', date] })
  }
  const delA = async (id: string) => {
    if (!confirm('Hapus aktivitas ini?')) return
    const { data, error } = await supabase.from('task_activities').delete().eq('id', id).select('id')
    if (error || !data?.length) alert(`Gagal menghapus. ${error?.message ?? 'Anda hanya bisa menghapus aktivitas milik Anda.'}`); else qc.invalidateQueries({ queryKey: ['d-acts', date] })
  }
  return (<>
    <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">Daily Report</h1><input aria-label="Tanggal" type="date" className="rounded border p-2" value={date} onChange={e => setDate(e.target.value)} /></div>
    <Card title="Aktivitas QA"><State loading={a.isLoading} error={a.error} empty={!a.isLoading && !a.error && !a.data?.length} />
      {!!a.data?.length && <Table><thead><tr className="border-b text-slate-500"><th className="p-2">QA</th><th>Project</th><th>Task</th><th>Aktivitas</th><th>Jam</th><th>Progress</th><th></th></tr></thead>
        <tbody>{a.data.map(x => <tr key={x.id} className="border-b"><td className="p-2">{x.profiles?.full_name ?? '-'}</td><td>{x.tasks?.projects?.project_name}</td><td>{x.tasks?.task_name}</td>{editA?.id === x.id ? <><td><select aria-label="Tipe aktivitas" className="mb-1 rounded border p-1" value={editA.activity_type} onChange={e => setEditA({ ...editA, activity_type: e.target.value })}>{acts.map(a => <option key={a}>{a}</option>)}</select><input aria-label="Deskripsi" className="w-full rounded border p-1" value={editA.description} onChange={e => setEditA({ ...editA, description: e.target.value })} /></td>
          <td><input aria-label="Jam" type="number" min={0} step={0.5} className="w-20 rounded border p-1" value={editA.hours_spent} onChange={e => setEditA({ ...editA, hours_spent: Number(e.target.value) })} /></td><td>{x.tasks?.progress_percentage}%</td>
          <td className="whitespace-nowrap"><button className="mr-2 text-blue-700" onClick={saveA}>Simpan</button><button onClick={() => setEditA(null)}>Batal</button></td></>
          : <><td>{x.activity_type}: {x.description}</td><td>{x.hours_spent}</td><td>{x.tasks?.progress_percentage}%</td>
          <td className="whitespace-nowrap">{canWrite && <><button className="mr-2 text-blue-700" onClick={() => setEditA({ id: x.id, activity_type: x.activity_type, description: x.description ?? '', hours_spent: Number(x.hours_spent) })}>Edit</button><button className="text-red-700" onClick={() => delA(x.id)}>Hapus</button></>}</td></>}</tr>)}</tbody></Table>}</Card>
    <Card title="Daily update"><State loading={u.isLoading} error={u.error} empty={!u.isLoading && !u.error && !u.data?.length} />
      {u.data?.map(x => <div key={x.id} className="mb-3 text-sm"><b>{x.profiles?.full_name} · {x.projects?.project_name}</b> ({x.progress}%)<br />{x.summary}<br />{x.blocker_summary && <span className="text-red-700">Blocker: {x.blocker_summary}<br /></span>}Besok: {x.tomorrow_plan}{canWrite && <div className="mt-1"><button className="mr-2 text-blue-700" onClick={() => startEdit(x)}>Edit</button><button className="text-red-700" onClick={() => delU(x)}>Hapus</button></div>}</div>)}</Card>
    <div id="form-update"><Card title={editId ? 'Edit daily update' : 'Tulis daily update'}><div className="grid gap-2 md:grid-cols-2">
      <select aria-label="Project" className="rounded border p-2" value={f.project_id} onChange={e => setF({ ...f, project_id: e.target.value })}><option value="">Pilih project</option>{projects.data?.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}</select>
      <label className="text-sm text-slate-600">Progress (%)<input aria-label="Progress" type="number" min={0} max={100} className="w-full rounded border p-2" value={f.progress} onChange={e => setF({ ...f, progress: Math.min(100, Math.max(0, Number(e.target.value))) })} /></label>
      <textarea aria-label="Hari ini" className="rounded border p-2" placeholder="Apa yang dikerjakan hari ini?" value={f.summary} onChange={e => setF({ ...f, summary: e.target.value })} />
      <textarea aria-label="Blocker" className="rounded border p-2" placeholder="Blocker" value={f.blocker_summary} onChange={e => setF({ ...f, blocker_summary: e.target.value })} />
      <textarea aria-label="Besok" className="rounded border p-2 md:col-span-2" placeholder="Rencana besok" value={f.tomorrow_plan} onChange={e => setF({ ...f, tomorrow_plan: e.target.value })} /></div>
      <button onClick={save} className="mt-2 rounded bg-slate-900 px-4 py-2 text-white">{editId ? 'Simpan perubahan' : 'Simpan update'}</button>{editId && <button onClick={() => { setEditId(null); setF({ project_id: '', summary: '', progress: 0, blocker_summary: '', tomorrow_plan: '' }) }} className="ml-2 rounded border px-4 py-2">Batal</button>}{err && <p className="mt-2 text-sm text-red-700">{err}</p>}</Card></div></>)
}