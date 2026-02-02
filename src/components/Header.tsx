"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, Shield } from "lucide-react";
import { siteConfig } from "@/data/siteData";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Our System", href: "/our-system" },
  { name: "System Readiness", href: "/system-readiness" },
  { name: "Financial Transparency", href: "/financial" },
  { name: "Operations", href: "/operations" },
  { name: "Safety", href: "/safety" },
  { name: "Our Team", href: "/our-team" },
  { name: "Contact", href: "/contact" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-[#21355a] text-white shadow-lg sticky top-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo and Site Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/fpa_logo.png"
                alt="SLFPA-E Logo"
                width={50}
                height={50}
                className="rounded-full bg-white p-1"
              />
              <div className="hidden sm:block">
                <div className="text-xl font-bold tracking-tight">{siteConfig.name}</div>
                <div className="text-xs text-blue-200">{siteConfig.tagline}</div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              type="button"
              className="p-2 text-white/90 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-base font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
