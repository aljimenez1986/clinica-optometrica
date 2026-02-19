'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

export const dynamic = 'force-dynamic'

const COLORS = ['#356375', '#46788c', '#5a9aa8', '#7eb8c4', '#a2d0d8']

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [countPacientes, setCountPacientes] = useState<number>(0)
  const [countResultados, setCountResultados] = useState<number>(0)
  const [countIpads, setCountIpads] = useState<number>(0)
  const [pacientesNuevos30, setPacientesNuevos30] = useState<number>(0)
  const [resultadosRecientes, setResultadosRecientes] = useState<any[]>([])
  const [configs, setConfigs] = useState<Record<string, { tipo_test: string }>>({})

  useEffect(() => {
    async function load() {
      const hace30 = new Date()
      hace30.setDate(hace30.getDate() - 30)
      const iso30 = hace30.toISOString()

      const [
        { count: cP },
        { count: cR },
        { count: cI },
        { count: cN30 },
        { data: resultados }
      ] = await Promise.all([
        supabase.from('pacientes').select('*', { count: 'exact', head: true }),
        supabase.from('test_resultados').select('*', { count: 'exact', head: true }),
        supabase.from('ipads').select('*', { count: 'exact', head: true }),
        supabase.from('pacientes').select('*', { count: 'exact', head: true }).gte('created_at', iso30),
        supabase
          .from('test_resultados')
          .select('id, fecha_realizacion, test_config_id')
          .order('fecha_realizacion', { ascending: false })
          .limit(500)
      ])

      setCountPacientes(cP ?? 0)
      setCountResultados(cR ?? 0)
      setCountIpads(cI ?? 0)
      setPacientesNuevos30(cN30 ?? 0)
      setResultadosRecientes(resultados ?? [])

      const configIds = [...new Set((resultados ?? []).map((r: any) => r.test_config_id).filter(Boolean))]
      if (configIds.length > 0) {
        const { data: configData } = await supabase
          .from('test_configs')
          .select('id, tipo_test')
          .in('id', configIds)
        const map: Record<string, { tipo_test: string }> = {}
        ;(configData ?? []).forEach((c: any) => { map[c.id] = { tipo_test: c.tipo_test || 'Sin tipo' } })
        setConfigs(map)
      }
      setLoading(false)
    }
    load()
  }, [])

  const testsPorDia = useMemo(() => {
    const hoy = new Date()
    const inicio = new Date(hoy)
    inicio.setDate(inicio.getDate() - 13) // 14 días: desde hace 13 días hasta hoy (incl.)
    const porDia: Record<string, number> = {}
    for (let i = 0; i < 14; i++) {
      const d = new Date(inicio)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      porDia[key] = 0
    }
    resultadosRecientes.forEach((r: any) => {
      const fecha = r.fecha_realizacion
      if (!fecha) return
      const key = new Date(fecha).toISOString().slice(0, 10)
      if (porDia[key] !== undefined) porDia[key]++
    })
    return Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({
        fecha: new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        total,
        full: fecha
      }))
  }, [resultadosRecientes])

  const testsPorTipo = useMemo(() => {
    const porTipo: Record<string, number> = {}
    resultadosRecientes.forEach((r: any) => {
      const tipo = configs[r.test_config_id]?.tipo_test ?? 'Otro'
      porTipo[tipo] = (porTipo[tipo] ?? 0) + 1
    })
    return Object.entries(porTipo).map(([name, value]) => ({ name, value }))
  }, [resultadosRecientes, configs])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#356375] mb-4" />
          <p className="text-gray-600 font-medium">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Estadísticas</h2>
        <p className="text-gray-600 text-sm mt-1">Resumen y métricas de la clínica</p>
      </div>

      {/* KPIs (mismo recuadro y posición que búsqueda/nuevo en Pacientes, Tests e iPads) */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/pacientes"
            className="rounded-xl border border-gray-200 p-6 shadow-sm hover:border-[#356375]/40 hover:shadow-md transition-all flex items-center justify-between group bg-gray-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-[#356375]/10">
                <svg className="w-8 h-8 text-[#356375]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total pacientes</p>
                <p className="text-2xl font-bold text-gray-900">{countPacientes}</p>
              </div>
            </div>
            <span className="text-[#356375] opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">Ver →</span>
          </Link>
          <Link
            href="/admin/tests"
            className="rounded-xl border border-gray-200 p-6 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between group bg-gray-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-100">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Tests realizados</p>
                <p className="text-2xl font-bold text-gray-900">{countResultados}</p>
              </div>
            </div>
            <span className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">Ver →</span>
          </Link>
          <Link
            href="/admin/ipads"
            className="rounded-xl border border-gray-200 p-6 shadow-sm hover:border-amber-300 hover:shadow-md transition-all flex items-center justify-between group bg-gray-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-100">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">iPads registrados</p>
                <p className="text-2xl font-bold text-gray-900">{countIpads}</p>
              </div>
            </div>
            <span className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">Ver →</span>
          </Link>
          <Link
            href="/admin/pacientes"
            className="rounded-xl border border-gray-200 p-6 shadow-sm hover:border-violet-300 hover:shadow-md transition-all flex items-center justify-between group bg-gray-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-violet-100">
                <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Pacientes nuevos (30 días)</p>
                <p className="text-2xl font-bold text-gray-900">{pacientesNuevos30}</p>
              </div>
            </div>
            <span className="text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">Ver →</span>
          </Link>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tests realizados (últimos 14 días)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={testsPorDia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [value, 'Tests']}
                  labelFormatter={(_, payload) => payload[0]?.payload?.full ? new Date(payload[0].payload.full).toLocaleDateString('es-ES') : ''}
                />
                <Bar dataKey="total" fill="#356375" radius={[4, 4, 0, 0]} name="Tests" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tests por tipo</h3>
          <div className="h-[280px]">
            {testsPorTipo.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">Sin datos aún</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={testsPorTipo}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {testsPorTipo.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Tests']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
