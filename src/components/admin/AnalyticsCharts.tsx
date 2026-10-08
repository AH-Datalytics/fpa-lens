"use client";

import React from "react";
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Client-side charts for /admin/analytics (AnalyticsView.tsx). Colours are the
 * FPA palette; teal/green rather than navy so the series read in dark mode too.
 */

const TEAL = "#2FA4A9";
const GREEN = "#65bc7b";
const NAVY = "#21355a";
const AXIS = "#8a94a6";
const DEVICE_COLORS = [TEAL, GREEN, NAVY, "#b0b8c7"];

const fmt = new Intl.NumberFormat("en-US");
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: "1px solid #d5dbe5" };

export function TrafficChart({ data }: { data: { date: string; visitors: number; pageViews: number }[] }) {
  if (data.length === 0) return <p className="fpa-an__empty">No visits in this range.</p>;
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="fpaVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
              <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={AXIS} strokeOpacity={0.2} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 11, fill: AXIS }}
            tickLine={false}
            axisLine={{ stroke: AXIS, strokeOpacity: 0.3 }}
            minTickGap={24}
          />
          <YAxis tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(l) => shortDate(String(l))}
            formatter={(v, name) => [fmt.format(Number(v)), name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="visitors" name="Visitors" stroke={TEAL} strokeWidth={2} fill="url(#fpaVisitors)" />
          <Line type="monotone" dataKey="pageViews" name="Page views" stroke={GREEN} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DevicesChart({ data }: { data: { name: string; visitors: number }[] }) {
  if (data.length === 0) return <p className="fpa-an__empty">No visitors in this range.</p>;
  const total = data.reduce((s, d) => s + d.visitors, 0) || 1;
  const rows = data.map((d) => ({ ...d, label: d.name.charAt(0).toUpperCase() + d.name.slice(1) }));
  return (
    <div className="fpa-an__devices">
      <div style={{ width: 150, height: 150 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="visitors" nameKey="label" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
              {rows.map((_, i) => (
                <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [fmt.format(Number(v)), name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="fpa-an__legend">
        {rows.map((d, i) => (
          <li key={d.name}>
            <span className="fpa-an__swatch" style={{ background: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
            {d.label}
            <strong>{Math.round((d.visitors / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
