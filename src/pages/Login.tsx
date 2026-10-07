import { useState } from 'react'
import { supabase } from '../lib/supabase'
export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState('')
  const submit = async () => { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setErr(error.message) }
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="w-80 space-y-3 rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold">Masuk ke QA Tracker</h1>
        <input aria-label="Email" className="w-full rounded border p-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input aria-label="Password" type="password" className="w-full rounded border p-2" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button onClick={submit} className="w-full rounded bg-slate-900 p-2 text-white">Masuk</button>
      </div>
    </div>
  )
}
