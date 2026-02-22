import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import api from "../../../api/client";
import {
  Search, ChevronLeft, ChevronRight, ShieldCheck, ShieldOff,
  Shield, Trash2, Loader2, X,
} from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import { thCls, tdMuted, rowHover, theadRow, tableBox, pageBtn, mutedText, headText } from "../constants";
import type { ApiError, UserItem, DialogState } from "../types";

export default function UsersTab() {
  const { theme, language, user: currentUser } = useApp();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ open: false, message: "", onConfirm: () => {} });
  const PAGE_SIZE = 20;

  const openDialog = (message: string, onConfirm: () => void) =>
    setDialog({ open: true, message, onConfirm });
  const closeDialog = () => setDialog(d => ({ ...d, open: false }));

  useEffect(() => {
    let alive = true;
    api.get("/users/")
      .then(r => { if (alive) { setUsers(r.data); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleDelete = (userId: number, userName: string) => {
    openDialog(
      language === "bg" ? `Изтрий потребител "${userName}"?` : `Delete user "${userName}"?`,
      async () => {
        closeDialog();
        setActionLoading(userId);
        try {
          await api.delete(`/users/${userId}`);
          setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
          setErrorMsg((err as ApiError).response?.data?.detail || "Failed to delete user");
        }
        setActionLoading(null);
      }
    );
  };

  const handleToggleAdmin = (userId: number, currentlyAdmin: boolean) => {
    const endpoint = currentlyAdmin ? "remove-admin" : "make-admin";
    const msg = currentlyAdmin
      ? (language === "bg" ? "Премахни админ права?" : "Remove admin privileges?")
      : (language === "bg" ? "Направи потребителя администратор?" : "Make this user an admin?");
    openDialog(msg, async () => {
      closeDialog();
      setActionLoading(userId);
      try {
        await api.patch(`/users/${userId}/${endpoint}`);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentlyAdmin } : u));
      } catch (err) {
        setErrorMsg((err as ApiError).response?.data?.detail || "Failed");
      }
      setActionLoading(null);
    });
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(0); }, [search]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted" /></div>;

  return (
    <>
      <ConfirmDialog open={dialog.open} message={dialog.message} onConfirm={dialog.onConfirm} onCancel={closeDialog} />
      <div className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <span className="text-sm flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg("")}><X className="w-4 h-4" /></button>
          </div>
        )}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={language === "bg" ? "Търси по име или имейл..." : "Search by name or email..."}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${theme === "dark" ? "bg-border border-border text-white placeholder:text-muted" : "bg-white border-border text-text placeholder:text-muted"} focus:outline-none focus:ring-2 focus:ring-primary`}
          />
        </div>

        <div className={tableBox(theme)}>
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className={theadRow(theme)}>
                  <th className={thCls(theme)}>ID</th>
                  <th className={thCls(theme)}>{language === "bg" ? "Потребител" : "User"}</th>
                  <th className={thCls(theme)}>Email</th>
                  <th className={thCls(theme)}>{language === "bg" ? "Дата" : "Joined"}</th>
                  <th className={thCls(theme)}>{language === "bg" ? "Роля" : "Role"}</th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${mutedText(theme)}`}>{language === "bg" ? "Действия" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700/50" : "divide-gray-100"}`}>
                {paginated.map(u => (
                  <tr key={u.id} className={rowHover(theme)}>
                    <td className={tdMuted(theme)}>{u.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">{u.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className={`text-sm font-medium ${headText(theme)}`}>{u.name}</span>
                      </div>
                    </td>
                    <td className={tdMuted(theme)}>{u.email}</td>
                    <td className={`px-4 py-3 text-xs ${mutedText(theme)}`}>
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${theme === "dark" ? "bg-gray-700 text-muted" : "bg-surface-2 text-muted"}`}>User</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {u.id !== currentUser?.id && (
                          <button onClick={() => handleToggleAdmin(u.id, u.is_admin)} disabled={actionLoading === u.id}
                            className={`p-2 rounded-lg transition-colors ${
                              u.is_admin
                                ? (theme === "dark" ? "hover:bg-red-500/20 text-amber-400 hover:text-red-400" : "hover:bg-red-50 text-amber-600 hover:text-red-600")
                                : (theme === "dark" ? "hover:bg-amber-500/20 text-muted hover:text-amber-400" : "hover:bg-amber-50 text-muted hover:text-amber-600")
                            }`}
                            title={u.is_admin ? (language === "bg" ? "Премахни админ" : "Remove admin") : (language === "bg" ? "Направи админ" : "Make admin")}>
                            {actionLoading === u.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : u.is_admin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </button>
                        )}
                        {u.id !== currentUser?.id && (
                          <button onClick={() => handleDelete(u.id, u.name)} disabled={actionLoading === u.id}
                            className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-red-500/20 text-muted hover:text-red-400" : "hover:bg-red-50 text-muted hover:text-red-600"}`}
                            title={language === "bg" ? "Изтрий" : "Delete"}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginated.length === 0 && (
            <p className={`text-center py-8 text-sm ${mutedText(theme)}`}>
              {search ? (language === "bg" ? "Няма резултати" : "No results") : (language === "bg" ? "Няма потребители" : "No users")}
            </p>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className={`text-xs text-muted`}>
            {language === "bg"
              ? `${filtered.length} от ${users.length} потребители${totalPages > 1 ? ` · Стр. ${page + 1} от ${totalPages}` : ""}`
              : `${filtered.length} of ${users.length} users${totalPages > 1 ? ` · Page ${page + 1} of ${totalPages}` : ""}`}
          </p>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className={pageBtn(theme)}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className={pageBtn(theme)}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
