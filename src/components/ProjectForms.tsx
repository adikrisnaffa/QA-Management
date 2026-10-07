import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
const cls = 'rounded border p-2'
export function useRefresh(projectId: string) { const qc = useQueryClient(); return () => qc.invalidateQueries({ queryKey: ['project', projectId] }) }
export async function removeRow(table: 'project_users' | 'project_milestones', id: string, label: string, done: () => void) {
  if (!confirm(`Hapus ${label}?`)) return
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) alert(`Gagal menghapus: ${error.message}`); else done()
}
export function StakeholderForm({ projectId }: { projectId: string }) {
  const refresh = useRefresh(projectId); const [f, setF] = useState({ name: '', email: '', department: '', role: 'Business User', phone: '', notes: '' }); const [err, setErr] = useState('')
  const save = async () => {
    if (!f.name.trim()) return setErr('Nama wajib diisi.')
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Format email tidak valid.')
    const { error } = await supabase.from('project_users').insert({ ...f, project_id: projectId })
    if (error) return setErr(error.message)
    setErr(''); setF({ ...f, name: '', email: '', phone: '', notes: '' }); refresh()
  }
  return (<div className="mb-4 grid gap-2 md:grid-cols-3">
    <input aria-label="Nama" className={cls} placeholder="Nama" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
    <input aria-label="Email" className={cls} placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
    <input aria-label="Departemen" className={cls} placeholder="Departemen" value={f.department} onChange={e => setF({ ...f, department: e.target.value })} />
    <select aria-label="Role" className={cls} value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{['Product Owner', 'Business User', 'Hospital User', 'IT', 'Developer', 'Management', 'Other'].map(r => <option key={r}>{r}</option>)}</select>
    <input aria-label="Telepon" className={cls} placeholder="Telepon" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
    <button onClick={save} className="rounded bg-slate-900 px-4 py-2 text-white">Tambah stakeholder</button>{err && <p className="text-sm text-red-700 md:col-span-3">{err}</p>}</div>)
}
export function MilestoneForm({ projectId }: { projectId: string }) {
  const refresh = useRefresh(projectId); const [f, setF] = useState({ milestone_name: '', description: '', start_date: '', target_date: '', status: 'Not Started' }); const [err, setErr] = useState('')
  const save = async () => {
    if (!f.milestone_name.trim()) return setErr('Nama milestone wajib diisi.')
    if (f.start_date && f.target_date && f.target_date < f.start_date) return setErr('Target tidak boleh sebelum tanggal mulai.')
    const { error } = await supabase.from('project_milestones').insert({ ...f, project_id: projectId, start_date: f.start_date || null, target_date: f.target_date || null })
    if (error) return setErr(error.message)
    setErr(''); setF({ ...f, milestone_name: '', description: '' }); refresh()
  }
  return (<div className="mb-4 grid gap-2 md:grid-cols-3">
    <input aria-label="Milestone" className={cls} placeholder="Nama milestone" value={f.milestone_name} onChange={e => setF({ ...f, milestone_name: e.target.value })} />
    <input aria-label="Mulai" type="date" className={cls} value={f.start_date} onChange={e => setF({ ...f, start_date: e.target.value })} />
    <input aria-label="Target" type="date" className={cls} value={f.target_date} onChange={e => setF({ ...f, target_date: e.target.value })} />
    <select aria-label="Status" className={cls} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>{['Not Started', 'In Progress', 'Completed', 'Delayed'].map(r => <option key={r}>{r}</option>)}</select>
    <input aria-label="Deskripsi" className={cls} placeholder="Deskripsi" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
    <button onClick={save} className="rounded bg-slate-900 px-4 py-2 text-white">Tambah milestone</button>{err && <p className="text-sm text-red-700 md:col-span-3">{err}</p>}</div>)
}
