import { useApp } from "../../../context/AppContext";
import { card, mutedText, headText } from "../constants";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const { theme } = useApp();
  return (
    <div className={`p-5 rounded-xl ${card(theme)}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${mutedText(theme)}`}>{label}</p>
          <p className={`text-2xl font-bold mt-1 ${headText(theme)}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
