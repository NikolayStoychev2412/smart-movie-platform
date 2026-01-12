// src/components/MoodFilter.tsx
import { useApp } from '../context/AppContext';

interface MoodFilterProps {
  onMoodSelect: (mood: string) => void;
  selectedMood?: string;
}

export default function MoodFilter({ onMoodSelect, selectedMood = 'all' }: MoodFilterProps) {
  const { t } = useApp();
  
  const moods = [
    { id: 'all', label: t.all, emoji: '🎬' },
    { id: 'funny', label: t.funny, emoji: '😂' },
    { id: 'scary', label: t.scary, emoji: '😱' },
    { id: 'romantic', label: t.romantic, emoji: '💕' },
    { id: 'exciting', label: t.exciting, emoji: '🔥' },
    { id: 'sad', label: t.sad, emoji: '😢' },
    { id: 'thoughtful', label: t.thoughtful, emoji: '🤔' },
    { id: 'dark', label: t.dark, emoji: '🌑' },
    { id: 'uplifting', label: t.uplifting, emoji: '✨' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {moods.map((mood) => (
        <button
          key={mood.id}
          onClick={() => onMoodSelect(mood.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedMood === mood.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <span className="mr-1">{mood.emoji}</span>
          {mood.label}
        </button>
      ))}
    </div>
  );
}