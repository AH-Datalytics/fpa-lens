import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Environmental Conditions | FPA Lens",
  description: "Real-time Lakeshore Drive flood risk assessment.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
