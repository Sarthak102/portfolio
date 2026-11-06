import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sarthak Kamble | Full-stack developer",
  description:
    "Full-stack developer working in TypeScript, React, Node.js and AWS DynamoDB.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <noscript>
          <style>{`.intro-hide{opacity:1!important}.intro-only{display:none!important}`}</style>
        </noscript>
        <SmoothScroll />
        {children}
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
