import type { MetadataRoute } from "next";

const BASE_URL = "https://www.fpalens.org";

/** Every public route on the site. Keep in step with the Header nav. */
const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/infrastructure",
  "/infrastructure/turf-maintenance",
  "/finance",
  "/engineering",
  "/engineering/idiq",
  "/engineering/permits",
  "/environment",
  "/environment/tropical-weather",
  "/protection",
  "/safety",
  "/staffing",
  "/feedback",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: path === "/environment/tropical-weather" ? "hourly" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
