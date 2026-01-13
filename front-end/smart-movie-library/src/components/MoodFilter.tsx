// src/components/MoodFilter.tsx

interface MoodFilterProps {
  onMoodSelect: (mood: string) => void;
  selectedMood?: string;
}

const moods = [
  { id: 'all', label: 'All', icon: '🎬' },
  { id: 'funny', label: 'Funny', icon: '😂' },
  { id: 'scary', label: 'Scary', icon: '😱' },
  { id: 'romantic', label: 'Romantic', icon: '💕' },
  { id: 'exciting', label: 'Exciting', icon: '🔥' },
  { id: 'sad', label: 'Sad', icon: '😢' },
  { id: 'thoughtful', label: 'Thoughtful', icon: '🤔' },
];

export default function MoodFilter({ onMoodSelect, selectedMood = 'all' }: MoodFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {moods.map((mood) => (
        <button
          key={mood.id}
          onClick={() => onMoodSelect(mood.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedMood === mood.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <span>{mood.icon}</span>
          <span>{mood.label}</span>
        </button>
      ))}
    </div>
  );
}