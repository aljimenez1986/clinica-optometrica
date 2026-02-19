'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const NOMBRES_TIPO_TEST: Record<string, string> = {
  rejilla_amsler: 'Rejilla de Amsler',
  agudeza_visual: 'Agudeza Visual',
  optopad_color: 'Optopad Color',
  optopad_csf: 'Optopad CSF'
}

const TIPOS_TEST_OPCIONES = [
  { value: '', label: 'Todos los tests' },
  ...Object.entries(NOMBRES_TIPO_TEST).map(([value, label]) => ({ value, label }))
]

type OrdenColumna = 'fecha' | 'paciente' | 'edad' | 'test' | 'ipad' | 'p' | 'd' | 't' | ''

function edadEnFecha(fechaNacimiento: string | null | undefined, fechaTest: string | null | undefined): number | null {
  if (!fechaNacimiento || !fechaTest) return null
  const birth = new Date(fechaNacimiento)
  const test = new Date(fechaTest)
  if (isNaN(birth.getTime()) || isNaN(test.getTime())) return null
  let edad = test.getFullYear() - birth.getFullYear()
  const cumpleEsteAnio = test.getMonth() > birth.getMonth() || (test.getMonth() === birth.getMonth() && test.getDate() >= birth.getDate())
  if (!cumpleEsteAnio) edad -= 1
  return edad >= 0 ? edad : null
}

type Row = {
  id: string
  paciente_id: string
  fecha_realizacion: string | null
  datos_respuesta: any
  test_config_id: string
  test_configs: { tipo_test?: string } | null
  _ipads: { nombre?: string; marca?: string; modelo?: string } | null
  _paciente: { id: string; id_paciente?: string; nombre?: string; fecha_nacimiento?: string } | null
}

