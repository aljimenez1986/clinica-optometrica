'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OptopadLogo from '@/components/OptopadLogo'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4"></div>
        <p className="text-gray-600 font-medium">Cargando...</p>
      </div>
    </div>
  )
}

export default function EjecucionLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <LoadingSpinner />
  if (!user) {
    router.push('/admin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/test" className="flex items-center gap-2">
              <OptopadLogo className="h-9" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Ejecución de tests</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/pacientes"
              className="text-[#356375] font-medium hover:underline"
            >
              Panel Admin
            </Link>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/admin')
              }}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition border border-red-200"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
