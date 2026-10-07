import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Badge, Card, State, Table } from '../components/ui'
import { useOptions } from '../hooks/useOptions'
import type { Bug } from '../types'
const sev = ['Low', 'Medium', 'High', 'Critical']; const sts = ['Open', 'In Progress', 'Fixed', 'Ready for Retest', 'Verified', 'Rejected', 'Closed']
export default function Bugs() {
  const qc = useQueryClient(); const { projects, tasks } = useOptions(); const [adding, setAdding] = useState(false); const [err, setErr] = useState(''); const [open, setOpen] = useState<string | null>(null)
  const [f, setF] = useState({ project_id: '', task_id: '', title: '', description: '', severity: 'Medium', priority: 'Medium', environment: '', steps_to_reproduce: '', expected_result: '', actual_result: '' })
  const q = useQuery({ queryKey: ['bugs'], queryFn: async () => { const { data, error } = await supabase.from('bugs').select('*, projects(project_name)').order('reported_date', { ascending: false }).returns<(Bug & { description: string | null; steps_to_reproduce: string | null; expected_result: string | null; actual_result: string | null; environment: string | null })[]>(); if (error) throw error; return data } })
  const refresh = () => qc.invalidateQueries({ queryKey: ['bugs'] })
  const nextNo = () => { const max = Math.max(100, ...(q.data ?? []).map(b => Number(b.bug_number.replace(/\D/g, '')) || 0)); return `BUG-${max + 1}` }
  const create = async () => {
    if (!f.project_id || !f.title.trim()) return setErr('Project dan judul bug wajib diisi.')
    const { error } = await supabase.from('bugs').insert({ ...f, task_id: f.task_id || null, bug_number: nextNo() })
    if (error) return setErr(error.message)
    setErr(''); setAdding(false); setF({ ...f, title: '', description: '', steps_to_reproduce: '', expected_result: '', actual_result: '' }); refresh()
  }
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const done = ['Verified', 'Closed', 'Rejected'].includes(status)
      const { error } = await supabase.from('bugs').update({ status, resolved_date: done ? new Date().toISOString().slice(0, 10) : null }).eq('id', id); if (error) throw error },
    onSuccess: refresh, onError: (e: Error) => alert(`Gagal memperbarui bug: ${e.message}`) })
  const change = (b: Bug, status: string) => { if (status === 'Closed' && !confirm(`Tutup ${b.bug_number}?`)) return; setStatus.mutate({ id: b.id, status }) }
  const cls = 'rounded border p-2'
  const txt = (k: 'description' | 'steps_to_reproduce' | 'expected_result' | 'actual_result', label: string) => <textarea aria-label={label} className={cls} placeholder={label} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />
  return (<>
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Bugs</h1><button onClick={() => setAdding(!adding)} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Bug baru</button></div>
    {adding && <Card><div className="grid gap-2 md:grid-cols-3">
      <select aria-label="Project" className={cls} value={f.project_id} onChange={e => setF({ ...f, project_id: e.target.value, task_id: '' })}><option value="">Pilih project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      <select aria-label="Task" className={cls} value={f.task_id} onChange={e => setF({ ...f, task_id: e.target.value })}><option value="">Task (opsional)</option>{tasks.filter(t => t.project_id === f.project_id).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
      <input aria-label="Environment" className={cls} placeholder="Environment (UAT, SIT...)" value={f.environment} onChange={e => setF({ ...f, environment: e.target.value })} />
      <input aria-label="Judul" className={`${cls} md:col-span-3`} placeholder="Judul bug" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <select aria-label="Severity" className={cls} value={f.severity} onChange={e => setF({ ...f, severity: e.target.value })}>{sev.map(s => <option key={s}>{s}</option>)}</select>
      <select aria-label="Prioritas" className={cls} value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{sev.map(s => <option key={s}>{s}</option>)}</select><span />
      {txt('description', 'Deskripsi')}{txt('steps_to_reproduce', 'Langkah reproduksi')}{txt('expected_result', 'Hasil diharapkan')}{txt('actual_result', 'Hasil aktual')}</div>
      <p className="mt-2 text-sm text-slate-500">Nomor bug dibuat otomatis: {nextNo()}</p>
      <button onClick={create} className="mt-2 rounded bg-slate-900 px-4 py-2 text-white">Simpan bug</button>{err && <p className="mt-2 text-sm text-red-700">{err}</p>}</Card>}
    <Card><State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && !q.data?.length} />
      {!!q.data?.length && <Table><thead><tr className="border-b text-slate-500"><th className="p-2">Bug ID</th><th>Project</th><th>Judul</th><th>Severity</th><th>Dilaporkan</th><th>Status</th></tr></thead>
        <tbody>{q.data.map(b => <><tr key={b.id} className="border-b"><td className="p-2"><button className="text-blue-700 underline" onClick={() => setOpen(open === b.id ? null : b.id)}>{b.bug_number}</button></td><td>{b.projects?.project_name}</td><td>{b.title}</td><td><Badge v={b.severity} /></td><td>{b.reported_date}</td>
          <td><select aria-label={`Status ${b.bug_number}`} className="rounded border p-1" value={b.status} onChange={e => change(b, e.target.value)}>{sts.map(s => <option key={s}>{s}</option>)}</select></td></tr>
          {open === b.id && <tr key={`${b.id}-d`} className="bg-slate-50"><td colSpan={6} className="space-y-1 p-3 text-sm"><div><b>Environment:</b> {b.environment ?? '-'}</div><div><b>Deskripsi:</b> {b.description ?? '-'}</div><div><b>Langkah:</b> {b.steps_to_reproduce ?? '-'}</div><div><b>Diharapkan:</b> {b.expected_result ?? '-'}</div><div><b>Aktual:</b> {b.actual_result ?? '-'}</div></td></tr>}</>)}</tbody></Table>}</Card></>)
}
