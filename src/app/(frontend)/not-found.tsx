import type { Metadata } from "next";
import NotFoundContent from "@/components/NotFoundContent";

export const metadata: Metadata = {
  title: "Page Not Found | FPA Lens",
};

// Rendered inside the (frontend) layout when a page calls notFound().
// Unmatched URLs are handled by src/app/global-not-found.tsx instead.
export default function NotFound() {
  return <NotFoundContent />;
}
