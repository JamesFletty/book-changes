import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyCredentials } from '@/lib/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize(credentials) {
        return verifyCredentials(credentials?.email, credentials?.password)
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.workspaceId = (user as { workspaceId?: string | null }).workspaceId ?? null
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { workspaceId: true },
        })
        token.workspaceId = dbUser?.workspaceId ?? null
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.workspaceId = (token.workspaceId as string | null) ?? undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
