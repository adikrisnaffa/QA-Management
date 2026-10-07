import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useOptions } from '../hooks/useOptions'
import { useRole } from '../hooks/useRole'
import type { Task } from '../types'
const types = ['Functional Testing', 'Regression Testing', 'Integration Testing', 'System Testing', 'API Testing', 'UI Testing', 'Mobile Testing', 'Automation Testing', 'Performance Testing', 'UAT Support', 'Bug Verification', 'Test Preparation', 'Test Documentation', 'Other']
export default function TaskForm({ task, onDone }: { task?: Task; onDone: () => void }) {
  const qc = useQueryClient(); const { isLead } = useRole(); const { qa } = useOptions()
  const projects = useQuery({ queryKey: ['project-opts'], queryFn: async () => (await supabase.from('projects').select('id, project_name').order('project_name')).data ?? [] })
  const codes = useQuery({ queryKey: ['task-codes'], queryFn: async () => (await supabase.from('tasks').select('task_code')).data ?? [] })
  const nextCode = 'T-' + String(Math.max(0, ...(codes.data ?? []).map(t => Number(/^T-(\d+)$/.exec(t.task_code)?.[1] ?? 0))) + 1).padStart(3, '0')
  const [f, setF] = useState({ project_id: task?.project_id ?? '', task_code: task?.task_code ?? '', task_name: task?.task_name ?? '', task_type: task?.task_type ?? types[0],
    priority: task?.priority ?? 'Medium', start_date: task?.start_date ?? '', target_end_date: task?.target_end_date ?? '', estimated_hours: task?.estimated_hours ?? 0, assigned_to: task?.assigned_to ?? '' })
  const [err, setErr] = useState('')
  const set = (k: string, v: string | number) => setF(p => ({ ...p, [k]: v }))
  const save = async () => {
    if (!f.project_id || !f.task_name.trim()) return setErr('Project dan nama task wajib diisi.')
    if (f.start_date && f.target_end_date && f.target_end_date < f.start_date) return setErr('Target selesai tidak boleh sebelum tanggal mulai.')
    const { task_code: _code, assigned_to, ...rest } = f
    const body = { ...rest, start_date: f.start_date || null, target_end_date: f.target_end_date || null }
    let error: { message: string } | null
    if (task) {
      const r = await supabase.from('tasks').update(isLead && assigned_to ? { ...body, assigned_to } : body).eq('id', task.id).select('id')
      error = r.error ?? (r.data?.length ? null : { message: 'Anda tidak punya izin mengubah task ini.' })
    } else {
      const uid = (await supabase.auth.getUser()).data.user?.id
      error = (await supabase.from('tasks').insert({ ...body, assigned_to: (isLead && assigned_to) || uid })).error
    }
    if (error) return setErr(error.message)
    await qc.invalidateQueries(); onDone()
  }
  const cls = 'w-full rounded border p-2'
  return (
    <div className="grid gap-2 rounded-lg border bg-white p-4 md:grid-cols-3">
      <select aria-label="Project" className={cls} value={f.project_id} onChange={e => set('project_id', e.target.value)}><option value="">Pilih project</option>{projects.data?.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}</select>
      <input aria-label="Kode" className={`${cls} bg-slate-100 text-slate-500`} disabled title="Kode dibuat otomatis" value={task?.task_code ?? nextCode} />
      {isLead && <select aria-label="Ditugaskan ke" className={cls} value={f.assigned_to} onChange={e => set('assigned_to', e.target.value)}><option value="">Saya sendiri</option>{qa.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select>}
      <input aria-label="Nama task" className={cls} placeholder="Nama task" value={f.task_name} onChange={e => set('task_name', e.target.value)} />
      <select aria-label="Tipe" className={cls} value={f.task_type} onChange={e => set('task_type', e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</select>
      <select aria-label="Prioritas" className={cls} value={f.priority} onChange={e => set('priority', e.target.value)}>{['Low', 'Medium', 'High', 'Critical'].map(t => <option key={t}>{t}</option>)}</select>
      <label className="text-sm text-slate-600">Estimasi jam kerja<input aria-label="Estimasi jam" type="number" min={0} className={cls} value={f.estimated_hours} onChange={e => set('estimated_hours', Number(e.target.value))} /></label>
      <label className="text-sm text-slate-600">Tanggal mulai<input aria-label="Mulai" type="date" className={cls} value={f.start_date} onChange={e => set('start_date', e.target.value)} /></label>
      <label className="text-sm text-slate-600">Target selesai<input aria-label="Target selesai" type="date" className={cls} value={f.target_end_date} onChange={e => set('target_end_date', e.target.value)} /></label>
      <div className="flex gap-2"><button onClick={save} className="rounded bg-slate-900 px-4 py-2 text-white">Simpan task</button><button onClick={onDone} className="rounded border px-4 py-2">Batal</button></div>
      {err && <p className="text-sm text-red-700 md:col-span-3">{err}</p>}
    </div>)
}