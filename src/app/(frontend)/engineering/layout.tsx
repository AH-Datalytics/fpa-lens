import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Engineering | FPA Lens",
  description: "Permits, inspections, and engineering contracts.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
