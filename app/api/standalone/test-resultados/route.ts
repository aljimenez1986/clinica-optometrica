import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const db = getDb()
    const pacienteId = request.nextUrl.searchParams.get('paciente_id')
    const all = request.nextUrl.searchParams.get('all') === '1'

    if (!pacienteId && !all) {
      const r = await db.query('SELECT paciente_id FROM test_resultados GROUP BY paciente_id')
      return NextResponse.json(r.rows.map((x: any) => x.paciente_id))
    }

    if (all) {
      const r = await db.query(
        `SELECT id, paciente_id, fecha_realizacion, datos_respuesta, test_config_id
         FROM test_resultados ORDER BY fecha_realizacion DESC LIMIT 500`
      )
      return NextResponse.json(r.rows)
    }

    const r = await db.query(
      `SELECT tr.*, tc.tipo_test, tc.nombre as config_nombre
       FROM test_resultados tr
       JOIN test_configs tc ON tc.id = tr.test_config_id
       WHERE tr.paciente_id = $1
       ORDER BY tr.fecha_realizacion DESC`,
      [pacienteId]
    )
    return NextResponse.json(r.rows)
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const db = getDb()
    const body = await request.json()

    const r = await db.query(
      `INSERT INTO test_resultados (paciente_id, test_config_id, paso_actual, datos_respuesta)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        body.paciente_id,
        body.test_config_id,
        body.paso_actual ?? 0,
        body.datos_respuesta ? JSON.stringify(body.datos_respuesta) : null,
      ]
    )
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
