import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Card, State, Table } from '../components/ui'
import { useRole } from '../hooks/useRole'
interface P { id: string; full_name: string | null; email: string | null; role: string; is_active: boolean }
const roles = [['admin', 'Admin'], ['qa_lead', 'QA Lead'], ['qa_engineer', 'QA Engineer'], ['viewer', 'Viewer / Management']]
export default function Users() {
  const { isAdmin, userId, loading } = useRole(); const qc = useQueryClient()
  const q = useQuery({ queryKey: ['users'], enabled: isAdmin, queryFn: async () => { const { data, error } = await supabase.from('profiles').select('id, full_name, email, role, is_active').order('email').returns<P[]>(); if (error) throw error; return data } })
  const update = async (p: P, patch: Partial<P>, msg: string) => {
    if (!confirm(msg)) return
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', p.id).select('id')
    if (error || !data?.length) alert(`Gagal memperbarui pengguna. ${error?.message ?? 'Anda tidak punya izin.'}`); else qc.invalidateQueries({ queryKey: ['users'] })
  }
  if (loading) return <State loading error={null} empty={false} />
  if (!isAdmin) return <p className="text-slate-600">Halaman ini hanya untuk Admin.</p>
  return (<><h1 className="text-2xl font-semibold">Pengguna</h1>
    <p className="text-sm text-slate-500">Akun baru dibuat di Supabase (Authentication → Users). Setelah itu atur role-nya di sini.</p>
    <Card><State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && !q.data?.length} />
      {!!q.data?.length && <Table><thead><tr className="border-b text-slate-500"><th className="p-2">Nama / Email</th><th>Role</th><th>Aktif</th></tr></thead>
        <tbody>{q.data.map(p => { const me = p.id === userId; return <tr key={p.id} className="border-b"><td className="p-2">{p.full_name}<div className="text-xs text-slate-500">{p.email}{me && ' (Anda)'}</div></td>
          <td><select aria-label={`Role ${p.email}`} disabled={me} className="rounded border p-1" value={p.role} onChange={e => update(p, { role: e.target.value }, `Ubah role ${p.email} menjadi ${e.target.value}?`)}>{roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
          <td><input aria-label={`Aktif ${p.email}`} type="checkbox" disabled={me} checked={p.is_active} onChange={e => update(p, { is_active: e.target.checked }, `${e.target.checked ? 'Aktifkan' : 'Nonaktifkan'} ${p.email}?`)} /></td></tr> })}</tbody></Table>}</Card></>)
}