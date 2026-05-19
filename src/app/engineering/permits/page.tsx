"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Clock, AlertCircle, Building2, Search } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import KPICard from "@/components/KPICard";

interface Permit {
  permitId: string;
  permitSubmitDate: string | null;
  permitType: string;
  permitStatus: string;
  permitStatusDate: string | null;
  lnoDate: string | null;
  leveeDistrict: string | null;
  infoRequestedDate: string | null;
  applicantType: string | null;
  projectDescription: string | null;
}

const DISTRICT_LABELS: Record<string, string> = {
  "Orleans Levee District": "OLD",
  "East Jefferson Levee District": "EJLD",
  "Lake Borgne Levee District": "LBBLD",
};

const DISTRICT_FILTERS = ["All", "Orleans Levee District", "East Jefferson Levee District", "Lake Borgne Levee District"];

const STATUS_GROUPS: Record<string, string> = {
  "Pre Review": "Pending",
  "With Permitting Office for Initial Review": "Under Review",
  "Under Review - Permitting Office": "Under Review",
  "Under Review - 3rd Party": "3rd Party",
  "With Applicant or Agent for Signature": "Awaiting Applicant",
  "With Permitting Office for Signature": "Final Review",
  "Pending Completion": "Final Review",
};

const STATUS_COLORS: Record<string, string> = {
  "Pending": "bg-gray-100 text-gray-700",
  "Under Review": "bg-blue-100 text-blue-700",
  "3rd Party": "bg-purple-100 text-purple-700",
  "Awaiting Applicant": "bg-amber-100 text-amber-700",
  "Final Review": "bg-green-100 text-green-700",
};

function daysOpen(submitDate: string | null): number | null {
  if (!submitDate) return null;
  const ms = Date.now() - new Date(submitDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PermitsPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [district, setDistrict] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetch("/api/permits")
      .then((r) => r.json())
      .then((data) => {
        setPermits(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return permits.filter((p) => {
      if (district !== "All" && p.leveeDistrict !== district) return false;
      const group = STATUS_GROUPS[p.permitStatus ?? ""] ?? "Other";
      if (statusFilter !== "All" && group !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.permitId.toLowerCase().includes(q) ||
          (p.projectDescription ?? "").toLowerCase().includes(q) ||
          (p.applicantType ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [permits, district, statusFilter, search]);

  const avgDays = useMemo(() => {
    const withDates = filtered.filter((p) => p.permitSubmitDate);
    if (!withDates.length) return null;
    const total = withDates.reduce((sum, p) => sum + (daysOpen(p.permitSubmitDate) ?? 0), 0);
    return Math.round(total / withDates.length);
  }, [filtered]);

  const awaitingApplicant = filtered.filter((p) => p.permitStatus === "With Applicant or Agent for Signature").length;
  const lnoPending = filtered.filter((p) => !p.lnoDate && p.permitStatus === "Under Review - 3rd Party").length;

  const statusGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const p of permits) {
      const g = STATUS_GROUPS[p.permitStatus ?? ""] ?? "Other";
      groups[g] = (groups[g] ?? 0) + 1;
    }
    return groups;
  }, [permits]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading permits...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500 text-sm">Failed to load permit data.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SectionHeader
        title="Permit Applications"
        subtitle="Active levee safety permit pipeline — SLFPA-East"
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Link href="/engineering" className="inline-flex items-center gap-1.5 text-sm text-[#21355a] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Engineering
        </Link>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Active Permits"
            value={permits.length.toLocaleString()}
            icon={<FileText className="h-5 w-5" />}
          />
          <KPICard
            label="Avg. Days Open"
            value={avgDays !== null ? `${avgDays}d` : "—"}
            icon={<Clock className="h-5 w-5" />}
            subtitle="from submission date"
          />
          <KPICard
            label="Awaiting Applicant"
            value={awaitingApplicant.toString()}
            icon={<AlertCircle className="h-5 w-5" />}
            subtitle="pending applicant response"
          />
          <KPICard
            label="Pending 3rd Party"
            value={lnoPending.toString()}
            icon={<Building2 className="h-5 w-5" />}
            subtitle="external agency review"
          />
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-[#21355a] mb-3">Pipeline by Status</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusGroups).sort((a, b) => b[1] - a[1]).map(([group, count]) => (
              <div key={group} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${STATUS_COLORS[group] ?? "bg-gray-100 text-gray-700"}`}>
                <span>{group}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {/* District tabs */}
            <div className="flex gap-1 flex-wrap">
              {DISTRICT_FILTERS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDistrict(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    district === d
                      ? "bg-[#21355a] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {d === "All" ? "All Districts" : DISTRICT_LABELS[d]}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white"
            >
              <option value="All">All Statuses</option>
              {Object.keys(STATUS_COLORS).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Search */}
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5 bg-white flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search permit ID or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs outline-none w-full text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">Showing {filtered.length.toLocaleString()} of {permits.length.toLocaleString()} permits</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Permit ID</th>
                  <th className="text-left px-4 py-3 font-medium">District</th>
                  <th className="text-left px-4 py-3 font-medium">Applicant Type</th>
                  <th className="text-left px-4 py-3 font-medium">Submitted</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Days Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice(0, 200).map((p) => {
                  const group = STATUS_GROUPS[p.permitStatus ?? ""] ?? "Other";
                  const days = daysOpen(p.permitSubmitDate);
                  return (
                    <tr key={p.permitId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#21355a] font-medium">{p.permitId}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {p.leveeDistrict ? DISTRICT_LABELS[p.leveeDistrict] ?? p.leveeDistrict : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{p.applicantType ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(p.permitSubmitDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[group] ?? "bg-gray-100 text-gray-700"}`}>
                          {group}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {days !== null ? `${days}d` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
              Showing first 200 of {filtered.length.toLocaleString()} results — use filters to narrow
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">
          Source: Vinformatix Permitting System · Data refreshes hourly
        </p>
      </div>
    </div>
  );
}
