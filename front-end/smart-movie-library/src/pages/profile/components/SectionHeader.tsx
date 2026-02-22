import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  count?: number;
  viewAllTo?: string;
  viewAllLabel?: string;
  theme: string;
}

export default function SectionHeader({
  icon: Icon,
  iconColor,
  label,
  count,
  viewAllTo,
  viewAllLabel,
  theme,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className={`text-lg font-semibold text-text`}>
          {label}
        </h2>
        {count !== undefined && count > 0 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            theme === "dark" ? "bg-border text-muted" : "bg-gray-200 text-muted"
          }`}>
            {count}
          </span>
        )}
      </div>
      {viewAllTo && (
        <Link
          to={viewAllTo}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {viewAllLabel || "View All"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
