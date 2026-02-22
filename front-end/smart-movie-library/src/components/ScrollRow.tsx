import { useRef, useState, useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../context/AppContext";

interface ScrollRowProps {
  children: ReactNode;
  className?: string;
}

export default function ScrollRow({ children, className = "" }: ScrollRowProps) {
  const { theme } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -400 : 400,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 350);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      ref?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [children]);

  const arrowClass = theme === "dark"
    ? "bg-border text-white hover:bg-[#3A3A5A]"
    : "bg-white text-text hover:bg-surface-2 border border-border shadow-md";

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className={`hidden md:flex absolute -left-4 top-1/3 z-10 p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center ${arrowClass}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className={`hidden md:flex absolute -right-4 top-1/3 z-10 p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center ${arrowClass}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto scrollbar-hide pb-4 ${className}`}
        style={{ scrollSnapType: "x mandatory" }}
      >
        {children}
      </div>
    </div>
  );
}
