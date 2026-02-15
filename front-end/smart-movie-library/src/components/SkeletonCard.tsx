import { useApp } from "../context/AppContext";

interface SkeletonCardProps {
  variant?: "poster" | "list" | "stat";
}

export default function SkeletonCard({ variant = "poster" }: SkeletonCardProps) {
  const { theme } = useApp();
  const pulse = theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200";

  if (variant === "stat") {
    return (
      <div className={`animate-pulse rounded-lg p-5 ${theme === "dark" ? "bg-[#1A1A33]" : "bg-white"}`}>
        <div className={`w-10 h-10 rounded-lg ${pulse} mb-3`} />
        <div className={`h-7 w-16 rounded ${pulse} mb-2`} />
        <div className={`h-3 w-24 rounded ${pulse}`} />
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={`animate-pulse flex gap-4 rounded-lg p-4 ${theme === "dark" ? "bg-[#1A1A33]" : "bg-white"}`}>
        <div className={`w-[94px] h-[141px] rounded-lg ${pulse}`} />
        <div className="flex-1 space-y-2 py-2">
          <div className={`h-4 w-2/3 rounded ${pulse}`} />
          <div className={`h-3 w-1/3 rounded ${pulse}`} />
          <div className={`h-3 w-full rounded ${pulse}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pulse flex-shrink-0 w-[150px]" style={{ scrollSnapAlign: "start" }}>
      <div className={`aspect-[2/3] rounded-lg ${pulse}`} />
      <div className={`h-4 w-full rounded mt-3 ${pulse}`} />
      <div className={`h-3 w-2/3 rounded mt-2 ${pulse}`} />
    </div>
  );
}
