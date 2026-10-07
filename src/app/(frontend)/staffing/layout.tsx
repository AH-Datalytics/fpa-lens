import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staffing | FPA Lens",
  description: "The dedicated professionals protecting Greater New Orleans.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
