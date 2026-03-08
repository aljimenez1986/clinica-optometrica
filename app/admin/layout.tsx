'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import OptopadLogo from '@/components/OptopadLogo'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { isStandaloneMode } from '@/lib/use-standalone'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: nextAuthSession, status } = useSession()
  const [supabaseUser, setSupabaseUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const RUTAS_SOLO_ADMIN = ['/admin/dashboard', '/admin/usuarios', '/admin/ipads', '/admin/config']

  const user = isStandaloneMode ? (nextAuthSession?.user ? { id: (nextAuthSession.user as any).id, email: nextAuthSession.user.email } : null) : supabaseUser
  const userRole = isStandaloneMode ? (nextAuthSession?.user as any)?.role : null

  useEffect(() => {
    if (isStandaloneMode) {
      if (status === 'loading') return
      const u = nextAuthSession?.user ?? null
      if (!u) {
        setLoading(false)
        return
      }
      if (pathname === '/admin') {
        const esAdmin = (nextAuthSession?.user as any)?.role === 'administrador'
        router.push(esAdmin ? '/admin/dashboard' : '/admin/pacientes')
      } else if (RUTAS_SOLO_ADMIN.includes(pathname)) {
        if ((nextAuthSession?.user as any)?.role !== 'administrador') {
          router.push('/admin/pacientes')
        }
      }
      setLoading(false)
      return
    }

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user ?? null
      setSupabaseUser(u)

      if (!u) {
        setLoading(false)
        return
      }

      if (pathname === '/admin') {
        const { data } = await supabase.from('app_usuario').select('role').eq('auth_user_id', u.id).single()
        const esAdmin = data?.role === 'administrador'
        router.push(esAdmin ? '/admin/dashboard' : '/admin/pacientes')
        setLoading(false)
        return
      }

      if (RUTAS_SOLO_ADMIN.includes(pathname)) {
        const { data } = await supabase.from('app_usuario').select('role').eq('auth_user_id', u.id).single()
        if (data?.role !== 'administrador') {
          router.push('/admin/pacientes')
          setLoading(false)
          return
        }
      }

      setLoading(false)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSupabaseUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [router, pathname, isStandaloneMode, nextAuthSession, status])

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando Optopad...</p>
        </div>
      </div>
    )
  }

  // Si no está logueado, mostrar login (solo en /admin)
  if (!user && pathname === '/admin') {
    return <>{children}</>
  }

  // Si no está logueado pero está en otra ruta, redirigir a login
  if (!user) {
    router.push('/admin')
    return null
  }

  // Si está logueado, mostrar layout con sidebar
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        {/* Header Superior - misma altura que el logo del sidebar */}
        <header className="h-[72px] shrink-0 bg-white border-b border-gray-200 shadow-sm flex items-center">
          <div className="px-6 w-full flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/test"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#356375]/10 text-[#356375] font-semibold hover:bg-[#356375]/20 transition"
              >
                Realizar Test
              </Link>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">Usuario activo</p>
              </div>
              <button 
                onClick={async () => {
                  if (isStandaloneMode) {
                    await signOut({ redirect: false })
                  } else {
                    await supabase.auth.signOut()
                  }
                  router.push('/admin')
                }}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition border border-red-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

