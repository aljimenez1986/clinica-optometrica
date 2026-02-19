'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type OrdenPaciente = 'id_paciente' | 'nombre' | 'genero' | 'fecha_nacimiento' | 'created_at' | 'telefono' | 'email' | 'graduacion_od' | 'graduacion_oi' | ''

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [ordenColumna, setOrdenColumna] = useState<OrdenPaciente>('created_at')
  const [ordenAsc, setOrdenAsc] = useState(false)
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
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  const [pacientesConResultados, setPacientesConResultados] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPacientes()
  }, [])

  useEffect(() => {
    async function fetchPacientesConResultados() {
      const { data, error } = await supabase
        .from('test_resultados')
        .select('paciente_id')
      if (error) return
      const ids = new Set((data || []).map((r: { paciente_id: string }) => r.paciente_id))
      setPacientesConResultados(ids)
    }
    fetchPacientesConResultados()
  }, [])

  async function fetchPacientes() {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error cargando pacientes:', error.message)
    else setPacientes(data || [])
  }

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

  function resetearFormulario() {
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
    setEditandoId(null)
    setMostrarFormulario(false)
  }

  function abrirFormularioEdicion(paciente: any) {
    setForm({
      id_paciente: paciente.id_paciente || '',
      nombre: paciente.nombre || '',
      genero: paciente.genero || '',
      genero_otro: paciente.genero_otro || '',
      fecha_nacimiento: paciente.fecha_nacimiento || '',
      telefono: paciente.telefono || '',
      email: paciente.email || '',
      graduacion_od: paciente.graduacion_od || '',
      graduacion_oi: paciente.graduacion_oi || '',
      observaciones: paciente.observaciones || ''
    })
    setEditandoId(paciente.id)
    setIdDuplicado(false)
    setMostrarFormulario(true)
  }

  async function guardarPaciente(e: React.FormEvent) {
    e.preventDefault()
    if (!form.id_paciente) return alert("El ID del paciente es obligatorio")
    if (!form.genero) return alert("El género es obligatorio")
    if (form.genero === 'otro' && !form.genero_otro) return alert("Debe especificar el género cuando selecciona 'Otro'")
    if (!form.fecha_nacimiento) return alert("La fecha de nacimiento es obligatoria")

    if (editandoId) {
      const pacienteOriginal = pacientes.find(p => p.id === editandoId)
      const idCambio = pacienteOriginal?.id_paciente !== form.id_paciente
      
      if (idCambio) {
        const idExiste = await verificarIdPaciente(form.id_paciente)
        if (idExiste) {
          setIdDuplicado(true)
          alert("Error: El ID del paciente '" + form.id_paciente + "' ya existe. Por favor, use un ID diferente.")
          return
        }
      }
    } else {
      const idExiste = await verificarIdPaciente(form.id_paciente)
      if (idExiste) {
        setIdDuplicado(true)
        alert("Error: El ID del paciente '" + form.id_paciente + "' ya existe. Por favor, use un ID diferente.")
        return
      }
    }

    setIdDuplicado(false)
    let error

    if (editandoId) {
      const { error: updateError } = await supabase
        .from('pacientes')
        .update(form)
        .eq('id', editandoId)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('pacientes').insert([form])
      error = insertError
    }
    
    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        setIdDuplicado(true)
        alert("Error: El ID del paciente ya existe en la base de datos. Por favor, use un ID diferente.")
      } else {
        alert("Error al guardar: " + error.message)
      }
    } else {
      resetearFormulario()
      fetchPacientes()
    }
  }

  async function handleIdPacienteChange(value: string) {
    setForm({...form, id_paciente: value})
    setIdDuplicado(false)
    
    if (editandoId) {
      const pacienteOriginal = pacientes.find(p => p.id === editandoId)
      if (pacienteOriginal?.id_paciente === value.trim()) {
        return
      }
    }
    
    if (value.trim().length > 0) {
      setVerificandoId(true)
      const existe = await verificarIdPaciente(value)
      setIdDuplicado(existe)
      setVerificandoId(false)
    }
  }

  const pacientesFiltrados = pacientes.filter(p => {
    if (!filtro.trim()) return true
    const busqueda = filtro.toLowerCase()
    return (
      (p.id_paciente?.toLowerCase().includes(busqueda)) ||
      (p.nombre?.toLowerCase().includes(busqueda)) ||
      (p.telefono?.toLowerCase().includes(busqueda)) ||
      (p.email?.toLowerCase().includes(busqueda)) ||
      (p.graduacion_od?.toLowerCase().includes(busqueda)) ||
      (p.graduacion_oi?.toLowerCase().includes(busqueda))
    )
  })

  const pacientesFiltradosOrdenados = useMemo(() => {
    const col = ordenColumna || 'created_at'
    const asc = ordenAsc
    return [...pacientesFiltrados].sort((a, b) => {
      let cmp = 0
      if (col === 'fecha_nacimiento') {
        cmp = new Date(a.fecha_nacimiento || 0).getTime() - new Date(b.fecha_nacimiento || 0).getTime()
      } else if (col === 'created_at') {
        cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      } else {
        const an = a[col] ?? ''
        const bn = b[col] ?? ''
        cmp = String(an).localeCompare(String(bn), 'es')
      }
      return asc ? cmp : -cmp
    })
  }, [pacientesFiltrados, ordenColumna, ordenAsc])

  const toggleOrden = (col: OrdenPaciente) => {
    if (ordenColumna === col) setOrdenAsc(a => !a)
    else {
      setOrdenColumna(col)
      setOrdenAsc(col === 'fecha_nacimiento' || col === 'created_at' ? false : true)
    }
  }

  const ThSort = ({ col, label, className = '' }: { col: OrdenPaciente; label: string; className?: string }) => (
    <th
      className={`px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 ${className}`}
      onClick={() => toggleOrden(col)}
    >
      <span className={`flex items-center gap-1 ${className.includes('text-center') ? 'justify-center' : ''}`}>
        {label}
        {ordenColumna === col && <span className="text-[#356375]">{ordenAsc ? ' ↑' : ' ↓'}</span>}
      </span>
    </th>
  )

  async function eliminarPaciente(id: string) {
    if (confirm("¿Seguro que quieres eliminar este paciente?")) {
      await supabase.from('pacientes').delete().eq('id', id)
      fetchPacientes()
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
        <p className="text-gray-600 text-sm mt-1">Registro de pacientes de la clínica</p>
      </div>
      {/* Barra de búsqueda y botón crear */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por ID, nombre, teléfono, email o graduación..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none transition"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              resetearFormulario()
              setMostrarFormulario(true)
            }}
            className="bg-[#356375] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2d5566] transition-all shadow-md hover:shadow-lg whitespace-nowrap flex items-center justify-center gap-2 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Paciente
          </button>
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
              <span className="font-semibold text-gray-900">{pacientesFiltrados.length}</span> de <span className="font-semibold text-gray-900">{pacientes.length}</span> pacientes encontrados
            </p>
          </div>
        )}
      </div>

      {/* Listado de Pacientes */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-[#356375] px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Registro de Pacientes {filtro ? `(${pacientesFiltrados.length} de ${pacientes.length})` : `(${pacientes.length})`}
          </h2>
          <p className="text-white/90 text-sm">Haz clic en una columna para ordenar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <ThSort col="created_at" label="Fecha creación" />
                <ThSort col="id_paciente" label="ID" />
                <ThSort col="nombre" label="Nombre" />
                <ThSort col="genero" label="Género" />
                <ThSort col="fecha_nacimiento" label="Fecha Nac." />
                <ThSort col="telefono" label="Teléfono" />
                <ThSort col="email" label="Email" />
                <ThSort col="graduacion_od" label="Graduación OD" className="text-center" />
                <ThSort col="graduacion_oi" label="Graduación OI" className="text-center" />
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pacientesFiltradosOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-500 font-medium">
                        {filtro ? 'No se encontraron pacientes con ese criterio de búsqueda.' : 'No hay pacientes registrados.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pacientesFiltradosOrdenados.map((p, index) => (
                  <tr key={p.id} className={`hover:bg-[#46788c]/10 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-[#356375]">{p.id_paciente || '-'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.nombre || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {p.genero === 'otro' ? p.genero_otro : (p.genero ? p.genero.charAt(0).toUpperCase() + p.genero.slice(1) : '-')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString('es-ES') : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {p.telefono ? (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {p.telefono}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {p.email ? (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {p.email}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#46788c]/20 text-[#356375]">
                        {p.graduacion_od || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800">
                        {p.graduacion_oi || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {pacientesConResultados.has(p.id) && (
                            <Link
                              href={`/admin/resultados?paciente=${encodeURIComponent(p.id)}`}
                              title="Historial de tests"
                              className="p-2 rounded-lg text-[#356375] hover:bg-[#356375]/10 transition"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </Link>
                          )}
                        <Link
                          href={`/ejecucion?paciente=${encodeURIComponent(p.id)}`}
                          title="Ejecutar test"
                          className="p-2 rounded-lg text-[#356375] hover:bg-[#356375]/10 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </Link>                        
                        <button
                          type="button"
                          onClick={() => abrirFormularioEdicion(p)}
                          title="Editar"
                          className="p-2 rounded-lg text-[#356375] hover:bg-[#356375]/10 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarPaciente(p.id)}
                          title="Eliminar"
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal/Formulario de Crear/Editar */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#356375] px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {editandoId ? 'Editar Paciente' : 'Registrar Nuevo Paciente'}
              </h2>
              <button
                onClick={resetearFormulario}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={guardarPaciente} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Campos Obligatorios</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID del Paciente <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    placeholder="Ej: PAC001" 
                    className={`w-full border p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none ${
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
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
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
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
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
                      className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
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
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                    value={form.nombre}
                    onChange={e => setForm({...form, nombre: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 mt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Datos de Contacto (Opcionales)</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input 
                    type="tel"
                    placeholder="Ej: 612345678" 
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
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
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 mt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Datos Ópticos</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Graduación Ojo Derecho
                  </label>
                  <input 
                    type="text"
                    placeholder="Graduación OD" 
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
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
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
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
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                    value={form.observaciones}
                    onChange={e => setForm({...form, observaciones: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2 flex gap-4 pt-4 border-t border-gray-200">
                  <button 
                    type="button"
                    onClick={resetearFormulario}
                    className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition border-2 border-gray-200"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-[#356375] text-white font-semibold py-3 rounded-lg hover:bg-[#2d5566] transition-all shadow-lg hover:shadow-xl"
                  >
                    {editandoId ? 'Guardar Cambios' : 'Registrar Paciente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

