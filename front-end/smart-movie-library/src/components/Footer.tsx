import { useApp } from "../context/AppContext";

export default function Footer() {
  const { theme, t } = useApp();

  return (
    <footer className={`border-t ${theme === "dark" ? "bg-dark-surface border-dark-border" : "bg-light-surface border-light-border"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col items-center gap-4">
          {/* TMDB Logo */}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
              alt="TMDB Logo"
              className="h-6"
            />
          </a>

          {/* Required Disclaimer */}
          <p className={`text-xs text-center max-w-lg ${theme === "dark" ? "text-dark-muted" : "text-light-muted"}`}>
            {t.tmdbDisclaimer}
          </p>

          {/* Copyright */}
          <p className={`text-xs text-muted`}>
            © {new Date().getFullYear()} MovieMaze
          </p>
        </div>
      </div>
    </footer>
  );
}
