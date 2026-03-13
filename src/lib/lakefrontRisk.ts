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

export interface RiskAssessment {
  level: RiskLevel;
  action: string;
  description: string;
  factors: string[];
  isOnshore: boolean;
  trending: "improving" | "stable" | "worsening";
}

export interface LakefrontData {
  risk: RiskAssessment;
  current: LakefrontConditions;
  forecast: ForecastPoint[];
  alerts: NWSAlert[];
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
 * Evaluates current conditions against thresholds, checks forecast
 * for escalation, and returns the overall risk assessment.
 */
export function computeRiskLevel(
  current: LakefrontConditions,
  forecast: ForecastPoint[]
): RiskAssessment {
  const factors: string[] = [];
  const onshore = isOnshoreWind(current.wind.direction);

  // Evaluate wind-driven risk
  const windLevel = windRiskLevel(current.wind.speed, onshore);
  if (windLevel !== "GREEN") {
    factors.push(
      `Onshore wind at ${current.wind.speed.toFixed(0)} kt from ${current.wind.cardinal}`
    );
  }

  // Evaluate gust escalation
  let gustBump = false;
  if (onshore && current.wind.gust > current.wind.speed) {
    const gustLevel = windRiskLevel(current.wind.gust, true);
    if (riskIndex(gustLevel) > riskIndex(windLevel)) {
      gustBump = true;
      factors.push(`Gusts to ${current.wind.gust.toFixed(0)} kt`);
    }
  }

  // Evaluate surge anomaly
  const surgeLevel = surgeRiskLevel(current.waterLevel.anomaly);
  if (surgeLevel !== "GREEN") {
    factors.push(
      `Surge anomaly ${current.waterLevel.anomaly > 0 ? "+" : ""}${current.waterLevel.anomaly.toFixed(2)} ft above predicted`
    );
  }

  // Combine: take the worse of wind and surge risk
  let level = maxRisk(windLevel, surgeLevel);

  // Apply gust bump: if gusts push to a higher tier, bump up one level
  if (gustBump) {
    level = bumpRisk(level);
  }

  // Check forecast for escalation: if forecast shows worse conditions
  // within the lookahead window, bump current level up one tier
  const forecastMax = forecastMaxRisk(forecast);
  if (riskIndex(forecastMax) > riskIndex(level)) {
    level = bumpRisk(level);
    factors.push("Forecast shows worsening conditions within 6 hours");
  }

  // Add context for non-onshore winds
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
  };
}
