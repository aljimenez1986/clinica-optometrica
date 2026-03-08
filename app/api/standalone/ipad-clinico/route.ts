import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const db = getDb()
    const ipadId = request.nextUrl.searchParams.get('ipad_id')

    if (!ipadId) return NextResponse.json({ error: 'ipad_id requerido' }, { status: 400 })

    const r = await db.query('SELECT usuario_id FROM ipad_clinico WHERE ipad_id = $1', [ipadId])
    return NextResponse.json(r.rows.map((x: any) => x.usuario_id))
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.message === 'Solo administradores') return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
    const db = getDb()
    const body = await request.json()
    const { ipad_id, usuario_ids } = body
    if (!ipad_id) return NextResponse.json({ error: 'ipad_id requerido' }, { status: 400 })

    await db.query('DELETE FROM ipad_clinico WHERE ipad_id = $1', [ipad_id])
    if (Array.isArray(usuario_ids) && usuario_ids.length > 0) {
      for (const uid of usuario_ids) {
        await db.query('INSERT INTO ipad_clinico (ipad_id, usuario_id) VALUES ($1, $2)', [ipad_id, uid])
      }
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    if (e.message === 'Solo administradores') return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
