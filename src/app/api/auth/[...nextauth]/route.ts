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
  callbacks: {
    // @ts-expect-error - NextAuth v4 callback types
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    // @ts-expect-error - NextAuth v4 callback types
    async session({ session, token }) {
      session.accessToken = token.accessToken
      return session
    }
  },
  pages: {
    signIn: '/',
    error: '/error'
  }
})

export { handler as GET, handler as POST }