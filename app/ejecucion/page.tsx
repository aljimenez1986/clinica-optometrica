'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type TipoTest = 'rejilla_amsler' | 'agudeza_visual' | 'optopad_color' | 'optopad_csf'

const tiposTest = [
  { id: 'rejilla_amsler' as TipoTest, nombre: 'Rejilla de Amsler', icono: '📐' },
  { id: 'agudeza_visual' as TipoTest, nombre: 'Agudeza Visual', icono: '👁️' },
  { id: 'optopad_color' as TipoTest, nombre: 'Optopad Color', icono: '🎨' },
  { id: 'optopad_csf' as TipoTest, nombre: 'Optopad CSF', icono: '📊' }
]

function EjecucionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pacienteFromUrl = searchParams.get('paciente')
  const [pacientes, setPacientes] = useState<any[]>([])
  const [ipads, setIpads] = useState<any[]>([])
  const [pacienteId, setPacienteId] = useState<string>('')
  const [ipadId, setIpadId] = useState<string>('')
  const [testSeleccionado, setTestSeleccionado] = useState<TipoTest | ''>('')
  const aplicadoPacienteUrl = useRef(false)

  useEffect(() => {
    async function load() {
      const [pacRes, ipadRes] = await Promise.all([
        supabase.from('pacientes').select('*').order('nombre').order('created_at', { ascending: false }),
        supabase.from('ipads').select('*').order('nombre')
      ])
      const listaPacientes = pacRes.data ?? []
      const listaIpads = ipadRes.data ?? []
      setPacientes(listaPacientes)
      setIpads(listaIpads)
      if (pacienteFromUrl && !aplicadoPacienteUrl.current && listaPacientes.some((p: any) => p.id === pacienteFromUrl)) {
        setPacienteId(pacienteFromUrl)
        aplicadoPacienteUrl.current = true
      }
    }
    load()
  }, [pacienteFromUrl])

  const paciente = pacientes.find(p => p.id === pacienteId)
  const ipad = ipads.find(i => i.id === ipadId)
  const puedeIniciar = pacienteId && ipadId && testSeleccionado

  return (
    <div className="p-6">
      <div className="mb-8">
        <p className="text-gray-600">Seleccione paciente, iPad y test para iniciar la ejecución.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paciente */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#356375] px-5 py-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Paciente
            </h2>
          </div>
          <div className="p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar paciente</label>
            <select
              value={pacienteId}
              onChange={e => setPacienteId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
            >
              <option value="">— Elija un paciente</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id_paciente} — {p.nombre || '(Sin nombre)'}
                </option>
              ))}
            </select>
            {pacientes.length === 0 && (
              <p className="text-amber-600 text-sm mt-2">No hay pacientes. Regístrelos en el Panel Admin.</p>
            )}
          </div>
        </div>

        {/* iPad */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#356375] px-5 py-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              iPad
            </h2>
          </div>
          <div className="p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar iPad</label>
            <select
              value={ipadId}
              onChange={e => setIpadId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
            >
              <option value="">— Elija un iPad</option>
              {ipads.map(i => (
                <option key={i.id} value={i.id}>
                  {i.nombre} — {i.marca} {i.modelo}
                </option>
              ))}
            </select>
            {ipads.length === 0 && (
              <p className="text-amber-600 text-sm mt-2">No hay iPads. Regístrelos en el Panel Admin.</p>
            )}
          </div>
        </div>

        {/* Test */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#356375] px-5 py-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Test
            </h2>
          </div>
          <div className="p-5">
            <label className="block text-sm font-medium text-gray-700 mb-3">Seleccionar test</label>
            <div className="grid grid-cols-2 gap-2">
              {tiposTest.map(tipo => (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => setTestSeleccionado(tipo.id)}
                  className={`p-3 border-2 rounded-lg text-left text-sm font-medium transition ${
                    testSeleccionado === tipo.id
                      ? 'border-[#356375] bg-[#356375]/10 text-[#356375]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="text-lg block mb-1">{tipo.icono}</span>
                  {tipo.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen y acción */}
      <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 font-medium">Paciente</dt>
            <dd className="text-gray-900 mt-0.5">{paciente ? `${paciente.id_paciente} — ${paciente.nombre || '(Sin nombre)'}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium">iPad</dt>
            <dd className="text-gray-900 mt-0.5">{ipad ? `${ipad.nombre} (${ipad.marca} ${ipad.modelo})` : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium">Test</dt>
            <dd className="text-gray-900 mt-0.5">{testSeleccionado ? tiposTest.find(t => t.id === testSeleccionado)?.nombre : '—'}</dd>
          </div>
        </dl>
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            disabled={!puedeIniciar}
            onClick={() => {
              if (testSeleccionado === 'optopad_color') {
                const params = new URLSearchParams({
                  paciente: pacienteId,
                  ipad: ipadId,
                  test: testSeleccionado
                })
                router.push(`/ejecucion/run?${params.toString()}`)
              } else {
                alert('De momento solo está disponible el test Optopad Color.')
              }
            }}
            className="bg-[#356375] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2d5566] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Iniciar test
          </button>
          {!puedeIniciar && (
            <p className="text-gray-500 text-sm mt-2">Seleccione paciente, iPad y test para habilitar el inicio.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EjecucionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4" />
            <p className="text-gray-600 font-medium">Cargando...</p>
          </div>
        </div>
      }
    >
      <EjecucionContent />
    </Suspense>
  )
}
