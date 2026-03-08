/**
 * Configuración de NextAuth para modo standalone (PostgreSQL local)
 */
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getDb } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) throw new Error('Email y contraseña requeridos')
        const db = getDb()
        const r = await db.query(
          'SELECT id, email, password_hash, nombre, role FROM usuarios WHERE email = $1',
          [credentials.email.trim()]
        )
        const user = r.rows[0]
        if (!user) throw new Error('Credenciales incorrectas')
        const ok = await bcrypt.compare(credentials.password, user.password_hash)
        if (!ok) throw new Error('Credenciales incorrectas')
        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const t = token as { id?: string; role?: string }
        (session.user as any).id = t.id
        (session.user as any).role = t.role
      }
      return session
    },
  },
  pages: {
    signIn: '/admin',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}
