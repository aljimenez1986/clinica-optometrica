'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Forzamos que la página sea dinámica para evitar errores en el build de Vercel
export const dynamic = 'force-dynamic';

export default function AdminClinica() {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Estados para el Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Estados para el Formulario de Pacientes
  const [form, setForm] = useState({
    nombre: '',
    graduacion_od: '',
    graduacion_oi: '',
    observaciones: ''
  })

  useEffect(() => {
    // 1. Comprobar sesión al cargar la página
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    checkUser()

    // 2. Escuchar cambios en la autenticación con tipos explícitos
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Cargar pacientes cuando el usuario esté logueado
  useEffect(() => {
    if (user) fetchPacientes()
  }, [user])

  async function fetchPacientes() {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error cargando pacientes:', error.message)
    else setPacientes(data || [])
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Error de acceso: " + error.message)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setPacientes([])
  }

  async function guardarPaciente(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre) return alert("El nombre es obligatorio")

    const { error } = await supabase.from('pacientes').insert([form])
    
    if (error) {
      alert("Error al guardar: " + error.message)
    } else {
      setForm({ nombre: '', graduacion_od: '', graduacion_oi: '', observaciones: '' })
      fetchPacientes()
    }
  }

  async function eliminarPaciente(id: string) {
    if (confirm("¿Seguro que quieres eliminar este paciente?")) {
      await supabase.from('pacientes').delete().eq('id', id)
      fetchPacientes()
    }
  }

  if (loading) return <div className="p-10 text-center">Cargando...</div>

  // VISTA DE LOGIN
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="p-8 bg-white shadow-xl rounded-2xl w-full max-w-md">
          <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">Óptica Admin</h2>
          <p className="text-center text-gray-500 mb-6">Introduce tus credenciales</p>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="Email" 
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">
              Iniciar Sesión
            </button>
          </div>
        </form>
      </div>
    )
  }

  // VISTA DEL PANEL CRUD
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Pacientes</h1>
          <button 
            onClick={handleLogout}
            className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Formulario de Alta */}
        <section className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Registrar Nuevo Paciente</h2>
          <form onSubmit={guardarPaciente} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              placeholder="Nombre completo" 
              className="border p-2 rounded-lg md:col-span-3"
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value})}
            />
            <input 
              placeholder="Graduación Ojo Derecho" 
              className="border p-2 rounded-lg"
              value={form.graduacion_od}
              onChange={e => setForm({...form, graduacion_od: e.target.value})}
            />
            <input 
              placeholder="Graduación Ojo Izquierdo" 
              className="border p-2 rounded-lg"
              value={form.graduacion_oi}
              onChange={e => setForm({...form, graduacion_oi: e.target.value})}
            />
            <button className="bg-green-600 text-white font-bold p-2 rounded-lg hover:bg-green-700 transition">
              Añadir Paciente
            </button>
          </form>
        </section>

        {/* Listado de Pacientes */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-semibold text-gray-700">Paciente</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Graduación (OD | OI)</th>
                <th className="p-4 font-semibold text-gray-700 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pacientes.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-gray-400">No hay pacientes registrados.</td></tr>
              ) : (
                pacientes.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800">{p.nombre}</td>
                    <td className="p-4 text-center text-gray-600">
                      <span className="bg-blue-50 px-2 py-1 rounded text-blue-700 text-sm mr-2">{p.graduacion_od || '-'}</span>
                      <span className="bg-purple-50 px-2 py-1 rounded text-purple-700 text-sm">{p.graduacion_oi || '-'}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => eliminarPaciente(p.id)}
                        className="text-red-400 hover:text-red-600 font-medium"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}