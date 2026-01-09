// src/components/MoodFilter.tsx

interface MoodFilterProps {
  onMoodSelect: (mood: string) => void;
  selectedMood?: string;
}

const moods = [
  { id: 'all', label: 'Всички', emoji: '🎬' },
  { id: 'funny', label: 'Смешни', emoji: '😂' },
  { id: 'scary', label: 'Страшни', emoji: '😱' },
  { id: 'romantic', label: 'Романтични', emoji: '💕' },
  { id: 'exciting', label: 'Вълнуващи', emoji: '🔥' },
  { id: 'sad', label: 'Тъжни', emoji: '😢' },
  { id: 'thoughtful', label: 'За размисъл', emoji: '🤔' },
  { id: 'dark', label: 'Мрачни', emoji: '🌑' },
  { id: 'uplifting', label: 'Вдъхновяващи', emoji: '✨' },
];

export default function MoodFilter({ onMoodSelect, selectedMood = 'all' }: MoodFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {moods.map((mood) => (
        <button
          key={mood.id}
          onClick={() => onMoodSelect(mood.id)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-all
            ${selectedMood === mood.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }
          `}
        >
          <span className="mr-1">{mood.emoji}</span>
          {mood.label}
        </button>
      ))}
    </div>
  );
}