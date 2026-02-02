import { ReactNode } from "react";

interface DataCardProps {
  title: string;
  children: ReactNode;
  source?: string;
  className?: string;
}

export default function DataCard({ title, children, source, className = "" }: DataCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden ${className}`}>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <h3 className="font-semibold text-[#21355a]">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
      {source && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">Source: {source}</p>
        </div>
      )}
    </div>
  );
}
