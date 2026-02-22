import { useState } from "react";
import { Film } from "lucide-react";
import { useApp } from "../context/AppContext";

interface MoviePosterProps {
  posterPath?: string | null;
  posterUrl?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w92",
  md: "w342",
  lg: "w500",
};

export default function MoviePoster({ posterPath, posterUrl, alt, size = "md", className = "" }: MoviePosterProps) {
  const { theme } = useApp();
  const [error, setError] = useState(false);

  const url = posterUrl || (posterPath ? `https://image.tmdb.org/t/p/${sizeMap[size]}${posterPath}` : null);

  if (!url || error) {
    return (
      <div className={`aspect-[2/3] rounded-lg flex items-center justify-center ${
        theme === "dark" ? "bg-border" : "bg-gray-200"
      } ${className}`}>
        <Film className={`w-8 h-8 ${theme === "dark" ? "text-muted" : "text-gray-400"}`} />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`aspect-[2/3] rounded-lg object-cover ${className}`}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}
