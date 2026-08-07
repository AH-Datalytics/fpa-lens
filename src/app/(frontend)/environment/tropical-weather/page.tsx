import type { Metadata } from "next";
import { DashboardProvider } from "@/lib/tropical/useDashboard";
import TropicalWeatherContent from "./TropicalWeatherContent";
import "./tropical-map.css";

export const metadata: Metadata = {
  title: "Tropical Weather | FPA Lens",
  description:
    "Live National Hurricane Center tracking for the Gulf Coast: forecast cone and track, model guidance, coastal watches and warnings, and wind probabilities for the New Orleans metro area.",
};

export default function TropicalWeatherPage() {
  return (
    <DashboardProvider>
      <TropicalWeatherContent />
    </DashboardProvider>
  );
}
