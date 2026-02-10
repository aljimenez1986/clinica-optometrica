'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminClinica() {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [form, setForm] = useState({ nombre: '', graduacion_od: '', graduacion_oi: '' })
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Verificar sesión al cargar
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user))
    if (user) fetchPacientes()
  }, [user])

  async function fetchPacientes() {
    const { data } = await supabase.from('pacientes').select('*')
    if (data) setPacientes(data)
  }

  async function handleLogin() {
    // Esto abrirá el widget de login o puedes usar auth.signInWithPassword
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  async function guardarPaciente(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('pacientes').insert([form])
    setForm({ nombre: '', graduacion_od: '', graduacion_oi: '' })
    fetchPacientes()
  }

  if (!user) return <button onClick={handleLogin} className="p-4 bg-blue-600 text-white m-10 rounded">Login Administrador</button>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Panel Optométrico</h1>
      
      {/* Formulario de Registro */}
      <form onSubmit={guardarPaciente} className="grid grid-cols-1 gap-4 mb-8 bg-gray-50 p-6 rounded-lg">
        <input placeholder="Nombre del Paciente" className="border p-2" onChange={e => setForm({...form, nombre: e.target.value})} />
        <div className="flex gap-2">
          <input placeholder="Grad. OD" className="border p-2 w-1/2" onChange={e => setForm({...form, graduacion_od: e.target.value})} />
          <input placeholder="Grad. OI" className="border p-2 w-1/2" onChange={e => setForm({...form, graduacion_oi: e.target.value})} />
        </div>
        <button className="bg-green-600 text-white p-2 rounded">Añadir Paciente</button>
      </form>

      {/* Tabla de Resultados */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Nombre</th>
            <th className="p-2 border">OD / OI</th>
            <th className="p-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pacientes.map(p => (
            <tr key={p.id} className="text-center">
              <td className="p-2 border">{p.nombre}</td>
              <td className="p-2 border">{p.graduacion_od} | {p.graduacion_oi}</td>
              <td className="p-2 border">
                <button onClick={async () => { await supabase.from('pacientes').delete().eq('id', p.id); fetchPacientes(); }} className="text-red-500">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}