export default function TestsPage() {
  const [resultados, setResultados] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [ordenColumna, setOrdenColumna] = useState<OrdenColumna>('fecha')
  const [ordenAsc, setOrdenAsc] = useState(false)

  useEffect(() => {
    async function load() {
      const resRes = await supabase
        .from('test_resultados')
        .select('id, paciente_id, fecha_realizacion, datos_respuesta, test_config_id')
        .order('fecha_realizacion', { ascending: false })

      if (resRes.error) {
        console.error('Error cargando resultados:', resRes.error)
        setResultados([])
        setLoading(false)
        return
      }

      const lista = resRes.data ?? []
      if (lista.length === 0) {
        setResultados([])
        setLoading(false)
        return
      }

      const pacienteIds = [...new Set(lista.map((r: any) => r.paciente_id).filter(Boolean))]
      const configIds = [...new Set(lista.map((r: any) => r.test_config_id).filter(Boolean))]

      const [pacientesRes, configsRes] = await Promise.all([
        supabase.from('pacientes').select('id, id_paciente, nombre, fecha_nacimiento').in('id', pacienteIds),
        supabase.from('test_configs').select('id, tipo_test, ipad_id').in('id', configIds)
      ])

      const pacientes = (pacientesRes.data ?? []).reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p
        return acc
      }, {})
      const configs = (configsRes.data ?? []).reduce((acc: Record<string, any>, c: any) => {
        acc[c.id] = c
        return acc
      }, {})

      const ipadIds = [...new Set((configsRes.data ?? []).map((c: any) => c.ipad_id).filter(Boolean))]
      let ipads: Record<string, any> = {}
      if (ipadIds.length > 0) {
        const ipadsRes = await supabase.from('ipads').select('id, nombre, marca, modelo').in('id', ipadIds)
        ipads = (ipadsRes.data ?? []).reduce((acc: Record<string, any>, i: any) => {
          acc[i.id] = i
          return acc
        }, {})
      }

      const rows: Row[] = lista.map((r: any) => ({
        ...r,
        test_configs: r.test_config_id ? configs[r.test_config_id] ?? null : null,
        _ipads: r.test_config_id && configs[r.test_config_id]?.ipad_id
          ? ipads[configs[r.test_config_id].ipad_id] ?? null
          : null,
        _paciente: r.paciente_id ? pacientes[r.paciente_id] ?? null : null
      }))

      setResultados(rows)
      setLoading(false)
    }
    load()
  }, [])

  const config = (r: Row) => r.test_configs ?? {}
  const ipad = (r: Row) => r._ipads ?? null
  const paciente = (r: Row) => r._paciente ?? null
  const datos = (r: Row) => (r.datos_respuesta && typeof r.datos_respuesta === 'object' ? r.datos_respuesta : {})

  const resultadosFiltradosOrdenados = useMemo(() => {
    const busquedaNorm = busqueda.trim().toLowerCase()
    const filtrados = resultados.filter((r) => {
      if (filtroTipo) {
        const cfg = config(r)
        if ((cfg.tipo_test || '') !== filtroTipo) return false
      }
      if (busquedaNorm) {
        const cfg = config(r)
        const ipadInfo = ipad(r)
        const pac = paciente(r)
        const d = datos(r)
        const tipo = cfg.tipo_test || ''
        const nombreTest = (NOMBRES_TIPO_TEST[tipo] || tipo).toLowerCase()
        const ipadStr = ipadInfo ? (ipadInfo.nombre || '') + (ipadInfo.marca || '') + (ipadInfo.modelo || '') : ''
        const pacStr = pac ? (pac.id_paciente || '') + (pac.nombre || '') : ''
        const fechaStr = r.fecha_realizacion ? new Date(r.fecha_realizacion).toLocaleString('es-ES') : ''
        const edadVal = edadEnFecha(pac?.fecha_nacimiento, r.fecha_realizacion)
        const edadStr = edadVal !== null ? String(edadVal) : ''
        const texto = [nombreTest, ipadStr, pacStr, fechaStr, edadStr, String(d.resultado_p ?? ''), String(d.resultado_d ?? ''), String(d.resultado_t ?? '')].join(' ').toLowerCase()
        if (!texto.includes(busquedaNorm)) return false
      }
      return true
    })

    const col = ordenColumna || 'fecha'
    const asc = ordenAsc
    return [...filtrados].sort((a, b) => {
      const cfgA = config(a)
      const cfgB = config(b)
      const ipadA = ipad(a)
      const ipadB = ipad(b)
      const pacA = paciente(a)
      const pacB = paciente(b)
      const dA = datos(a)
      const dB = datos(b)
      let cmp = 0
      switch (col) {
        case 'fecha':
          cmp = new Date(a.fecha_realizacion || 0).getTime() - new Date(b.fecha_realizacion || 0).getTime()
          break
        case 'paciente':
          cmp = (pacA?.nombre || pacA?.id_paciente || '').localeCompare(pacB?.nombre || pacB?.id_paciente || '')
          break
        case 'edad': {
          const edadA = edadEnFecha(pacA?.fecha_nacimiento, a.fecha_realizacion) ?? -1
          const edadB = edadEnFecha(pacB?.fecha_nacimiento, b.fecha_realizacion) ?? -1
          cmp = edadA - edadB
          break
        }
        case 'test':
          cmp = (NOMBRES_TIPO_TEST[cfgA.tipo_test as string] || '').localeCompare(NOMBRES_TIPO_TEST[cfgB.tipo_test as string] || '')
          break
        case 'ipad':
          cmp = (ipadA?.nombre || '').localeCompare(ipadB?.nombre || '')
          break
        case 'p':
          cmp = (typeof dA.resultado_p === 'number' ? dA.resultado_p : -1) - (typeof dB.resultado_p === 'number' ? dB.resultado_p : -1)
          break
        case 'd':
          cmp = (typeof dA.resultado_d === 'number' ? dA.resultado_d : -1) - (typeof dB.resultado_d === 'number' ? dB.resultado_d : -1)
          break
        case 't':
          cmp = (typeof dA.resultado_t === 'number' ? dA.resultado_t : -1) - (typeof dB.resultado_t === 'number' ? dB.resultado_t : -1)
          break
        default:
          cmp = new Date(a.fecha_realizacion || 0).getTime() - new Date(b.fecha_realizacion || 0).getTime()
      }
      return asc ? cmp : -cmp
    })
  }, [resultados, busqueda, filtroTipo, ordenColumna, ordenAsc])

  const tieneFiltros = Boolean(busqueda.trim() || filtroTipo)

  const toggleOrden = (col: OrdenColumna) => {
    if (ordenColumna === col) setOrdenAsc((a) => !a)
    else {
      setOrdenColumna(col)
      setOrdenAsc(col === 'fecha' ? false : true)
    }
  }

  const ThOrden = ({ col, label, className = '' }: { col: OrdenColumna; label: string; className?: string }) => (
    <th
      className={`px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 ${className}`}
      onClick={() => toggleOrden(col)}
    >
      <span className={`flex items-center gap-1 ${className.includes('text-center') ? 'justify-center' : ''}`}>
        {label}
        {ordenColumna === col && (
          <span className="text-[#356375]" aria-hidden>
            {ordenAsc ? ' ↑' : ' ↓'}
          </span>
        )}
      </span>
    </th>
  )

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4" />
          <p className="text-gray-600 font-medium">Cargando resultados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Tests
        </h1>
        <p className="text-gray-600 text-sm mt-1">Historial de tests de todos los pacientes</p>
      </div>

      {/* Recuadro búsqueda + filtros + nuevo (misma posición que Pacientes e iPads) */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por paciente, fecha, test, iPad, edad o resultados..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none transition"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="filtro-tipo" className="text-sm font-medium text-gray-700 whitespace-nowrap">Tipo de test:</label>
            <select
              id="filtro-tipo"
              className="border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none min-w-[180px]"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              {TIPOS_TEST_OPCIONES.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Link
            href="/admin/ejecucion"
            className="bg-[#356375] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2d5566] transition-all shadow-md hover:shadow-lg whitespace-nowrap flex items-center justify-center gap-2 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo test
          </Link>
          {tieneFiltros && (
            <button
              type="button"
              onClick={() => { setBusqueda(''); setFiltroTipo('') }}
              className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 whitespace-nowrap shrink-0"
            >
              Limpiar filtros
            </button>
          )}
        </div>
        {(busqueda.trim() || filtroTipo) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{resultadosFiltradosOrdenados.length}</span> de <span className="font-semibold text-gray-900">{resultados.length}</span> resultados
            </p>
          </div>
        )}
      </div>

      {resultados.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 font-medium">No hay resultados de tests registrados.</p>
          <Link
            href="/admin/pacientes"
            className="inline-block mt-4 text-[#356375] font-medium hover:underline"
          >
            Ir a Pacientes
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#356375] px-6 py-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Resultados
                {tieneFiltros ? ` (${resultadosFiltradosOrdenados.length} de ${resultados.length})` : ` (${resultados.length})`}
              </h2>
              <p className="text-white/90 text-sm">Haz clic en una columna para ordenar</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <ThOrden col="fecha" label="Fecha" />
                    <ThOrden col="paciente" label="Paciente" />
                    <ThOrden col="edad" label="Edad" className="text-center" />
                    <ThOrden col="test" label="Test" />
                    <ThOrden col="ipad" label="iPad" />
                    <ThOrden col="p" label="P" className="text-center" />
                    <ThOrden col="d" label="D" className="text-center" />
                    <ThOrden col="t" label="T" className="text-center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resultadosFiltradosOrdenados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        No hay resultados que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    resultadosFiltradosOrdenados.map((r) => {
                      const cfg = config(r)
                      const ipadInfo = ipad(r)
                      const pac = paciente(r)
                      const d = datos(r)
                      const tipo = cfg.tipo_test || ''
                      const nombreTest = NOMBRES_TIPO_TEST[tipo] || tipo || '—'
                      const ipadNombre = ipadInfo
                        ? (ipadInfo.nombre ?? '—') + (ipadInfo.marca || ipadInfo.modelo ? ` (${[ipadInfo.marca, ipadInfo.modelo].filter(Boolean).join(' ')})` : '')
                        : '—'
                      const tieneOptopad = tipo === 'optopad_color'
                      const edad = edadEnFecha(pac?.fecha_nacimiento, r.fecha_realizacion)
                      const pacienteLabel = pac ? `${pac.id_paciente || ''} ${pac.nombre || ''}`.trim() || '—' : '—'
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                            {r.fecha_realizacion
                              ? new Date(r.fecha_realizacion).toLocaleString('es-ES', {
                                  dateStyle: 'short',
                                  timeStyle: 'short'
                                })
                              : '—'}
                          </td>
                          <td className="px-6 py-4">
                            {r.paciente_id ? (
                              <Link
                                href={`/admin/resultados?paciente=${encodeURIComponent(r.paciente_id)}`}
                                className="text-[#356375] font-medium hover:underline"
                              >
                                {pacienteLabel}
                              </Link>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-700">
                            {edad !== null ? `${edad} años` : '—'}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{nombreTest}</td>
                          <td className="px-6 py-4 text-gray-700">{ipadNombre}</td>
                          <td className="px-6 py-4 text-center">
                            {tieneOptopad && typeof d.resultado_p === 'number' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#46788c]/20 text-[#356375]">
                                {d.resultado_p}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {tieneOptopad && typeof d.resultado_d === 'number' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#46788c]/20 text-[#356375]">
                                {d.resultado_d}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {tieneOptopad && typeof d.resultado_t === 'number' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#46788c]/20 text-[#356375]">
                                {d.resultado_t}
                              </span>
                            ) : (
                              '—'
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
        </>
      )}
    </div>
  )
}
