import { Building2, ExternalLink } from "lucide-react";
import { translations } from "../../../i18n/translations";
import type { MovieDetail } from "../types";

export default function FactsPanel({ movie, theme, language }: { movie: MovieDetail; theme: string; language: string }) {
  const t = translations[language as "bg" | "en"];
  const director = movie.director || movie.crew?.find(c => c.job === "Director")?.name;
  const writers = movie.crew?.filter(c => ["Writer","Screenplay","Story"].includes(c.job) || c.department === "Writing").slice(0,2);
  const formatMoney = (n?: number) => !n ? null : n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(0)}M` : `$${n.toLocaleString()}`;
  const facts: {label:string;value:string|null|undefined}[] = [];
  if (movie.status) facts.push({ label: t.statusFact, value: movie.status });
  if (movie.original_language) facts.push({ label: t.originalLanguage, value: movie.original_language.toUpperCase() });
  const budgetStr = movie.budget_formatted || formatMoney(movie.budget); if (budgetStr) facts.push({ label: t.budget, value: budgetStr });
  const revenueStr = movie.revenue_formatted || formatMoney(movie.revenue); if (revenueStr) facts.push({ label: t.revenue, value: revenueStr });
  if (!director && !writers?.length && !facts.length && !movie.production_companies?.length) return null;

  return (
    <div className={`rounded-lg p-5 ${theme === "dark" ? "bg-surface-2" : "bg-white border shadow-sm"}`}>
      <h3 className={`font-bold text-lg mb-4 text-text`}>{t.factsTitle}</h3>
      <div className="space-y-4">
        {director && <div><p className="text-sm font-medium text-muted">{t.directorLabel}</p><p className={`font-medium mt-0.5 text-text`}>{director}</p></div>}
        {(writers?.length ?? 0) > 0 && <div><p className="text-sm font-medium text-muted">{t.writerLabel}</p><p className={`font-medium mt-0.5 text-text`}>{writers!.map(w=>w.name).join(", ")}</p></div>}
        {facts.map((f,i) => f.value && <div key={i}><p className="text-sm font-medium text-muted">{f.label}</p><p className={`font-medium mt-0.5 text-text`}>{f.value}</p></div>)}
        {(movie.production_companies?.length ?? 0) > 0 && <div><p className="text-sm font-medium mb-2 text-muted">{t.productionLabel}</p><div className="space-y-2">{movie.production_companies!.slice(0,3).map((c,i) => <div key={c.id||i} className="flex items-center gap-2">{c.logo_path ? <img src={`https://image.tmdb.org/t/p/w92${c.logo_path}`} alt={c.name} className={`h-6 w-auto object-contain ${theme==="dark"?"":"brightness-0"}`}/> : <Building2 className="w-5 h-5 text-muted"/>}<span className={`text-sm ${theme==="dark"?"text-muted":"text-muted"}`}>{c.name}</span></div>)}</div></div>}
        {movie.homepage && <a href={movie.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm mt-4"><ExternalLink className="w-4 h-4"/>{t.officialWebsite}</a>}
      </div>
    </div>
  );
}
