import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Infrastructure | FPA Lens",
  description: "Learn about the flood protection infrastructure that keeps Greater New Orleans safe.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
