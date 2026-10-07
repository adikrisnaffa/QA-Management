import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Card, State, Table } from '../components/ui'
import Filters, { emptyFilters } from '../components/Filters'
import { downloadCsv, type Row } from '../lib/csv'
interface Def { table: string; col: string; sel: string; project?: string; qa?: string; viaTask?: boolean }
const defs: Record<string, Def> = {
  'Task Completion': { table: 'tasks', col: 'target_end_date', project: 'project_id', qa: 'assigned_to', sel: 'task_code,task_name,status,progress_percentage,start_date,target_end_date,estimated_hours,actual_hours' },
  'Bug Report': { table: 'bugs', col: 'reported_date', project: 'project_id', qa: 'reported_by', sel: 'bug_number,title,severity,status,reported_date,resolved_date' },
  'Blocker Report': { table: 'blockers_v', col: 'identified_date', project: 'project_id', sel: 'project_name,title,severity,status,identified_date,age_days' },
  'Daily Activity': { table: 'task_activities', col: 'activity_date', qa: 'created_by', viaTask: true, sel: 'activity_date,activity_type,description,hours_spent' },
}
export default function Reports() {
  const [name, setName] = useState('Task Completion'); const [fl, setFl] = useState(emptyFilters); const [page, setPage] = useState(0); const PAGE = 15; const d = defs[name]
  const q = useQuery({ queryKey: ['report', name, fl], queryFn: async () => {
    let r = supabase.from(d.table).select(d.sel)
    if (fl.from) r = r.gte(d.col, fl.from)
    if (fl.to) r = r.lte(d.col, fl.to)
    if (fl.qa && d.qa) r = r.eq(d.qa, fl.qa)
    if (fl.project && d.project) r = r.eq(d.project, fl.project)
    if (fl.project && d.viaTask) {
      const ids = ((await supabase.from('tasks').select('id').eq('project_id', fl.project)).data ?? []).map(t => t.id)
      r = r.in('task_id', ids)
    }
    const { data, error } = await r.returns<Row[]>(); if (error) throw error; return data } })
  const all = q.data ?? []; const pages = Math.max(1, Math.ceil(all.length / PAGE)); const cur = Math.min(page, pages - 1); const paged = all.slice(cur * PAGE, cur * PAGE + PAGE)
  const cols = q.data?.length ? Object.keys(q.data[0]) : []
  return (<><h1 className="text-2xl font-semibold">Reports</h1>
    <div className="flex flex-wrap gap-2"><select aria-label="Jenis report" className="rounded border p-2" value={name} onChange={e => { setName(e.target.value); setPage(0) }}>{Object.keys(defs).map(k => <option key={k}>{k}</option>)}</select>
      <button disabled={!q.data?.length} onClick={() => downloadCsv(name.replace(/ /g, '_'), q.data ?? [])} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-40">Export CSV</button></div>
    <Filters value={fl} onChange={v => { setFl(v); setPage(0) }} />
    {fl.qa && !d.qa && <p className="text-sm text-amber-700">Report ini tidak punya data QA, filter QA diabaikan.</p>}
    <Card><State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && !q.data?.length} />
      {!!q.data?.length && <Table><thead><tr className="border-b text-slate-500">{cols.map(c => <th key={c} className="p-2">{c}</th>)}</tr></thead><tbody>{paged.map((r, i) => <tr key={i} className="border-b">{cols.map(c => <td key={c} className="p-2">{String(r[c] ?? '')}</td>)}</tr>)}</tbody></Table>}
      {all.length > 0 && <div className="mt-3 flex items-center gap-3 text-sm"><button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Sebelumnya</button>
        <span>Halaman {cur + 1} dari {pages} · {all.length} baris</span><button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Berikutnya</button></div>}</Card></>)
}