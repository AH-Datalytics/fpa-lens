import Link from "next/link";
import SectionHeader from "@/components/SectionHeader";

const SECTIONS = [
  { name: "Infrastructure", href: "/infrastructure" },
  { name: "Finance", href: "/finance" },
  { name: "Engineering", href: "/engineering" },
  { name: "Safety", href: "/safety" },
  { name: "Staffing", href: "/staffing" },
  { name: "Environment", href: "/environment" },
  { name: "Protection", href: "/protection" },
  { name: "About Us", href: "/about" },
];

/**
 * Branded "page not found" body, shared by the route-group `not-found.tsx`
 * (rendered when a page calls notFound()) and `app/global-not-found.tsx`
 * (rendered for URLs that match no route at all -- the root layout lives in
 * the (frontend) route group, so Next cannot compose that case from a layout).
 */
export default function NotFoundContent() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Page Not Found"
          subtitle="The page you were looking for does not exist or has moved."
        />
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-600 mb-4">
            Try one of the main sections of the FPA Lens instead:
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SECTIONS.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="block rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-[#21355a] hover:border-[#21355a]/30 hover:bg-gray-50 transition-colors"
                >
                  {section.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-[#21355a] hover:bg-[#2c4470] text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Back to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
