// src/components/MoodFilter.tsx
import { useApp } from '../context/AppContext';

interface MoodFilterProps {
  onMoodSelect: (mood: string) => void;
  selectedMood?: string;
}

export default function MoodFilter({ onMoodSelect, selectedMood = 'all' }: MoodFilterProps) {
  const { theme, t } = useApp();

  const moods = [
    { id: 'all', labelKey: 'all' as const, icon: '🎬' },
    { id: 'funny', labelKey: 'funny' as const, icon: '😂' },
    { id: 'scary', labelKey: 'scary' as const, icon: '😱' },
    { id: 'romantic', labelKey: 'romantic' as const, icon: '💕' },
    { id: 'exciting', labelKey: 'exciting' as const, icon: '🔥' },
    { id: 'sad', labelKey: 'sad' as const, icon: '😢' },
    { id: 'thoughtful', labelKey: 'thoughtful' as const, icon: '🤔' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {moods.map((mood) => (
        <button
          key={mood.id}
          onClick={() => onMoodSelect(mood.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedMood === mood.id
              ? 'bg-blue-600 text-white'
              : theme === 'dark'
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
          }`}
        >
          <span>{mood.icon}</span>
          <span>{t[mood.labelKey]}</span>
        </button>
      ))}
    </div>
  );
}