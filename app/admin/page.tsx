'use client'

import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import OptopadLogo from '@/components/OptopadLogo'

export const dynamic = 'force-dynamic'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    
    if (loginError) {
      setError(loginError.message)
      setLoading(false)
    } else {
      router.push('/admin/pacientes')
    }
  }

  return (
    <div className="min-h-screen bg-[#356375] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <OptopadLogo className="h-20" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Optopad</h1>
          <p className="text-white/90 text-sm">Sistema de Gestión Optométrica</p>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso al Sistema</h2>
          <p className="text-gray-600 text-sm mb-6">Ingrese sus credenciales para continuar</p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input 
                type="email" 
                placeholder="usuario@ejemplo.com" 
                className="w-full border-2 border-gray-200 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none transition"
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full border-2 border-gray-200 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none transition"
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#356375] text-white font-semibold py-3.5 rounded-lg hover:bg-[#2d5566] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-white/80 text-xs mt-6">
          © 2024 Optopad. Sistema profesional de gestión.
        </p>
      </div>
    </div>
  )
}
