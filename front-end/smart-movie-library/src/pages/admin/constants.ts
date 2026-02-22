
// --- Style helpers (centralise repeated Tailwind strings) ---

export const card = (t: string) =>
  t === "dark" ? "bg-border/60 border border-border/50" : "bg-white border border-border shadow-sm";

export const thCls = (t: string) =>
  `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${t === "dark" ? "text-muted" : "text-muted"}`;

export const tdMuted = (t: string) =>
  `px-4 py-3 text-sm ${t === "dark" ? "text-muted" : "text-muted"}`;

export const rowHover = (t: string) =>
  t === "dark" ? "hover:bg-border/40" : "hover:bg-bg";

export const theadRow = (t: string) =>
  t === "dark" ? "bg-border/80" : "bg-bg";

export const tableBox = (t: string) =>
  `rounded-xl overflow-hidden border ${t === "dark" ? "border-border/50" : "border-border"}`;

export const pageBtn = (t: string) =>
  `p-2 rounded-lg border ${t === "dark" ? "border-border text-muted hover:bg-border disabled:opacity-30" : "border-border text-muted hover:bg-bg disabled:opacity-30"}`;

export const mutedText = (t: string) => (t === "dark" ? "text-muted" : "text-muted");
export const headText  = (t: string) => (t === "dark" ? "text-white"    : "text-text");

// --- Audit event label / colour map ---

export const eventLabels: Record<string, { label: string; color: string }> = {
  delete_review:    { label: "Deleted review",        color: "text-red-400" },
  delete_movie:     { label: "Deleted movie",         color: "text-red-400" },
  update_movie:     { label: "Edited movie",          color: "text-yellow-400" },
  review_deleted:   { label: "Deleted review",        color: "text-red-400" },
  movie_deleted:    { label: "Deleted movie",         color: "text-red-400" },
  movie_created:    { label: "Edited movie",          color: "text-yellow-400" },
  user_deleted:     { label: "Deleted user",          color: "text-red-400" },
  user_created:     { label: "New user",              color: "text-green-400" },
  admin_promoted:   { label: "Promoted to admin",     color: "text-amber-400" },
  admin_demoted:    { label: "Demoted from admin",    color: "text-orange-400" },
  password_changed: { label: "Password changed",      color: "text-blue-400" },
  login_success:    { label: "Login",                 color: "text-blue-400" },
  login_failed:     { label: "Failed login",          color: "text-red-400" },
  admin_action:     { label: "Admin action",          color: "text-amber-400" },
};
