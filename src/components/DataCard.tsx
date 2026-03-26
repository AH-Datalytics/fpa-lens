import { ReactNode } from "react";

interface DataCardProps {
  title: ReactNode;
  children: ReactNode;
  source?: string;
  note?: ReactNode;
  className?: string;
  contentClassName?: string;
  subgrid?: boolean;
}

export default function DataCard({ title, children, source, note, className = "", contentClassName, subgrid }: DataCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-gray-100 ${subgrid ? "row-span-3 grid grid-rows-subgrid" : "flex flex-col"} ${className}`}>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 rounded-t-xl">
        <h3 className="font-semibold text-[#21355a]">{title}</h3>
      </div>
      <div className={`${contentClassName ?? "p-6 justify-center"} ${subgrid ? "" : "flex-1"} flex flex-col`}>{children}</div>
      {(source || note) ? (
        <div className={`px-6 py-3 bg-gray-50 border-t border-gray-100 ${subgrid ? "flex flex-col justify-center" : "mt-auto"} rounded-b-xl`}>
          {source && <p className="text-xs text-gray-400">Source: {source}</p>}
          {note && <p className={`text-xs text-gray-400 ${source ? "mt-1" : ""}`}>{note}</p>}
        </div>
      ) : subgrid ? <div className="rounded-b-xl" /> : null}
    </div>
  );
}
