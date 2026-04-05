/**
 * Lakefront Flood Risk Engine
 *
 * Rule-based risk assessment for Lakeshore Drive flooding
 * driven by wind setup on Lake Pontchartrain.
 *
 * Data sources:
 * - NOAA CO-OPS Station 8761927 (New Canal Station)
 * - NWS API (grid LIX/67,92)
 *
 * IMPORTANT: Thresholds below are starting points and need
 * calibration with the Regional Director based on historical
 * Lakeshore Drive flooding events.
 */

// ============================================================================
// TYPES
// ============================================================================

export type RiskLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export interface WindReading {
  speed: number;       // knots
  direction: number;   // degrees (0-360)
  gust: number;        // knots
  cardinal: string;    // e.g. "N", "NE"
  timestamp: string;
}

export interface WaterLevelReading {
  level: number;       // feet MLLW
  predicted: number;   // feet MLLW (tidal prediction)
  anomaly: number;     // level - predicted (surge anomaly)
  timestamp: string;
}

export interface PressureReading {
  value: number;       // millibars
  timestamp: string;
}

export interface LakefrontConditions {
  wind: WindReading;
  waterLevel: WaterLevelReading;
  pressure: PressureReading;
}

export interface ForecastPoint {
  timestamp: string;
  windSpeed: number | null;       // knots
  windDirection: number | null;   // degrees
  windGust: number | null;        // knots
  windCardinal: string | null;
  waterLevel: number | null;      // feet MLLW (NGOFS2 model)
}

export interface NWSAlert {
  headline: string;
  severity: string;
  event: string;
  description: string;
  onset: string;
  expires: string;
}

/**
 * Water level reading from a USGS flood control structure gauge.
 * Used as secondary corroboration of lakefront conditions, not as
 * an input to the risk algorithm. These gauges (Seabrook, Surge Barrier,
 * Bayou Dupre, Caernarvon) are the same ones FPA operations monitors
 * in their EOC via info.floodauthority.org/gages.htm.
 *
 * USGS station IDs are subject to confirmation with the Director's team.
 */
export interface StructureGauge {
  siteId: string;
  name: string;
  level: number | null;    // feet (gauge height, USGS parameter 00065)
  timestamp: string;
}

export interface WindPersistence {
  hoursAnalyzed: number;        // how many hours of history were analyzed
  onshoreReadings: number;      // count of onshore readings above threshold
  totalReadings: number;        // total readings in window
  sustainedFraction: number;    // onshoreReadings / totalReadings
  isSustained: boolean;         // sustainedFraction >= WIND_SUSTAINED_FRACTION
  effectiveHours: number;       // approximate hours of sustained onshore wind
}

export interface RiskAssessment {
  level: RiskLevel;
  action: string;
  description: string;
  factors: string[];
  isOnshore: boolean;
  trending: "improving" | "stable" | "worsening";
  windPersistence: WindPersistence | null;
}

export interface WaterLevelHistoryPoint {
  level: number;
  timestamp: string;
}

export interface StoredForecast {
  wind: number | null;
  water: number | null;
  savedAt: string;
  leadTimeHours: number; // hours between capture time and target time
  forecast24h?: {
    wind: number | null;
    water: number | null;
    savedAt: string;
  };
}

export interface LakefrontData {
  risk: RiskAssessment;
  current: LakefrontConditions;
  windHistory: WindReading[];              // recent observed wind (for chart + duration gating)
  waterLevelHistory: WaterLevelHistoryPoint[];  // recent observed water level (for chart)
  forecast: ForecastPoint[];
  storedForecasts: Record<string, StoredForecast>;  // historical forecast snapshots
  alerts: NWSAlert[];
  structureGauges: StructureGauge[];
  dataGaps: string[];                     // which data sources are currently unavailable
  lastUpdated: string;
  stationId: string;
  stationName: string;
}

// ============================================================================
// CONFIGURABLE THRESHOLDS
// ============================================================================

/**
 * These thresholds need calibration with the Regional Director.
 * Current values are reasonable starting points based on typical
 * Lake Pontchartrain wind-driven surge characteristics.
 */
