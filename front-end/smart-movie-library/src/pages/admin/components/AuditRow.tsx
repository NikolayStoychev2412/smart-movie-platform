import { useApp } from "../../../context/AppContext";
import { eventLabels } from "../constants";
import type { AuditEvent } from "../types";

interface AuditRowProps {
  event: AuditEvent;
  compact?: boolean;
}

export default function AuditRow({ event, compact = false }: AuditRowProps) {
  const { theme } = useApp();
  const action = (event.details?.action as string | undefined) || event.event_type;
  const config = eventLabels[action] || eventLabels[event.event_type] || { label: action, color: "text-muted" };

  const detail = (
    (event.details?.movie_title || event.details?.deleted_user_email || event.details?.reviewer_email || "") as string
  );
  const time = event.timestamp ? new Date(event.timestamp).toLocaleString() : "";

  if (compact) {
    return (
      <div className={`flex items-center gap-3 py-2 ${theme === "dark" ? "border-border" : "border-gray-100"}`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.color.replace("text-", "bg-")}`} />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          {detail && (
            <span className={`text-sm ml-1.5 text-muted`}>
              · {detail}
            </span>
          )}
        </div>
        <span className={`text-xs flex-shrink-0 text-muted`}>
          {time}
        </span>
      </div>
    );
  }

  return (
    <tr className={theme === "dark" ? "hover:bg-border/40" : "hover:bg-bg"}>
      <td className="px-4 py-3">
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      </td>
      <td className={`px-4 py-3 text-sm text-muted`}>
        {detail || "—"}
      </td>
      <td className={`px-4 py-3 text-sm text-muted`}>
        {event.user_email || "—"}
      </td>
      <td className={`px-4 py-3 text-xs text-muted`}>
        {time}
      </td>
      <td className={`px-4 py-3 text-xs text-muted`}>
        {event.ip_address || "—"}
      </td>
    </tr>
  );
}
