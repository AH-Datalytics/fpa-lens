"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import Prose from "@/components/Prose";
import { usePageCopy } from "@/lib/usePageCopy";
import { TROPICAL_WEATHER_DEFAULTS } from "@/globals/pages/tropicalWeatherPage";
import { AdvisoryPlayback } from "@/components/tropical/AdvisoryPlayback";
import { IntensityPanel } from "@/components/tropical/IntensityPanel";
import { SummaryBand } from "@/components/tropical/SummaryBand";
import { PAGE_PATH } from "@/lib/tropical/config";
import { cdtTime, formatCycle } from "@/lib/tropical/format";
import {
  DEFAULT_LAYER_STATE,
  DEMO_LAYER_STATE,
  toggleLayer,
  type WindThreshold,
} from "@/lib/tropical/layers";
import { allModelCodes } from "@/lib/tropical/mapStyle";
import { useDashboard } from "@/lib/tropical/useDashboard";

// MapLibre touches `window` at import time (setWorkerUrl), so the map is
// client-only — same pattern as the Leaflet maps elsewhere in FPA Lens.
const StormMap = dynamic(() => import("@/components/tropical/StormMap"), {
  ssr: false,
  loading: MapLoading,
});

function MapLoading() {
  return (
    <div
      className="flex h-full w-full items-center justify-center gap-2 bg-gray-100 text-sm text-gray-500"
      role="status"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Loading map…
    </div>
  );
}

