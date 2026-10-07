import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Infrastructure Protection Operations | FPA Lens",
  description: "FPA Police as the 24/7 field protection of the flood-defense system.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
