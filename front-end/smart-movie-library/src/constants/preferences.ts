export const GENRES = [
  { id: "action", en: "Action", bg: "Екшън" },
  { id: "comedy", en: "Comedy", bg: "Комедия" },
  { id: "drama", en: "Drama", bg: "Драма" },
  { id: "horror", en: "Horror", bg: "Ужаси" },
  { id: "scifi", en: "Sci-Fi", bg: "Научна фантастика" },
  { id: "romance", en: "Romance", bg: "Романтика" },
  { id: "thriller", en: "Thriller", bg: "Трилър" },
  { id: "animation", en: "Animation", bg: "Анимация" },
  { id: "fantasy", en: "Fantasy", bg: "Фентъзи" },
  { id: "documentary", en: "Documentary", bg: "Документален" },
  { id: "crime", en: "Crime", bg: "Криминален" },
  { id: "adventure", en: "Adventure", bg: "Приключенски" },
];

export const MOODS = [
  { id: "happy", en: "Something fun & light", bg: "Нещо забавно и леко" },
  { id: "thrilling", en: "Edge of my seat excitement", bg: "Вълнуващо и напрегнато" },
  { id: "thoughtful", en: "Make me think", bg: "Да ме накара да мисля" },
  { id: "emotional", en: "Touch my heart", bg: "Да ме трогне" },
  { id: "scary", en: "Scare me!", bg: "Да ме изплаши!" },
  { id: "relaxed", en: "Easy watching", bg: "Лесно за гледане" },
];

export const MOOD_LABELS: Record<string, { en: string; bg: string; style: string }> = {
  happy: { en: "Fun & Light", bg: "Забавно и леко", style: "Uplifting + Fun" },
  thrilling: { en: "Exciting & Intense", bg: "Вълнуващо и интензивни", style: "Dark + Suspenseful" },
  thoughtful: { en: "Thought Provoking", bg: "Провокиращо размисъл", style: "Deep + Cerebral" },
  emotional: { en: "Emotional", bg: "Емоционално", style: "Heartfelt + Moving" },
  scary: { en: "Scary", bg: "Страшно", style: "Horror + Thrills" },
  relaxed: { en: "Easy Watching", bg: "Лесно за гледане", style: "Chill + Casual" },
};