export const RISK_THRESHOLDS = {
  // Onshore wind direction range (degrees). For the south shore of
  // Lake Pontchartrain (Lakeshore Drive), northerly winds push water
  // toward shore. Range: 315 (NW) through 0 (N) to 45 (NE).
  ONSHORE_DIR_MIN: 315,
  ONSHORE_DIR_MAX: 45,

  // Sustained wind speed tiers (knots)
  WIND_YELLOW: 15,
  WIND_ORANGE: 25,
  WIND_RED: 35,

  // Surge anomaly tiers (feet above predicted tidal level)
  SURGE_YELLOW: 0.5,
  SURGE_ORANGE: 1.0,
  SURGE_RED: 1.5,

  // Forecast lookahead for escalation (hours)
  FORECAST_LOOKAHEAD_HOURS: 6,

  // Wind persistence / duration gating
  // Requires sustained onshore winds before escalating to YELLOW or ORANGE.
  // RED is exempt (immediate response for dangerous conditions).
  WIND_HISTORY_HOURS: 3,           // hours of recent wind data to analyze
  WIND_SUSTAINED_FRACTION: 0.7,    // 70% of readings must be onshore + above threshold
} as const;

// ============================================================================
// RISK LEVEL METADATA
// ============================================================================

const RISK_ACTIONS: Record<RiskLevel, string> = {
  GREEN: "Normal conditions — No action required",
  YELLOW: "Risk developing — Monitor conditions",
  ORANGE: "Elevated risk — Stage barricades",
  RED: "High risk — Close roadway",
};

