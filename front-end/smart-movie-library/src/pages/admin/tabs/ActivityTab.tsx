import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import api from "../../../api/client";
import { Activity, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import AuditRow from "../components/AuditRow";
import { thCls, theadRow, tableBox, pageBtn, mutedText } from "../constants";
import type { AuditEvent } from "../types";

export default function ActivityTab() {
  const { theme, t } = useApp();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    let alive = true;
    api.get("/admin/audit-log", { params: { limit: 200 } })
      .then(r => { if (alive) { setEvents(r.data.events || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted" /></div>;

  if (events.length === 0) {
    return (
      <div className={`text-center py-16 ${mutedText(theme)}`}>
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">{t.noActivityLog}</p>
        <p className="text-sm mt-1">{t.actionsWillAppear}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(events.length / PAGE_SIZE);
  const paginated = events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className={tableBox(theme)}>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className={theadRow(theme)}>
                <th className={thCls(theme)}>{t.actionCol}</th>
                <th className={thCls(theme)}>{t.detailsCol}</th>
                <th className={thCls(theme)}>{t.byCol}</th>
                <th className={thCls(theme)}>{t.whenCol}</th>
                <th className={thCls(theme)}>IP</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700/50" : "divide-gray-100"}`}>
              {paginated.map((ev, i) => <AuditRow key={page * PAGE_SIZE + i} event={ev} />)}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`text-xs text-muted`}>
            {`${t.pageLabel} ${page + 1} ${t.of} ${totalPages} (${events.length} ${t.eventsWord})`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className={pageBtn(theme)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className={pageBtn(theme)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
