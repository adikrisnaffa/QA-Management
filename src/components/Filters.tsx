import { useOptions } from '../hooks/useOptions'
export interface FilterState { from: string; to: string; project: string; qa: string }
export const emptyFilters: FilterState = { from: '', to: '', project: '', qa: '' }
export default function Filters({ value, onChange }: { value: FilterState; onChange: (v: FilterState) => void }) {
  const { projects, qa } = useOptions(); const cls = 'rounded border p-2'; const set = (k: keyof FilterState, v: string) => onChange({ ...value, [k]: v })
  return (<div className="flex flex-wrap gap-2">
    <input aria-label="Dari tanggal" type="date" className={cls} value={value.from} onChange={e => set('from', e.target.value)} />
    <input aria-label="Sampai tanggal" type="date" className={cls} value={value.to} onChange={e => set('to', e.target.value)} />
    <select aria-label="Project" className={cls} value={value.project} onChange={e => set('project', e.target.value)}><option value="">Semua project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
    <select aria-label="QA" className={cls} value={value.qa} onChange={e => set('qa', e.target.value)}><option value="">Semua QA</option>{qa.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
    <button className="rounded border px-3" onClick={() => onChange(emptyFilters)}>Reset</button></div>)
}
