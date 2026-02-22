export default function SkeletonCard({ theme }: { theme: string }) {
  return (
    <div className="flex-shrink-0 w-[140px] animate-pulse" style={{ scrollSnapAlign: "start" }}>
      <div className={`w-full aspect-[2/3] rounded-lg ${theme === "dark" ? "bg-border" : "bg-gray-200"}`} />
      <div className={`h-3 mt-2 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"} w-[80%]`} />
      <div className={`h-3 mt-1.5 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"} w-[50%]`} />
    </div>
  );
}
