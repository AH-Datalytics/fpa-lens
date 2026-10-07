import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./(frontend)/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotFoundContent from "@/components/NotFoundContent";

/**
 * Global 404 for URLs that match no route. The site's root layout lives in
 * the (frontend) route group (the Payload admin has its own under (payload)),
 * so Next cannot build the unmatched-URL 404 from a layout + not-found pair;
 * without this file visitors got Next's unbranded stock page. Enabled by
 * `experimental.globalNotFound` in next.config.ts. Must render the full
 * document itself, so it mirrors the (frontend) layout's shell.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Page Not Found | FPA Lens",
  description: "The page you were looking for does not exist or has moved.",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main id="main" className="flex-1">
            <NotFoundContent />
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
