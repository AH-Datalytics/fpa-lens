import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Turf Maintenance | FPA Lens",
  description: "Levee turf maintenance progress across the system.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
