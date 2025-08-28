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
  description: "Create and join music rooms for synchronized listening",
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
