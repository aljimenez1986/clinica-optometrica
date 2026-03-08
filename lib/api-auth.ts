/**
 * Verificación de sesión en API routes (modo standalone)
 */
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export async function getAuthSession() {
  return getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getAuthSession()
  if (!session?.user) {
    throw new Error('No autorizado')
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if ((session.user as any).role !== 'administrador') {
    throw new Error('Solo administradores')
  }
  return session
}
