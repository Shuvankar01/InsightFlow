import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield, Trash2, Ban, MoreHorizontal, Eye, Pencil, UserCog,
  CheckCircle2, Download, FileText, Search, UserPlus, Users as UsersIcon,
  Activity, Mail, Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — InsightFlow" }] }),
  component: UsersPage,
});

type Role = "admin" | "manager" | "user";
type Status = "all" | "active" | "blocked";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  blocked: boolean;
  created_at: string;
  last_active_at: string | null;
  roles: Role[];
};

const PAGE_SIZE = 10;

const DAY = 86400000;
const DEMO_USERS: UserRow[] = [
  {
    id: "demo-admin",
    name: "InsightFlow Admin",
    email: "demo@insightflow.ai",
    avatar: null,
    blocked: false,
    created_at: new Date(Date.now() - 90 * DAY).toISOString(),
    last_active_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    roles: ["admin"],
  },
  {
    id: "demo-manager",
    name: "Analytics Manager",
    email: "manager@insightflow.ai",
    avatar: null,
    blocked: false,
    created_at: new Date(Date.now() - 45 * DAY).toISOString(),
    last_active_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    roles: ["manager"],
  },
  {
    id: "demo-user",
    name: "Team Member",
    email: "user@insightflow.ai",
    avatar: null,
    blocked: false,
    created_at: new Date(Date.now() - 14 * DAY).toISOString(),
    last_active_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    roles: ["user"],
  },
];

function initials(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "?").trim();
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function roleStyles(r: Role) {
  if (r === "admin") return "bg-[var(--gold)]/20 text-foreground border-[var(--gold)]/50";
  if (r === "manager") return "bg-primary/15 text-foreground border-primary/40";
  return "bg-muted text-muted-foreground border-border";
}