export default function TropicalWeatherContent() {
  const copy = usePageCopy("tropical-weather-page", TROPICAL_WEATHER_DEFAULTS);
  const dashboard = useDashboard();
  const [visibleModels, setVisibleModels] = useState<Set<string>>(new Set());
  // Start with the lightweight cone-first state while the URL mode resolves.
  // Live mode expands to DEFAULT_LAYER_STATE as soon as its manifest arrives.
  const [layers, setLayers] = useState(DEMO_LAYER_STATE);
  const [windThreshold, setWindThreshold] = useState<WindThreshold>(39);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [intensityOpen, setIntensityOpen] = useState(false);
  const [loadMap, setLoadMap] = useState(false);
  const [seededLayerMode, setSeededLayerMode] = useState<boolean | null>(null);

  // Keep MapLibre and third-party basemap tiles off the critical path. The
  // rail can report live conditions as soon as the manifest resolves; the
  // interactive map follows during the browser's next idle window.
  //
  // "unavailable" counts as resolved: when the storm feed is down there are no
  // overlays to draw, but the basemap and the New Orleans reference point
  // still render, which beats a spinner that never stops.
  useEffect(() => {
    if (dashboard.status === "loading" || loadMap) return;
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setLoadMap(true), { timeout: 800 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setLoadMap(true), 150);
    return () => clearTimeout(id);
  }, [dashboard.status, loadMap]);

  // Seed the layer set once the manifest resolves which mode we're in. This is
  // React's "adjust state while rendering" pattern rather than an effect: the
  // adjustment depends only on values already available during this render, and
  // an effect would paint the wrong layer set for one frame first.
  if (dashboard.status === "ready" && seededLayerMode !== dashboard.demo) {
    setSeededLayerMode(dashboard.demo);
    setLayers(dashboard.demo ? DEMO_LAYER_STATE : DEFAULT_LAYER_STATE);
  }

  // Every model track present in the CURRENT storm's models.geojson, defaulted
  // to "all visible" — a data-driven default, since different storms carry
  // wildly different model rosters (the Ida sample alone has ~80 track
  // features). Re-seeded only when the SELECTED storm/model-cycle actually
  // changes, so toggling individual checkboxes in the map options doesn't get
  // stomped by this effect on every unrelated re-render.
  const modelsKey = dashboard.storm ? `${dashboard.storm.id}:${dashboard.storm.modelCycle}` : "";
  const lastModelsKeyRef = useRef<string>("");
  const lastAvailableModelsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!dashboard.geo.models) return;
    if (lastModelsKeyRef.current === modelsKey) return;
    const nextAvailable = new Set(allModelCodes(dashboard.geo.models));
    const previousAvailable = lastAvailableModelsRef.current;
    const firstCycle = lastModelsKeyRef.current === "";
    lastModelsKeyRef.current = modelsKey;
    lastAvailableModelsRef.current = nextAvailable;
    setVisibleModels((previousVisible) => {
      const previouslyShowingAll =
        previousAvailable.size > 0 &&
        [...previousAvailable].every((model) => previousVisible.has(model));
      if (firstCycle || previouslyShowingAll) return nextAvailable;
      return new Set([...previousVisible].filter((model) => nextAvailable.has(model)));
    });
  }, [dashboard.geo.models, modelsKey]);

  // Gated on the guidance EXISTING, not on `mode`. `mode === "active"` means
  // "a storm is inside the Gulf box" -- not "there is a storm" -- so an
  // Atlantic storm anywhere else lost its intensity chart entirely while every
  // other panel drew, and the map reported it UNAVAILABLE with the data sitting
  // right there in storms/<id>/intensity.json. Same gate, same fix, as the
  // model picker in StormMap. intensity.json is already per-storm, so nothing
  // further is needed to scope it to the selected storm.
  const hasIntensity = !!dashboard.storm && !!dashboard.intensity;
  // The advisory scrubber occupies the bottom of the map during a replay, so
  // the intensity pop-out has to sit above it rather than on top of it.
  const hasReplay = dashboard.storm?.id === "al092021" && dashboard.advisories.length > 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/environment"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#21355a] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Environment
        </Link>
        <h1 className="text-3xl font-bold text-[#21355a] md:text-4xl">{copy.pageTitle}</h1>
        <p className="mt-2 text-lg text-gray-600">{copy.pageSubtitle}</p>
        <Prose className="mt-3 max-w-3xl text-gray-600 [&_p]:m-0" data={copy.intro} />

        {dashboard.stale && dashboard.manifest && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Data may be delayed — last updated {cdtTime(dashboard.manifest.generated)}
          </div>
        )}

        {/* "This is not live data" banner. It sits above the map rather than
            floating over a corner of it: the map's four corners already carry
            the compass, the options panel, the replay bar and the attribution,
            and on a phone an overlaid tag lands on top of one of them. */}
        {dashboard.demo && dashboard.demoTag && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
              {dashboard.demoTag}
            </span>
            {/* The only way out of a demo: the dashboard reads `?demo=` as a
                one-shot snapshot of the URL, so this has to be a real document
                navigation, and it has to drop every param (the replay scrubber
                also writes `?advisory=`), not just the demo one. */}
            <a
              href={PAGE_PATH}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to live conditions
            </a>
          </div>
        )}

        <div className="mt-6">
          <SummaryBand
            status={dashboard.status}
            retry={dashboard.retry}
            dataIssues={dashboard.dataIssues}
            mode={dashboard.mode}
            storm={dashboard.storm}
            outlookText={dashboard.outlookText}
            probs={dashboard.probs}
            storms={dashboard.storms}
            demoParam={dashboard.demoParam}
            wwlines={dashboard.geo.wwlines}
            publicAdvisoryText={dashboard.textProducts?.publicAdvisory?.text}
          />
        </div>

        {/* Full page width, with the summary overhead rather than beside it. */}
        <div className="relative mt-4 h-[26rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:h-[32rem] lg:h-[40rem]">
          {loadMap ? (
            <StormMap
              geo={dashboard.geo}
              stormSummary={
                dashboard.storm
                  ? {
                      name: dashboard.storm.name,
                      classification: dashboard.storm.classification,
                      intensityMph: dashboard.storm.intensityMph,
                      pressureMb: dashboard.storm.pressureMb,
                      movementDir: dashboard.storm.movementDir,
                      movementMph: dashboard.storm.movementMph,
                      advisoryNum: dashboard.storm.advisoryNum,
                      advisoryTime: dashboard.storm.advisoryTime,
                    }
                  : undefined
              }
              mode={dashboard.mode}
              visibleModels={visibleModels}
              onVisibleModelsChange={setVisibleModels}
              modelCycleLabel={
                dashboard.storm ? formatCycle(dashboard.storm.modelCycle) : undefined
              }
              windProbCycleLabel={
                dashboard.storm?.windprobCycle
                  ? formatCycle(dashboard.storm.windprobCycle)
                  : undefined
              }
              windProbCyclesBehind={dashboard.storm?.windprobCyclesBehind}
              layers={layers}
              onLayersToggle={(key) => setLayers((s) => toggleLayer(s, key))}
              windThreshold={windThreshold}
              onWindThresholdChange={setWindThreshold}
              outlookText={dashboard.outlookText?.text}
              otherStorms={dashboard.otherStorms}
              discussion={dashboard.textProducts?.discussion ?? null}
              discussionOpen={discussionOpen}
              onDiscussionOpenChange={(open) => {
                // The two pop-outs share the same corner of the map.
                if (open) setIntensityOpen(false);
                setDiscussionOpen(open);
              }}
              hasIntensity={hasIntensity}
              intensityOpen={intensityOpen}
              onIntensityOpenChange={(open) => {
                if (open) setDiscussionOpen(false);
                setIntensityOpen(open);
              }}
            />
          ) : (
            <MapLoading />
          )}
          {hasIntensity && intensityOpen && dashboard.storm && dashboard.intensity && (
            <div
              className={`absolute inset-x-3 z-20 md:right-[17.75rem] ${
                hasReplay ? "bottom-[6.5rem]" : "bottom-3"
              }`}
            >
              <IntensityPanel
                intensity={dashboard.intensity}
                storm={dashboard.storm}
                track={dashboard.geo.track}
                visibleModels={visibleModels}
                storms={dashboard.storms}
                demoParam={dashboard.demoParam}
                onClose={() => setIntensityOpen(false)}
              />
            </div>
          )}
          {hasReplay && (
            <AdvisoryPlayback
              advisories={dashboard.advisories}
              currentIndex={dashboard.advisoryIndex}
              onSelect={dashboard.selectAdvisoryIndex}
            />
          )}
        </div>

        <p className="mt-4 text-sm text-gray-500">{copy.disclaimer}</p>
      </div>
    </div>
  );
}
