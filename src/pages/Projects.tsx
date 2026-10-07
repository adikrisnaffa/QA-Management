import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Badge, Card, Progress, State, Table } from '../components/ui'
import { weighted } from '../lib/progress'
import type { ProjectRow } from '../types'
const cls = 'rounded border p-2'
type MS = { id?: string; milestone_name: string; target_date: string | null; status: string }
const msStatuses = ['Not Started', 'In Progress', 'Completed', 'Delayed']
const statuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']

function ProjectForm({ project, nextCode, onDone }: { project?: ProjectRow; nextCode: string; onDone: () => void }) {
  const qc = useQueryClient(); const [err, setErr] = useState('')
  const [ms, setMs] = useState<MS[]>(project?.project_milestones ?? [])
  const upd = (i: number, patch: Partial<MS>) => setMs(ms.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  const [f, setF] = useState({ project_code: project?.project_code ?? '', project_name: project?.project_name ?? '', description: project?.description ?? '', status: project?.status ?? 'In Progress',
    priority: project?.priority ?? 'Medium', start_date: project?.start_date ?? '', target_end_date: project?.target_end_date ?? '' })
  const save = async () => {
    if (!f.project_name.trim()) return setErr('Nama project wajib diisi.')
    if (f.start_date && f.target_end_date && f.target_end_date < f.start_date) return setErr('Target selesai tidak boleh sebelum tanggal mulai.')
    const { project_code: _code, ...rest } = f
    const body = { ...rest, start_date: f.start_date || null, target_end_date: f.target_end_date || null, actual_end_date: f.status === 'Completed' ? new Date().toISOString().slice(0, 10) : null }
    if (ms.some(m => !m.milestone_name.trim() && m.target_date)) return setErr('Nama milestone wajib diisi.')
    const today = new Date().toISOString().slice(0, 10)
    let pid = project?.id; let error: { message: string } | null
    if (project) { const r = await supabase.from('projects').update(body).eq('id', project.id).select('id'); error = r.error ?? (r.data?.length ? null : { message: 'Anda tidak punya izin mengubah project ini.' }) }
    else { const r = await supabase.from('projects').insert(body).select('id').single<{ id: string }>(); error = r.error; pid = r.data?.id }
    if (!error && pid) {
      const rows = ms.filter(m => m.milestone_name.trim()).map(m => ({ ...m, project_id: pid, target_date: m.target_date || null, ...(m.status === 'Completed' && !m.id ? { actual_date: today } : {}) }))
      const keep = rows.filter(r => r.id).map(r => r.id as string)
      const removed = (project?.project_milestones ?? []).filter(m => !keep.includes(m.id)).map(m => m.id)
      if (removed.length) error = (await supabase.from('project_milestones').delete().in('id', removed)).error
      if (!error && rows.some(r => r.id)) error = (await supabase.from('project_milestones').upsert(rows.filter(r => r.id))).error
      if (!error && rows.some(r => !r.id)) error = (await supabase.from('project_milestones').insert(rows.filter(r => !r.id).map(({ id: _id, ...r }) => r))).error
    }
    if (error) return setErr(error.message)
    await qc.invalidateQueries(); onDone()
  }
  return (<Card title={project ? `Edit project ${project.project_code}` : 'Project baru'}><div className="grid gap-2 md:grid-cols-4">
    <input aria-label="Kode" className={`${cls} bg-slate-100 text-slate-500`} disabled title="Kode dibuat otomatis" value={project?.project_code ?? nextCode} />
    <input aria-label="Nama" className={`${cls} md:col-span-2`} placeholder="Nama project" value={f.project_name} onChange={e => setF({ ...f, project_name: e.target.value })} />
    <select aria-label="Status" className={cls} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>{statuses.map(x => <option key={x}>{x}</option>)}</select>
    <select aria-label="Prioritas" className={cls} value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{['Low', 'Medium', 'High', 'Critical'].map(x => <option key={x}>{x}</option>)}</select>
    <input aria-label="Mulai" type="date" className={cls} value={f.start_date} onChange={e => setF({ ...f, start_date: e.target.value })} />
    <input aria-label="Target selesai" type="date" className={cls} value={f.target_end_date} onChange={e => setF({ ...f, target_end_date: e.target.value })} />
    <input aria-label="Deskripsi" className={cls} placeholder="Deskripsi" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
    <div className="mt-3"><div className="mb-1 text-sm font-medium">Milestone ({ms.length})</div>
      {ms.map((m, i) => <div key={m.id ?? `n${i}`} className="mb-2 grid gap-2 md:grid-cols-[1fr_160px_160px_auto]">
        <input aria-label={`Nama milestone ${i + 1}`} className={cls} placeholder="Nama milestone" value={m.milestone_name} onChange={e => upd(i, { milestone_name: e.target.value })} />
        <input aria-label={`Target milestone ${i + 1}`} type="date" className={cls} value={m.target_date ?? ''} onChange={e => upd(i, { target_date: e.target.value })} />
        <select aria-label={`Status milestone ${i + 1}`} className={cls} value={m.status} onChange={e => upd(i, { status: e.target.value })}>{msStatuses.map(x => <option key={x}>{x}</option>)}</select>
        <button className="text-red-700" onClick={() => setMs(ms.filter((_, j) => j !== i))}>Hapus</button></div>)}
      <button onClick={() => setMs([...ms, { milestone_name: '', target_date: '', status: 'Not Started' }])} className="rounded border px-3 py-1 text-sm">+ Tambah milestone</button></div>
    <div className="mt-2 flex gap-2"><button onClick={save} className="rounded bg-slate-900 px-4 py-2 text-white">Simpan project</button><button onClick={onDone} className="rounded border px-4 py-2">Batal</button></div>
    {err && <p className="mt-2 text-sm text-red-700">{err}</p>}</Card>)
}

const dot: Record<string, string> = { Completed: 'bg-emerald-500', 'In Progress': 'bg-blue-500', Delayed: 'bg-red-500' }
const msSummary = (p: ProjectRow) => {
  const m = [...(p.project_milestones ?? [])].sort((a, b) => (a.target_date ?? '9999').localeCompare(b.target_date ?? '9999'))
  if (!m.length) return <span className="text-slate-400">-</span>
  return (<ul className="space-y-0.5">{m.slice(0, 3).map(x => <li key={x.id} className="flex items-center gap-1.5 text-sm" title={`${x.status}${x.target_date ? ' · ' + x.target_date : ''}`}>
    <span role="img" aria-label={x.status} className={`h-2 w-2 shrink-0 rounded-full ${dot[x.status] ?? 'bg-slate-400'}`} />{x.milestone_name}</li>)}
    {m.length > 3 && <li className="text-xs text-slate-500">+{m.length - 3} lagi</li>}</ul>)
}
export default function Projects() {
  const qc = useQueryClient(); const [view, setView] = useState<'table' | 'card'>('table'); const [search, setSearch] = useState(''); const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<ProjectRow | 'new' | null>(null)
  const [sortKey, setSortKey] = useState<'project_code' | 'project_name' | 'priority' | 'target_end_date' | 'status'>('project_code'); const [asc, setAsc] = useState(true); const [page, setPage] = useState(0); const PAGE = 10
  const q = useQuery({ queryKey: ['projects'], queryFn: async () => { const { data, error } = await supabase.from('projects').select('*, tasks(progress_percentage, estimated_hours), project_milestones(id, milestone_name, target_date, status)').order('project_code').returns<ProjectRow[]>(); if (error) throw error; return data } })
  const nextCode = 'P-' + String(Math.max(0, ...(q.data ?? []).map(p => Number(/^P-(\d+)$/.exec(p.project_code)?.[1] ?? 0))) + 1).padStart(3, '0')
  const filtered = (q.data ?? []).filter(p => (!status || p.status === status) && `${p.project_name} ${p.project_code}`.toLowerCase().includes(search.toLowerCase()))
  const rank: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 }
  const rows = [...filtered].sort((a, b) => { const x = sortKey === 'priority' ? rank[a.priority] - rank[b.priority] : String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), undefined, { numeric: true }); return asc ? x : -x })
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)); const cur = Math.min(page, pages - 1); const paged = rows.slice(cur * PAGE, cur * PAGE + PAGE)
  const remove = async (p: ProjectRow) => {
    if (!confirm(`Hapus project "${p.project_name}"?\n\nSemua task (${p.tasks.length}), aktivitas, bug, blocker, stakeholder, dan milestone di dalamnya ikut terhapus permanen.`)) return
    const { error } = await supabase.from('projects').delete().eq('id', p.id)
    if (error) alert(`Gagal menghapus project: ${error.message}`); else qc.invalidateQueries()
  }
  const actions = (p: ProjectRow) => <span className="whitespace-nowrap"><button className="mr-2 text-blue-700" onClick={() => setEditing(p)}>Edit</button><button className="text-red-700" onClick={() => remove(p)}>Hapus</button></span>
  return (<>
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Projects</h1><button onClick={() => setEditing('new')} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Project baru</button></div>
    {editing && <ProjectForm nextCode={nextCode} key={editing === 'new' ? 'new' : editing.id} project={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
    <div className="flex flex-wrap gap-2"><input className={cls} placeholder="Cari project" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
      <select aria-label="Status" className={cls} value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}><option value="">Semua status</option>{statuses.map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Urutkan" className={cls} value={sortKey} onChange={e => { setSortKey(e.target.value as typeof sortKey); setPage(0) }}><option value="project_code">Urutkan: Kode</option><option value="project_name">Urutkan: Nama</option><option value="priority">Urutkan: Prioritas</option><option value="target_end_date">Urutkan: Target</option><option value="status">Urutkan: Status</option></select>
      <button aria-label="Arah urutan" className="rounded border px-3" onClick={() => { setAsc(!asc); setPage(0) }}>{asc ? '▲ Naik' : '▼ Turun'}</button>
      <button className="rounded border px-3" onClick={() => setView(view === 'table' ? 'card' : 'table')}>{view === 'table' ? 'Tampilan kartu' : 'Tampilan tabel'}</button></div>
    <State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && !rows.length} />
    {!!rows.length && view === 'table' && <Card><Table><thead><tr className="border-b text-slate-500"><th className="p-2">Kode</th><th>Project</th><th>Prioritas</th><th>Target</th><th>Progress</th><th>Milestone</th><th>Status</th><th></th></tr></thead>
      <tbody>{paged.map(p => <tr key={p.id} className="border-b"><td className="p-2">{p.project_code}</td><td><Link className="text-blue-700 underline" to={`/projects/${p.id}`}>{p.project_name}</Link></td><td><Badge v={p.priority} /></td><td>{p.target_end_date}</td><td><Progress v={weighted(p.tasks)} /></td><td>{msSummary(p)}</td><td><Badge v={p.status} /></td><td>{actions(p)}</td></tr>)}</tbody></Table></Card>}
    {!!rows.length && view === 'card' && <div className="grid gap-3 md:grid-cols-3">{paged.map(p => <Card key={p.id}><Link to={`/projects/${p.id}`} className="font-semibold text-blue-700 underline">{p.project_name}</Link><div className="mb-2 text-xs text-slate-500">{p.project_code} · target {p.target_end_date ?? '-'}</div><Progress v={weighted(p.tasks)} /><div className="mt-2 text-xs text-slate-500">Milestone</div>{msSummary(p)}<div className="mt-2 flex items-center justify-between"><span className="flex gap-2"><Badge v={p.status} /><Badge v={p.priority} /></span>{actions(p)}</div></Card>)}</div>}{rows.length > 0 && <div className="flex items-center gap-3 text-sm"><button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Sebelumnya</button>
      <span>Halaman {cur + 1} dari {pages} · {rows.length} project</span><button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Berikutnya</button></div>}</>)
}