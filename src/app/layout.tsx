import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The FPA Lens | SLFPA-E Transparency Dashboard",
  description: "Public transparency dashboard for the Southeast Louisiana Flood Protection Authority - East. View system readiness, financial data, operations, and more.",
  keywords: ["flood protection", "New Orleans", "SLFPA-E", "levees", "transparency", "public dashboard"],
  icons: {
    icon: "/fpa_logo.png",
    apple: "/fpa_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
