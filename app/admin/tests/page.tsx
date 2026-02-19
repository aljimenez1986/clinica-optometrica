'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type TipoTest = 'rejilla_amsler' | 'agudeza_visual' | 'optopad_color' | 'optopad_csf'

const tiposTest = [
  { id: 'rejilla_amsler' as TipoTest, nombre: 'Rejilla de Amsler', icono: '📐' },
  { id: 'agudeza_visual' as TipoTest, nombre: 'Agudeza Visual', icono: '👁️' },
  { id: 'optopad_color' as TipoTest, nombre: 'Optopad Color', icono: '🎨' },
  { id: 'optopad_csf' as TipoTest, nombre: 'Optopad CSF', icono: '📊' }
]

interface TestPaso {
  id?: string
  orden: number
  nombre_archivo: string
  ruta_archivo: string
  url_publica: string
  descripcion?: string
  valores_correctos?: string[] // Array: agudeza_visual varios; optopad_color uno (Arriba/Abajo/Izquierda/Derecha)
}

const FILAS_OPTOPAD_COLOR = ['P', 'D', 'T'] as const
const PASOS_POR_FILA = 10
const OPCIONES_DIRECCION = ['arriba', 'abajo', 'izquierda', 'derecha'] as const
const TESTS_PENDIENTES: TipoTest[] = ['rejilla_amsler', 'agudeza_visual', 'optopad_csf']

function ordenFromFilaYPaso(fila: string, pasoNum: number): number {
  const idx = FILAS_OPTOPAD_COLOR.indexOf(fila as 'P' | 'D' | 'T')
  return idx >= 0 ? idx * PASOS_POR_FILA + pasoNum : pasoNum
}
function filaYPasoFromOrden(orden: number): { fila: string; pasoNum: number } {
  const cero = orden - 1
  const fila = FILAS_OPTOPAD_COLOR[Math.floor(cero / PASOS_POR_FILA)] ?? 'P'
  const pasoNum = (cero % PASOS_POR_FILA) + 1
  return { fila, pasoNum }
}

