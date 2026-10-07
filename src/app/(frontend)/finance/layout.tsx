import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finance | FPA Lens",
  description: "How your tax dollars are invested in flood protection.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
