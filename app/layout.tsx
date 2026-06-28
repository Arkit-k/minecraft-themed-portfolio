import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import { ScratchCursor } from "@/components/ScratchCursor";
import { BlockBuilder } from "@/components/BlockBuilder";
import { AmbientCreatures } from "@/components/AmbientCreatures";
import { BuildModeLauncher } from "@/components/BuildModeLauncher";

// Swiss neo-grotesque display face (Helvetica/Neue Haas family) for headings.
const grotesk = Hanken_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

// Editorial serif — kept for the hero name ("Arkit Karmokar").
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://arkitkarmokar.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Arkit Karmokar — Full Stack Developer",
  description:
    "Full Stack Developer building SaaS platforms and distributed systems. I build software that feels effortless.",
  keywords: [
    "Arkit Karmokar",
    "Full Stack Developer",
    "AI Engineer",
    "Next.js",
    "SaaS",
    "Distributed Systems",
  ],
  authors: [{ name: "Arkit Karmokar" }],
  openGraph: {
    title: "Arkit Karmokar — Full Stack Developer",
    description: "I build software that feels effortless.",
    url: SITE_URL,
    siteName: "Arkit Karmokar",
    images: [{ url: "/og.jpg", width: 1200, height: 800 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arkit Karmokar — Full Stack Developer",
    description: "I build software that feels effortless.",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#EEE5D1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${grotesk.variable} ${instrument.variable} ${inter.variable}`}
    >
      <body className="font-sans antialiased bg-cream text-charcoal">
        <AmbientCreatures />
        <div className="relative z-10" data-content>
          {children}
        </div>
        <BlockBuilder />
        <BuildModeLauncher />
        <div className="grain" aria-hidden="true" />
        <ScratchCursor />
      </body>
    </html>
  );
}
