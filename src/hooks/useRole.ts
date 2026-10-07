import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
export type Role = 'admin' | 'qa_lead' | 'qa_engineer' | 'viewer'
export function useRole() {
  const q = useQuery({ queryKey: ['my-role'], staleTime: 60_000, queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: Role }>()
    return { id: user.id, role: data?.role ?? 'viewer' }
  } })
  const role = q.data?.role ?? null
  return { loading: q.isLoading, userId: q.data?.id ?? null, role, isAdmin: role === 'admin', isLead: role === 'admin' || role === 'qa_lead', canWrite: role === 'admin' || role === 'qa_lead' || role === 'qa_engineer' }
}