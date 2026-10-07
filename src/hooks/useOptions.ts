import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
export interface Opt { id: string; label: string; project_id?: string }
export function useOptions() {
  const projects = useQuery({ queryKey: ['opt-projects'], queryFn: async (): Promise<Opt[]> => { const { data } = await supabase.from('projects').select('id, project_name').order('project_name'); return (data ?? []).map(p => ({ id: p.id, label: p.project_name })) } })
  const tasks = useQuery({ queryKey: ['opt-tasks'], queryFn: async (): Promise<Opt[]> => { const { data } = await supabase.from('tasks').select('id, task_name, project_id').order('task_name'); return (data ?? []).map(t => ({ id: t.id, label: t.task_name, project_id: t.project_id })) } })
  const qa = useQuery({ queryKey: ['opt-qa'], queryFn: async (): Promise<Opt[]> => { const { data } = await supabase.from('profiles').select('id, full_name, email').eq('is_active', true).in('role', ['admin', 'qa_lead', 'qa_engineer']).order('full_name'); return (data ?? []).map(p => ({ id: p.id, label: p.full_name ?? p.email ?? p.id })) } })
  return { projects: projects.data ?? [], tasks: tasks.data ?? [], qa: qa.data ?? [] }
}