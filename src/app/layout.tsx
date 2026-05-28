import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Part Pros — OEC Price Optimizer Console",
  description: "Configure dealer seat licenses, markup thresholds, and optimization strategies for OE Connection parts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-favcon.png" type="image/png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
