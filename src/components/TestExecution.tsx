import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Card, State, Table } from './ui'
interface T { id: string; test_case_name: string; test_type: string | null; environment: string | null; execution_date: string | null; total_cases: number; passed_cases: number; failed_cases: number; blocked_cases: number; pass_percentage: number }
export default function TestExecution({ taskId }: { taskId: string }) {
  const qc = useQueryClient(); const [err, setErr] = useState('')
  const [f, setF] = useState({ test_case_name: '', test_type: 'Functional', environment: 'UAT', execution_date: new Date().toISOString().slice(0, 10), total_cases: 0, passed_cases: 0, failed_cases: 0, blocked_cases: 0 })
  const q = useQuery({ queryKey: ['tests', taskId], queryFn: async () => { const { data, error } = await supabase.from('test_execution').select('*').eq('task_id', taskId).order('execution_date', { ascending: false }).returns<T[]>(); if (error) throw error; return data } })
  const save = async () => {
    if (!f.test_case_name.trim()) return setErr('Nama test case wajib diisi.')
    if ([f.total_cases, f.passed_cases, f.failed_cases, f.blocked_cases].some(n => n < 0)) return setErr('Jumlah case tidak boleh negatif.')
    if (f.passed_cases + f.failed_cases + f.blocked_cases > f.total_cases) return setErr('Passed + failed + blocked melebihi total case.')
    const { error } = await supabase.from('test_execution').insert({ ...f, task_id: taskId })
    if (error) return setErr(error.message)
    setErr(''); setF({ ...f, test_case_name: '' }); qc.invalidateQueries({ queryKey: ['tests', taskId] })
  }
  const num = (k: 'total_cases' | 'passed_cases' | 'failed_cases' | 'blocked_cases', label: string) => <label className="text-sm text-slate-600">{label}<input aria-label={label} type="number" min={0} className="w-full rounded border p-2" value={f[k]} onChange={e => setF({ ...f, [k]: Number(e.target.value) })} /></label>
  return (<Card title="Test execution">
    <p className="mb-2 text-sm text-slate-500">Total case = seluruh test case. Passed + Failed + Blocked tidak boleh melebihi Total. Sisanya dihitung belum dieksekusi.</p>
    <div className="mb-3 grid gap-2 md:grid-cols-4">
      <label className="text-sm text-slate-600 md:col-span-2">Nama test case / suite<input aria-label="Test case" className="w-full rounded border p-2" placeholder="Nama test case / suite" value={f.test_case_name} onChange={e => setF({ ...f, test_case_name: e.target.value })} /></label>
      <label className="text-sm text-slate-600">Environment<input aria-label="Environment" className="w-full rounded border p-2" placeholder="Environment" value={f.environment} onChange={e => setF({ ...f, environment: e.target.value })} /></label>
      <label className="text-sm text-slate-600">Tanggal eksekusi<input aria-label="Tanggal" type="date" className="w-full rounded border p-2" value={f.execution_date} onChange={e => setF({ ...f, execution_date: e.target.value })} /></label>
      {num('total_cases', 'Total case')}{num('passed_cases', 'Passed (lulus)')}{num('failed_cases', 'Failed (gagal)')}{num('blocked_cases', 'Blocked (terhambat)')}
      <button onClick={save} className="rounded bg-slate-900 px-4 py-2 text-white">Simpan eksekusi</button>{err && <p className="text-sm text-red-700 md:col-span-4">{err}</p>}</div>
    <State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.error && !q.data?.length} />
    {!!q.data?.length && <Table><thead><tr className="border-b text-slate-500"><th className="p-2">Test case</th><th>Tanggal</th><th>Env</th><th>Total</th><th>Pass</th><th>Fail</th><th>Blocked</th><th>Belum</th><th>Pass %</th></tr></thead>
      <tbody>{q.data.map(t => <tr key={t.id} className="border-b"><td className="p-2">{t.test_case_name}</td><td>{t.execution_date}</td><td>{t.environment}</td><td>{t.total_cases}</td><td>{t.passed_cases}</td><td>{t.failed_cases}</td><td>{t.blocked_cases}</td><td>{t.total_cases - t.passed_cases - t.failed_cases - t.blocked_cases}</td><td>{t.pass_percentage}%</td></tr>)}</tbody></Table>}</Card>)
}