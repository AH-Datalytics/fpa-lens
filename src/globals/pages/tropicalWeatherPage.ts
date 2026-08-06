import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";
import { rt } from "@/lib/richText";

/**
 * Editable copy for the Tropical Weather page (`/environment/tropical-weather`).
 * The page is a live National Hurricane Center dashboard, so only the framing
 * prose is editable: the page heading, the intro paragraph, and the standing
 * "this is not an official forecast" note. Every storm figure, map label, layer
 * name, legend, status line, and data-source credit is driven by the NHC/NWS
 * feeds or hardcoded in the page, and stays out of the CMS.
 *
 * `defaultValue`s mirror the current hardcoded wording exactly, so the admin
 * form pre-fills and an unseeded global still returns the live copy.
 */
export const TROPICAL_WEATHER_DEFAULTS = {
  pageTitle: "Tropical Weather",
  pageSubtitle: "Live National Hurricane Center tracking for the Gulf Coast",
  intro: rt(
    "When a tropical system enters the Gulf, this page shows the National Hurricane Center's official forecast cone and track, the spread of the individual forecast models, coastal watches and warnings, and the chance of tropical-storm and hurricane-force winds reaching New Orleans. Between storms it shows the seven-day genesis outlook. Everything on this page comes straight from the NHC and the National Weather Service and refreshes automatically.",
  ),
  disclaimer:
    "Not an official forecast. For decisions, consult the National Hurricane Center and NWS New Orleans/Baton Rouge.",
};

export const TropicalWeatherPage: GlobalConfig = {
  slug: "tropical-weather-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Tropical Weather page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    {
      name: "pageTitle",
      label: "Page title",
      type: "text",
      defaultValue: () => TROPICAL_WEATHER_DEFAULTS.pageTitle,
      admin: { description: "Main page heading (top of the Tropical Weather page)." },
    },
    {
      name: "pageSubtitle",
      label: "Page subtitle",
      type: "text",
      defaultValue: () => TROPICAL_WEATHER_DEFAULTS.pageSubtitle,
      admin: { description: "One-line subtitle beneath the page heading." },
    },
    {
      name: "intro",
      label: "Intro paragraph",
      type: "richText",
      defaultValue: () => TROPICAL_WEATHER_DEFAULTS.intro,
      admin: {
        description:
          "Explainer paragraph above the map. Storm data, map labels, and legends are not editable.",
      },
    },
    {
      name: "disclaimer",
      label: "Forecast disclaimer",
      type: "text",
      defaultValue: () => TROPICAL_WEATHER_DEFAULTS.disclaimer,
      admin: {
        description:
          "Standing note beneath the map. Keep the pointer to the National Hurricane Center and NWS.",
      },
    },
  ],
};
