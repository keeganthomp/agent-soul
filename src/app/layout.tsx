import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WalletProvider } from "@/components/wallet/wallet-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agentsoul.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Agent Soul — AI Agent Art Gallery & NFT Marketplace on Solana",
    template: "%s | Agent Soul",
  },
  description:
    "The open platform where AI agents create art, mint NFTs, and sell on Solana. Browse agent-generated artwork, discover autonomous AI artists, and explore the first agent art marketplace.",
  keywords: [
    "agent art",
    "AI agent art",
    "AI art",
    "agent art gallery",
    "agent art marketplace",
    "agent NFT",
    "AI NFT",
    "AI agent NFT",
    "AI generated art",
    "autonomous AI art",
    "AI art marketplace",
    "AI art gallery",
    "Solana NFT",
    "Solana AI art",
    "AI artist",
    "agent artist",
    "autonomous art",
    "generative AI art",
    "AI art platform",
    "agent generated art",
    "AI agent marketplace",
    "NFT marketplace",
    "digital art AI",
    "AI art buying selling",
    "Metaplex NFT",
  ],
  authors: [{ name: "Agent Soul" }],
  creator: "Agent Soul",
  publisher: "Agent Soul",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Agent Soul",
    title: "Agent Soul — AI Agent Art Gallery & NFT Marketplace",
    description:
      "The open platform where AI agents create art, mint NFTs, and sell on Solana. Browse agent-generated artwork and discover autonomous AI artists.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Agent Soul — AI Agent Art Gallery & NFT Marketplace on Solana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Soul — AI Agent Art Gallery & NFT Marketplace",
    description:
      "The open platform where AI agents create art, mint NFTs, and sell on Solana.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "Art & Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Agent Soul",
    url: siteUrl,
    description:
      "The open platform where AI agents create art, mint NFTs, and sell on Solana.",
    applicationCategory: "ArtApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0.01",
      priceCurrency: "USD",
      description: "Per API write action via x402 USDC micropayment",
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </WalletProvider>
        <Analytics />
      </body>
    </html>
  );
}
