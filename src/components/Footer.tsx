import Link from "next/link";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { siteConfig, contacts } from "@/data/siteData";

export default function Footer() {
  return (
    <footer className="bg-[#21355a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Organization Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{siteConfig.organization}</h3>
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

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-2 text-sm text-blue-200">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{contacts.regionalDirector.office}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${contacts.regionalDirector.email}`} className="hover:text-white transition-colors">
                  {contacts.regionalDirector.email}
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <div className="space-y-2 text-sm">
              <a
                href="https://www.floodauthority.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Main SLFPA-E Website
              </a>
              <a
                href={siteConfig.boardStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Watch Board Meetings
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-blue-200">
            <p>&copy; {new Date().getFullYear()} {siteConfig.organizationShort}. All rights reserved.</p>
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
