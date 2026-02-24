import { useApp } from "../../../context/AppContext";
import { card, headText } from "../constants";

interface ConfirmProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel }: ConfirmProps) {
  const { theme, t } = useApp();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className={`relative rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl ${card(theme)}`}>
        <p className={`text-sm leading-relaxed ${headText(theme)}`}>{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              theme === "dark"
                ? "border-border text-muted hover:bg-border"
                : "border-border text-muted hover:bg-bg"
            }`}>
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">
            {t.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