const RISK_DESCRIPTIONS: Record<RiskLevel, string> = {
  GREEN: "Environmental conditions are within normal parameters. No lakefront flooding risk anticipated.",
  YELLOW: "Conditions are developing that may lead to elevated water levels along Lakeshore Drive. Continue monitoring wind and lake level trends.",
  ORANGE: "Conditions indicate a meaningful risk of lakefront flooding. Consider staging barricades and preparing for potential roadway closures.",
  RED: "Conditions strongly indicate active or imminent lakefront flooding. Roadway closures should be implemented.",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getRiskAction(level: RiskLevel): string {
  return RISK_ACTIONS[level];
}

export function getRiskDescription(level: RiskLevel): string {
  return RISK_DESCRIPTIONS[level];
}

/**
 * Determines if wind direction is onshore for the south shore
 * of Lake Pontchartrain (pushing water toward Lakeshore Drive).
 * Onshore directions: NW through N to NE (315-360, 0-45 degrees).
 */
export function isOnshoreWind(degrees: number): boolean {
  return degrees >= RISK_THRESHOLDS.ONSHORE_DIR_MIN || degrees <= RISK_THRESHOLDS.ONSHORE_DIR_MAX;
}

/**
 * Convert cardinal direction string to degrees.
 */
export function cardinalToDegrees(cardinal: string): number {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  return map[cardinal.toUpperCase()] ?? 0;
}

/**
 * Convert degrees to cardinal direction string.
 */
export function degreesToCardinal(degrees: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return dirs[index];
}

// ============================================================================
// WIND PERSISTENCE ANALYSIS
// ============================================================================

/**
 * Analyze recent wind history to determine if onshore winds have been
 * sustained above a given speed threshold.
 *
 * METHODOLOGY:
 * - Takes the last WIND_HISTORY_HOURS (default 3) hours of 6-minute
 *   wind observations from NOAA (~30 readings).
 * - Counts how many readings are both onshore (315-045 degrees) AND
 *   above the speed threshold.
 * - If that fraction >= WIND_SUSTAINED_FRACTION (default 70%), the
 *   wind is considered "sustained" for that tier.
 * - 70% of 3 hours = ~2.1 hours of qualifying wind. This allows for
 *   brief lulls or direction shifts without resetting the clock.
 *
 * WHY DURATION MATTERS:
 * Wind setup on Lake Pontchartrain develops over hours of sustained
 * northerly winds, not instantly. A brief gust from the north doesn't
 * push meaningful water toward shore. Duration gating prevents false
 * alarms during routine north wind events.
 *
 * DURATION GATING RULES:
 * - YELLOW and ORANGE require sustained winds (duration-gated)
 * - RED triggers immediately regardless of duration (35+ kt onshore
 *   is dangerous enough to warrant immediate response)
 * - If history is unavailable, falls back to instantaneous-only
 */
function computeWindPersistence(
  history: WindReading[],
  speedThreshold: number
): WindPersistence {
  const totalReadings = history.length;
  if (totalReadings === 0) {
    return {
      hoursAnalyzed: 0,
      onshoreReadings: 0,
      totalReadings: 0,
      sustainedFraction: 0,
      isSustained: false,
      effectiveHours: 0,
    };
  }

  let onshoreReadings = 0;
  for (const reading of history) {
    if (isOnshoreWind(reading.direction) && reading.speed >= speedThreshold) {
      onshoreReadings++;
    }
  }

  const sustainedFraction = onshoreReadings / totalReadings;

  // Calculate window span from timestamps
  const first = new Date(history[0].timestamp).getTime();
  const last = new Date(history[history.length - 1].timestamp).getTime();
  const hoursAnalyzed = Math.abs(last - first) / (60 * 60 * 1000);

  // Effective hours = fraction of the window that was sustained onshore
  const effectiveHours = Math.round(sustainedFraction * hoursAnalyzed * 10) / 10;

  return {
    hoursAnalyzed: Math.round(hoursAnalyzed * 10) / 10,
    onshoreReadings,
    totalReadings,
    sustainedFraction: Math.round(sustainedFraction * 100) / 100,
    isSustained: sustainedFraction >= RISK_THRESHOLDS.WIND_SUSTAINED_FRACTION,
    effectiveHours,
  };
}

/**
 * Apply duration gating to an instantaneous wind risk level.
 *
 * LOGIC:
 * 1. RED → never gated, return as-is
 * 2. ORANGE → check if sustained at ORANGE threshold
 *    - If yes → ORANGE
 *    - If no → check if sustained at YELLOW threshold
 *      - If yes → YELLOW
 *      - If no → GREEN
 * 3. YELLOW → check if sustained at YELLOW threshold
 *    - If yes → YELLOW
 *    - If no → GREEN
 * 4. GREEN → return GREEN (nothing to gate)
 *
 * Returns the gated level and the persistence analysis used.
 */
function applyDurationGate(
  instantLevel: RiskLevel,
  history: WindReading[]
): { gatedLevel: RiskLevel; persistence: WindPersistence } {
  if (instantLevel === "RED") {
    // RED is never duration-gated
    const persistence = computeWindPersistence(history, RISK_THRESHOLDS.WIND_RED);
    return { gatedLevel: "RED", persistence };
  }

  if (instantLevel === "ORANGE") {
    const orangePersistence = computeWindPersistence(history, RISK_THRESHOLDS.WIND_ORANGE);
    if (orangePersistence.isSustained) {
      return { gatedLevel: "ORANGE", persistence: orangePersistence };
    }
    // Not sustained at ORANGE; check if YELLOW is sustained
    const yellowPersistence = computeWindPersistence(history, RISK_THRESHOLDS.WIND_YELLOW);
    if (yellowPersistence.isSustained) {
      return { gatedLevel: "YELLOW", persistence: yellowPersistence };
    }
    return { gatedLevel: "GREEN", persistence: yellowPersistence };
  }

  if (instantLevel === "YELLOW") {
    const yellowPersistence = computeWindPersistence(history, RISK_THRESHOLDS.WIND_YELLOW);
    if (yellowPersistence.isSustained) {
      return { gatedLevel: "YELLOW", persistence: yellowPersistence };
    }
    return { gatedLevel: "GREEN", persistence: yellowPersistence };
  }

  // GREEN - nothing to gate
  return {
    gatedLevel: "GREEN",
    persistence: computeWindPersistence(history, RISK_THRESHOLDS.WIND_YELLOW),
  };
}

// ============================================================================
// CORE RISK COMPUTATION
// ============================================================================

const RISK_ORDER: RiskLevel[] = ["GREEN", "YELLOW", "ORANGE", "RED"];

function riskIndex(level: RiskLevel): number {
  return RISK_ORDER.indexOf(level);
}

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return riskIndex(a) >= riskIndex(b) ? a : b;
}