function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<Status>("all");
  const [page, setPage] = useState(0);

  const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<UserRow | null>(null);

  const { data: me } = useQuery({
    queryKey: ["me-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return { userId: user.id, roles: (data ?? []).map((r) => r.role as Role) };
    },
  });
  const isAdmin = me?.roles.includes("admin");

  const { data: users = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role),
      })) as UserRow[];
    },
    enabled: !!me,
  });

  // Realtime: profile + role updates
  useEffect(() => {
    const ch = supabase
      .channel("users-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        qc.invalidateQueries({ queryKey: ["users-list"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => {
        qc.invalidateQueries({ queryKey: ["users-list"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const isDemoFallback = !isLoading && users.length === 0;
  const displayUsers = isDemoFallback ? DEMO_USERS : users;

  const filtered = useMemo(() => {
    return displayUsers.filter((u) => {
      const s = search.toLowerCase();
      const matchSearch = !s ||
        (u.name ?? "").toLowerCase().includes(s) ||
        (u.email ?? "").toLowerCase().includes(s);
      const matchRole = filterRole === "all" || u.roles.includes(filterRole as Role);
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "blocked" ? u.blocked : !u.blocked);
      return matchSearch && matchRole && matchStatus;
    });
  }, [displayUsers, search, filterRole, filterStatus]);

  const stats = useMemo(() => {
    const total = displayUsers.length;
    const active = displayUsers.filter((u) => !u.blocked).length;
    const admins = displayUsers.filter((u) => u.roles.includes("admin")).length;
    const pending = displayUsers.filter((u) => !u.last_active_at && !u.blocked).length;
    return { total, active, admins, pending };
  }, [displayUsers]);


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, filterRole, filterStatus]);

  function isDemoId(id: string) { return id.startsWith("demo-"); }

  async function setRole(userId: string, role: Role) {
    if (isDemoId(userId)) { toast.info("Demo preview — sign in to manage real members."); return; }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    const { error: e2 } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (e2) toast.error(e2.message); else toast.success(`Role set to ${role}`);
    qc.invalidateQueries({ queryKey: ["users-list"] });
  }

  async function applyBlock(u: UserRow) {
    if (isDemoId(u.id)) { toast.info("Demo preview — actions disabled on sample data."); setConfirmBlock(null); return; }
    const next = !u.blocked;
    const { error } = await supabase.from("profiles").update({ blocked: next }).eq("id", u.id);
    if (error) toast.error(error.message);
    else toast.success(next ? "User blocked" : "User unblocked");
    setConfirmBlock(null);
    qc.invalidateQueries({ queryKey: ["users-list"] });
  }

  async function applyDelete(u: UserRow) {
    if (isDemoId(u.id)) { toast.info("Demo preview — actions disabled on sample data."); setConfirmDelete(null); return; }
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) toast.error(error.message); else toast.success("Profile deleted");
    setConfirmDelete(null);
    qc.invalidateQueries({ queryKey: ["users-list"] });
  }

  async function saveEdit() {
    if (!editUser) return;
    if (isDemoId(editUser.id)) { toast.info("Demo preview — actions disabled on sample data."); setEditUser(null); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ name: editName || null, email: editEmail || null })
      .eq("id", editUser.id);
    if (error) toast.error(error.message);

    else { toast.success("Profile updated"); setEditUser(null); }
    qc.invalidateQueries({ queryKey: ["users-list"] });
  }

  function exportCSV() {
    const rows = [
      ["id", "name", "email", "role", "status", "joined", "last_active"],
      ...filtered.map((u) => [
        u.id, u.name ?? "", u.email ?? "",
        u.roles.join("|") || "user",
        u.blocked ? "blocked" : "active",
        u.created_at,
        u.last_active_at ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("InsightFlow — Users", 14, 16);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString()} • ${filtered.length} users`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Name", "Email", "Role", "Status", "Joined"]],
      body: filtered.map((u) => [
        u.name ?? "—", u.email ?? "—",
        u.roles[0] ?? "user",
        u.blocked ? "Blocked" : "Active",
        new Date(u.created_at).toLocaleDateString(),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 67, 56] },
    });
    doc.save(`users-${Date.now()}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin ? "Manage team members, roles, and access." : "Browse team members."}
            <span className="ml-2 inline-flex items-center gap-1 text-xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              live
            </span>
            {isDemoFallback && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--gold)]">
                Demo preview
              </span>
            )}
          </p>

        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              className="bg-primary text-primary-foreground"
              onClick={() => toast.info("Invite flow coming soon — share the signup link for now.")}
            >
              <UserPlus className="mr-2 h-4 w-4" />Invite Member
            </Button>
          )}
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />CSV</Button>
          <Button variant="outline" onClick={exportPDF}><FileText className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Users" value={stats.total} Icon={UsersIcon} tone="primary" />
        <StatCard label="Active Users" value={stats.active} Icon={Activity} tone="emerald" />
        <StatCard label="Admins" value={stats.admins} Icon={Shield} tone="gold" />
        <StatCard label="Pending Invites" value={stats.pending} Icon={Mail} tone="muted" />
      </div>

      {/* Role legend / tooltip */}
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Roles:</span>
          {([
            ["admin", "Full management access — users, roles, audit, exports."],
            ["manager", "Analytics and operational access — dashboards, reports, insights."],
            ["user", "Read-only access — view dashboards and personal settings."],
          ] as const).map(([r, desc]) => (
            <Tooltip key={r}>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`cursor-help capitalize ${roleStyles(r as Role)}`}>
                  {r === "admin" && <Shield className="mr-1 h-3 w-3" />}
                  {r}
                  <Info className="ml-1 h-3 w-3 opacity-60" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{desc}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>


      {/* Filters */}
      <div className="glass-card rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as Status)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} results</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last active</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Loading users…</td></tr>
              )}
              {!isLoading && paged.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                      <UserCog className="h-6 w-6 text-primary" />
                    </div>
                    <div className="font-display text-xl">No team members yet</div>
                    <p className="text-sm text-muted-foreground">
                      Invite teammates to collaborate on dashboards, share insights, and manage workspace access.
                    </p>
                    {isAdmin && (
                      <Button onClick={() => toast.info("Invite flow coming soon.")} className="mt-1">
                        <UserPlus className="mr-2 h-4 w-4" /> Invite your first member
                      </Button>
                    )}
                  </div>
                </td></tr>
              )}
              {paged.map((u) => (
                <tr key={u.id} onClick={() => setDrawerUser(u)} className="cursor-pointer border-t border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border/50">
                        {u.avatar && <AvatarImage src={u.avatar} alt={u.name ?? ""} />}
                        <AvatarFallback className="bg-primary/15 text-xs font-medium text-foreground">
                          {initials(u.name, u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.name ?? "Unnamed"}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(u.roles.length ? u.roles : (["user"] as Role[])).map((r) => (
                      <Badge key={r} variant="outline" className={`mr-1 capitalize ${roleStyles(r)}`}>
                        {r === "admin" && <Shield className="mr-1 h-3 w-3" />}
                        {r}
                      </Badge>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    {u.blocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.last_active_at
                      ? formatDistanceToNow(new Date(u.last_active_at), { addSuffix: true })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setDrawerUser(u)}>
                            <Eye className="mr-2 h-4 w-4" /> View profile
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuItem onClick={() => {
                                setEditUser(u); setEditName(u.name ?? ""); setEditEmail(u.email ?? "");
                              }}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit user
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-muted-foreground">Change role</DropdownMenuLabel>
                              {(["admin", "manager", "user"] as Role[]).map((r) => (
                                <DropdownMenuItem key={r} onClick={() => setRole(u.id, r)}>
                                  <Shield className="mr-2 h-4 w-4" /> <span className="capitalize">{r}</span>
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setConfirmBlock(u)}>
                                <Ban className="mr-2 h-4 w-4" />
                                {u.blocked ? "Unblock" : "Block"} user
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setConfirmDelete(u)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete user
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          Page {page + 1} of {totalPages}
          {filtered.length > 0 && (
            <span className="ml-2">
              · Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Profile drawer */}
      <Sheet open={!!drawerUser} onOpenChange={(o) => !o && setDrawerUser(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {drawerUser && (
            <>
              <SheetHeader>
                <SheetTitle>User profile</SheetTitle>
                <SheetDescription>Detailed view and quick actions</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border border-border/50">
                    {drawerUser.avatar && <AvatarImage src={drawerUser.avatar} />}
                    <AvatarFallback className="bg-primary/15 text-lg">
                      {initials(drawerUser.name, drawerUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-display text-2xl">{drawerUser.name ?? "Unnamed"}</div>
                    <div className="truncate text-sm text-muted-foreground">{drawerUser.email}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Status" value={drawerUser.blocked ? "Blocked" : "Active"} />
                  <Stat label="Role" value={drawerUser.roles[0] ?? "user"} />
                  <Stat label="Joined" value={new Date(drawerUser.created_at).toLocaleDateString()} />
                  <Stat label="Last active" value={
                    drawerUser.last_active_at
                      ? formatDistanceToNow(new Date(drawerUser.last_active_at), { addSuffix: true })
                      : "—"
                  } />
                </div>
                <div className="rounded-lg border border-border/50 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 font-medium text-foreground">User ID</div>
                  <code className="break-all">{drawerUser.id}</code>
                </div>

                {/* Permissions */}
                <div className="rounded-lg border border-border/50 p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Permissions</div>
                  <ul className="space-y-1.5 text-sm">
                    {(() => {
                      const role = drawerUser.roles[0] ?? "user";
                      const perms = role === "admin"
                        ? ["Manage users & roles", "View & export audit log", "Generate AI insights", "Export reports", "Workspace settings"]
                        : role === "manager"
                        ? ["View dashboards & analytics", "Generate AI insights", "Export reports", "Invite team members"]
                        : ["View dashboards", "View personal settings", "Receive notifications"];
                      return perms.map((p) => (
                        <li key={p} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {p}
                        </li>
                      ));
                    })()}
                  </ul>
                </div>

                {/* Recent activity (presentation only) */}
                <div className="rounded-lg border border-border/50 p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Recent activity</div>
                  <ul className="space-y-2 text-sm">
                    {[
                      { e: "Signed in", t: "5 minutes ago" },
                      { e: "Viewed executive dashboard", t: "1 hour ago" },
                      { e: "Generated AI insight", t: "3 hours ago" },
                      { e: "Exported report (PDF)", t: "Yesterday" },
                    ].map((r) => (
                      <li key={r.e} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        <div className="flex-1">
                          <div>{r.e}</div>
                          <div className="text-xs text-muted-foreground">{r.t}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast.info("Activity view coming soon.")}>
                    <Activity className="mr-2 h-4 w-4" /> View activity
                  </Button>
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setEditUser(drawerUser); setEditName(drawerUser.name ?? ""); setEditEmail(drawerUser.email ?? ""); }}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmBlock(drawerUser)}>
                        <Ban className="mr-2 h-4 w-4" /> {drawerUser.blocked ? "Unblock" : "Suspend"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit user */}
      <Sheet open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {editUser && (
            <>
              <SheetHeader>
                <SheetTitle>Edit user</SheetTitle>
                <SheetDescription>Update profile details</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                  <Button onClick={saveEdit}>Save changes</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Block confirm */}
      <AlertDialog open={!!confirmBlock} onOpenChange={(o) => !o && setConfirmBlock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBlock?.blocked ? "Unblock user?" : "Block user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBlock?.blocked
                ? "They will regain access to the workspace."
                : "They will be prevented from accessing the workspace until unblocked."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmBlock && applyBlock(confirmBlock)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the profile record. Their auth account remains and they can sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && applyDelete(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 capitalize">{value}</div>
    </div>
  );
}

function StatCard({
  label, value, Icon, tone,
}: {
  label: string; value: number;
  Icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "emerald" | "gold" | "muted";
}) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    gold: "bg-[var(--gold)]/15 text-[var(--gold)]",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${toneCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 font-display text-3xl">{value.toLocaleString()}</div>
    </div>
  );
}
