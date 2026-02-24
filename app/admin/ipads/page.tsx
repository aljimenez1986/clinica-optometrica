'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type OrdenIpad = 'nombre' | 'marca' | 'modelo' | ''

export default function IpadsPage() {
  const [ipads, setIpads] = useState<any[]>([])
  const [clinicos, setClinicos] = useState<{ id: string; nombre?: string; email: string }[]>([])
  const [esAdmin, setEsAdmin] = useState(false)
  const [form, setForm] = useState({ nombre: '', marca: '', modelo: '', clinicosIds: [] as string[] })
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  const [ordenColumna, setOrdenColumna] = useState<OrdenIpad>('nombre')
  const [ordenAsc, setOrdenAsc] = useState(true)

  useEffect(() => {
    verificarRol()
    fetchIpads()
    fetchClinicos()
  }, [])

  async function verificarRol() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('app_usuario').select('role').eq('auth_user_id', user.id).single()
    setEsAdmin(data?.role === 'administrador')
  }

  async function fetchIpads() {
    const { data, error } = await supabase
      .from('ipads')
      .select('*, ipad_clinico(usuario_id)')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error cargando iPads:', error.message)
      return
    }
    setIpads(data || [])
  }

  async function fetchClinicos() {
    const { data, error } = await supabase
      .from('app_usuario')
      .select('id, nombre, email')
      .eq('role', 'clinico')
      .order('email')
    if (error) {
      console.error('Error cargando clínicos:', error.message)
      return
    }
    setClinicos(data || [])
  }

  function resetearFormulario() {
    setForm({ nombre: '', marca: '', modelo: '', clinicosIds: [] })
    setEditandoId(null)
    setMostrarFormulario(false)
  }

  async function abrirFormularioEdicion(ipad: any) {
    let clinicosIds: string[] = []
    const { data } = await supabase.from('ipad_clinico').select('usuario_id').eq('ipad_id', ipad.id)
    if (data) clinicosIds = data.map((r: { usuario_id: string }) => r.usuario_id)
    setForm({
      nombre: ipad.nombre || '',
      marca: ipad.marca || '',
      modelo: ipad.modelo || '',
      clinicosIds
    })
    setEditandoId(ipad.id)
    setMostrarFormulario(true)
  }

  async function guardarIpad(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre?.trim()) return alert('El nombre es obligatorio')
    if (!form.marca?.trim()) return alert('La marca es obligatoria')
    if (!form.modelo?.trim()) return alert('El modelo es obligatorio')

    const { nombre, marca, modelo, clinicosIds } = form
    const payload = { nombre, marca, modelo }

    let ipadId: string
    if (editandoId) {
      const { error } = await supabase.from('ipads').update(payload).eq('id', editandoId)
      if (error) {
        alert('Error al actualizar: ' + error.message)
        return
      }
      ipadId = editandoId
    } else {
      const { data, error } = await supabase.from('ipads').insert([payload]).select('id').single()
      if (error) {
        alert('Error al crear: ' + error.message)
        return
      }
      ipadId = data.id
    }

    await supabase.from('ipad_clinico').delete().eq('ipad_id', ipadId)
    if (clinicosIds.length > 0) {
      await supabase.from('ipad_clinico').insert(clinicosIds.map(usuario_id => ({ ipad_id: ipadId, usuario_id })))
    }

    resetearFormulario()
    fetchIpads()
  }

  async function eliminarIpad(id: string) {
    if (!confirm('¿Seguro que desea eliminar este iPad? Las configuraciones de tests asociadas también se verán afectadas.')) return
    const { error } = await supabase.from('ipads').delete().eq('id', id)
    if (error) {
      alert('Error al eliminar: ' + error.message)
      return
    }
    fetchIpads()
  }

  const ipadsFiltrados = ipads.filter(i => {
    if (!filtro.trim()) return true
    const b = filtro.toLowerCase()
    return (i.nombre?.toLowerCase().includes(b)) || (i.marca?.toLowerCase().includes(b)) || (i.modelo?.toLowerCase().includes(b))
  })

  const ipadsFiltradosOrdenados = useMemo(() => {
    const col = ordenColumna || 'nombre'
    const asc = ordenAsc
    return [...ipadsFiltrados].sort((a, b) => {
      const cmp = String(a[col] ?? '').localeCompare(String(b[col] ?? ''), 'es')
      return asc ? cmp : -cmp
    })
  }, [ipadsFiltrados, ordenColumna, ordenAsc])

  const toggleOrden = (col: OrdenIpad) => {
    if (ordenColumna === col) setOrdenAsc(a => !a)
    else {
      setOrdenColumna(col)
      setOrdenAsc(true)
    }
  }

  const ThSort = ({ col, label }: { col: OrdenIpad; label: string }) => (
    <th
      className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
      onClick={() => toggleOrden(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {ordenColumna === col && <span className="text-[#356375]">{ordenAsc ? ' ↑' : ' ↓'}</span>}
      </span>
    </th>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">iPads</h1>
        <p className="text-gray-600 text-sm mt-1">Dispositivos registrados para la ejecución de tests</p>
      </div>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, marca o modelo..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none transition"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
          </div>
          {esAdmin && (
          <button
            onClick={() => { resetearFormulario(); setForm(f => ({ ...f, clinicosIds: [] })); setMostrarFormulario(true) }}
            className="bg-[#356375] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2d5566] transition-all shadow-md hover:shadow-lg whitespace-nowrap flex items-center justify-center gap-2 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo iPad
          </button>
          )}
          {filtro.trim() && (
            <button
              type="button"
              onClick={() => setFiltro('')}
              className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 whitespace-nowrap shrink-0"
            >
              Limpiar filtros
            </button>
          )}
        </div>
        {filtro && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{ipadsFiltrados.length}</span> de <span className="font-semibold text-gray-900">{ipads.length}</span> iPads
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-[#356375] px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            iPads registrados {filtro ? `(${ipadsFiltrados.length} de ${ipads.length})` : `(${ipads.length})`}
          </h2>
          <p className="text-white/90 text-sm">Haz clic en una columna para ordenar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <ThSort col="nombre" label="Nombre" />
                <ThSort col="marca" label="Marca" />
                <ThSort col="modelo" label="Modelo" />
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Clínicos asignados</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ipadsFiltradosOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-500 font-medium">
                        {filtro ? 'No hay iPads que coincidan con la búsqueda.' : 'No hay iPads registrados. Añada uno para configurar tests por dispositivo.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                ipadsFiltradosOrdenados.map((i, idx) => {
                  const asignados = (i.ipad_clinico || []).map((ic: any) => {
                    const c = clinicos.find(x => x.id === ic.usuario_id)
                    return c ? (c.nombre || c.email) : ic.usuario_id
                  }).filter(Boolean)
                  return (
                  <tr key={i.id} className={`hover:bg-[#46788c]/10 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">{i.nombre || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{i.marca || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{i.modelo || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {asignados.length > 0 ? asignados.join(', ') : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {esAdmin && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirFormularioEdicion(i)}
                          title="Editar"
                          className="p-2 rounded-lg text-[#356375] hover:bg-[#356375]/10 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarIpad(i.id)}
                          title="Eliminar"
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      )}
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#356375] px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {editandoId ? 'Editar iPad' : 'Nuevo iPad'}
              </h2>
              <button onClick={resetearFormulario} className="text-white hover:bg-white/20 rounded-lg p-2 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={guardarIpad} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Ej: iPad consultorio 1"
                  className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Ej: Apple"
                  className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                  value={form.marca}
                  onChange={e => setForm({ ...form, marca: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Ej: iPad Pro 12.9 (6ª gen)"
                  className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                  value={form.modelo}
                  onChange={e => setForm({ ...form, modelo: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clínicos asignados</label>
                <p className="text-xs text-gray-500 mb-2">Opcional. Seleccione los clínicos que pueden usar este iPad.</p>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50/50 space-y-2">
                  {clinicos.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay clínicos registrados. Cree usuarios con rol Clínico en Usuarios.</p>
                  ) : (
                    clinicos.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/60 rounded px-2 py-1">
                        <input
                          type="checkbox"
                          checked={form.clinicosIds.includes(c.id)}
                          onChange={e => {
                            if (e.target.checked) setForm(f => ({ ...f, clinicosIds: [...f.clinicosIds, c.id] }))
                            else setForm(f => ({ ...f, clinicosIds: f.clinicosIds.filter(id => id !== c.id) }))
                          }}
                          className="rounded border-gray-300 text-[#356375] focus:ring-[#356375]"
                        />
                        <span className="text-gray-900">{c.nombre || c.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-[#356375] text-white py-2.5 rounded-lg font-semibold hover:bg-[#2d5566] transition">
                  {editandoId ? 'Guardar cambios' : 'Crear iPad'}
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
