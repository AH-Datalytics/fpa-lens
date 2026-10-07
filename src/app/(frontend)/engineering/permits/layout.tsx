import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Permit Overview | FPA Lens",
  description: "Live tracking of permit applications for construction, encroachments, and events on or near the levee system.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
