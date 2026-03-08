import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const ipadId = request.nextUrl.searchParams.get('ipad_id')
    const tipoTest = request.nextUrl.searchParams.get('tipo_test')

    if (!ipadId) {
      const r = await db.query('SELECT * FROM test_configs ORDER BY tipo_test')
      return NextResponse.json(r.rows)
    }

    if (tipoTest) {
      const r = await db.query(
        'SELECT * FROM test_configs WHERE ipad_id = $1 AND tipo_test = $2',
        [ipadId, tipoTest]
      )
      return NextResponse.json(r.rows[0] || null)
    }

    const r = await db.query('SELECT * FROM test_configs WHERE ipad_id = $1 ORDER BY tipo_test', [ipadId])
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
      `INSERT INTO test_configs (tipo_test, nombre, descripcion, ipad_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        body.tipo_test,
        body.nombre || body.tipo_test,
        body.descripcion || null,
        body.ipad_id,
      ]
    )
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.code === '23505') return NextResponse.json({ error: 'Configuración ya existe para este iPad' }, { status: 400 })
    console.error(e)
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
