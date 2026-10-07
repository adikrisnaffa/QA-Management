import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Badge, Card, State, Table } from '../components/ui'
import { useOptions } from '../hooks/useOptions'
import type { BlockerRow } from '../types'
const age = (d: number) => (d > 3 ? ['Critical Attention', 'text-red-700'] : d >= 2 ? ['Attention', 'text-amber-700'] : ['Normal', 'text-slate-600'])
const sev = ['Low', 'Medium', 'High', 'Critical']; const sts = ['Open', 'In Progress', 'Resolved', 'Closed']
export default function Blockers() {
  const qc = useQueryClient(); const { projects, tasks } = useOptions(); const [adding, setAdding] = useState(false); const [err, setErr] = useState('')
  const [f, setF] = useState({ project_id: '', task_id: '', title: '', description: '', severity: 'Medium', blocked_by: '', identified_date: new Date().toISOString().slice(0, 10) })
  const q = useQuery({ queryKey: ['blockers'], queryFn: async () => { const { data, error } = await supabase.from('blockers_v').select('*').order('identified_date').returns<BlockerRow[]>(); if (error) throw error; return data } })
  const refresh = () => qc.invalidateQueries({ queryKey: ['blockers'] })
  const create = async () => {
    if (!f.project_id || !f.title.trim()) return setErr('Project dan judul blocker wajib diisi.')
    const { error } = await supabase.from('blockers').insert({ ...f, task_id: f.task_id || null })
    if (error) return setErr(error.message)
    setErr(''); setAdding(false); setF({ ...f, title: '', description: '' }); refresh()
  }
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const closing = status === 'Resolved' || status === 'Closed'
      const { error } = await supabase.from('blockers').update({ status, resolved_date: closing ? new Date().toISOString().slice(0, 10) : null }).eq('id', id); if (error) throw error },
    onSuccess: refresh, onError: (e: Error) => alert(`Gagal memperbarui blocker: ${e.message}`) })
  const change = (b: BlockerRow, status: string) => { if ((status === 'Resolved' || status === 'Closed') && !confirm(`Tandai blocker "${b.title}" sebagai ${status}?`)) return; setStatus.mutate({ id: b.id, status }) }
  const cls = 'rounded border p-2'
  return (<>
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Blockers</h1><button onClick={() => setAdding(!adding)} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Blocker baru</button></div>
    {adding && <Card><div className="grid gap-2 md:grid-cols-3">
      <select aria-label="Project" className={cls} value={f.project_id} onChange={e => setF({ ...f, project_id: e.target.value, task_id: '' })}><option value="">Pilih project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      <select aria-label="Task" className={cls} value={f.task_id} onChange={e => setF({ ...f, task_id: e.target.value })}><option value="">Task (opsional)</option>{tasks.filter(t => t.project_id === f.project_id).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
      <select aria-label="Severity" className={cls} value={f.severity} onChange={e => setF({ ...f, severity: e.target.value })}>{sev.map(s => <option key={s}>{s}</option>)}</select>
      <input aria-label="Judul" className={`${cls} md:col-span-2`} placeholder="Judul blocker" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <input aria-label="Tanggal" type="date" className={cls} value={f.identified_date} onChange={e => setF({ ...f, identified_date: e.target.value })} />
      <input aria-label="Owner" className={cls} placeholder="Owner / pihak terkait" value={f.blocked_by} onChange={e => setF({ ...f, blocked_by: e.target.value })} />
      <textarea aria-label="Deskripsi" className={`${cls} md:col-span-2`} placeholder="Deskripsi" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
      <button onClick={create} className="mt-2 rounded bg-slate-900 px-4 py-2 text-white">Simpan blocker</button>{err && <p className="mt-2 text-sm text-red-700">{err}</p>}</Card>}
    <Card><State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && !q.data?.length} />
      {!!q.data?.length && <Table><thead><tr className="border-b text-slate-500"><th className="p-2">Project</th><th>Task</th><th>Blocker</th><th>Severity</th><th>Umur</th><th>Owner</th><th>Status</th></tr></thead>
        <tbody>{q.data.map(b => { const [l, c] = age(b.age_days); return <tr key={b.id} className="border-b"><td className="p-2">{b.project_name}</td><td>{b.task_name}</td><td>{b.title}</td><td><Badge v={b.severity} /></td><td className={c}>{b.age_days} hari · {l}</td><td>{b.blocked_by}</td>
          <td><select aria-label={`Status ${b.title}`} className="rounded border p-1" value={b.status} onChange={e => change(b, e.target.value)}>{sts.map(s => <option key={s}>{s}</option>)}</select></td></tr> })}</tbody></Table>}</Card></>)
}
