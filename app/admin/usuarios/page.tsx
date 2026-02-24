'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Rol = 'administrador' | 'clinico'

const ROLES: { value: Rol; label: string }[] = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'clinico', label: 'Clínico' }
]

type OrdenCol = 'nombre' | 'email' | 'role' | 'created_at' | ''

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [esAdmin, setEsAdmin] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', role: 'clinico' as Rol })
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [ordenColumna, setOrdenColumna] = useState<OrdenCol>('nombre')
  const [ordenAsc, setOrdenAsc] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: miPerfil } = await supabase.from('app_usuario').select('role').eq('auth_user_id', user.id).single()
    setEsAdmin(miPerfil?.role === 'administrador')

    const { data, error } = await supabase.from('app_usuario').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('Error cargando usuarios:', error)
      setUsuarios([])
    } else {
      setUsuarios(data || [])
    }
    setLoading(false)
  }

  function resetearFormulario() {
    setForm({ nombre: '', email: '', password: '', role: 'clinico' })
    setEditandoId(null)
    setMostrarFormulario(false)
  }

  function abrirEdicion(u: any) {
    setForm({ nombre: u.nombre || '', email: u.email, password: '', role: u.role })
    setEditandoId(u.id)
    setMostrarFormulario(true)
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email?.trim()) return alert('El email es obligatorio')
    if (!editandoId && !form.password?.trim()) return alert('La contraseña es obligatoria')
    if (!form.role) return alert('El rol es obligatorio')

    setGuardando(true)
    try {
      if (editandoId) {
        const { error } = await supabase.from('app_usuario').update({ nombre: form.nombre?.trim() || null, role: form.role }).eq('id', editandoId)
        if (error) throw error
        alert('Usuario actualizado correctamente')
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) throw new Error('Sesión no válida')

        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: form.email.trim(), password: form.password, role: form.role, nombre: form.nombre?.trim() || null })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Error al crear usuario')
        alert('Usuario creado correctamente')
      }
      resetearFormulario()
      cargarDatos()
    } catch (err: any) {
      alert(err.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarUsuario(id: string, authUserId: string) {
    if (!confirm('¿Seguro que desea eliminar este usuario?')) return
    if (!esAdmin) return alert('Solo administradores pueden eliminar usuarios')

    setGuardando(true)
    try {
      const res = await fetch(`/api/admin/users?authUserId=${authUserId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al eliminar')
      }
      cargarDatos()
    } catch (err: any) {
      alert(err.message || 'Error al eliminar')
    } finally {
      setGuardando(false)
    }
  }

  const usuariosFiltrados = usuarios.filter(u => !filtro.trim() || (u.nombre || '').toLowerCase().includes(filtro.toLowerCase()) || (u.email || '').toLowerCase().includes(filtro.toLowerCase()) || (u.role || '').toLowerCase().includes(filtro.toLowerCase()))
  const usuariosOrdenados = [...usuariosFiltrados].sort((a, b) => {
    const col = ordenColumna || 'nombre'
    const va = a[col] ?? ''
    const vb = b[col] ?? ''
    const cmp = String(va).localeCompare(String(vb), 'es')
    return ordenAsc ? cmp : -cmp
  })

  const toggleOrden = (col: OrdenCol) => {
    setOrdenColumna(col)
    setOrdenAsc(prev => ordenColumna === col ? !prev : true)
  }

  const ThSort = ({ col, label }: { col: OrdenCol; label: string }) => (
    <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100" onClick={() => toggleOrden(col)}>
      <span className="flex items-center gap-1">{label}{ordenColumna === col && <span className="text-[#356375]">{ordenAsc ? ' ↑' : ' ↓'}</span>}</span>
    </th>
  )

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4" />
          <p className="text-gray-600 font-medium">Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-600 text-sm mt-1">Gestión de usuarios y roles de la aplicación</p>
      </div>

      {!esAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 font-medium">Solo los administradores pueden crear, editar o eliminar usuarios.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, email o rol..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none transition"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
          </div>
          {esAdmin && (
            <button
              onClick={() => { resetearFormulario(); setForm({ nombre: '', email: '', password: '', role: 'clinico' }); setMostrarFormulario(true) }}
              className="bg-[#356375] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2d5566] transition-all shadow-md hover:shadow-lg whitespace-nowrap flex items-center justify-center gap-2 shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo usuario
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-[#356375] px-6 py-4">
          <h2 className="text-xl font-bold text-white">Usuarios registrados ({usuariosOrdenados.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <ThSort col="nombre" label="Nombre" />
                <ThSort col="email" label="Email" />
                <ThSort col="role" label="Rol" />
                <ThSort col="created_at" label="Fecha alta" />
                {esAdmin && <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuariosOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={esAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                    No hay usuarios registrados. {esAdmin && 'Cree el primer usuario como administrador.'}
                  </td>
                </tr>
              ) : (
                usuariosOrdenados.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.nombre || '—'}</td>
                    <td className="px-6 py-4 text-gray-700">{u.email || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-md text-sm font-medium ${u.role === 'administrador' ? 'bg-[#356375]/20 text-[#356375]' : 'bg-gray-100 text-gray-700'}`}>
                        {ROLES.find(r => r.value === u.role)?.label || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES', { dateStyle: 'short' }) : '—'}
                    </td>
                    {esAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => abrirEdicion(u)} title="Editar" className="p-2 rounded-lg text-[#356375] hover:bg-[#356375]/10 transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button type="button" onClick={() => eliminarUsuario(u.id, u.auth_user_id)} title="Eliminar" className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#356375] px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editandoId ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button onClick={resetearFormulario} className="text-white hover:bg-white/20 rounded-lg p-2 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={crearUsuario} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: María Luque"
                  className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={!!editandoId}
                />
                {editandoId && <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>}
              </div>
              {!editandoId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol <span className="text-red-500">*</span></label>
                <select
                  className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as Rol })}
                  required
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={guardando} className="flex-1 bg-[#356375] text-white py-2.5 rounded-lg font-semibold hover:bg-[#2d5566] transition disabled:opacity-50">
                  {guardando ? 'Guardando...' : (editandoId ? 'Guardar cambios' : 'Crear usuario')}
                </button>
                <button type="button" onClick={resetearFormulario} className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
