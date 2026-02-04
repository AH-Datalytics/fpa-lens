import { Bell, MessageSquare, Mail, ExternalLink, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import Link from "next/link";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";

const smsKeywords = [
  {
    keyword: "FLOODGATE",
    description: "Information on floodgates opening/closing and floodgate maintenance related to vehicle/boat traffic",
  },
  {
    keyword: "LAKESHOREDRIVE",
    description: "Updates about temporary closures or flooded areas",
  },
  {
    keyword: "RIVER",
    description: "Information about Mississippi River levels during flood operations",
  },
  {
    keyword: "HIGHTIDE",
    description: "Information regarding gate openings and closures due to high tides related to vehicle/boat traffic",
  },
];

const socialLinks = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/FloodProtectionAuthority/",
    icon: Facebook,
    handle: "@FloodProtectionAuthority",
  },
  {
    name: "X (Twitter)",
    url: "https://x.com/SLFPAE",
    icon: Twitter,
    handle: "@SLFPAE",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/floodauthority/",
    icon: Instagram,
    handle: "@floodauthority",
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/@SLFPAEast",
    icon: Youtube,
    handle: "SLFPA East",
  },
];

export default function StayInformedPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Stay Informed"
          subtitle="Sign up for alerts and follow us on social media to stay updated on flood protection operations"
        />

        {/* SMS Alerts */}
        <section className="mb-12">
          <SectionSubheader title="Text Message Alerts" />
          <div className="bg-gradient-to-r from-[#21355a] to-[#2c3859] rounded-xl p-8 text-white mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Subscribe to Real-Time Alerts</h3>
                <p className="text-blue-100 mb-4">
                  Get instant notifications about floodgate operations, road closures, river levels, and high tide events
                  delivered directly to your phone.
                </p>
                <div className="bg-white/10 rounded-lg p-4 inline-block">
                  <p className="text-sm text-blue-200 mb-1">Text any keyword below to:</p>
                  <p className="text-2xl font-bold">77295</p>
                  <p className="text-xs text-blue-200 mt-1">or 333111</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {smsKeywords.map((item) => (
              <div
                key={item.keyword}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-[#65bc7b]/10 rounded-lg px-3 py-2">
                    <span className="font-mono font-bold text-[#21355a]">{item.keyword}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <a
              href="https://www.floodauthority.org/news/public-alerts/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#21355a] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2c3859] transition-colors"
            >
              <Bell className="h-5 w-5" />
              Visit Official Alerts Page
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* Email Notifications */}
        <section className="mb-12">
          <SectionSubheader title="Email Notifications" />
          <DataCard title="Sign Up for Email Alerts">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#21355a]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-[#21355a]" />
              </div>
              <div>
                <p className="text-gray-600 mb-4">
                  Prefer email? Sign up through our RAVE notification system to receive alerts via email.
                </p>
                <a
                  href="https://www.getrave.com/login/floodauthority"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#21355a] font-medium hover:underline"
                >
                  Sign up at getrave.com/login/floodauthority
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </DataCard>
        </section>

        {/* Social Media */}
        <section className="mb-12">
          <SectionSubheader title="Follow Us on Social Media" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-[#21355a]/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#21355a] rounded-lg flex items-center justify-center group-hover:bg-[#65bc7b] transition-colors">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#21355a]">{social.name}</p>
                      <p className="text-sm text-gray-500">{social.handle}</p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* News & Press Releases */}
        <section>
          <SectionSubheader title="News & Press Releases" />
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-gray-600 mb-4">
              For the latest news, press releases, and tropical weather updates, visit our official website.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://www.floodauthority.org/news/press-releases/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-100 text-[#21355a] px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Press Releases
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="https://www.floodauthority.org/news/tropical-weather-updates/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-100 text-[#21355a] px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Tropical Weather Updates
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
