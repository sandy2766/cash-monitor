import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getRoles } from '../utils/roleRouter'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [roles, setRoles] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        const r = await getRoles(supabase, session.user.id)
        setRoles(r)
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setProfile(data)
      }
      setLoading(false)
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { user, roles, profile, loading, signOut }
}
