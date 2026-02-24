import type { Language } from "../i18n/translations";

export const GENRES = [
  { id: "action",          en: "Action",           bg: "Екшън",               emoji: "💥" },
  { id: "adventure",       en: "Adventure",        bg: "Приключенски",        emoji: "🏔️" },
  { id: "animation",       en: "Animation",        bg: "Анимация",            emoji: "🎨" },
  { id: "comedy",          en: "Comedy",           bg: "Комедия",             emoji: "😂" },
  { id: "crime",           en: "Crime",            bg: "Криминален",          emoji: "🕵️" },
  { id: "documentary",     en: "Documentary",      bg: "Документален",        emoji: "🎥" },
  { id: "drama",           en: "Drama",            bg: "Драма",               emoji: "🎭" },
  { id: "family",          en: "Family",           bg: "Семеен",              emoji: "👨‍👩‍👧" },
  { id: "fantasy",         en: "Fantasy",          bg: "Фентъзи",             emoji: "🧙" },
  { id: "history",         en: "History",          bg: "Исторически",         emoji: "📜" },
  { id: "horror",          en: "Horror",           bg: "Ужаси",               emoji: "👻" },
  { id: "music",           en: "Music",            bg: "Музикален",           emoji: "🎵" },
  { id: "mystery",         en: "Mystery",          bg: "Мистерия",            emoji: "🔍" },
  { id: "romance",         en: "Romance",          bg: "Романтика",           emoji: "❤️" },
  { id: "scifi",           en: "Sci-Fi",           bg: "Научна фантастика",   emoji: "🚀" },
  { id: "sciencefiction",  en: "Science Fiction",  bg: "Научна фантастика",   emoji: "🚀" },
  { id: "thriller",        en: "Thriller",         bg: "Трилър",              emoji: "🔪" },
  { id: "tvmovie",         en: "TV Movie",         bg: "ТВ филм",             emoji: "📺" },
  { id: "war",             en: "War",              bg: "Военен",              emoji: "⚔️" },
  { id: "western",         en: "Western",          bg: "Уестърн",             emoji: "🤠" },
];

/**
 * Translate a genre to the requested language.
 * Accepts either a genre ID stored in user preferences (e.g. "scifi")
 * or an English name returned by TMDB (e.g. "Science Fiction").
 */
export function translateGenre(genre: string, language: Language): string {
  const lower = genre.toLowerCase();
  const match = GENRES.find(
    (g) => g.id === lower || g.en.toLowerCase() === lower
  );
  return match ? match[language] : genre;
}

export const MOODS = [
  { id: "happy",       en: "Something fun & light",       bg: "Нещо забавно и леко"      },
  { id: "thrilling",   en: "Edge of my seat excitement",  bg: "Вълнуващо и напрегнато"   },
  { id: "thoughtful",  en: "Make me think",               bg: "Да ме накара да мисля"    },
  { id: "emotional",   en: "Touch my heart",              bg: "Да ме трогне"             },
  { id: "scary",       en: "Scare me!",                   bg: "Да ме изплаши!"           },
  { id: "relaxed",     en: "Easy watching",               bg: "Лесно за гледане"         },
];

export const MOOD_LABELS: Record<string, { en: string; bg: string; style: string }> = {
  happy:      { en: "Fun & Light",          bg: "Забавно и леко",            style: "Uplifting + Fun"      },
  thrilling:  { en: "Exciting & Intense",   bg: "Вълнуващо и интензивни",   style: "Dark + Suspenseful"   },
  thoughtful: { en: "Thought Provoking",    bg: "Провокиращо размисъл",      style: "Deep + Cerebral"      },
  emotional:  { en: "Emotional",            bg: "Емоционално",               style: "Heartfelt + Moving"   },
  scary:      { en: "Scary",                bg: "Страшно",                   style: "Horror + Thrills"     },
  relaxed:    { en: "Easy Watching",        bg: "Лесно за гледане",          style: "Chill + Casual"       },
};
