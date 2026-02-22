import { useState } from "react";
import { Star } from "lucide-react";

export default function StarRating({ rating, onRate, size = 24 }: { rating: number; onRate?: (r: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate?.(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`transition-colors ${onRate ? 'cursor-pointer' : 'cursor-default'}`}
          disabled={!onRate}
        >
          <Star
            size={size}
            className={`${
              star <= (hover || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
