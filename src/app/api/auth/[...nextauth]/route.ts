import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

// @ts-expect-error - NextAuth v4 compatibility with Next.js 15
const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
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
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        // Remove domain to prevent cross-subdomain sharing
        // domain: undefined
      }
    },
    callbackUrl: {
      name: '__Secure-next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: true,
        // Remove domain to prevent cross-subdomain sharing
        // domain: undefined
      }
    },
    csrfToken: {
      name: '__Host-next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    }
  },
  callbacks: {
    // @ts-expect-error - NextAuth v4 callback types
    async jwt({ token, account, user }) {
      try {
        const logData = {
          account: !!account, 
          user: !!user, 
          token: !!token,
          userId: token?.sub || user?.id,
          email: token?.email || user?.email,
          accountType: account?.provider,
          accessToken: !!account?.access_token,
          tokenPreview: token ? JSON.stringify(token).substring(0, 100) + '...' : null,
          userPreview: user ? JSON.stringify(user).substring(0, 100) + '...' : null,
          accountPreview: account ? JSON.stringify({
            provider: account.provider,
            type: account.type,
            userId: account.userId
          }) : null
        }
        
        console.log('JWT callback START:', logData);
        
        // Log to our endpoint
        try {
          await fetch(`${process.env.NEXTAUTH_URL}/api/auth-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'jwt_callback', data: logData })
          });
        } catch {
          // Ignore fetch errors
        }
        
        if (account && user) {
          console.log('Processing new login for:', user.email);
          token.accessToken = account.access_token
          token.refreshToken = account.refresh_token
          token.expiresAt = account.expires_at
          token.userId = user.id
          console.log('JWT token created successfully for:', user.email);
        } else if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
          // Token is still valid
          console.log('Returning valid existing token for:', token?.email);
        } else {
          // Token expired, refresh it
          console.log('Token expired, refreshing for:', token?.email);
          try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
              },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token.refreshToken
              })
            });

            const refreshedTokens = await response.json();

            if (!response.ok) {
              throw refreshedTokens;
            }

            console.log('Token refreshed successfully for:', token?.email);
            token.accessToken = refreshedTokens.access_token;
            token.expiresAt = Math.floor(Date.now() / 1000 + refreshedTokens.expires_in);
            
            if (refreshedTokens.refresh_token) {
              token.refreshToken = refreshedTokens.refresh_token;
            }
          } catch (error) {
            console.error('Token refresh failed:', error);
            // Return token anyway, let the app handle the auth failure
          }
        }
        
        console.log('JWT callback END - returning token');
        return token
      } catch (error) {
        console.error('JWT callback ERROR:', error);
        return token
      }
    },
    // @ts-expect-error - NextAuth v4 callback types
    async session({ session, token }) {
      try {
        console.log('Session callback START:', { 
          session: !!session, 
          token: !!token,
          userEmail: session?.user?.email,
          tokenSub: token?.sub,
          hasAccessToken: !!token?.accessToken
        });
        
        if (session?.user && token) {
          session.accessToken = token.accessToken
          session.user.id = token.sub || token.userId
          console.log('Session created successfully for:', session.user.email);
        } else {
          console.log('Session callback - missing session or token');
        }
        
        return session
      } catch (error) {
        console.error('Session callback ERROR:', error);
        return session
      }
    }
  },
  pages: {
    signIn: '/',
    error: '/error'
  },
  debug: process.env.NODE_ENV === 'development'
})

export { handler as GET, handler as POST }