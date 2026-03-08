/**
 * Detecta si la app está en modo standalone (PostgreSQL local).
 * NEXT_PUBLIC_USE_STANDALONE=true cuando se despliega con base de datos local.
 */
export const isStandaloneMode = process.env.NEXT_PUBLIC_USE_STANDALONE === 'true'
