import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IDIQ Contract Tracker | FPA Lens",
  description: "How SLFPA-E procures and assigns engineering and professional services work.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
