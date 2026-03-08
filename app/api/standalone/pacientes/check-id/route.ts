import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const db = getDb()
    const idPaciente = request.nextUrl.searchParams.get('id_paciente')
    const excludeId = request.nextUrl.searchParams.get('exclude_id')

    if (!idPaciente?.trim()) return NextResponse.json({ exists: false })

    let r
    if (excludeId) {
      r = await db.query('SELECT 1 FROM pacientes WHERE id_paciente = $1 AND id != $2 LIMIT 1', [idPaciente.trim(), excludeId])
    } else {
      r = await db.query('SELECT 1 FROM pacientes WHERE id_paciente = $1 LIMIT 1', [idPaciente.trim()])
    }
    return NextResponse.json({ exists: r.rows.length > 0 })
  } catch (e: any) {
    if (e.message === 'No autorizado') return NextResponse.json({ error: e.message }, { status: 401 })
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
