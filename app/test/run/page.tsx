'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
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
  valor_decimal?: string | number | null
}

function calcularResultadoFila(pasosList: PasoConfig[], filaIdx: number, ultimoPaso: number): number | null {
  if (ultimoPaso < 0) return null
  const baseOrden = filaIdx * PASOS_POR_FILA
  const getVal = (k: number): number | null => {
    const paso = pasosList.find(p => p.orden === baseOrden + k)
    const v = paso?.valor_decimal
    if (v == null || v === '') return null
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    return isNaN(n) ? null : n
  }
  const P1 = getVal(1), P2 = getVal(2), P8 = getVal(8), P9 = getVal(9)
  if (ultimoPaso === 0) {
    if (P1 != null && P2 != null && P2 !== 0) return (P1 * P1) / P2
    return null
  }
  if (ultimoPaso >= 8 && ultimoPaso <= 9) {
    if (P9 != null && P8 != null && P8 !== 0) return (P9 * P9) / P8
    return null
  }
  if (ultimoPaso >= 1 && ultimoPaso <= 7) {
    const Pk = getVal(ultimoPaso + 1)
    const Pk1 = getVal(ultimoPaso + 2)
    if (Pk != null && Pk1 != null) return (Pk + Pk1) / 2
  }
  return null
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Sesión no válida.')
        setLoading(false)
        return
      }
      const { data: perfil } = await supabase.from('app_usuario').select('id, role').eq('auth_user_id', user.id).single()
      const esAdmin = perfil?.role === 'administrador'
      if (!esAdmin && perfil?.id) {
        const [pacRes, icRes] = await Promise.all([
          supabase.from('pacientes').select('registrado_por').eq('id', pacienteId).single(),
          supabase.from('ipad_clinico').select('ipad_id').eq('usuario_id', perfil.id).eq('ipad_id', ipadId).maybeSingle()
        ])
        const pacienteOk = pacRes.data?.registrado_por === perfil.id
        const ipadOk = icRes.data != null
        if (!pacienteOk || !ipadOk) {
          setError('No tiene permiso para ejecutar tests con este paciente o iPad.')
          setLoading(false)
          return
        }
      }

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
        .select('id, orden, valores_correctos, valor_decimal')
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
    router.push(pacienteId ? `/test?paciente=${encodeURIComponent(pacienteId)}` : '/test')
  }, [router, pacienteId])

  const handleRespuesta = useCallback((respuesta: RespuestaUsuario) => {
    const esNinguna = respuesta === 'Ninguna'
    const valorUsuario = respuesta.toLowerCase().replace('ninguna', '')
    const correcto = !esNinguna && respuestaCorrecta && (valorUsuario === respuestaCorrecta || respuesta.toLowerCase() === respuestaCorrecta)

    if (correcto) {
      setLastCorrect(prev => {
        const next = [...prev] as [number, number, number]
        next[filaIndex] = pasoIndex + 1
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
  }, [filaIndex, pasoIndex, respuestaCorrecta, consecutiveFailures])

  useEffect(() => {
    if (!testFinished || !testConfigId || !pacienteId || resultadoGuardado) return
    const guardar = async () => {
      const ultimoP = lastCorrect[0] >= 1 ? lastCorrect[0] - 1 : -1
      const ultimoD = lastCorrect[1] >= 1 ? lastCorrect[1] - 1 : -1
      const ultimoT = lastCorrect[2] >= 1 ? lastCorrect[2] - 1 : -1
      const rP = calcularResultadoFila(pasos, 0, ultimoP)
      const rD = calcularResultadoFila(pasos, 1, ultimoD)
      const rT = calcularResultadoFila(pasos, 2, ultimoT)
      const datosRespuesta: Record<string, unknown> = {
        resultado_p: lastCorrect[0],
        resultado_d: lastCorrect[1],
        resultado_t: lastCorrect[2],
        resultado_p_valor: rP ?? null,
        resultado_d_valor: rD ?? null,
        resultado_t_valor: rT ?? null
      }
      const { error: insertError } = await supabase.from('test_resultados').insert([{
        paciente_id: pacienteId,
        test_config_id: testConfigId,
        paso_actual: 0,
        datos_respuesta: datosRespuesta
      }])
      if (!insertError) setResultadoGuardado(true)
    }
    guardar()
  }, [testFinished, testConfigId, pacienteId, lastCorrect, resultadoGuardado, pasos])

  const backHref = pacienteId ? `/test?paciente=${encodeURIComponent(pacienteId)}` : '/test'
  const BackLink = () => (
    <Link href={backHref} className="text-[#356375] font-medium hover:underline flex items-center gap-1">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Volver a Ejecución
    </Link>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto mb-6">
          <BackLink />
        </div>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4" />
            <p className="text-gray-600 font-medium">Cargando test...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 max-w-xl mx-auto">
        <div className="mb-6">
          <BackLink />
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium mb-4">{error}</p>
          <Link href={backHref} className="inline-block bg-[#356375] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2d5566] transition">
            Volver a Ejecución
          </Link>
        </div>
      </div>
    )
  }

  if (testFinished) {
    const ultimoP = lastCorrect[0] >= 1 ? lastCorrect[0] - 1 : -1
    const ultimoD = lastCorrect[1] >= 1 ? lastCorrect[1] - 1 : -1
    const ultimoT = lastCorrect[2] >= 1 ? lastCorrect[2] - 1 : -1
    const rP = calcularResultadoFila(pasos, 0, ultimoP)
    const rD = calcularResultadoFila(pasos, 1, ultimoD)
    const rT = calcularResultadoFila(pasos, 2, ultimoT)
    return (
      <div className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <BackLink />
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#356375] px-6 py-4">
            <h1 className="text-xl font-bold text-white">Test finalizado</h1>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-6">Último paso correcto (1–10) y resultado por fila:</p>
            <dl className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <dt className="text-sm font-medium text-gray-500">Fila P</dt>
                <dd className="text-2xl font-bold text-[#356375] mt-1">{lastCorrect[0] >= 1 ? lastCorrect[0] : '0'}</dd>
                {rP != null && <dd className="text-sm text-gray-600 mt-1">{rP.toFixed(6)}</dd>}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <dt className="text-sm font-medium text-gray-500">Fila D</dt>
                <dd className="text-2xl font-bold text-[#356375] mt-1">{lastCorrect[1] >= 1 ? lastCorrect[1] : '0'}</dd>
                {rD != null && <dd className="text-sm text-gray-600 mt-1">{rD.toFixed(6)}</dd>}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <dt className="text-sm font-medium text-gray-500">Fila T</dt>
                <dd className="text-2xl font-bold text-[#356375] mt-1">{lastCorrect[2] >= 1 ? lastCorrect[2] : '0'}</dd>
                {rT != null && <dd className="text-sm text-gray-600 mt-1">{rT.toFixed(6)}</dd>}
              </div>
            </dl>
            <p className="text-sm text-gray-500 mb-6">{resultadoGuardado ? 'Resultado guardado correctamente.' : 'Guardando resultado...'}</p>
            <Link href={backHref} className="block w-full text-center bg-[#356375] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2d5566] transition">
              Finalizar test
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <BackLink />
          <button type="button" onClick={() => setShowSalirConfirm(true)} className="text-red-600 hover:text-red-800 font-medium text-sm border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition">
            Salir del test
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 px-5 py-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900">Optopad Color — Fila {fila}, paso {pasoNum}</h2>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            {respuestaCorrecta ? (
              <p className="text-sm font-medium text-[#356375] mb-2">Respuesta esperada: <span className="font-semibold capitalize">{respuestaCorrecta}</span></p>
            ) : (
              <p className="text-sm text-amber-600 mb-2">Sin respuesta configurada para este paso.</p>
            )}
            <p className="text-sm text-gray-600 mb-1">Última correcta en esta fila: <span className="font-semibold text-gray-900">{lastCorrect[filaIndex]}</span></p>
            <p className="text-xs text-gray-500 mb-4">P: {lastCorrect[0]} · D: {lastCorrect[1]} · T: {lastCorrect[2]}</p>
            <p className="text-gray-600 mb-6">¿Qué dirección percibe el paciente?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OPCIONES_RESPUESTA.map(opcion => (
                <button key={opcion} type="button" onClick={() => handleRespuesta(opcion)}
                  className={`py-4 px-4 rounded-xl font-medium border-2 transition ${opcion === 'Ninguna' ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-[#356375] text-[#356375] hover:bg-[#356375]/10'}`}>
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
            <p className="text-gray-600 mb-6">Si sales ahora, los resultados no se guardarán. ¿Quieres salir igualmente?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowSalirConfirm(false)} className="flex-1 py-2.5 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={salirSinGuardar} className="flex-1 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700">Salir sin guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RunTestPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center bg-gray-50"><div className="text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4" /><p className="text-gray-600 font-medium">Cargando test...</p></div></div>}>
      <RunTestContent />
    </Suspense>
  )
}