function bumpRisk(level: RiskLevel): RiskLevel {
  const idx = riskIndex(level);
  return idx < RISK_ORDER.length - 1 ? RISK_ORDER[idx + 1] : level;
}

/**
 * Compute the risk level from wind conditions alone.
 */
function windRiskLevel(speed: number, isOnshore: boolean): RiskLevel {
  if (!isOnshore) return "GREEN";
  if (speed >= RISK_THRESHOLDS.WIND_RED) return "RED";
  if (speed >= RISK_THRESHOLDS.WIND_ORANGE) return "ORANGE";
  if (speed >= RISK_THRESHOLDS.WIND_YELLOW) return "YELLOW";
  return "GREEN";
}

/**
 * Compute the risk level from surge anomaly alone.
 */
function surgeRiskLevel(anomaly: number): RiskLevel {
  if (anomaly >= RISK_THRESHOLDS.SURGE_RED) return "RED";
  if (anomaly >= RISK_THRESHOLDS.SURGE_ORANGE) return "ORANGE";
  if (anomaly >= RISK_THRESHOLDS.SURGE_YELLOW) return "YELLOW";
  return "GREEN";
}

/**
 * Check forecast for conditions that exceed a given risk level
 * within the lookahead window.
 */
function forecastMaxRisk(forecast: ForecastPoint[]): RiskLevel {
  const cutoff = Date.now() + RISK_THRESHOLDS.FORECAST_LOOKAHEAD_HOURS * 60 * 60 * 1000;
  let maxLevel: RiskLevel = "GREEN";

  for (const point of forecast) {
    if (new Date(point.timestamp).getTime() > cutoff) break;

    if (point.windSpeed !== null && point.windDirection !== null) {
      const onshore = isOnshoreWind(point.windDirection);
      const windLevel = windRiskLevel(point.windSpeed, onshore);
      maxLevel = maxRisk(maxLevel, windLevel);
    }
  }

  return maxLevel;
}

/**
 * Determine trending direction by comparing current conditions
 * to the forecast over the next few hours.
 */
function computeTrending(
  currentLevel: RiskLevel,
  forecast: ForecastPoint[]
): "improving" | "stable" | "worsening" {
  const forecastMax = forecastMaxRisk(forecast);
  if (riskIndex(forecastMax) > riskIndex(currentLevel)) return "worsening";
  if (riskIndex(forecastMax) < riskIndex(currentLevel)) return "improving";
  return "stable";
}

/**
 * Core risk assessment engine.
 *
 * METHODOLOGY OVERVIEW:
 * 1. Compute instantaneous wind risk from current speed + direction
 * 2. Apply duration gating: if wind history is available, YELLOW and
 *    ORANGE require sustained onshore winds (RED is immediate)
 * 3. Check gust escalation against the duration-gated wind level
 * 4. Compute surge anomaly risk (not duration-gated; surge is a
 *    direct measurement of water already being pushed toward shore)
 * 5. Combine wind and surge: take the higher of the two
 * 6. Check 6-hour forecast for escalation: if forecast shows worse
 *    conditions, bump current level up one tier for lead time
 * 7. Compute trending direction (improving/stable/worsening)
 *
 * PARAMETERS:
 * - current: latest sensor readings (wind, water level, pressure)
 * - forecast: merged NWS wind + NOAA water level forecast points
 * - windHistory: optional array of recent wind readings for duration
 *   analysis. If null/undefined, duration gating is skipped and the
 *   engine falls back to instantaneous-only behavior.
 */
