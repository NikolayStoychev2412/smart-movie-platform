import { User } from "lucide-react";
import ScrollRow from "../../../components/ScrollRow";
import type { CastMember } from "../types";

export default function CastCarousel({ cast, theme, language }: { cast: CastMember[]; theme: string; language: string }) {
  if (!cast?.length) return <div className={`text-center py-12 rounded-lg bg-surface-2 text-muted`}><User className="w-16 h-16 mx-auto mb-3 opacity-50" /><p>{language === "bg" ? "Няма информация" : "No cast info"}</p></div>;

  return (
    <ScrollRow>
      {(cast || []).sort((a,b) => (a.order??999)-(b.order??999)).slice(0,15).map((actor, i) => (
        <div key={actor.id||i} className={`flex-shrink-0 w-[150px] rounded-lg overflow-hidden ${theme === "dark" ? "bg-surface-2" : "bg-white border"}`} style={{scrollSnapAlign:"start"}}>
          <div className="aspect-[2/3]">{actor.profile_path ? <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center ${theme === "dark" ? "bg-border" : "bg-gray-200"}`}><User className="w-16 h-16 text-muted" /></div>}</div>
          <div className="p-3"><p className={`font-semibold text-sm truncate text-text`}>{actor.name}</p>{actor.character && <p className="text-xs mt-1 truncate text-muted">{actor.character}</p>}</div>
        </div>
      ))}
    </ScrollRow>
  );
}
