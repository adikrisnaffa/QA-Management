import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addMonths, format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Card, State, Table } from '../components/ui'
import { useRole } from '../hooks/useRole'
import { useOptions } from '../hooks/useOptions'
import { downloadCsv } from '../lib/csv'
interface A { id: string; profile_id: string; work_date: string; check_in: string | null; check_out: string | null; status: string; note: string | null; profiles: { full_name: string | null; email: string | null } | null }
const statuses = ['Hadir', 'WFH', 'Izin', 'Sakit', 'Alpha']
const chip: Record<string, string> = { Hadir: 'bg-emerald-100 text-emerald-800', WFH: 'bg-blue-100 text-blue-800', Izin: 'bg-amber-100 text-amber-800', Sakit: 'bg-amber-100 text-amber-800', Alpha: 'bg-red-100 text-red-800' }
const todayJkt = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
const timeJkt = (t: string | null) => (t ? new Date(t).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) : '-')
const dur = (a: A) => (a.check_in && a.check_out ? `${((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000).toFixed(1)} jam` : '-')
const nm = (a: A) => a.profiles?.full_name ?? a.profiles?.email ?? '-'
const PAGE = 15
export default function Attendance() {
  const { isLead, canWrite, userId } = useRole(); const qc = useQueryClient(); const { qa } = useOptions()
  const [month, setMonth] = useState(todayJkt().slice(0, 7)); const [who, setWho] = useState(''); const [page, setPage] = useState(0)
  const [st, setSt] = useState('Hadir'); const [note, setNote] = useState(''); const [man, setMan] = useState({ profile_id: '', work_date: todayJkt(), status: 'Hadir', note: '' })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['att-today'] }) }
  const todayQ = useQuery({ queryKey: ['att-today', userId], enabled: !!userId, queryFn: async () => { const { data, error } = await supabase.from('attendance').select('*, profiles:profile_id(full_name, email)').eq('profile_id', userId!).eq('work_date', todayJkt()).maybeSingle<A>(); if (error) throw error; return data } })
  const q = useQuery({ queryKey: ['attendance', month, who], queryFn: async () => {
    let r = supabase.from('attendance').select('*, profiles:profile_id(full_name, email)').gte('work_date', `${month}-01`).lt('work_date', format(addMonths(parseISO(`${month}-01`), 1), 'yyyy-MM-dd')).order('work_date', { ascending: false })
    if (who) r = r.eq('profile_id', who)
    const { data, error } = await r.returns<A[]>(); if (error) throw error; return data } })
  const today = todayQ.data
  const run = async (fn: 'clock_in' | 'clock_out') => {
    const { error } = fn === 'clock_in' ? await supabase.rpc('clock_in', { p_status: st, p_note: note || null }) : await supabase.rpc('clock_out')
    if (error) alert(error.message); else { setNote(''); refresh() }
  }
  const setStatus = async (a: A, status: string) => {
    const { data, error } = await supabase.from('attendance').update({ status }).eq('id', a.id).select('id')
    if (error || !data?.length) alert(`Gagal memperbarui. ${error?.message ?? 'Anda tidak punya izin.'}`); else refresh()
  }
  const remove = async (a: A) => {
    if (!confirm(`Hapus absensi ${nm(a)} tanggal ${a.work_date}?`)) return
    const { data, error } = await supabase.from('attendance').delete().eq('id', a.id).select('id')
    if (error || !data?.length) alert(`Gagal menghapus. ${error?.message ?? 'Anda tidak punya izin.'}`); else refresh()
  }
  const addManual = async () => {
    if (!man.profile_id) return alert('Pilih anggota tim.')
    const { error } = await supabase.from('attendance').insert({ ...man, note: man.note || null })
    if (error) alert(error.code === '23505' ? 'Absensi tanggal itu sudah ada. Ubah statusnya di tabel.' : error.message); else { setMan({ ...man, note: '' }); refresh() }
  }
  const rows = q.data ?? []
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)); const cur = Math.min(page, pages - 1); const paged = rows.slice(cur * PAGE, cur * PAGE + PAGE)
  const recap = new Map<string, Record<string, number>>()
  rows.forEach(a => { const r = recap.get(nm(a)) ?? {}; r[a.status] = (r[a.status] ?? 0) + 1; recap.set(nm(a), r) })
  const cls = 'rounded border p-2'
  return (<>
    <h1 className="text-2xl font-semibold">Absensi</h1>
    {canWrite ? <Card title={`Hari ini · ${todayJkt()}`}><State loading={todayQ.isLoading} error={todayQ.error} empty={false} />
      {today?.check_in && !today.check_out && <div className="flex flex-wrap items-center gap-3"><span>Masuk <b>{timeJkt(today.check_in)}</b> ({today.status})</span><button onClick={() => run('clock_out')} className="rounded bg-slate-900 px-4 py-2 text-white">Absen pulang</button></div>}
      {today?.check_out && <p>Masuk <b>{timeJkt(today.check_in)}</b> · Pulang <b>{timeJkt(today.check_out)}</b>. Terima kasih, absensi hari ini selesai.</p>}
      {today && !today.check_in && <p>Status hari ini: <b>{today.status}</b>{today.note ? ` · ${today.note}` : ''}</p>}
      {!todayQ.isLoading && !today && <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-600">Status<select aria-label="Status" className={`${cls} block`} value={st} onChange={e => setSt(e.target.value)}>{statuses.filter(s => s !== 'Alpha').map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="text-sm text-slate-600">Catatan (opsional)<input aria-label="Catatan" className={`${cls} block`} value={note} onChange={e => setNote(e.target.value)} /></label>
        <button onClick={() => run('clock_in')} className="rounded bg-slate-900 px-4 py-2 text-white">{st === 'Hadir' || st === 'WFH' ? 'Absen masuk' : 'Kirim keterangan'}</button></div>}
    </Card> : <p className="text-slate-600">Role Viewer tidak mencatat absensi.</p>}
    {isLead && <Card title="Tambah / koreksi manual"><div className="flex flex-wrap items-end gap-2">
      <label className="text-sm text-slate-600">Anggota<select aria-label="Anggota" className={`${cls} block`} value={man.profile_id} onChange={e => setMan({ ...man, profile_id: e.target.value })}><option value="">Pilih</option>{qa.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
      <label className="text-sm text-slate-600">Tanggal<input aria-label="Tanggal" type="date" className={`${cls} block`} value={man.work_date} onChange={e => setMan({ ...man, work_date: e.target.value })} /></label>
      <label className="text-sm text-slate-600">Status<select aria-label="Status manual" className={`${cls} block`} value={man.status} onChange={e => setMan({ ...man, status: e.target.value })}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="text-sm text-slate-600">Catatan<input aria-label="Catatan manual" className={`${cls} block`} value={man.note} onChange={e => setMan({ ...man, note: e.target.value })} /></label>
      <button onClick={addManual} className="rounded border px-4 py-2">Simpan</button></div></Card>}
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-sm text-slate-600">Bulan<input aria-label="Bulan" type="month" className={`${cls} block`} value={month} onChange={e => { setMonth(e.target.value || month); setPage(0) }} /></label>
      {isLead && <label className="text-sm text-slate-600">Anggota<select aria-label="Filter anggota" className={`${cls} block`} value={who} onChange={e => { setWho(e.target.value); setPage(0) }}><option value="">Semua</option>{qa.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>}
      {isLead && <button disabled={!rows.length} onClick={() => downloadCsv(`Absensi_${month}`, rows.map(a => ({ tanggal: a.work_date, nama: nm(a), status: a.status, masuk: timeJkt(a.check_in), pulang: timeJkt(a.check_out), durasi: dur(a), catatan: a.note ?? '' })))} className="rounded border px-3 py-2 disabled:opacity-40">Export CSV</button>}</div>
    <Card title="Rekap bulan ini"><State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && !rows.length} />
      {rows.length > 0 && <Table><thead><tr className="border-b text-slate-500"><th className="p-2">Nama</th>{statuses.map(s => <th key={s}>{s}</th>)}</tr></thead>
        <tbody>{[...recap].map(([n, c]) => <tr key={n} className="border-b"><td className="p-2">{n}</td>{statuses.map(s => <td key={s}>{c[s] ?? 0}</td>)}</tr>)}</tbody></Table>}</Card>
    <Card title="Riwayat">{rows.length === 0 ? <p className="text-slate-500">Belum ada data.</p> : <>
      <Table><thead><tr className="border-b text-slate-500"><th className="p-2">Tanggal</th>{isLead && <th>Nama</th>}<th>Status</th><th>Masuk</th><th>Pulang</th><th>Durasi</th><th>Catatan</th>{isLead && <th></th>}</tr></thead>
        <tbody>{paged.map(a => <tr key={a.id} className="border-b"><td className="p-2">{a.work_date}</td>{isLead && <td>{nm(a)}</td>}
          <td>{isLead ? <select aria-label={`Status ${nm(a)} ${a.work_date}`} className="rounded border p-1" value={a.status} onChange={e => setStatus(a, e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select> : <span className={`rounded px-2 py-0.5 text-xs font-medium ${chip[a.status]}`}>{a.status}</span>}</td>
          <td>{timeJkt(a.check_in)}</td><td>{timeJkt(a.check_out)}</td><td>{dur(a)}</td><td>{a.note}</td>{isLead && <td><button className="text-red-700" onClick={() => remove(a)}>Hapus</button></td>}</tr>)}</tbody></Table>
      <div className="mt-3 flex items-center gap-3 text-sm"><button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Sebelumnya</button><span>Halaman {cur + 1} dari {pages} · {rows.length} catatan</span><button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Berikutnya</button></div></>}</Card></>)
}