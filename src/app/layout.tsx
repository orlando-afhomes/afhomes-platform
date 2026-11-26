import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/shared/providers/query-provider";
import { SessionIdentityProvider } from "@/shared/providers/session-identity-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Display serif used across the public headings, cards and hero accents. */
const sourceSerif = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "AFhomes Platform",
  description: "AFhomes business management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable}`}>
      <body className="root-body">
        <QueryProvider>
          <SessionIdentityProvider>{children}</SessionIdentityProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
