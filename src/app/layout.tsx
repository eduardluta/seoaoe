import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEO-AOE | AI Visibility Checker for Google & ChatGPT Rankings",
  description: "Check how your brand ranks across Google, ChatGPT, and other AI answer engines with SEO-AOE — the AI visibility tracker for the next generation of search.",
  keywords: "AI SEO, ChatGPT rankings, Google AI, AI visibility, answer engines",
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
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-S1M39DS48Q"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-S1M39DS48Q');
          `}
        </Script>
        {children}
        <footer className="w-full py-6 text-center text-sm text-gray-500">
          made by <a href="https://mikgroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">mikgroup</a>
        </footer>
      </body>
    </html>
  );
}
