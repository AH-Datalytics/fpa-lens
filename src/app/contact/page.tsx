import { MapPin, Phone, Mail, Video, ExternalLink, AlertCircle } from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import { siteConfig, contacts } from "@/data/siteData";

export default function ContactPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Contact Us"
          subtitle="Get in touch with the Southeast Louisiana Flood Protection Authority - East"
        />

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Regional Director */}
          <section>
            <SectionSubheader title="Regional Director" />
            <DataCard title={contacts.regionalDirector.name} source="Dec 2025 SITREP">
              <div className="space-y-4">
                <p className="text-lg font-semibold text-[#21355a]">
                  {contacts.regionalDirector.title}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#21355a]/10 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5 text-[#21355a]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Office</p>
                      <a
                        href={`tel:${contacts.regionalDirector.office}`}
                        className="text-[#21355a] font-medium hover:underline"
                      >
                        {contacts.regionalDirector.office}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#21355a]/10 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5 text-[#21355a]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Mobile</p>
                      <a
                        href={`tel:${contacts.regionalDirector.mobile}`}
                        className="text-[#21355a] font-medium hover:underline"
                      >
                        {contacts.regionalDirector.mobile}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#21355a]/10 rounded-lg flex items-center justify-center">
                      <Mail className="h-5 w-5 text-[#21355a]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a
                        href={`mailto:${contacts.regionalDirector.email}`}
                        className="text-[#21355a] font-medium hover:underline"
                      >
                        {contacts.regionalDirector.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </DataCard>
          </section>

          {/* Location */}
          <section>
            <SectionSubheader title="Headquarters" />
            <DataCard title={siteConfig.organization}>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#21355a]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-[#21355a]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{siteConfig.address.street}</p>
                    <p className="text-gray-600">
                      {siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.zip}
                    </p>
                  </div>
                </div>
                <div className="mt-6 bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">[Map placeholder]</p>
                </div>
              </div>
            </DataCard>
          </section>
        </div>

        {/* Public Contact Placeholder */}
        <section className="mt-8">
          <SectionSubheader title="General Public Inquiries" />
          {contacts.publicContact.isPlaceholder ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Contact Information Pending</p>
                  <p className="text-sm text-amber-700 mt-1">
                    General public contact information is awaiting stakeholder input.
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <p>Phone: {contacts.publicContact.phone}</p>
                    <p>Email: {contacts.publicContact.email}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <DataCard title="Contact Us">
              <p className="text-gray-600">Contact information available.</p>
            </DataCard>
          )}
        </section>

        {/* Board Meetings */}
        <section className="mt-8">
          <SectionSubheader title="Board Meetings" />
          <DataCard title="Watch Live & On-Demand" source="Internal documentation">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#65bc7b]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Video className="h-6 w-6 text-[#65bc7b]" />
              </div>
              <div>
                <p className="text-gray-700 mb-4">
                  SLFPA-E Board meetings are streamed live and available for on-demand viewing.
                </p>
                <a
                  href={siteConfig.boardStreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#21355a] text-white px-4 py-2 rounded-lg hover:bg-[#2c3859] transition-colors"
                >
                  <Video className="h-4 w-4" />
                  Watch Board Meetings
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </DataCard>
        </section>

        {/* Main Website Link */}
        <section className="mt-8">
          <div className="bg-gradient-to-r from-[#21355a] to-[#2c3859] rounded-xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold mb-2">Visit Our Main Website</h3>
                <p className="text-blue-200">
                  For more information about SLFPA-E, visit our official website.
                </p>
              </div>
              <a
                href="https://www.floodauthority.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-[#21355a] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                floodauthority.org
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
