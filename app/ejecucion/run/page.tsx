'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FILAS_OPTOPAD_COLOR = ['P', 'D', 'T'] as const
const PASOS_POR_FILA = 10
const OPCIONES_RESPUESTA = ['Arriba', 'Abajo', 'Izquierda', 'Derecha', 'Ninguna'] as const

type RespuestaUsuario = typeof OPCIONES_RESPUESTA[number]

interface PasoConfig {
  id: string
  orden: number
  valores_correctos?: string[]
}

function RunTestContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pacienteId = searchParams.get('paciente')
  const ipadId = searchParams.get('ipad')
  const testParam = searchParams.get('test')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testConfigId, setTestConfigId] = useState<string | null>(null)
  const [pasos, setPasos] = useState<PasoConfig[]>([])
  const [filaIndex, setFilaIndex] = useState(0)
  const [pasoIndex, setPasoIndex] = useState(0)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const [lastCorrect, setLastCorrect] = useState<[number, number, number]>([0, 0, 0])
  const [testFinished, setTestFinished] = useState(false)
  const [resultadoGuardado, setResultadoGuardado] = useState(false)
  const [showSalirConfirm, setShowSalirConfirm] = useState(false)

  const fila = FILAS_OPTOPAD_COLOR[filaIndex]
  const pasoNum = pasoIndex + 1
  const orden = filaIndex * PASOS_POR_FILA + pasoIndex + 1
  const pasoConfig = pasos.find(p => p.orden === orden)
  const respuestaCorrecta = pasoConfig?.valores_correctos?.[0]?.toLowerCase?.() ?? ''

  useEffect(() => {
    if (!pacienteId || !ipadId || testParam !== 'optopad_color') {
      setError('Parámetros inválidos. Debe indicar paciente, iPad y test Optopad Color.')
      setLoading(false)
      return
    }
    async function load() {
      const { data: configData, error: configError } = await supabase
        .from('test_configs')
        .select('id')
        .eq('ipad_id', ipadId)
        .eq('tipo_test', 'optopad_color')
        .single()

      if (configError || !configData) {
        setError('No hay configuración de Optopad Color para este iPad. Configúrela en Panel Admin.')
        setLoading(false)
        return
      }
      setTestConfigId(configData.id)

      const { data: pasosData, error: pasosError } = await supabase
        .from('test_pasos')
        .select('id, orden, valores_correctos')
        .eq('test_config_id', configData.id)
        .order('orden', { ascending: true })

      if (pasosError) {
        setError('Error al cargar los pasos del test.')
        setLoading(false)
        return
      }
      const list = (pasosData || []).map((p: any) => ({
        ...p,
        valores_correctos: Array.isArray(p.valores_correctos) ? p.valores_correctos : (typeof p.valores_correctos === 'string' ? (() => { try { return JSON.parse(p.valores_correctos) } catch { return [] } })() : [])
      }))
      setPasos(list)
      setLoading(false)
    }
    load()
  }, [pacienteId, ipadId, testParam])

  const salirSinGuardar = useCallback(() => {
    setShowSalirConfirm(false)
    router.push('/ejecucion')
  }, [router])

  const handleRespuesta = useCallback((respuesta: RespuestaUsuario) => {
    const esNinguna = respuesta === 'Ninguna'
    const valorUsuario = respuesta.toLowerCase().replace('ninguna', '')
    const correcto = !esNinguna && respuestaCorrecta && (valorUsuario === respuestaCorrecta || respuesta.toLowerCase() === respuestaCorrecta)

    if (correcto) {
      setLastCorrect(prev => {
        const next = [...prev] as [number, number, number]
        next[filaIndex] = pasoNum
        return next
      })
      setConsecutiveFailures(0)
      if (pasoIndex < PASOS_POR_FILA - 1) {
        setPasoIndex(p => p + 1)
      } else {
        if (filaIndex < FILAS_OPTOPAD_COLOR.length - 1) {
          setFilaIndex(i => i + 1)
          setPasoIndex(0)
        } else {
          setTestFinished(true)
        }
      }
    } else {
      const nextFailures = consecutiveFailures + 1
      setConsecutiveFailures(nextFailures)
      if (nextFailures >= 2) {
        setConsecutiveFailures(0)
        if (filaIndex < FILAS_OPTOPAD_COLOR.length - 1) {
          setFilaIndex(i => i + 1)
          setPasoIndex(0)
        } else {
          setTestFinished(true)
        }
      } else {
        if (pasoIndex < PASOS_POR_FILA - 1) {
          setPasoIndex(p => p + 1)
        } else {
          setConsecutiveFailures(0)
          if (filaIndex < FILAS_OPTOPAD_COLOR.length - 1) {
            setFilaIndex(i => i + 1)
            setPasoIndex(0)
          } else {
            setTestFinished(true)
          }
        }
      }
    }
  }, [filaIndex, pasoIndex, pasoNum, respuestaCorrecta, consecutiveFailures])

  useEffect(() => {
    if (!testFinished || !testConfigId || !pacienteId || resultadoGuardado) return
    const guardar = async () => {
      const { error: insertError } = await supabase.from('test_resultados').insert([{
        paciente_id: pacienteId,
        test_config_id: testConfigId,
        paso_actual: 0,
        datos_respuesta: {
          resultado_p: lastCorrect[0],
          resultado_d: lastCorrect[1],
          resultado_t: lastCorrect[2]
        }
      }])
      if (!insertError) setResultadoGuardado(true)
    }
    guardar()
  }, [testFinished, testConfigId, pacienteId, lastCorrect, resultadoGuardado])

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4" />
          <p className="text-gray-600 font-medium">Cargando test...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 max-w-xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/ejecucion')}
            className="bg-[#356375] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2d5566] transition"
          >
            Volver a ejecución
          </button>
        </div>
      </div>
    )
  }

  if (testFinished) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#356375] px-6 py-4">
            <h1 className="text-xl font-bold text-white">Test finalizado</h1>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-6">Última respuesta correcta por fila:</p>
            <dl className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <dt className="text-sm font-medium text-gray-500">Fila P</dt>
                <dd className="text-2xl font-bold text-[#356375] mt-1">{lastCorrect[0]}</dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <dt className="text-sm font-medium text-gray-500">Fila D</dt>
                <dd className="text-2xl font-bold text-[#356375] mt-1">{lastCorrect[1]}</dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <dt className="text-sm font-medium text-gray-500">Fila T</dt>
                <dd className="text-2xl font-bold text-[#356375] mt-1">{lastCorrect[2]}</dd>
              </div>
            </dl>
            <p className="text-sm text-gray-500 mb-6">
              {resultadoGuardado ? 'Resultado guardado correctamente.' : 'Guardando resultado...'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/ejecucion')}
              className="w-full bg-[#356375] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2d5566] transition"
            >
              Finalizar test
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 px-5 py-4 flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            Optopad Color — Fila {fila}, paso {pasoNum}
          </h2>
          <button
            type="button"
            onClick={() => setShowSalirConfirm(true)}
            className="text-red-600 hover:text-red-800 font-medium text-sm border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition"
          >
            Salir del test
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          {respuestaCorrecta ? (
            <p className="text-sm font-medium text-[#356375] mb-2">
              Respuesta esperada: <span className="font-semibold capitalize">{respuestaCorrecta}</span>
            </p>
          ) : (
            <p className="text-sm text-amber-600 mb-2">Sin respuesta configurada para este paso.</p>
          )}
          <p className="text-sm text-gray-600 mb-1">
            Última respuesta correcta en esta fila: <span className="font-semibold text-gray-900">{lastCorrect[filaIndex]}</span>
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Resumen por fila — P: {lastCorrect[0]} · D: {lastCorrect[1]} · T: {lastCorrect[2]}
          </p>
          <p className="text-gray-600 mb-6">¿Qué dirección percibe el paciente?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OPCIONES_RESPUESTA.map(opcion => (
              <button
                key={opcion}
                type="button"
                onClick={() => handleRespuesta(opcion)}
                className={`py-4 px-4 rounded-xl font-medium border-2 transition ${
                  opcion === 'Ninguna'
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    : 'border-[#356375] text-[#356375] hover:bg-[#356375]/10'
                }`}
              >
                {opcion}
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>

      {showSalirConfirm && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Salir del test</h3>
            <p className="text-gray-600 mb-6">
              Si sales ahora, los resultados no se guardarán. ¿Quieres salir igualmente?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSalirConfirm(false)}
                className="flex-1 py-2.5 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salirSinGuardar}
                className="flex-1 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RunTestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4" />
            <p className="text-gray-600 font-medium">Cargando test...</p>
          </div>
        </div>
      }
    >
      <RunTestContent />
    </Suspense>
  )
}
