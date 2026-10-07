import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | FPA Lens",
  description: "Protecting Greater New Orleans from hurricane surge and Mississippi River flooding.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
