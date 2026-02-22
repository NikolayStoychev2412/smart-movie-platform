import { Star } from "lucide-react";

interface RatingBadgeProps {
  value: number;
  scale?: 5 | 10;
  size?: "sm" | "md" | "lg";
}

export default function RatingBadge({ value, scale = 10, size = "sm" }: RatingBadgeProps) {
  const normalized = scale === 5 ? value * 2 : value;
  const display = scale === 5 ? value.toFixed(1) : normalized.toFixed(1);

  const color =
    normalized >= 7
      ? "bg-green-600 text-white"
      : normalized >= 5
      ? "bg-yellow-500 text-white"
      : "bg-red-500 text-white";

  const sizeClasses =
    size === "lg"
      ? "text-sm px-2.5 py-1.5 gap-1.5"
      : size === "md"
      ? "text-xs px-2 py-1 gap-1"
      : "text-micro px-1.5 py-0.5 gap-1";

  const iconSize = size === "lg" ? "w-3.5 h-3.5" : size === "md" ? "w-3 h-3" : "w-2.5 h-2.5";

  if (!value || value <= 0) return null;

  return (
    <span className={`inline-flex items-center font-semibold rounded-md ${color} ${sizeClasses}`}>
      {scale === 5 && <Star className={`${iconSize} fill-current`} />}
      {display}
    </span>
  );
}
