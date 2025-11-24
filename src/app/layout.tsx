import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import BugReportButton from "@/components/BugReportButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://seoaoe.com'),
  title: {
    default: "SEO-AOE | AI Visibility Checker for Google & ChatGPT Rankings",
    template: "%s | SEO-AOE"
  },
  description: "Check how your brand ranks across Google, ChatGPT, and other AI answer engines with SEO-AOE — the AI visibility tracker for the next generation of search.",
  keywords: ["AI SEO", "ChatGPT rankings", "Google AI", "AI visibility", "answer engines", "AI search", "LLM SEO", "Perplexity rankings", "Claude AI", "Gemini rankings", "Grok search"],
  authors: [{ name: "SEO-AOE" }],
  creator: "SEO-AOE",
  publisher: "SEO-AOE",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://seoaoe.com',
    siteName: 'SEO-AOE',
    title: 'SEO-AOE | AI Visibility Checker for Google & ChatGPT Rankings',
    description: 'Check how your brand ranks across Google, ChatGPT, and other AI answer engines. Track your AI visibility in real-time.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SEO-AOE - AI Visibility Checker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEO-AOE | AI Visibility Checker',
    description: 'Check how your brand ranks across Google, ChatGPT, and other AI answer engines',
    images: ['/og-image.png'],
    creator: '@seoaoe',
  },
  verification: {
    google: 'your-google-verification-code', // Add your Google Search Console verification code
  },
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
        {/* Structured Data (JSON-LD) */}
        <Script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "SEO-AOE",
              "alternateName": "AI Visibility Checker",
              "url": "https://seoaoe.com",
              "description": "Check how your brand ranks across Google, ChatGPT, and other AI answer engines. Track your AI visibility in real-time.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "150"
              },
              "featureList": [
                "Google AI Overview tracking",
                "ChatGPT ranking analysis",
                "Perplexity visibility check",
                "Claude AI mentions",
                "Gemini rankings",
                "Grok search visibility",
                "Real-time AI SEO tracking"
              ]
            })
          }}
        />
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
        <BugReportButton />
      </body>
    </html>
  );
}
