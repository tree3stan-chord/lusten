import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

// @ts-expect-error - NextAuth v4 compatibility with Next.js 15
const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'user-read-email user-read-private streaming user-modify-playback-state user-read-playback-state'
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  callbacks: {
    // @ts-expect-error - NextAuth v4 callback types
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      return token
    },
    // @ts-expect-error - NextAuth v4 callback types
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.user.id = token.sub
      return session
    }
  },
  pages: {
    signIn: '/',
    error: '/error'
  },
  debug: process.env.NODE_ENV === 'development'
})

export { handler as GET, handler as POST }