export function computeRiskLevel(
  current: LakefrontConditions,
  forecast: ForecastPoint[],
  windHistory?: WindReading[] | null
): RiskAssessment {
  const factors: string[] = [];
  const onshore = isOnshoreWind(current.wind.direction);

  // Step 1: Instantaneous wind risk
  const instantWindLevel = windRiskLevel(current.wind.speed, onshore);

  // Step 2: Duration gating
  // Always compute persistence when history is available, regardless of wind
  // direction, so the UI can show the tracking bar at all times.
  let effectiveWindLevel = instantWindLevel;
  let persistence: WindPersistence | null = null;

  if (windHistory && windHistory.length > 0) {
    // Compute persistence at the YELLOW threshold as the baseline for display.
    // This shows how close current conditions are to triggering duration-gated alerts.
    persistence = computeWindPersistence(windHistory, RISK_THRESHOLDS.WIND_YELLOW);

    if (onshore && instantWindLevel !== "GREEN") {
      // Actually apply duration gating for non-GREEN onshore levels
      const gateResult = applyDurationGate(instantWindLevel, windHistory);
      effectiveWindLevel = gateResult.gatedLevel;
      persistence = gateResult.persistence;

      // Report sustained wind with duration context
      if (effectiveWindLevel !== "GREEN") {
        const durationNote = persistence.isSustained
          ? ` (sustained ~${persistence.effectiveHours} hrs)`
          : "";
        factors.push(
          `Onshore wind at ${current.wind.speed.toFixed(0)} kt from ${current.wind.cardinal}${durationNote}`
        );
      }

      // Report when duration gating downgraded the level
      if (effectiveWindLevel === "GREEN") {
        factors.push(
          `Onshore wind at ${current.wind.speed.toFixed(0)} kt from ${current.wind.cardinal} but not yet sustained (${Math.round(persistence.sustainedFraction * 100)}% of readings, need ${Math.round(RISK_THRESHOLDS.WIND_SUSTAINED_FRACTION * 100)}%)`
        );
      }
    } else if (instantWindLevel !== "GREEN") {
      // No history available or offshore; use instantaneous level without gating
      factors.push(
        `Onshore wind at ${current.wind.speed.toFixed(0)} kt from ${current.wind.cardinal}`
      );
    }
  } else if (instantWindLevel !== "GREEN") {
    // No history at all; use instantaneous level without gating
    factors.push(
      `Onshore wind at ${current.wind.speed.toFixed(0)} kt from ${current.wind.cardinal}`
    );
  }

  // Step 3: Gust escalation (checked against duration-gated level)
  let gustBump = false;
  if (onshore && current.wind.gust > current.wind.speed) {
    const gustLevel = windRiskLevel(current.wind.gust, true);
    if (riskIndex(gustLevel) > riskIndex(effectiveWindLevel)) {
      gustBump = true;
      factors.push(`Gusts to ${current.wind.gust.toFixed(0)} kt`);
    }
  }

  // Step 4: Surge anomaly (not duration-gated)
  const surgeLevel = surgeRiskLevel(current.waterLevel.anomaly);
  if (surgeLevel !== "GREEN") {
    factors.push(
      `Surge anomaly ${current.waterLevel.anomaly > 0 ? "+" : ""}${current.waterLevel.anomaly.toFixed(2)} ft above predicted`
    );
  }

  // Step 5: Combine wind (duration-gated) and surge
  let level = maxRisk(effectiveWindLevel, surgeLevel);

  // Apply gust bump
  if (gustBump) {
    level = bumpRisk(level);
  }

  // Step 6: Forecast escalation
  const forecastMax = forecastMaxRisk(forecast);
  if (riskIndex(forecastMax) > riskIndex(level)) {
    level = bumpRisk(level);
    factors.push("Forecast shows worsening conditions within 6 hours");
  }

  // Context for non-onshore winds
  if (!onshore && current.wind.speed >= RISK_THRESHOLDS.WIND_YELLOW) {
    factors.push(
      `Wind at ${current.wind.speed.toFixed(0)} kt from ${current.wind.cardinal} (offshore, not driving surge)`
    );
  }

  if (factors.length === 0) {
    factors.push("All conditions within normal parameters");
  }

  const trending = computeTrending(level, forecast);

  return {
    level,
    action: getRiskAction(level),
    description: getRiskDescription(level),
    factors,
    isOnshore: onshore,
    trending,
    windPersistence: persistence,
  };
}
