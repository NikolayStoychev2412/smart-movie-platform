import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";

export default function SentimentBadge({ sentiment, confidence, size = 'small', language = 'en' }: { sentiment: string; confidence: number; size?: 'small' | 'large'; language?: string }) {
  const config = {
    positive: { icon: ThumbsUp, color: 'text-green-400 bg-green-500/20 border-green-500/30', label: 'Positive', labelBg: 'Позитивен' },
    negative: { icon: ThumbsDown, color: 'text-red-400 bg-red-500/20 border-red-500/30', label: 'Negative', labelBg: 'Негативен' },
    neutral: { icon: Minus, color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', label: 'Neutral', labelBg: 'Неутрален' }
  };

  const entry = config[sentiment as keyof typeof config] || config.neutral;
  const { icon: Icon, color } = entry;
  const displayLabel = language === 'bg' ? entry.labelBg : entry.label;

  if (size === 'small') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {displayLabel} ({Math.round(confidence * 100)}%)
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${color}`}>
      <Icon className="w-4 h-4" />
      {displayLabel} ({Math.round(confidence * 100)}%)
    </div>
  );
}
