import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Send Feedback | FPA Lens",
  description: "Have a question or comment for the Flood Authority? Send us a note.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
