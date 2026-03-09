import { ReactNode } from "react";

interface DataCardProps {
  title: ReactNode;
  children: ReactNode;
  source?: string;
  className?: string;
}

export default function DataCard({ title, children, source, className = "" }: DataCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-gray-100 flex flex-col ${className}`}>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 rounded-t-xl">
        <h3 className="font-semibold text-[#21355a]">{title}</h3>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">{children}</div>
      {source && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 mt-auto rounded-b-xl">
          <p className="text-xs text-gray-400">Source: {source}</p>
        </div>
      )}
    </div>
  );
}