export default function TestsPage() {
  const [ipads, setIpads] = useState<any[]>([])
  const [ipadSeleccionado, setIpadSeleccionado] = useState<string | null>(null)
  const [testSeleccionado, setTestSeleccionado] = useState<TipoTest | ''>('')
  const [testConfig, setTestConfig] = useState<any>(null)
  const [pasos, setPasos] = useState<TestPaso[]>([])
  const [mostrarFormularioPaso, setMostrarFormularioPaso] = useState(false)
  const [pasoEditando, setPasoEditando] = useState<TestPaso | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [descripcionPaso, setDescripcionPaso] = useState('')
  const [valoresCorrectos, setValoresCorrectos] = useState<string[]>([''])
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('ipads').select('*').order('nombre')
      const list = data || []
      setIpads(list)
      if (list.length > 0 && !ipadSeleccionado) {
        setIpadSeleccionado(list[0].id)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (testSeleccionado) {
      cargarConfiguracionTest()
    } else {
      setTestConfig(null)
      setPasos([])
    }
  }, [testSeleccionado, ipadSeleccionado])

  async function cargarConfiguracionTest() {
    if (!ipadSeleccionado) return
    const { data: configData, error: configError } = await supabase
      .from('test_configs')
      .select('*')
      .eq('ipad_id', ipadSeleccionado)
      .eq('tipo_test', testSeleccionado)
      .single()

    if (configError && !configError.message.includes('No rows')) {
      console.error('Error cargando configuración:', configError)
    }

    setTestConfig(configData)

    // Cargar pasos del test
    if (configData) {
      const { data: pasosData, error: pasosError } = await supabase
        .from('test_pasos')
        .select('*')
        .eq('test_config_id', configData.id)
        .order('orden', { ascending: true })

      if (pasosError) {
        console.error('Error cargando pasos:', pasosError)
        setPasos([])
      } else {
        // Parsear valores_correctos si vienen como JSON
        const pasosParseados = (pasosData || []).map((paso: any) => {
          let valoresCorrectos = undefined
          if (paso.valores_correctos) {
            if (Array.isArray(paso.valores_correctos)) {
              valoresCorrectos = paso.valores_correctos
            } else if (typeof paso.valores_correctos === 'string') {
              try {
                valoresCorrectos = JSON.parse(paso.valores_correctos)
              } catch (e) {
                console.error('Error parseando valores_correctos:', e)
              }
            }
          }
          return {
            ...paso,
            valores_correctos: valoresCorrectos
          }
        })
        setPasos(pasosParseados)
      }
    } else {
      setPasos([])
    }
  }

  async function crearConfiguracionTest() {
    if (!ipadSeleccionado) {
      alert('Debe seleccionar un iPad para crear la configuración del test.')
      return
    }
    const tipoTest = tiposTest.find(t => t.id === testSeleccionado)
    const { data, error } = await supabase
      .from('test_configs')
      .insert([{
        tipo_test: testSeleccionado,
        nombre: tipoTest?.nombre || testSeleccionado,
        descripcion: `Configuración para ${tipoTest?.nombre}`,
        ipad_id: ipadSeleccionado
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creando configuración:', error)
      alert('Error al crear la configuración del test')
      return undefined
    }

    setTestConfig(data)
    return data
  }

  async function subirImagenPaso(e: React.FormEvent) {
    e.preventDefault()

    if (!testConfig) {
      await crearConfiguracionTest()
      return
    }

      // Validar valores correctos para agudeza visual
      if (testSeleccionado === 'agudeza_visual') {
        const valoresFiltrados = valoresCorrectos.filter(v => v.trim() !== '' && ['arriba', 'abajo', 'izquierda', 'derecha'].includes(v))
        if (valoresFiltrados.length < 3 || valoresFiltrados.length > 5) {
          alert('Debe configurar entre 3 y 5 valores correctos para el test de Agudeza Visual')
          return
        }
      }
    if (!pasoEditando && !archivo) {
      alert('Por favor, seleccione una imagen')
      return
    }

    setSubiendo(true)

    try {
      const orden = pasoEditando ? pasoEditando.orden : pasos.length + 1
      const datosPaso: any = {
        descripcion: descripcionPaso || null
      }

      if (archivo) {
        const timestamp = Date.now()
        const extension = archivo.name.split('.').pop()
        const nombreArchivo = `paso_${orden}_${timestamp}.${extension}`
        const rutaArchivo = `${testSeleccionado}/${nombreArchivo}`

        // Subir imagen a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('tests')
          .upload(rutaArchivo, archivo, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            alert('El bucket de almacenamiento no existe. Por favor, créelo en Supabase Storage.')
            setSubiendo(false)
            return
          }
          throw uploadError
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('tests')
          .getPublicUrl(rutaArchivo)

        datosPaso.nombre_archivo = nombreArchivo
        datosPaso.ruta_archivo = rutaArchivo
        datosPaso.url_publica = urlData.publicUrl
      }

      // Si es agudeza visual, agregar valores correctos
      if (testSeleccionado === 'agudeza_visual') {
        const valoresFiltrados = valoresCorrectos.filter(v => v.trim() !== '' && ['arriba', 'abajo', 'izquierda', 'derecha'].includes(v))
        if (valoresFiltrados.length < 3 || valoresFiltrados.length > 5) {
          alert('Debe configurar entre 3 y 5 valores correctos para el test de Agudeza Visual')
          setSubiendo(false)
          return
        }
        datosPaso.valores_correctos = valoresFiltrados
      }
      // Guardar o actualizar paso
      if (pasoEditando && pasoEditando.id) {
        // Actualizar paso existente
        const { error: updateError } = await supabase
          .from('test_pasos')
          .update(datosPaso)
          .eq('id', pasoEditando.id)

        if (updateError) throw updateError
      } else {
        if (!archivo) {
          alert('Por favor, seleccione una imagen para el nuevo paso')
          setSubiendo(false)
          return
        }
        const { error: insertError } = await supabase
          .from('test_pasos')
          .insert([{
            test_config_id: testConfig.id,
            orden: orden,
            ...datosPaso
          }])

        if (insertError) {
          if (insertError.message.includes('does not exist')) {
            console.warn('La tabla test_pasos no existe. Ejecuta el script SQL primero.')
            alert('Error: La tabla de pasos no existe. Por favor, ejecuta el script SQL de configuración.')
          } else {
            throw insertError
          }
        }
      }

      // Limpiar formulario
      setArchivo(null)
      setDescripcionPaso('')
      setValoresCorrectos([''])
      setPasoEditando(null)
      setMostrarFormularioPaso(false)

      // Recargar pasos
      cargarConfiguracionTest()

      alert(pasoEditando ? 'Paso actualizado correctamente' : 'Paso agregado correctamente')
    } catch (error: any) {
      console.error('Error subiendo imagen:', error)
      alert('Error al subir la imagen: ' + (error.message || 'Error desconocido'))
    } finally {
      setSubiendo(false)
    }
  }

  async function eliminarPaso(pasoId: string, rutaArchivo?: string | null) {
    if (!confirm('¿Seguro que desea eliminar este paso?')) return

    const { error: dbError } = await supabase
      .from('test_pasos')
      .delete()
      .eq('id', pasoId)

    if (dbError) {
      console.error('Error eliminando paso:', dbError)
    }

    if (rutaArchivo) {
      const { error: storageError } = await supabase.storage
        .from('tests')
        .remove([rutaArchivo])
      if (storageError) console.error('Error eliminando archivo:', storageError)
    }

    cargarConfiguracionTest()
  }

  async function guardarRespuestaOptopadColor(fila: string, pasoNum: number, valor: string) {
    if (!ipadSeleccionado) return
    let config = testConfig
    if (!config) {
      config = await crearConfiguracionTest()
      if (!config) return
    }
    const orden = ordenFromFilaYPaso(fila, pasoNum)
    const paso = pasos.find(p => p.orden === orden)
    const valorTrim = valor.trim()

    if (!valorTrim) {
      if (paso?.id) {
        await supabase.from('test_pasos').delete().eq('id', paso.id)
        cargarConfiguracionTest()
      }
      return
    }

    if (!OPCIONES_DIRECCION.includes(valorTrim as typeof OPCIONES_DIRECCION[number])) return

    if (paso?.id) {
      const { error } = await supabase
        .from('test_pasos')
        .update({ valores_correctos: [valorTrim] })
        .eq('id', paso.id)
      if (!error) cargarConfiguracionTest()
      return
    }

    const { error } = await supabase.from('test_pasos').insert([{
      test_config_id: config.id,
      orden,
      nombre_archivo: null,
      ruta_archivo: null,
      url_publica: null,
      descripcion: null,
      valores_correctos: [valorTrim]
    }])
    if (!error) cargarConfiguracionTest()
  }

  function editarPaso(paso: TestPaso) {
    setPasoEditando(paso)
    setDescripcionPaso(paso.descripcion || '')
    setValoresCorrectos(paso.valores_correctos && paso.valores_correctos.length > 0 
      ? paso.valores_correctos 
      : [''])
    setArchivo(null)
    setMostrarFormularioPaso(true)
  }

  function nuevoPaso() {
    setPasoEditando(null)
    setDescripcionPaso('')
    setValoresCorrectos([''])
    setArchivo(null)
    setMostrarFormularioPaso(true)
  }

  function agregarValorCorrecto() {
    if (valoresCorrectos.length < 5) {
      setValoresCorrectos([...valoresCorrectos, ''])
    }
  }

  function eliminarValorCorrecto(index: number) {
    if (valoresCorrectos.length > 1) {
      setValoresCorrectos(valoresCorrectos.filter((_, i) => i !== index))
    }
  }

  function actualizarValorCorrecto(index: number, valor: string) {
    const nuevosValores = [...valoresCorrectos]
    nuevosValores[index] = valor
    setValoresCorrectos(nuevosValores)
  }

  async function reordenarPasos(pasoId: string, nuevaPosicion: number) {
    const pasoActual = pasos.find(p => p.id === pasoId)
    if (!pasoActual) return

    const pasoIntercambio = pasos.find(p => p.orden === nuevaPosicion)
    
    try {
      // Intercambiar los órdenes
      if (pasoIntercambio) {
        // Primero actualizar el paso que estaba en la nueva posición
        const { error: error1 } = await supabase
          .from('test_pasos')
          .update({ orden: pasoActual.orden })
          .eq('id', pasoIntercambio.id)

        if (error1) throw error1
      }

      // Luego actualizar el paso actual
      const { error: error2 } = await supabase
        .from('test_pasos')
        .update({ orden: nuevaPosicion })
        .eq('id', pasoId)

      if (error2) throw error2

      cargarConfiguracionTest()
    } catch (error) {
      console.error('Error reordenando:', error)
      alert('Error al reordenar los pasos')
    }
  }

  return (
    <div className="p-6">
      {/* Selector de iPad */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          iPad
        </h2>
        <p className="text-gray-600 mb-4">Todo test debe estar configurado para un iPad. Seleccione el dispositivo.</p>
        <div className="flex flex-wrap gap-3">
          {ipads.map(ipad => (
            <button
              key={ipad.id}
              onClick={() => setIpadSeleccionado(ipad.id)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                ipadSeleccionado === ipad.id
                  ? 'border-[#356375] bg-[#356375]/10 text-[#356375]'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {ipad.nombre} — {ipad.marca} {ipad.modelo}
            </button>
          ))}
        </div>
        {ipads.length === 0 && (
          <p className="text-amber-700 text-sm mt-2">
            No hay iPads registrados. <Link href="/admin/ipads" className="underline font-medium text-[#356375] hover:text-[#2d5566]">Añadir iPads</Link> para poder configurar tests.
          </p>
        )}
      </div>

      {/* Selector de Test y pasos: solo cuando hay iPad seleccionado */}
      {ipadSeleccionado && (
        <>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Configuración de Tests
        </h2>
        <p className="text-gray-600 mb-4">Seleccione un test para configurar sus pasos (imágenes) y orden para este iPad</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiposTest.map(tipo => (
            <button
              key={tipo.id}
              onClick={() => setTestSeleccionado(tipo.id)}
              className={`p-4 border-2 rounded-lg text-center transition ${
                testSeleccionado === tipo.id
                  ? 'border-[#356375] bg-[#356375]/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">{tipo.icono}</div>
              <div className="text-sm font-medium text-gray-900">{tipo.nombre}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuración de Pasos */}
      {testSeleccionado && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#356375] px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">
                {tiposTest.find(t => t.id === testSeleccionado)?.nombre}
              </h3>
              <p className="text-white/80 text-sm mt-1">
                {testSeleccionado === 'optopad_color'
                  ? 'Tres filas (P, D, T). Cada fila tiene 10 pasos con opción correcta: Arriba, Abajo, Izquierda, Derecha.'
                  : 'Configure las imágenes y su orden para este test'}
              </p>
            </div>
            {testSeleccionado !== 'optopad_color' && !TESTS_PENDIENTES.includes(testSeleccionado as TipoTest) && (
              <button
                onClick={nuevoPaso}
                className="bg-white text-[#356375] px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Paso
              </button>
            )}
          </div>

          <div className="p-6">
            {TESTS_PENDIENTES.includes(testSeleccionado as TipoTest) ? (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 py-12 px-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-600 mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-amber-900 mb-2">Funcionalidad pendiente de implementar</h4>
                <p className="text-amber-800 text-sm max-w-md mx-auto">
                  La configuración para el test <strong>{tiposTest.find(t => t.id === testSeleccionado)?.nombre}</strong> estará disponible en una próxima actualización.
                </p>
              </div>
            ) : testSeleccionado === 'optopad_color' ? (
              <div className="space-y-8">
                {FILAS_OPTOPAD_COLOR.map(fila => (
                  <div key={fila}>
                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="bg-[#356375] text-white w-8 h-8 rounded flex items-center justify-center">{fila}</span>
                      Fila {fila}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-3">
                      {Array.from({ length: PASOS_POR_FILA }, (_, i) => i + 1).map(pasoNum => {
                        const orden = ordenFromFilaYPaso(fila, pasoNum)
                        const paso = pasos.find(p => p.orden === orden)
                        const respuesta = paso?.valores_correctos?.[0] ?? ''
                        return (
                          <div
                            key={`${fila}-${pasoNum}`}
                            className="border border-gray-200 rounded-lg p-2 bg-white flex flex-col gap-1"
                          >
                            <span className="text-xs text-gray-500 font-medium">{fila}-{pasoNum}</span>
                            <select
                              value={respuesta}
                              onChange={e => guardarRespuestaOptopadColor(fila, pasoNum, e.target.value)}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                            >
                              <option value="">—</option>
                              <option value="arriba">⬆️ Arriba</option>
                              <option value="abajo">⬇️ Abajo</option>
                              <option value="izquierda">⬅️ Izquierda</option>
                              <option value="derecha">➡️ Derecha</option>
                            </select>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : pasos.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 font-medium mb-4">
                  No hay pasos configurados para este test
                </p>
                <button
                  onClick={nuevoPaso}
                  className="bg-[#356375] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#2d5566] transition"
                >
                  Agregar Primer Paso
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {pasos.map((paso, index) => (
                  <div key={paso.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start gap-4">
                      {/* Orden */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-[#356375] text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                          {paso.orden}
                        </div>
                        {index > 0 && (
                          <button
                            onClick={() => reordenarPasos(paso.id!, paso.orden - 1)}
                            className="text-gray-400 hover:text-[#356375]"
                            title="Mover arriba"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                        )}
                        {index < pasos.length - 1 && (
                          <button
                            onClick={() => reordenarPasos(paso.id!, paso.orden + 1)}
                            className="text-gray-400 hover:text-[#356375]"
                            title="Mover abajo"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Imagen */}
                      <div className="flex-1">
                        {paso.url_publica ? (
                          (paso.nombre_archivo.toLowerCase().endsWith('.tif') || paso.nombre_archivo.toLowerCase().endsWith('.tiff')) ? (
                            <div className="w-full max-w-md h-48 bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 mb-2">
                              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <p className="text-sm font-medium text-gray-700 mb-1">Archivo TIFF</p>
                              <p className="text-xs text-gray-500 mb-2">Los navegadores no pueden mostrar TIFF</p>
                              <a
                                href={paso.url_publica}
                                download={paso.nombre_archivo}
                                className="text-xs text-[#356375] hover:text-[#284b5a] font-medium underline"
                              >
                                Descargar archivo
                              </a>
                            </div>
                          ) : (
                            <img
                              src={paso.url_publica}
                              alt={`Paso ${paso.orden}`}
                              className="w-full max-w-md h-48 object-contain bg-gray-100 rounded-lg mb-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3EImagen no disponible%3C/text%3E%3C/svg%3E'
                              }}
                            />
                          )
                        ) : (
                          <div className="w-full max-w-md h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                            <p className="text-gray-400">Sin imagen</p>
                          </div>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Archivo:</span> {paso.nombre_archivo}
                        </p>
                        {paso.descripcion && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Descripción:</span> {paso.descripcion}
                          </p>
                        )}
                        {testSeleccionado === 'agudeza_visual' && paso.valores_correctos && paso.valores_correctos.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Valores Correctos:</p>
                            <div className="flex flex-wrap gap-1">
                              {paso.valores_correctos.map((valor, idx) => {
                                const iconos: { [key: string]: string } = {
                                  'arriba': '⬆️',
                                  'abajo': '⬇️',
                                  'izquierda': '⬅️',
                                  'derecha': '➡️'
                                }
                                const nombres: { [key: string]: string } = {
                                  'arriba': 'Arriba',
                                  'abajo': 'Abajo',
                                  'izquierda': 'Izquierda',
                                  'derecha': 'Derecha'
                                }
                                return (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                                    {iconos[valor] || ''} {nombres[valor] || valor}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => editarPaso(paso)}
                          className="text-[#356375] hover:text-[#284b5a] font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarPaso(paso.id!, paso.ruta_archivo)}
                          className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {/* Modal de Subida/Edición de Paso (no se usa en Optopad Color: el selector va en cada celda) */}
      {mostrarFormularioPaso && testSeleccionado && testSeleccionado !== 'optopad_color' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-[#356375] px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {pasoEditando ? 'Editar Paso' : 'Agregar Nuevo Paso'}
              </h2>
              <button
                onClick={() => {
                  setMostrarFormularioPaso(false)
                  setPasoEditando(null)
                  setArchivo(null)
                  setDescripcionPaso('')
                  setValoresCorrectos([''])
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={subirImagenPaso} className="p-6 space-y-6">
              {pasoEditando && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Paso {pasoEditando.orden}:</span> Está editando este paso. 
                    Si sube una nueva imagen, reemplazará la anterior.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#356375] transition">
                  <input
                    type="file"
                    accept="image/*,.tif,.tiff"
                    onChange={e => setArchivo(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                    required={!pasoEditando}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {archivo || (pasoEditando && pasoEditando.url_publica) ? (
                      <div>
                        <svg className="w-12 h-12 text-[#356375] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {archivo ? (
                          <>
                            <p className="text-sm font-medium text-gray-900">{archivo.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{(archivo.size / 1024 / 1024).toFixed(2)} MB</p>
                          </>
                        ) : (
                          pasoEditando && (
                            <>
                              <p className="text-sm font-medium text-gray-900">Imagen actual: {pasoEditando.nombre_archivo}</p>
                              <p className="text-xs text-gray-500 mt-1">Seleccione una nueva imagen para reemplazar</p>
                            </>
                          )
                        )}
                      </div>
                    ) : (
                      <div>
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <p className="text-sm text-gray-600">Haga clic para seleccionar una imagen</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG, TIFF hasta 10MB</p>
                        <p className="text-xs text-amber-600 mt-1 font-medium">
                          ⚠️ Nota: Los navegadores no pueden mostrar TIFF directamente. 
                          Se recomienda convertir a PNG/JPG para visualización.
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Descripción del paso..."
                  className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                  value={descripcionPaso}
                  onChange={e => setDescripcionPaso(e.target.value)}
                />
              </div>

              {/* Valores Correctos (solo para Agudeza Visual) */}
              {testSeleccionado === 'agudeza_visual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valores Correctos <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 font-normal ml-2">(Entre 3 y 5 valores)</span>
                  </label>
                  <div className="space-y-2">
                    {valoresCorrectos.map((valor, index) => (
                      <div key={index} className="flex gap-2">
                        <select
                          className="flex-1 border border-gray-300 p-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#356375] focus:border-[#356375] outline-none"
                          value={valor}
                          onChange={e => actualizarValorCorrecto(index, e.target.value)}
                          required={index < 3} // Los primeros 3 son obligatorios
                        >
                          <option value="">Seleccione una dirección...</option>
                          <option value="arriba">⬆️ Arriba</option>
                          <option value="abajo">⬇️ Abajo</option>
                          <option value="izquierda">⬅️ Izquierda</option>
                          <option value="derecha">➡️ Derecha</option>
                        </select>
                        {valoresCorrectos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => eliminarValorCorrecto(index)}
                            className="text-red-600 hover:text-red-800 p-2"
                            title="Eliminar valor"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    {valoresCorrectos.length < 5 && (
                      <button
                        type="button"
                        onClick={agregarValorCorrecto}
                        className="text-[#356375] hover:text-[#284b5a] text-sm font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar otro valor
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Configure entre 3 y 5 direcciones que se considerarán correctas para este paso. 
                    Si el paciente falla 2 pasos consecutivos, el test finalizará.
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormularioPaso(false)
                    setPasoEditando(null)
                    setArchivo(null)
                    setDescripcionPaso('')
                    setValoresCorrectos([''])
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition border-2 border-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    subiendo ||
                    (!pasoEditando && !archivo) ||
                    (testSeleccionado === 'agudeza_visual' && valoresCorrectos.filter(v => v.trim() !== '' && ['arriba', 'abajo', 'izquierda', 'derecha'].includes(v)).length < 3)
                  }
                  className="flex-1 bg-[#356375] text-white font-semibold py-3 rounded-lg hover:bg-[#2d5566] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {subiendo ? 'Guardando...' : (pasoEditando ? 'Actualizar Paso' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
