import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LUSTEN - Shared Listening Experience",
  description: "Create and join music rooms for synchronized listening with friends. Connect your Spotify and enjoy music together in real-time.",
  keywords: ["music", "spotify", "listening", "social", "rooms", "synchronized", "sharing"],
  authors: [{ name: "LUSTEN" }],
  creator: "LUSTEN",
  publisher: "LUSTEN",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", type: "image/svg+xml", sizes: "180x180" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://lusten.musicsian.com",
    title: "LUSTEN - Shared Listening Experience",
    description: "Create and join music rooms for synchronized listening with friends. Connect your Spotify and enjoy music together in real-time.",
    siteName: "LUSTEN",
  },
  twitter: {
    card: "summary_large_image",
    title: "LUSTEN - Shared Listening Experience",
    description: "Create and join music rooms for synchronized listening with friends. Connect your Spotify and enjoy music together in real-time.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <script 
          dangerouslySetInnerHTML={{
            __html: `
              window.onSpotifyWebPlaybackSDKReady = () => {
                window.spotifySDKReady = true;
                if (window.initializeSpotifyPlayer) {
                  window.initializeSpotifyPlayer();
                }
              };
            `
          }}
        />
        <script src="https://sdk.scdn.co/spotify-player.js" async></script>
      </body>
    </html>
  );
}
