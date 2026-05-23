import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { getHomePage } from './utils/roleRouter'
import Login from './pages/Login'
import Collector from './pages/Collector'
import Holder from './pages/Holder'
import Billing from './pages/Billing'
import Admin from './pages/Admin'

function ProtectedRoute({ children, session }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={<Login session={session} />} />
      <Route path="/collector" element={<ProtectedRoute session={session}><Collector /></ProtectedRoute>} />
      <Route path="/holder" element={<ProtectedRoute session={session}><Holder /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute session={session}><Billing /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute session={session}><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
