import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Filters, { emptyFilters } from '../components/Filters'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { Card, State, Table } from '../components/ui'
interface R { status: string; estimated_hours: number; actual_hours: number; profiles: { full_name: string | null } | null }
export default function Workload() {
  const [fl, setFl] = useState(emptyFilters)
  const q = useQuery({ queryKey: ['workload', fl], queryFn: async () => {
    let r = supabase.from('tasks').select('status, estimated_hours, actual_hours, profiles:assigned_to(full_name)')
    if (fl.project) r = r.eq('project_id', fl.project)
    if (fl.qa) r = r.eq('assigned_to', fl.qa)
    if (fl.from) r = r.gte('target_end_date', fl.from)
    if (fl.to) r = r.lte('start_date', fl.to)
    const { data, error } = await r.returns<R[]>(); if (error) throw error; return data } })
  const map = new Map<string, { qa: string; active: number; done: number; progress: number; blocked: number; est: number; act: number }>()
  q.data?.forEach(t => {
    const qa = t.profiles?.full_name ?? 'Belum ditugaskan'
    const r = map.get(qa) ?? { qa, active: 0, done: 0, progress: 0, blocked: 0, est: 0, act: 0 }
    if (t.status === 'Completed') r.done++
    else if (t.status !== 'Cancelled') { r.active++; r.est += Number(t.estimated_hours) }
    if (t.status === 'In Progress') r.progress++
    if (t.status === 'Blocked') r.blocked++
    r.act += Number(t.actual_hours); map.set(qa, r)
  })
  const rows = [...map.values()]
  return (<><h1 className="text-2xl font-semibold">Workload</h1>
    <Filters value={fl} onChange={setFl} />
    <p className="text-sm text-slate-500">Estimasi = jam estimasi pada task yang masih aktif (diisi di form task). Aktual = total jam dari aktivitas yang dicatat di detail task.</p>
    <State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && !rows.length} />
    {!!rows.length && <><Card title="Jam estimasi vs aktual"><ResponsiveContainer height={260}><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="qa" /><YAxis /><Tooltip /><Legend /><Bar dataKey="est" name="Estimasi (task aktif)" fill="#94a3b8" /><Bar dataKey="act" name="Aktual" fill="#2563eb" /></BarChart></ResponsiveContainer></Card>
      <Card><Table><thead><tr className="border-b text-slate-500"><th className="p-2">QA</th><th>Aktif</th><th>Selesai</th><th>In Progress</th><th>Blocked</th><th>Est. jam</th><th>Aktual jam</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.qa} className="border-b"><td className="p-2">{r.qa}</td><td>{r.active}</td><td>{r.done}</td><td>{r.progress}</td><td>{r.blocked}</td><td>{r.est}</td><td>{r.act}</td></tr>)}</tbody></Table></Card></>}</>)
}