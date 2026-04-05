"use client";

import { useState, useEffect } from "react";
import {
  Info,
  X,
  Shield,
  FileText,
  Droplets,
  HardHat,
  Users,
  Wind,
} from "lucide-react";

const pages = [
  {
    icon: Shield,
    name: "Infrastructure",
    desc: "System map, asset inventory, and readiness status for levees, floodgates, pumps, and complex structures.",
  },
  {
    icon: FileText,
    name: "Finance",
    desc: "Budget vs actuals, spending by department and district, capital projects, and long-term financial planning.",
  },
  {
    icon: Droplets,
    name: "Operations",
    desc: "Permit processing metrics, maintenance activities, and IDIQ contract tracker.",
  },
  {
    icon: HardHat,
    name: "Safety",
    desc: "Workplace safety metrics, incident tracking, and training compliance.",
  },
  {
    icon: Users,
    name: "Staffing",
    desc: "Headcount, vacancies, department breakdown, and leadership directory.",
  },
  {
    icon: Wind,
    name: "Environmental",
    desc: "Lake and river levels, wind conditions, weather alerts, and lakefront flood risk.",
  },
];

export default function SiteGuide() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="About this site"
        title="About this site"
      >
        <Info className="h-4 w-4 text-blue-200" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-bold text-[#21355a]">How to use the FPA Lens</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Use the navigation bar to browse different areas of the dashboard. Each page
                covers a specific part of how SLFPA-E manages and maintains the flood protection
                system. The cards on the homepage give you a quick snapshot of each area.
              </p>
              <div className="space-y-3">
                {pages.map((page) => {
                  const Icon = page.icon;
                  return (
                    <div key={page.name} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#65bc7b]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-[#65bc7b]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#21355a]">{page.name}</h3>
                        <p className="text-xs text-gray-500">{page.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Data refreshes vary by source. Environmental conditions update every 5 minutes.
                Financial and operational metrics are updated as new reports become available.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
