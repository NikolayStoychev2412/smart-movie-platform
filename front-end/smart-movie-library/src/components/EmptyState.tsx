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
      theme === "dark" ? "bg-[#1A1A33]/50" : "bg-[#F3F4FF]"
    }`}>
      <Icon className={`w-12 h-12 mx-auto mb-3 ${
        theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"
      }`} />
      <p className={`font-medium ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
        {title}
      </p>
      {description && (
        <p className={`text-sm mt-1 ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
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
