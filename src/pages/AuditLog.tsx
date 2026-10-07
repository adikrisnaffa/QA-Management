import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Card, State, Table } from '../components/ui'
interface L { id: string; action: string; entity_type: string; entity_id: string | null; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string; profiles: { full_name: string | null } | null }
const SIZE = 25
const changes = (l: L) => {
  if (l.action === 'INSERT') return 'Data dibuat'
  if (l.action === 'DELETE') return 'Data dihapus'
  const o = l.old_data ?? {}; const n = l.new_data ?? {}
  const keys = Object.keys(n).filter(k => JSON.stringify(o[k]) !== JSON.stringify(n[k]))
  return keys.map(k => `${k}: ${String(o[k] ?? '-')} → ${String(n[k] ?? '-')}`).join('; ') || '-'
}
export default function AuditLog() {
  const [entity, setEntity] = useState(''); const [action, setAction] = useState(''); const [page, setPage] = useState(0)
  const q = useQuery({ queryKey: ['audit', entity, action, page], queryFn: async () => {
    let r = supabase.from('audit_logs').select('*, profiles:user_id(full_name)').order('created_at', { ascending: false }).range(page * SIZE, page * SIZE + SIZE - 1)
    if (entity) r = r.eq('entity_type', entity)
    if (action) r = r.eq('action', action)
    const { data, error } = await r.returns<L[]>(); if (error) throw error; return data } })
  const cls = 'rounded border p-2'
  return (<><h1 className="text-2xl font-semibold">Audit Log</h1><p className="text-sm text-slate-500">Hanya Admin dan QA Lead yang dapat melihat halaman ini.</p>
    <div className="flex flex-wrap gap-2">
      <select aria-label="Entitas" className={cls} value={entity} onChange={e => { setEntity(e.target.value); setPage(0) }}><option value="">Semua entitas</option>{['projects', 'tasks', 'blockers', 'bugs'].map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Aksi" className={cls} value={action} onChange={e => { setAction(e.target.value); setPage(0) }}><option value="">Semua aksi</option>{['INSERT', 'UPDATE', 'DELETE'].map(x => <option key={x}>{x}</option>)}</select></div>
    <Card><State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && !q.data?.length} />
      {!!q.data?.length && <Table><thead><tr className="border-b text-slate-500"><th className="p-2">Waktu</th><th>User</th><th>Aksi</th><th>Entitas</th><th>Perubahan</th></tr></thead>
        <tbody>{q.data.map(l => <tr key={l.id} className="border-b align-top"><td className="whitespace-nowrap p-2">{format(new Date(l.created_at), 'dd MMM yyyy HH:mm')}</td><td>{l.profiles?.full_name ?? 'sistem'}</td><td>{l.action}</td><td>{l.entity_type}</td><td className="max-w-md break-words">{changes(l)}</td></tr>)}</tbody></Table>}
      <div className="mt-3 flex items-center gap-3"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Sebelumnya</button><span className="text-sm">Halaman {page + 1}</span>
        <button disabled={(q.data?.length ?? 0) < SIZE} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Berikutnya</button></div></Card></>)
}
