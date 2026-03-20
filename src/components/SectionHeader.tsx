interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  source?: string;
}

export default function SectionHeader({ title, subtitle, source }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-[#21355a]">{title}</h1>
      {subtitle && (
        <p className="mt-2 text-lg text-gray-600">{subtitle}</p>
      )}
      {source && (
        <p className="mt-2 text-sm text-gray-400">Data source: {source}</p>
      )}
    </div>
  );
}

export function SectionSubheader({ title, subtitle, className = "" }: { title: string; subtitle?: string; className?: string }) {
  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-xl md:text-2xl font-semibold text-[#21355a]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}
