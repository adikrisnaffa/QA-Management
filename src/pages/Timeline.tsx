import { useQuery } from '@tanstack/react-query'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Card, State } from '../components/ui'
import type { Task } from '../types'
const bar: Record<string, string> = { Completed: 'bg-emerald-500', 'In Progress': 'bg-blue-500', Blocked: 'bg-red-500' }
export default function Timeline() {
  const q = useQuery({ queryKey: ['timeline'], queryFn: async () => { const { data, error } = await supabase.from('tasks').select('*, projects(project_name)').not('start_date', 'is', null).not('target_end_date', 'is', null).order('start_date').returns<Task[]>(); if (error) throw error; return data } })
  const rows = q.data ?? []
  if (!rows.length) return <><h1 className="text-2xl font-semibold">Timeline</h1><State loading={q.isLoading} error={q.error} empty /></>
  const min = parseISO(rows.map(r => r.start_date!).sort()[0]); const max = parseISO(rows.map(r => r.target_end_date!).sort().slice(-1)[0])
  const span = Math.max(1, differenceInCalendarDays(max, min) + 1); const todayPct = (differenceInCalendarDays(new Date(), min) / span) * 100
  return (<><h1 className="text-2xl font-semibold">Timeline</h1>
    <Card><div className="overflow-x-auto"><div className="min-w-[640px]">
      <div className="mb-2 flex justify-between text-xs text-slate-500"><span>{format(min, 'dd MMM')}</span><span>{format(addDays(min, Math.floor(span / 2)), 'dd MMM')}</span><span>{format(max, 'dd MMM')}</span></div>
      {rows.map(t => { const l = (differenceInCalendarDays(parseISO(t.start_date!), min) / span) * 100; const w = ((differenceInCalendarDays(parseISO(t.target_end_date!), parseISO(t.start_date!)) + 1) / span) * 100
        return <div key={t.id} className="grid grid-cols-[180px_1fr] items-center border-t py-1 text-sm"><span className="truncate pr-2">{t.task_name}</span>
          <div className="relative h-5 rounded bg-slate-100">{todayPct >= 0 && todayPct <= 100 && <span className="absolute inset-y-0 w-px bg-red-400" style={{ left: `${todayPct}%` }} />}
            <div title={`${t.start_date} → ${t.target_end_date}`} className={`absolute h-5 rounded ${bar[t.status] ?? 'bg-slate-400'}`} style={{ left: `${l}%`, width: `${w}%` }} /></div></div> })}
    </div></div></Card></>)
}
