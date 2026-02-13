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
    id_paciente: '',
    nombre: '',
    genero: '',
    genero_otro: '',
    fecha_nacimiento: '',
    telefono: '',
    email: '',
    graduacion_od: '',
    graduacion_oi: '',
    observaciones: ''
  })
  const [idDuplicado, setIdDuplicado] = useState(false)
  const [verificandoId, setVerificandoId] = useState(false)

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

  // Verificar si el ID del paciente ya existe
  async function verificarIdPaciente(idPaciente: string): Promise<boolean> {
    if (!idPaciente.trim()) return false
    
    const { data, error } = await supabase
      .from('pacientes')
      .select('id_paciente')
      .eq('id_paciente', idPaciente.trim())
      .limit(1)
    
    if (error) {
      console.error('Error verificando ID:', error.message)
      return false
    }
    
    return (data && data.length > 0)
  }

  async function guardarPaciente(e: React.FormEvent) {
    e.preventDefault()
    if (!form.id_paciente) return alert("El ID del paciente es obligatorio")
    if (!form.genero) return alert("El género es obligatorio")
    if (form.genero === 'otro' && !form.genero_otro) return alert("Debe especificar el género cuando selecciona 'Otro'")
    if (!form.fecha_nacimiento) return alert("La fecha de nacimiento es obligatoria")

    // Verificar si el ID ya existe
    const idExiste = await verificarIdPaciente(form.id_paciente)
    if (idExiste) {
      setIdDuplicado(true)
      alert("Error: El ID del paciente '" + form.id_paciente + "' ya existe. Por favor, use un ID diferente.")
      return
    }

    setIdDuplicado(false)
    const { error } = await supabase.from('pacientes').insert([form])
    
    if (error) {
      // Si el error es por restricción única en la BD
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        setIdDuplicado(true)
        alert("Error: El ID del paciente ya existe en la base de datos. Por favor, use un ID diferente.")
      } else {
        alert("Error al guardar: " + error.message)
      }
    } else {
      setForm({ 
        id_paciente: '', 
        nombre: '', 
        genero: '', 
        genero_otro: '', 
        fecha_nacimiento: '', 
        telefono: '', 
        email: '', 
        graduacion_od: '', 
        graduacion_oi: '', 
        observaciones: '' 
      })
      setIdDuplicado(false)
      fetchPacientes()
    }
  }

  // Verificar ID en tiempo real mientras el usuario escribe
  async function handleIdPacienteChange(value: string) {
    setForm({...form, id_paciente: value})
    setIdDuplicado(false)
    
    if (value.trim().length > 0) {
      setVerificandoId(true)
      const existe = await verificarIdPaciente(value)
      setIdDuplicado(existe)
      setVerificandoId(false)
    }
  }

  async function eliminarPaciente(id: string) {
    if (confirm("¿Seguro que quieres eliminar este paciente?")) {
      await supabase.from('pacientes').delete().eq('id', id)
      fetchPacientes()
    }
  }

  if (loading) return <div className="p-10 text-center text-gray-800">Cargando...</div>

  // VISTA DE LOGIN
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="p-8 bg-white shadow-xl rounded-2xl w-full max-w-md">
          <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-900">Óptica Admin</h2>
          <p className="text-center text-gray-700 mb-6">Introduce tus credenciales</p>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="Email" 
              className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
          <h1 className="text-3xl font-bold text-gray-900">Panel de Pacientes</h1>
          <button 
            onClick={handleLogout}
            className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Formulario de Alta */}
        <section className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Registrar Nuevo Paciente</h2>
          <form onSubmit={guardarPaciente} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campos Obligatorios */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Campos Obligatorios</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID del Paciente <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                placeholder="Ej: PAC001" 
                className={`w-full border p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                  idDuplicado 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-300'
                }`}
                value={form.id_paciente}
                onChange={e => handleIdPacienteChange(e.target.value)}
                required
              />
              {verificandoId && (
                <p className="text-xs text-gray-500 mt-1">Verificando...</p>
              )}
              {idDuplicado && !verificandoId && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  ⚠️ Este ID ya está en uso. Por favor, use un ID diferente.
                </p>
              )}
              {!idDuplicado && !verificandoId && form.id_paciente.trim().length > 0 && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  ✓ ID disponible
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Nacimiento <span className="text-red-500">*</span>
              </label>
              <input 
                type="date"
                className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.fecha_nacimiento}
                onChange={e => setForm({...form, fecha_nacimiento: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Género <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.genero}
                onChange={e => setForm({...form, genero: e.target.value, genero_otro: e.target.value !== 'otro' ? '' : form.genero_otro})}
                required
              >
                <option value="">Seleccione...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {form.genero === 'otro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especificar Género <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  placeholder="Especifique el género" 
                  className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={form.genero_otro}
                  onChange={e => setForm({...form, genero_otro: e.target.value})}
                  required
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo
              </label>
              <input 
                type="text"
                placeholder="Nombre completo" 
                className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
              />
            </div>

            {/* Campos Opcionales */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos de Contacto (Opcionales)</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input 
                type="tel"
                placeholder="Ej: 612345678" 
                className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.telefono}
                onChange={e => setForm({...form, telefono: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input 
                type="email"
                placeholder="Ej: paciente@email.com" 
                className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
              />
            </div>

            {/* Campos Adicionales */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos Ópticos</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Graduación Ojo Derecho
              </label>
              <input 
                type="text"
                placeholder="Graduación OD" 
                className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.graduacion_od}
                onChange={e => setForm({...form, graduacion_od: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Graduación Ojo Izquierdo
              </label>
              <input 
                type="text"
                placeholder="Graduación OI" 
                className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.graduacion_oi}
                onChange={e => setForm({...form, graduacion_oi: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea 
                placeholder="Observaciones adicionales" 
                className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={form.observaciones}
                onChange={e => setForm({...form, observaciones: e.target.value})}
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">
                Añadir Paciente
              </button>
            </div>
          </form>
        </section>

        {/* Listado de Pacientes */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-semibold text-gray-900">ID</th>
                <th className="p-4 font-semibold text-gray-900">Paciente</th>
                <th className="p-4 font-semibold text-gray-900">Género</th>
                <th className="p-4 font-semibold text-gray-900">Fecha Nac.</th>
                <th className="p-4 font-semibold text-gray-900 text-center">Contacto</th>
                <th className="p-4 font-semibold text-gray-900 text-center">Graduación (OD | OI)</th>
                <th className="p-4 font-semibold text-gray-900 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pacientes.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-600">No hay pacientes registrados.</td></tr>
              ) : (
                pacientes.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-mono text-sm font-medium text-gray-900">{p.id_paciente || '-'}</td>
                    <td className="p-4 font-medium text-gray-900">{p.nombre || '-'}</td>
                    <td className="p-4 text-gray-700">
                      {p.genero === 'otro' ? p.genero_otro : (p.genero ? p.genero.charAt(0).toUpperCase() + p.genero.slice(1) : '-')}
                    </td>
                    <td className="p-4 text-gray-700">
                      {p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString('es-ES') : '-'}
                    </td>
                    <td className="p-4 text-center text-gray-700 text-sm">
                      {p.telefono || p.email ? (
                        <div className="space-y-1">
                          {p.telefono && <div>📞 {p.telefono}</div>}
                          {p.email && <div>✉️ {p.email}</div>}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-center text-gray-700">
                      <span className="bg-blue-50 px-2 py-1 rounded text-blue-800 text-sm mr-2">{p.graduacion_od || '-'}</span>
                      <span className="bg-purple-50 px-2 py-1 rounded text-purple-800 text-sm">{p.graduacion_oi || '-'}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => eliminarPaciente(p.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
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