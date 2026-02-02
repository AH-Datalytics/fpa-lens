"use client";

import { Users, TrendingUp, CheckCircle, UserPlus } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import KPICard from "@/components/KPICard";
import PlaceholderBox from "@/components/PlaceholderBox";
import { staffingData, kpiMetrics } from "@/data/siteData";

const COLORS = ["#21355a", "#65bc7b"];

export default function OurTeamPage() {
  const headcountData = [
    { name: "Classified", value: staffingData.headcount.classified },
    { name: "Unclassified", value: staffingData.headcount.unclassified },
  ];

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Our Team"
          subtitle="The dedicated professionals protecting Greater New Orleans"
          source={staffingData.source}
        />

        {/* Headcount Overview */}
        <section className="mb-12">
          <div className="grid md:grid-cols-3 gap-6">
            <KPICard
              label="Total Staff"
              value={kpiMetrics.staffCount.value}
              subtitle={kpiMetrics.staffCount.breakdown}
              icon={<Users className="h-6 w-6" />}
              source={kpiMetrics.staffCount.source}
            />
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Monthly Change
                </span>
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-green-600">
                  +{staffingData.headcount.changeFromLastMonth}
                </span>
                <span className="text-sm text-gray-500">from November</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  As Of
                </span>
              </div>
              <div className="text-xl font-semibold text-[#21355a]">
                {staffingData.asOfDate}
              </div>
            </div>
          </div>
        </section>

        {/* Headcount Breakdown */}
        <section className="mb-12">
          <SectionSubheader title="Staffing Breakdown" />
          <div className="grid lg:grid-cols-2 gap-6">
            <DataCard title="Employee Classification" source={staffingData.source}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={headcountData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {headcountData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DataCard>
            <DataCard title="Headcount Details" source={staffingData.source}>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[0] }}></div>
                    <span className="text-gray-700">Classified Employees</span>
                  </div>
                  <span className="text-2xl font-bold text-[#21355a]">
                    {staffingData.headcount.classified}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[1] }}></div>
                    <span className="text-gray-700">Unclassified Employees</span>
                  </div>
                  <span className="text-2xl font-bold text-[#21355a]">
                    {staffingData.headcount.unclassified}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-[#21355a]">
                      {staffingData.headcount.total}
                    </span>
                  </div>
                </div>
              </div>
            </DataCard>
          </div>
        </section>

        {/* Department Status */}
        <section className="mb-12">
          <SectionSubheader title="Department Staffing Status" />
          <div className="grid md:grid-cols-3 gap-4">
            {staffingData.departmentStatus.map((dept) => (
              <div
                key={dept.name}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[#21355a]">{dept.name}</h4>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    {dept.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Hires */}
        <section className="mb-12">
          <SectionSubheader title="Recent Hires" />
          <DataCard title="New Team Members" source={staffingData.source}>
            <div className="space-y-3">
              {staffingData.recentHires.map((hire, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-green-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">{hire.position}</p>
                    <p className="text-sm text-green-600">{hire.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </DataCard>
        </section>

        {/* Department Breakdown Placeholder */}
        <section>
          <SectionSubheader title="Department Breakdown" />
          <PlaceholderBox
            title="Staffing by Department/Function"
            description="Detailed breakdown of employee counts by department, division, or functional area."
            stakeholderNeeded={staffingData.departmentBreakdown.stakeholderNeeded}
            type="team"
            height="h-64"
          />
        </section>
      </div>
    </div>
  );
}
