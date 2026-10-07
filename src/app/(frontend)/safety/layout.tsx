import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety Performance | FPA Lens",
  description: "Our commitment to a safe workplace.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
