import { useState } from "react";
import { Play, X } from "lucide-react";
import ScrollRow from "../../../components/ScrollRow";
import type { MovieDetail } from "../types";
import { translations } from "../../../i18n/translations";

export default function VideosSection({ movie, theme, language }: { movie: MovieDetail; theme: string; language: string }) {
  const [playingVideo, setPlayingVideo] = useState<string|null>(null);
  const t = translations[language as "bg" | "en"];

  const videos = [...(movie.videos||[]).filter(v => v.site === "YouTube")];
  if (movie.trailer_youtube_key && !videos.find(v => v.key === movie.trailer_youtube_key)) videos.unshift({ id: "main", key: movie.trailer_youtube_key, name: t.officialTrailer, site: "YouTube", type: "Trailer" });

  if (!videos.length) return null;

  return (
    <section>
      <h2 className={`text-2xl font-bold mb-5 text-text`}>{t.videosLabel} <span className="ml-2 text-base font-normal text-muted">({videos.length})</span></h2>
      {playingVideo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPlayingVideo(null)}><button onClick={() => setPlayingVideo(null)} className="absolute top-4 right-4 p-2 text-white hover:text-muted"><X className="w-8 h-8"/></button><div className="w-full max-w-5xl aspect-video" onClick={e => e.stopPropagation()}><iframe src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1`} title="Video" className="w-full h-full rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div></div>}
      <ScrollRow>
        {videos.map(v => (
          <div key={v.id||v.key} className="flex-shrink-0 w-[320px] md:w-[400px] cursor-pointer group" style={{scrollSnapAlign:"start"}} onClick={() => setPlayingVideo(v.key)}>
            <div className="relative rounded-lg overflow-hidden">
              <img src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`} alt={v.name} className="w-full aspect-video object-cover" onError={e => (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.key}/hqdefault.jpg`}/>
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition-colors"><div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg"><Play className="w-8 h-8 text-text ml-1" fill="currentColor"/></div></div>
              <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">{v.type}</div>
            </div>
            <p className={`mt-2 text-sm font-medium line-clamp-1 ${theme==="dark"?"text-muted":"text-muted"}`}>{v.name}</p>
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}
