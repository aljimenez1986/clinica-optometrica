import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const db = getDb()
    const testConfigId = request.nextUrl.searchParams.get('test_config_id')

    if (!testConfigId) return NextResponse.json({ error: 'test_config_id requerido' }, { status: 400 })

    const r = await db.query(
      'SELECT * FROM test_pasos WHERE test_config_id = $1 ORDER BY orden ASC',
      [testConfigId]
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
      `INSERT INTO test_pasos (test_config_id, orden, nombre_archivo, ruta_archivo, url_publica, descripcion, valores_correctos, valor_decimal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        body.test_config_id,
        body.orden,
        body.nombre_archivo ?? null,
        body.ruta_archivo ?? null,
        body.url_publica ?? null,
        body.descripcion ?? null,
        body.valores_correctos ? JSON.stringify(body.valores_correctos) : null,
        body.valor_decimal ?? null,
      ]
    )
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
