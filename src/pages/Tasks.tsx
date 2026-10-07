import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Badge, Progress, State, Table, Card } from '../components/ui'
import { Link } from 'react-router-dom'
import TaskForm from '../components/TaskForm'
import { useRole } from '../hooks/useRole'
import type { Task } from '../types'
export default function Tasks() {
  const { canWrite, isLead } = useRole()
  const qc = useQueryClient(); const [search, setSearch] = useState(''); const [status, setStatus] = useState('')
  const [sortKey, setSortKey] = useState<'task_code' | 'task_name' | 'priority' | 'target_end_date' | 'progress_percentage' | 'status'>('task_code')
  const [asc, setAsc] = useState(true); const [page, setPage] = useState(0); const PAGE = 10
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const q = useQuery({ queryKey: ['tasks'], queryFn: async () => { const { data, error } = await supabase.from('tasks').select('*, projects(project_name), profiles:assigned_to(full_name)').order('target_end_date').returns<Task[]>(); if (error) throw error; return data } })
  const setProgress = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: number }) => { const { data, error } = await supabase.from('tasks').update({ progress_percentage: v, status: v === 100 ? 'Completed' : 'In Progress' }).eq('id', id).select('id'); if (error) throw error; if (!data?.length) throw new Error('Anda hanya bisa mengubah task milik Anda.') },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }), onError: (e: Error) => alert(`Gagal memperbarui: ${e.message}`) })
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('tasks').delete().eq('id', id); if (error) throw error },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }), onError: (e: Error) => alert(`Gagal menghapus: ${e.message}`) })
  const filtered = (q.data ?? []).filter(t => (!status || t.status === status) && `${t.task_name} ${t.task_code}`.toLowerCase().includes(search.toLowerCase()))
  const rank: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 }
  const val = (t: Task) => (sortKey === 'priority' ? rank[t.priority] : t[sortKey] ?? '')
  const rows = [...filtered].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1) })
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)); const cur = Math.min(page, pages - 1); const paged = rows.slice(cur * PAGE, cur * PAGE + PAGE)
  const sort = (k: typeof sortKey) => { if (k === sortKey) setAsc(!asc); else { setSortKey(k); setAsc(true) }; setPage(0) }
  const th = (k: typeof sortKey, label: string) => <th className="p-2"><button className="font-medium" onClick={() => sort(k)}>{label}{sortKey === k ? (asc ? ' ▲' : ' ▼') : ''}</button></th>
  return (<>
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Tasks</h1>{canWrite && <button onClick={() => setEditing("new")} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Task baru</button>}</div>
    {editing && <TaskForm key={editing === "new" ? "new" : editing.id} task={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
    <div className="flex gap-2"><input className="rounded border p-2" placeholder="Cari task" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
      <select aria-label="Status" className="rounded border p-2" value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}><option value="">Semua status</option>{['Not Started', 'In Progress', 'Blocked', 'Completed'].map(s => <option key={s}>{s}</option>)}</select></div>
    <Card><State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && rows.length === 0} />
      {rows.length > 0 && <Table><thead><tr className="border-b text-slate-500">{th('task_code', 'ID')}{th('task_name', 'Task')}<th className="p-2">Project</th><th className="p-2">QA</th>{th('priority', 'Prioritas')}{th('target_end_date', 'Target')}{th('progress_percentage', 'Progress')}{th('status', 'Status')}<th></th></tr></thead>
        <tbody>{paged.map(t => <tr key={t.id} className="border-b"><td className="p-2">{t.task_code}</td><td><Link className="text-blue-700 underline" to={`/tasks/${t.id}`}>{t.task_name}</Link></td><td>{t.projects?.project_name}</td><td>{t.profiles?.full_name ?? '-'}</td><td><Badge v={t.priority} /></td><td>{t.target_end_date}</td>
          <td><Progress v={t.progress_percentage} /><input aria-label="Ubah progress" disabled={!canWrite} type="range" min={0} max={100} step={5} defaultValue={t.progress_percentage} onMouseUp={e => setProgress.mutate({ id: t.id, v: Number(e.currentTarget.value) })} onKeyUp={e => setProgress.mutate({ id: t.id, v: Number(e.currentTarget.value) })} /></td>
          <td><Badge v={t.status} /></td><td className="whitespace-nowrap">{canWrite && <button className="mr-2 text-blue-700" onClick={() => setEditing(t)}>Edit</button>}{isLead && <button className="text-red-700" onClick={() => { if (confirm(`Hapus task ${t.task_code}?`)) remove.mutate(t.id) }}>Hapus</button>}</td></tr>)}</tbody></Table>}
      {rows.length > 0 && <div className="mt-3 flex items-center gap-3 text-sm"><button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Sebelumnya</button>
        <span>Halaman {cur + 1} dari {pages} · {rows.length} task</span><button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Berikutnya</button></div>}</Card></>)
}