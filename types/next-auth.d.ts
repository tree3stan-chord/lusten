import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
    accessToken?: string
  }

  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    userId?: string
  }
}