import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import { ScratchCursor } from "@/components/ScratchCursor";
import { BlockBuilder } from "@/components/BlockBuilder";
import { AmbientCreatures } from "@/components/AmbientCreatures";
import { BuildModeLauncher } from "@/components/BuildModeLauncher";
import { EmailPill } from "@/components/EmailPill";
import { StructuredData } from "@/components/StructuredData";
import { SITE_URL, SITE_NAME } from "@/lib/site";

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

const TITLE = "Arkit Karmokar — AI Engineer, MCP Servers & LLM Systems";
const DESCRIPTION =
  "Arkit Karmokar is an AI engineer in Mumbai building production LLM systems — MCP servers, tool-calling agents, RAG pipelines, and the infrastructure underneath them.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — Arkit Karmokar",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Arkit Karmokar",
    "AI Engineer",
    "MCP server developer",
    "Model Context Protocol",
    "AI agent developer",
    "LLM engineer India",
    "tool calling agents",
    "RAG pipelines",
    "LangChain",
    "AI engineer Mumbai",
    "Next.js",
    "TypeScript",
    "Go",
    "Python Django",
  ],
  authors: [{ name: "Arkit Karmokar", url: SITE_URL }],
  creator: "Arkit Karmokar",
  publisher: "Arkit Karmokar",
  alternates: {
    canonical: "/",
  },
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "profile",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 800,
        alt: "Arkit Karmokar — Full Stack Developer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@arkit_k",
    creator: "@arkit_k",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
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
        <StructuredData />
        <AmbientCreatures />
        <div className="relative z-10" data-content>
          {children}
        </div>
        <BlockBuilder />
        <BuildModeLauncher />
        <EmailPill />
        <div className="grain" aria-hidden="true" />
        <ScratchCursor />
      </body>
    </html>
  );
}
