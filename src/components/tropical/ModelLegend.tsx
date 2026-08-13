"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { modelRows } from "@/lib/tropical/mapStyle";
import {
  DEFAULT_MODEL_COLOR,
  ENSEMBLE_COLOR,
  ENSEMBLE_DESCRIPTION,
  MODEL_COLORS,
  modelDescription,
} from "@/lib/tropical/modelColors";
import { Kicker } from "./Kicker";

export interface ModelLegendProps {
  visibleModels: Set<string>;
  onChange: (next: Set<string>) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  cycleLabel?: string;
  models?: GeoJSON.FeatureCollection | null;
}

const CHECKBOX =
  "h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-[#21355a] focus:ring-1 focus:ring-[#21355a]";
const MODEL_ROW =
  "flex cursor-help items-center gap-2 py-0.5 text-[11px] text-gray-700 hover:text-gray-900";

/** Forecast-track choices embedded in Map options. Primary choices use
 * plain language; technical model codes stay behind Advanced. */
export function ModelLegend({
  visibleModels,
  onChange,
  enabled,
  onEnabledChange,
  cycleLabel,
  models,
}: ModelLegendProps) {
  const rows = modelRows(models);
  const deterministic = rows.filter((row) => row.group === "deterministic");
  const ensemble = rows.filter((row) => row.group === "ensemble");
  const ensembleCodes = ensemble.map((row) => row.code);
  const gefsCodes = ensemble
    .filter((row) => row.label.startsWith("GEFS"))
    .map((row) => row.code);
  const ecmwfCodes = ensemble
    .filter((row) => row.label.startsWith("ECMWF"))
    .map((row) => row.code);
  const namedEnsembleCodes = new Set([...gefsCodes, ...ecmwfCodes]);
  const otherEnsembleCodes = ensembleCodes.filter((code) => !namedEnsembleCodes.has(code));
  // Consensus aids usually sit close to the official forecast and add clutter
  // without presenting a meaningfully distinct scenario to general users.
  const allCodes = [...deterministic, ...ensemble].map((row) => row.code);
  // What is actually DRAWN, which is what every control in this panel should
  // describe. `visibleModels` is the selection and `enabled` is the layer's
  // visibility, and the two can disagree: with models off by default but every
  // code still selected, each checkbox rendered ticked while the map drew
  // nothing. Deriving from the drawn set keeps a tick meaning "this is on the
  // map", and makes the first click on a model turn on exactly that model
  // rather than silently revealing the other thirty-nine.
  const EMPTY: Set<string> = new Set();
  const shown = enabled ? visibleModels : EMPTY;
  const selectedCount = allCodes.filter((code) => shown.has(code)).length;
  const allSelected = allCodes.length > 0 && selectedCount === allCodes.length;
  // Reads from the drawn set for the same reason, so the label still states
  // what pressing it will do: with the layer off nothing is drawn, so the
  // button offers to turn the ensembles ON.
  const allEnsembleSelected =
    ensembleCodes.length > 0 && ensembleCodes.every((code) => shown.has(code));

  function choose(codes: string[]) {
    onChange(new Set(codes));
    onEnabledChange(codes.length > 0);
  }

  function toggle(code: string) {
    const next = new Set([...shown].filter((selected) => allCodes.includes(selected)));
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(next);
    onEnabledChange(next.size > 0);
  }

  function toggleModelSet(codes: string[]) {
    const allOn = codes.length > 0 && codes.every((code) => shown.has(code));
    const next = new Set([...shown].filter((selected) => allCodes.includes(selected)));
    for (const code of codes) {
      if (allOn) next.delete(code);
      else next.add(code);
    }
    onChange(next);
    onEnabledChange(next.size > 0);
  }

  function choiceClass(selected: boolean): string {
    return `flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left ${
      selected
        ? "border-[#21355a] bg-[#21355a]/5"
        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
    }`;
  }

  return (
    <section className="border-b border-gray-200 px-3.5 py-2.5" aria-labelledby="forecast-track-heading">
      <Kicker id="forecast-track-heading">Forecast track</Kicker>
      <div className="space-y-1">
        <button type="button" className={choiceClass(!enabled)} onClick={() => choose([])}>
          <b className="text-xs font-semibold text-gray-900">Official forecast</b>
          {!enabled && <Check className="h-4 w-4 shrink-0 text-[#21355a]" aria-hidden="true" />}
        </button>
        <button type="button" className={choiceClass(allSelected)} onClick={() => choose(allCodes)}>
          <span>
            <b className="block text-xs font-semibold text-gray-900">Forecast model tracks</b>
            <small className="block text-[11px] text-gray-500">Show other projected paths</small>
          </span>
          {allSelected && <Check className="h-4 w-4 shrink-0 text-[#21355a]" aria-hidden="true" />}
        </button>
      </div>
      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-[11px] font-medium text-[#21355a] hover:underline">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span> Choose
          individual models
        </summary>
        {cycleLabel && (
          <div className="mt-2 text-[11px] text-gray-500">Guidance cycle: {cycleLabel}</div>
        )}
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Model selection actions">
          <button
            type="button"
            onClick={() => choose(allCodes)}
            disabled={allSelected}
            className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => choose([])}
            disabled={selectedCount === 0}
            className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all
          </button>
          {/* The ensembles are the bulk of the list -- dozens of members across GEFS,
              ECMWF and the strays -- so clearing them in one action is the difference
              between a readable spread and a hairball. Individual members stay
              available below. */}
          {ensembleCodes.length > 0 && (
            <button
              type="button"
              onClick={() => toggleModelSet(ensembleCodes)}
              aria-pressed={allEnsembleSelected}
              className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
            >
              {allEnsembleSelected ? "Ensembles off" : "Ensembles on"} ({ensembleCodes.length})
            </button>
          )}
        </div>
        <div className="mt-2 max-h-52 overflow-y-auto pr-1">
          {deterministic.length > 0 && (
            <Fragment>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Individual models
              </div>
              <div className="mb-1 text-[11px] leading-relaxed text-gray-500">
                Hover a model for what it is.
              </div>
              {deterministic.map((model) => (
                <label
                  className={MODEL_ROW}
                  key={model.code}
                  title={modelDescription(model.code, model.label)}
                >
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={shown.has(model.code)}
                    onChange={() => toggle(model.code)}
                  />
                  <span
                    className={`h-0 w-4 shrink-0 ${model.kind === "ai" ? "border-t-2 border-dashed" : "border-t-2"}`}
                    style={{ borderColor: MODEL_COLORS[model.code] ?? DEFAULT_MODEL_COLOR }}
                  />
                  {model.label}
                </label>
              ))}
            </Fragment>
          )}
          {ensemble.length > 0 && (
            <Fragment>
              <div className="mt-2 mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Ensemble model tracks
              </div>
              <div className="mb-1 text-[11px] leading-relaxed text-gray-500">
                Each system is run with slightly different initial conditions. The spread of tracks
                shows forecast uncertainty.
              </div>
              {gefsCodes.length > 0 && (
                <label className={MODEL_ROW} title={ENSEMBLE_DESCRIPTION}>
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={gefsCodes.every((code) => shown.has(code))}
                    onChange={() => toggleModelSet(gefsCodes)}
                  />
                  <span
                    className="h-0 w-4 shrink-0 border-t-2"
                    style={{ borderColor: ENSEMBLE_COLOR }}
                  />
                  GEFS ensemble ({gefsCodes.length} members)
                </label>
              )}
              {ecmwfCodes.length > 0 && (
                <label className={MODEL_ROW} title={ENSEMBLE_DESCRIPTION}>
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={ecmwfCodes.every((code) => shown.has(code))}
                    onChange={() => toggleModelSet(ecmwfCodes)}
                  />
                  <span
                    className="h-0 w-4 shrink-0 border-t-2"
                    style={{ borderColor: ENSEMBLE_COLOR }}
                  />
                  ECMWF ensemble ({ecmwfCodes.length} members)
                </label>
              )}
              {otherEnsembleCodes.length > 0 && (
                <label className={MODEL_ROW} title={ENSEMBLE_DESCRIPTION}>
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={otherEnsembleCodes.every((code) => shown.has(code))}
                    onChange={() => toggleModelSet(otherEnsembleCodes)}
                  />
                  <span
                    className="h-0 w-4 shrink-0 border-t-2"
                    style={{ borderColor: ENSEMBLE_COLOR }}
                  />
                  Other ensemble members ({otherEnsembleCodes.length})
                </label>
              )}
            </Fragment>
          )}
        </div>
      </details>
    </section>
  );
}
