import Link from "next/link";
import { MapPin, Phone, ExternalLink, Scissors } from "lucide-react";
import { siteConfig } from "@/data/siteData";

export default function Footer() {
  return (
    <footer className="bg-[#21355a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16">
          {/* Organization Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Southeast Louisiana Flood<br />Protection Authority - East
            </h3>
            <div className="space-y-2 text-sm text-blue-200">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  {siteConfig.address.street}<br />
                  {siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.zip}
                </span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-2 text-sm text-blue-200">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>(504) 286-3100</span>
              </div>
              <a
                href="https://www.floodauthority.org/contact/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Contact form
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <div className="space-y-2 text-sm">
              <a
                href="https://www.floodauthority.org/news/public-alerts/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Sign up for alerts
              </a>
              <a
                href="https://www.floodauthority.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Main SLFPA-E website
              </a>
              <a
                href={siteConfig.boardStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Watch board meetings
              </a>
              <Link
                href="/infrastructure/turf-maintenance"
                className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
              >
                <Scissors className="h-4 w-4" />
                Turf Maintenance
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-blue-200">
            <p>&copy; {new Date().getFullYear()} {siteConfig.organizationShort}</p>
            <p className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Data last updated: {siteConfig.lastUpdated}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
