import { NextResponse } from "next/server";

const CPRA_URL =
  "https://cimsgeo3.coastal.louisiana.gov/arcgis/rest/services/LIMS/LeveeGates/MapServer/0/query" +
  "?where=1+%3D+1&outFields=GateCode%2CCurrentStatus&returnGeometry=false&f=json";

export const revalidate = 300; // cache 5 minutes

export async function GET() {
  try {
    const res = await fetch(CPRA_URL, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ error: "CPRA fetch failed" }, { status: 502 });
    }
    const data = await res.json();

    const statuses: Record<string, string> = {};
    for (const feature of data.features ?? []) {
      const { GateCode, CurrentStatus } = feature.attributes;
      if (GateCode) statuses[GateCode] = CurrentStatus ?? "Unknown";
    }

    return NextResponse.json({ statuses });
  } catch {
    return NextResponse.json({ error: "Failed to fetch gate status" }, { status: 500 });
  }
}
