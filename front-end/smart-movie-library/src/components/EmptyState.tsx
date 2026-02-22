import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; to: string };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const { theme } = useApp();

  return (
    <div className={`text-center py-12 rounded-lg ${
      theme === "dark" ? "bg-surface-2/50" : "bg-surface-2"
    }`}>
      <Icon className={`w-12 h-12 mx-auto mb-3 text-muted`} />
      <p className={`font-medium text-muted`}>
        {title}
      </p>
      {description && (
        <p className={`text-sm mt-1 text-muted`}>
          {description}
        </p>
      )}
      {action && (
        <Link
          to={action.to}
          className="inline-block mt-4 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
